import { User, LoginCredentials } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    // Mock data for demo purposes
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@nekservice.ru',
        name: 'Администратор',
        role: 'admin',
        rating: 5.0,
        totalEarnings: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        email: 'manager@nekservice.ru',
        name: 'Менеджер',
        role: 'manager',
        rating: 4.8,
        totalEarnings: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        email: 'tech@nekservice.ru',
        name: 'Техник',
        role: 'technician',
        rating: 4.5,
        totalEarnings: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.email === credentials.email);
        if (user && credentials.password === 'password') {
          resolve({
            user,
            token: 'mock-jwt-token-' + user.id,
          });
        } else {
          reject(new Error('Неверный email или пароль'));
        }
      }, 1000);
    });
  }

  async getCurrentUser(): Promise<User> {
    // Mock implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          const userId = token.split('-').pop();
          const mockUser: User = {
            id: userId || '1',
            email: 'admin@nekservice.ru',
            name: 'Администратор',
            role: 'admin',
            rating: 5.0,
            totalEarnings: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          resolve(mockUser);
        } else {
          reject(new Error('No token found'));
        }
      }, 500);
    });
  }

  async logout(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }
}

export const authService = new AuthService();


