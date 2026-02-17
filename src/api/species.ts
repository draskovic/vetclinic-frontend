import apiClient from './client';
import type { Species, CreateSpeciesRequest, UpdateSpeciesRequest, PageResponse } from '@/types';

export const speciesApi = {
  getAll: (page = 0, size = 100) =>
    apiClient.get<PageResponse<Species>>(`/species?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Species>(`/species/${id}`),

  create: (data: CreateSpeciesRequest) => apiClient.post<Species>('/species', data),

  update: (id: string, data: UpdateSpeciesRequest) =>
    apiClient.put<Species>(`/species/${id}`, data),

  delete: (id: string) => apiClient.delete(`/species/${id}`),
};
