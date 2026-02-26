import apiClient from './client';
import type {
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  PageResponse,
} from '@/types';

export const appointmentsApi = {
  getAll: (page = 0, size = 10, sort = 'startTime,desc') =>
    apiClient.get<PageResponse<Appointment>>(
      `/appointments?page=${page}&size=${size}&sort=${sort}`,
    ),

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
};
