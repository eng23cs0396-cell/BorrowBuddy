export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  status?: 'active' | 'banned';
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

