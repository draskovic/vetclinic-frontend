import apiClient from './client';
import type { Prescription, CreatePrescriptionRequest, UpdatePrescriptionRequest } from '@/types';

export const prescriptionsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<Prescription[]>(`/prescriptions?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Prescription>(`/prescriptions/${id}`),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<Prescription[]>(`/prescriptions/by-medical-record/${medicalRecordId}`),

  getByPet: (petId: string) => apiClient.get<Prescription[]>(`/prescriptions/by-pet/${petId}`),

  create: (data: CreatePrescriptionRequest) => apiClient.post<Prescription>('/prescriptions', data),

  update: (id: string, data: UpdatePrescriptionRequest) =>
    apiClient.put<Prescription>(`/prescriptions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/prescriptions/${id}`),
};
