import apiClient from './client';
import type {
  MedicalRecord,
  CreateMedicalRecordRequest,
  UpdateMedicalRecordRequest,
  PageResponse,
} from '@/types';

export const medicalRecordsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<MedicalRecord>>(`/medical-records?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<MedicalRecord>(`/medical-records/${id}`),

  getByPet: (petId: string) => apiClient.get<MedicalRecord[]>(`/medical-records/by-pet/${petId}`),

  getByAppointment: (appointmentId: string) =>
    apiClient.get<MedicalRecord>(`/medical-records/by-appointment/${appointmentId}`),

  create: (data: CreateMedicalRecordRequest) =>
    apiClient.post<MedicalRecord>('/medical-records', data),

  update: (id: string, data: UpdateMedicalRecordRequest) =>
    apiClient.put<MedicalRecord>(`/medical-records/${id}`, data),

  delete: (id: string) => apiClient.delete(`/medical-records/${id}`),
};
