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
};
