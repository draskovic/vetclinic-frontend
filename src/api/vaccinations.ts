import apiClient from './client';
import type {
  Vaccination,
  CreateVaccinationRequest,
  UpdateVaccinationRequest,
  PageResponse,
} from '@/types';

export const vaccinationsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<Vaccination>>(`/vaccinations?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Vaccination>(`/vaccinations/${id}`),

  getByPet: (petId: string) => apiClient.get<Vaccination[]>(`/vaccinations/by-pet/${petId}`),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<Vaccination[]>(`/vaccinations/by-medical-record/${medicalRecordId}`),

  getDue: (before: string) => apiClient.get<Vaccination[]>(`/vaccinations/due?before=${before}`),

  create: (data: CreateVaccinationRequest) => apiClient.post<Vaccination>('/vaccinations', data),

  update: (id: string, data: UpdateVaccinationRequest) =>
    apiClient.put<Vaccination>(`/vaccinations/${id}`, data),

  delete: (id: string) => apiClient.delete(`/vaccinations/${id}`),
};
