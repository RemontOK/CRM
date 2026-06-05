import { TaxonomyNode } from '../types';
import { apiService } from './api';

const STORAGE_KEY = 'crm_taxonomy_nodes';

type TaxonomyScope = TaxonomyNode['scope'];

const defaultNodeDefinitions: Record<TaxonomyScope, Array<{ name: string; parentName?: string }>> = {
  inventory: [
    { name: 'Экраны' },
    { name: 'Батареи' },
    { name: 'Корпуса' },
    { name: 'Камеры' },
    { name: 'Клавиатуры' },
    { name: 'Процессоры' },
    { name: 'Память' },
    { name: 'Прочее' },
    { name: 'Защита экрана' },
    { name: 'Аксессуары' },
    { name: 'Товары' },
  ],
  cash: [
    { name: 'Ремонт' },
    { name: 'Продажи' },
    { name: 'Закупки' },
    { name: 'Зарплата' },
    { name: 'Расходы сервиса' },
    { name: 'Прочее' },
  ],
  employee_departments: [
    { name: 'Ремонт' },
    { name: 'Управление' },
    { name: 'Касса' },
    { name: 'Администрация' },
  ],
  employee_positions: [
    { name: 'Техник' },
    { name: 'Менеджер' },
    { name: 'Кассир' },
    { name: 'Администратор' },
    { name: 'Директор' },
  ],
};

const normalizeNode = (node: TaxonomyNode): TaxonomyNode => ({
  ...node,
  parentId: node.parentId || null,
  createdAt: new Date(node.createdAt),
});

class TaxonomyService {
  private nodes: TaxonomyNode[] = [];
  private refreshPromise: Promise<TaxonomyNode[]> | null = null;

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.nodes = saved ? JSON.parse(saved).map(normalizeNode) : [];
    } catch {
      this.nodes = [];
    }
  }

  private saveCache() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.nodes));
  }

  private syncNodes(nodes: TaxonomyNode[]) {
    this.nodes = nodes.map(normalizeNode);
    this.saveCache();
  }

  private buildFallbackNodes(): TaxonomyNode[] {
    const now = new Date();

    return (Object.entries(defaultNodeDefinitions) as Array<[TaxonomyScope, Array<{ name: string; parentName?: string }>]>)
      .flatMap(([scope, entries]) =>
        entries.map((entry, index) => ({
          id: `${scope}_${index + 1}`,
          scope,
          name: entry.name,
          parentId: null,
          createdAt: now,
        }))
      );
  }

  private async ensureDefaults(remoteNodes: TaxonomyNode[]) {
    if (remoteNodes.length > 0) {
      return remoteNodes;
    }

    const created: TaxonomyNode[] = [];

    for (const [scope, entries] of Object.entries(defaultNodeDefinitions) as Array<
      [TaxonomyScope, Array<{ name: string; parentName?: string }>]
    >) {
      for (const entry of entries) {
        const parent = entry.parentName ? created.find((node) => node.scope === scope && node.name === entry.parentName) : undefined;
        const node = await apiService.post<TaxonomyNode>('/taxonomy/nodes', {
          scope,
          name: entry.name,
          parentId: parent?.id || null,
        });
        created.push(normalizeNode(node));
      }
    }

    return created;
  }

  async refreshFromApi(): Promise<TaxonomyNode[]> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const remoteNodes = await apiService.get<TaxonomyNode[]>('/taxonomy/nodes');
          const nodes = await this.ensureDefaults(remoteNodes.map(normalizeNode));
          this.syncNodes(nodes);
          return this.nodes;
        } catch {
          if (this.nodes.length === 0) {
            this.syncNodes(this.buildFallbackNodes());
          }
          return this.nodes;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  getNodes(scope?: TaxonomyScope): TaxonomyNode[] {
    return scope ? this.nodes.filter((node) => node.scope === scope) : [...this.nodes];
  }

  getRoots(scope: TaxonomyScope): TaxonomyNode[] {
    return this.nodes.filter((node) => node.scope === scope && !node.parentId);
  }

  getChildren(parentId: string): TaxonomyNode[] {
    return this.nodes.filter((node) => node.parentId === parentId);
  }

  async addNode(scope: TaxonomyScope, name: string, parentId?: string | null): Promise<TaxonomyNode> {
    const created = normalizeNode(
      await apiService.post<TaxonomyNode>('/taxonomy/nodes', {
        scope,
        name,
        parentId: parentId || null,
      })
    );

    this.nodes = [...this.nodes.filter((node) => node.id !== created.id), created];
    this.saveCache();
    return created;
  }

  async updateNode(nodeId: string, name: string): Promise<TaxonomyNode> {
    const updated = normalizeNode(await apiService.put<TaxonomyNode>(`/taxonomy/nodes/${nodeId}`, { name }));
    this.nodes = this.nodes.map((node) => (node.id === updated.id ? updated : node));
    this.saveCache();
    return updated;
  }

  async deleteNode(nodeId: string): Promise<void> {
    await apiService.delete<{ deleted: boolean }>(`/taxonomy/nodes/${nodeId}`);
    const toDelete = new Set<string>([nodeId]);
    let changed = true;

    while (changed) {
      changed = false;
      this.nodes.forEach((node) => {
        if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
          toDelete.add(node.id);
          changed = true;
        }
      });
    }

    this.nodes = this.nodes.filter((node) => !toDelete.has(node.id));
    this.saveCache();
  }
}

export const taxonomyService = new TaxonomyService();
