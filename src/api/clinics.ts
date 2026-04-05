import apiClient from './client';
import type {
  Clinic,
  CreateClinicRequest,
  UpdateClinicRequest,
  PageResponse,
  ProvisionClinicRequest,
  ProvisionClinicResponse,
} from '@/types';

export const clinicsApi = {
  lookup: (email: string) => apiClient.get<Clinic>(`/clinics/lookup?email=${email}`),

  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<Clinic>>(`/clinics?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Clinic>(`/clinics/${id}`),

  create: (data: CreateClinicRequest) => apiClient.post<Clinic>('/clinics', data),

  update: (id: string, data: UpdateClinicRequest) => apiClient.put<Clinic>(`/clinics/${id}`, data),

  delete: (id: string) => apiClient.delete(`/clinics/${id}`),

  provision: (data: ProvisionClinicRequest) =>
    apiClient.post<ProvisionClinicResponse>('/clinics/provision', data).then((res) => res.data),

  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<Clinic>(`/clinics/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteLogo: (id: string) => apiClient.delete<Clinic>(`/clinics/${id}/logo`),

  getLogoUrl: (id: string) => `/clinics/${id}/logo`,
};
