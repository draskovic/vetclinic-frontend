import apiClient from './client';
import type {
  MedicalRecord,
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest,
  PageResponse,
} from '@/types';

export const medicalRecordsApi = {
  getAll: (
    page = 0,
    size = 10,
    search?: string,
    filters?: { dateFrom?: string; dateTo?: string; vetId?: string },
  ) =>
    apiClient.get<PageResponse<MedicalRecord>>('/medical-records', {
      params: {
        page,
        size,
        search: search || undefined,
        dateFrom: filters?.dateFrom || undefined,
        dateTo: filters?.dateTo || undefined,
        vetId: filters?.vetId || undefined,
      },
    }),

  getById: (id: string) => apiClient.get<MedicalRecord>(`/medical-records/${id}`),

  getByPet: (petId: string) => apiClient.get<MedicalRecord[]>(`/medical-records/by-pet/${petId}`),

  getByAppointment: (appointmentId: string) =>
    apiClient.get<MedicalRecord>(`/medical-records/by-appointment/${appointmentId}`),

  startFromAppointment: (appointmentId: string) =>
    apiClient.post<MedicalRecord>(`/medical-records/start-from-appointment/${appointmentId}`),

  create: (data: CreateMedicalRecordRequest) =>
    apiClient.post<MedicalRecord>('/medical-records', data),

  update: (id: string, data: UpdateMedicalRecordRequest) =>
    apiClient.put<MedicalRecord>(`/medical-records/${id}`, data),

  delete: (id: string) => apiClient.delete(`/medical-records/${id}`),

  downloadPdf: (id: string) =>
    apiClient.get<Blob>(`/medical-records/${id}/pdf`, {
      responseType: 'blob',
    }),

  getByOwner: (ownerId: string) =>
    apiClient.get<MedicalRecord[]>(`/medical-records/by-owner/${ownerId}`),
};
