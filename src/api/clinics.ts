import apiClient from './client';
import type { Clinic, CreateClinicRequest, UpdateClinicRequest, PageResponse } from '@/types';

export const clinicsApi = {
  lookup: (email: string) => apiClient.get<Clinic>(`/clinics/lookup?email=${email}`),

  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<Clinic>>(`/clinics?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Clinic>(`/clinics/${id}`),

  create: (data: CreateClinicRequest) => apiClient.post<Clinic>('/clinics', data),

  update: (id: string, data: UpdateClinicRequest) => apiClient.put<Clinic>(`/clinics/${id}`, data),

  delete: (id: string) => apiClient.delete(`/clinics/${id}`),
};
