import apiClient from './client';
import type { Role, CreateRoleRequest, UpdateRoleRequest, PageResponse } from '@/types';

export const rolesApi = {
  getAll: (page = 0, size = 100) =>
    apiClient.get<PageResponse<Role>>(`/roles?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Role>(`/roles/${id}`),

  create: (data: CreateRoleRequest) => apiClient.post<Role>('/roles', data),

  update: (id: string, data: UpdateRoleRequest) => apiClient.put<Role>(`/roles/${id}`, data),

  delete: (id: string) => apiClient.delete(`/roles/${id}`),
};
