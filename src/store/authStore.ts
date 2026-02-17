import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  clinicId: string | null;
  permissions: string[];
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string, clinicId: string) => void;
  clearAuth: () => void;
}

const parsePermissionsFromToken = (token: string): string[] => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const perms = payload.permissions;
    if (typeof perms === 'string') {
      return JSON.parse(perms);
    }
    return Array.isArray(perms) ? perms : [];
  } catch {
    return [];
  }
};

const storedToken = localStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: storedToken,
  refreshToken: localStorage.getItem('refreshToken'),
  clinicId: localStorage.getItem('clinicId'),
  permissions: storedToken ? parsePermissionsFromToken(storedToken) : [],
  isAuthenticated: !!storedToken,

  setAuth: (user, accessToken, refreshToken, clinicId) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('clinicId', clinicId);

    set({
      user,
      accessToken,
      refreshToken,
      clinicId,
      permissions: parsePermissionsFromToken(accessToken),
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    localStorage.clear();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      clinicId: null,
      permissions: [],
      isAuthenticated: false,
    });
  },
}));
