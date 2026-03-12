import apiClient from './client';
import type { User, CreateUserRequest, UpdateUserRequest, PageResponse } from '@/types';

export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me'),

  getAll: (page = 0, size = 100) =>
    apiClient.get<PageResponse<User>>(`/users?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<User>(`/users/${id}`),

  create: (data: CreateUserRequest) => apiClient.post<User>('/users', data),

  update: (id: string, data: UpdateUserRequest) => apiClient.put<User>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete(`/users/${id}`),

  updateProfile: (data: {
    firstName: string;
    lastName: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
  }) => apiClient.put<User>('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/users/change-password', data),
};
