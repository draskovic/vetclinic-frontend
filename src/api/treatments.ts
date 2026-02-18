import apiClient from './client';
import type { Treatment, CreateTreatmentRequest, UpdateTreatmentRequest } from '@/types';

export const treatmentsApi = {
  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<Treatment[]>(`/treatments/by-medical-record/${medicalRecordId}`),

  create: (data: CreateTreatmentRequest) => apiClient.post<Treatment>('/treatments', data),

  update: (id: string, data: UpdateTreatmentRequest) =>
    apiClient.put<Treatment>(`/treatments/${id}`, data),

  delete: (id: string) => apiClient.delete(`/treatments/${id}`),
};
