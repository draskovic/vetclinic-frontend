import apiClient from './client';
import type { ClinicLocation } from '@/types';

export interface CreateClinicLocationRequest {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isMain?: boolean;
  active?: boolean;
  workingHours?: string;
}

export interface UpdateClinicLocationRequest {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  isMain?: boolean;
  active?: boolean;
  workingHours?: string;
}

export const clinicLocationsApi = {
  getAll: (page = 0, size = 100) =>
    apiClient.get<{ content: ClinicLocation[]; totalElements: number }>('/clinic-locations', {
      params: { page, size },
    }),
  getActive: () => apiClient.get<ClinicLocation[]>('/clinic-locations/active'),
  getById: (id: string) => apiClient.get<ClinicLocation>(`/clinic-locations/${id}`),
  create: (data: CreateClinicLocationRequest) =>
    apiClient.post<ClinicLocation>('/clinic-locations', data),
  update: (id: string, data: UpdateClinicLocationRequest) =>
    apiClient.put<ClinicLocation>(`/clinic-locations/${id}`, data),
  remove: (id: string) => apiClient.delete(`/clinic-locations/${id}`),
};
