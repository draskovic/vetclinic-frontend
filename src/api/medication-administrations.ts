import apiClient from './client';
import type {
  MedicationAdministration,
  CreateMedicationAdministrationRequest,
  UpdateMedicationAdministrationRequest,
} from '@/types';

export const medicationAdministrationsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<MedicationAdministration[]>(
      `/medication-administrations?page=${page}&size=${size}`,
    ),

  getById: (id: string) =>
    apiClient.get<MedicationAdministration>(`/medication-administrations/${id}`),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<MedicationAdministration[]>(
      `/medication-administrations/by-medical-record/${medicalRecordId}`,
    ),

  getByPet: (petId: string) =>
    apiClient.get<MedicationAdministration[]>(`/medication-administrations/by-pet/${petId}`),

  create: (data: CreateMedicationAdministrationRequest) =>
    apiClient.post<MedicationAdministration>('/medication-administrations', data),

  update: (id: string, data: UpdateMedicationAdministrationRequest) =>
    apiClient.put<MedicationAdministration>(`/medication-administrations/${id}`, data),

  delete: (id: string) => apiClient.delete(`/medication-administrations/${id}`),
};
