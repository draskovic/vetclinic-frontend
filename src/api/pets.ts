import apiClient from './client';
import type { Pet, CreatePetRequest, UpdatePetRequest, PageResponse } from '@/types';

export const petsApi = {
  getAll: (page = 0, size = 10, search?: string) =>
    apiClient.get<PageResponse<Pet>>('/pets', { params: { page, size, search } }),

  getById: (id: string) => apiClient.get<Pet>(`/pets/${id}`),

  getByOwner: (ownerId: string) => apiClient.get<Pet[]>(`/pets/by-owner/${ownerId}`),

  create: (data: CreatePetRequest) => apiClient.post<Pet>('/pets', data),

  update: (id: string, data: UpdatePetRequest) => apiClient.put<Pet>(`/pets/${id}`, data),

  delete: (id: string) => apiClient.delete(`/pets/${id}`),

  setProfilePhoto: (petId: string, documentId: string) =>
    apiClient.put<Pet>(`/pets/${petId}/profile-photo`, { documentId }),
};
