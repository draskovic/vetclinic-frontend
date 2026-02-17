import apiClient from './client';
import type { Owner, CreateOwnerRequest, UpdateOwnerRequest, PageResponse } from '@/types';

export const ownersApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<Owner>>(`/owners?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Owner>(`/owners/${id}`),

  create: (data: CreateOwnerRequest) => apiClient.post<Owner>('/owners', data),

  update: (id: string, data: UpdateOwnerRequest) => apiClient.put<Owner>(`/owners/${id}`, data),

  delete: (id: string) => apiClient.delete(`/owners/${id}`),

  searchByLastName: (lastName: string) =>
    apiClient.get<Owner[]>(`/owners/search/by-last-name?lastName=${lastName}`),

  searchByPhone: (phone: string) =>
    apiClient.get<Owner[]>(`/owners/search/by-phone?phone=${phone}`),
};
