import apiClient from './client';
import type { Breed, CreateBreedRequest, UpdateBreedRequest, PageResponse } from '@/types';

export const breedsApi = {
  getAll: (page = 0, size = 100) =>
    apiClient.get<PageResponse<Breed>>(`/breeds?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Breed>(`/breeds/${id}`),

  getBySpecies: (speciesId: string) => apiClient.get<Breed[]>(`/breeds/by-species/${speciesId}`),

  create: (data: CreateBreedRequest) => apiClient.post<Breed>('/breeds', data),

  update: (id: string, data: UpdateBreedRequest) => apiClient.put<Breed>(`/breeds/${id}`, data),

  delete: (id: string) => apiClient.delete(`/breeds/${id}`),
};
