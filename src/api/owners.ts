import apiClient from './client';
import type {
  Owner,
  CreateOwnerRequest,
  UpdateOwnerRequest,
  PageResponse,
  ImportOwnerRequest,
  ImportResultResponse,
} from '@/types';

export const ownersApi = {
  getAll: (page = 0, size = 10, search?: string) =>
    apiClient.get<PageResponse<Owner>>('/owners', { params: { page, size, search } }),

  getById: (id: string) => apiClient.get<Owner>(`/owners/${id}`),

  create: (data: CreateOwnerRequest) => apiClient.post<Owner>('/owners', data),

  update: (id: string, data: UpdateOwnerRequest) => apiClient.put<Owner>(`/owners/${id}`, data),

  delete: (id: string) => apiClient.delete(`/owners/${id}`),

  searchByLastName: (lastName: string) =>
    apiClient.get<Owner[]>(`/owners/search/by-last-name?lastName=${lastName}`),

  searchByPhone: (phone: string) =>
    apiClient.get<Owner[]>(`/owners/search/by-phone?phone=${phone}`),
  importOwners: (data: ImportOwnerRequest[]) =>
    apiClient.post<ImportResultResponse>('/owners/import', data),
};
