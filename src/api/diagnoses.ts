import apiClient from './client';
import type {
  Diagnosis,
  CreateDiagnosisRequest,
  UpdateDiagnosisRequest,
  PageResponse,
} from '@/types';

export const diagnosesApi = {
  getAll: (page = 0, size = 20, search?: string) =>
    apiClient
      .get<PageResponse<Diagnosis>>('/diagnoses', { params: { page, size, search } })
      .then((res) => res.data),

  autocomplete: (page = 0, size = 20, search?: string) =>
    apiClient
      .get<PageResponse<Diagnosis>>('/diagnoses/autocomplete', { params: { page, size, search } })
      .then((res) => res.data),

  getById: (id: string) => apiClient.get<Diagnosis>(`/diagnoses/${id}`).then((res) => res.data),

  create: (data: CreateDiagnosisRequest) =>
    apiClient.post<Diagnosis>('/diagnoses', data).then((res) => res.data),

  update: (id: string, data: UpdateDiagnosisRequest) =>
    apiClient.put<Diagnosis>(`/diagnoses/${id}`, data).then((res) => res.data),

  remove: (id: string) => apiClient.delete(`/diagnoses/${id}`),
};
