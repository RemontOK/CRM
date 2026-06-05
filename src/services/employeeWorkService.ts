import { appSettingsService } from './appSettingsService';
import {
  AppSettings,
  EmployeeScheduleEntry,
  EmployeeScheduleRosterEntry,
  EmployeeTask,
  EmployeeTaskStatus,
} from '../types';

export interface EmployeeWorkNotification {
  id: string;
  title: string;
  description: string;
  kind: 'schedule' | 'task';
  severity: 'info' | 'warning' | 'error';
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const sortSchedule = (items: EmployeeScheduleEntry[]) =>
  [...items].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

const sortRoster = (items: EmployeeScheduleRosterEntry[]) =>
  [...items].sort((a, b) => `${a.month} ${a.employeeId}`.localeCompare(`${b.month} ${b.employeeId}`));

const sortTasks = (items: EmployeeTask[]) =>
  [...items].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) {
      return a.status === 'done' ? 1 : -1;
    }

    return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
  });

class EmployeeWorkService {
  getSettings(): AppSettings {
    return appSettingsService.getSettings();
  }

  async refresh(): Promise<AppSettings> {
    return appSettingsService.refreshFromApi();
  }

  getEmployeeSchedule(employeeId: string, settings = this.getSettings()) {
    return sortSchedule(settings.employeeWork.schedules.filter((entry) => entry.employeeId === employeeId));
  }

  getScheduleRoster(month: string, settings = this.getSettings()) {
    return sortRoster(settings.employeeWork.rosterEntries.filter((entry) => entry.month === month));
  }

  getEmployeeTasks(employeeId: string, settings = this.getSettings()) {
    return sortTasks(settings.employeeWork.tasks.filter((task) => task.employeeId === employeeId));
  }

  getEmployeeNotifications(employeeId: string, settings = this.getSettings()): EmployeeWorkNotification[] {
    const today = todayKey();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);

    const scheduleNotes = this.getEmployeeSchedule(employeeId, settings)
      .filter((entry) => entry.date === today || entry.date === tomorrowKey)
      .map<EmployeeWorkNotification>((entry) => ({
        id: `schedule_${entry.id}`,
        title: entry.date === today ? 'График на сегодня' : 'График на завтра',
        description: entry.isDayOff ? 'Выходной' : `${entry.startTime}-${entry.endTime}${entry.location ? `, ${entry.location}` : ''}`,
        kind: 'schedule',
        severity: 'info',
      }));

    const taskNotes = this.getEmployeeTasks(employeeId, settings)
      .filter((task) => task.status !== 'done')
      .slice(0, 8)
      .map<EmployeeWorkNotification>((task) => ({
        id: `task_${task.id}`,
        title: task.dueDate && task.dueDate < today ? 'Просроченная задача' : 'Задача',
        description: `${task.title}${task.dueDate ? ` до ${new Date(task.dueDate).toLocaleDateString('ru-RU')}` : ''}`,
        kind: 'task',
        severity: task.dueDate && task.dueDate < today ? 'error' : task.priority === 'high' ? 'warning' : 'info',
      }));

    return [...scheduleNotes, ...taskNotes];
  }

  async saveScheduleEntry(entry: Partial<EmployeeScheduleEntry> & { employeeId: string }) {
    const settings = await this.refresh();
    const now = new Date().toISOString();
    const nextEntry: EmployeeScheduleEntry = {
      id: entry.id || generateId('schedule'),
      employeeId: entry.employeeId,
      date: entry.date || todayKey(),
      startTime: entry.startTime || '10:00',
      endTime: entry.endTime || '19:00',
      location: entry.location || '',
      note: entry.note || '',
      isDayOff: Boolean(entry.isDayOff),
      updatedAt: now,
    };
    const schedules = settings.employeeWork.schedules.filter((item) => item.id !== nextEntry.id);

    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        schedules: sortSchedule([...schedules, nextEntry]),
      },
    });
  }

  async deleteScheduleEntry(id: string) {
    const settings = await this.refresh();
    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        schedules: settings.employeeWork.schedules.filter((entry) => entry.id !== id),
      },
    });
  }

  async addScheduleRosterEmployee(employeeId: string, month: string) {
    const settings = await this.refresh();
    const rosterEntries = settings.employeeWork.rosterEntries || [];
    const existing = rosterEntries.find((entry) => entry.employeeId === employeeId && entry.month === month);

    if (existing) {
      return settings;
    }

    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        rosterEntries: sortRoster([
          ...rosterEntries,
          {
            id: generateId('schedule_roster'),
            employeeId,
            month,
            updatedAt: new Date().toISOString(),
          },
        ]),
      },
    });
  }

  async saveTask(task: Partial<EmployeeTask> & { employeeId: string; title: string }) {
    const settings = await this.refresh();
    const now = new Date().toISOString();
    const status = task.status || 'todo';
    const nextTask: EmployeeTask = {
      id: task.id || generateId('task'),
      employeeId: task.employeeId,
      title: task.title.trim(),
      description: task.description || '',
      dueDate: task.dueDate || '',
      status,
      priority: task.priority || 'medium',
      progress: status === 'done' ? 100 : Math.max(0, Math.min(100, Number(task.progress || 0))),
      createdAt: task.createdAt || now,
      updatedAt: now,
      completedAt: status === 'done' ? task.completedAt || now : undefined,
    };
    const tasks = settings.employeeWork.tasks.filter((item) => item.id !== nextTask.id);

    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        tasks: sortTasks([...tasks, nextTask]),
      },
    });
  }

  async updateTaskProgress(id: string, status: EmployeeTaskStatus, progress: number) {
    const settings = await this.refresh();
    const now = new Date().toISOString();
    const tasks = settings.employeeWork.tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            status,
            progress: status === 'done' ? 100 : Math.max(0, Math.min(100, progress)),
            updatedAt: now,
            completedAt: status === 'done' ? task.completedAt || now : undefined,
          }
        : task
    );

    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        tasks,
      },
    });
  }

  async deleteTask(id: string) {
    const settings = await this.refresh();
    return appSettingsService.saveSettings({
      ...settings,
      employeeWork: {
        ...settings.employeeWork,
        tasks: settings.employeeWork.tasks.filter((task) => task.id !== id),
      },
    });
  }
}

export const employeeWorkService = new EmployeeWorkService();
