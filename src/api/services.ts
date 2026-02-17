import apiClient from './client';
import type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  PageResponse,
  ServiceCategory,
} from '@/types';

export const servicesApi = {
  getAll: (page = 0, size = 20) =>
    apiClient
      .get<PageResponse<Service>>(`/services?page=${page}&size=${size}`)
      .then((res) => res.data),

  getById: (id: string) => apiClient.get<Service>(`/services/${id}`).then((res) => res.data),

  create: (data: CreateServiceRequest) =>
    apiClient.post<Service>('/services', data).then((res) => res.data),

  update: (id: string, data: UpdateServiceRequest) =>
    apiClient.put<Service>(`/services/${id}`, data).then((res) => res.data),

  delete: (id: string) => apiClient.delete(`/services/${id}`),

  getByCategory: (category: ServiceCategory) =>
    apiClient.get<Service[]>(`/services/by-category/${category}`).then((res) => res.data),
};
