import apiClient from './client';
import type {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  PageResponse,
} from '@/types';

export const appointmentsApi = {
  getAll: (page = 0, size = 10, sort = 'startTime,desc', search?: string, status?: string) =>
    apiClient.get<PageResponse<Appointment>>('/appointments', {
      params: { page, size, sort, search, status },
    }),

  getById: (id: string) => apiClient.get<Appointment>(`/appointments/${id}`),

  getByDateRange: (from: string, to: string) =>
    apiClient.get<Appointment[]>(
      `/appointments/date-range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),

  getByVet: (vetId: string, from: string, to: string) =>
    apiClient.get<Appointment[]>(
      `/appointments/by-vet/${vetId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),

  create: (data: CreateAppointmentRequest) => apiClient.post<Appointment>('/appointments', data),

  update: (id: string, data: UpdateAppointmentRequest) =>
    apiClient.put<Appointment>(`/appointments/${id}`, data),

  delete: (id: string) => apiClient.delete(`/appointments/${id}`),

  getByPet: (petId: string) => apiClient.get<Appointment[]>(`/appointments/by-pet/${petId}`),

  getByOwner: (ownerId: string) =>
    apiClient.get<Appointment[]>(`/appointments/by-owner/${ownerId}`),

  approve: (id: string) => apiClient.post(`/appointments/${id}/approve`),
  reject: (id: string) => apiClient.post(`/appointments/${id}/reject`),
  countPending: () => apiClient.get<number>('/appointments/count-pending'),
};
