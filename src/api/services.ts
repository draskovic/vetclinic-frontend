import apiClient from './client';
import type {
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  PageResponse,
  ServiceCategory,
} from '@/types';

export const servicesApi = {
  getAll: (page = 0, size = 20, search?: string, category?: string) =>
    apiClient
      .get<PageResponse<Service>>(`/services`, { params: { page, size, search, category } })
      .then((res) => res.data),

  getById: (id: string) => apiClient.get<Service>(`/services/${id}`).then((res) => res.data),

  create: (data: CreateServiceRequest) =>
    apiClient.post<Service>('/services', data).then((res) => res.data),

  update: (id: string, data: UpdateServiceRequest) =>
    apiClient.put<Service>(`/services/${id}`, data).then((res) => res.data),

  delete: (id: string) => apiClient.delete(`/services/${id}`),

  getByCategory: (category: ServiceCategory) =>
    apiClient.get<Service[]>(`/services/by-category/${category}`).then((res) => res.data),

  importServices: (
    data: { sku: string; name: string; price: number; unit?: string; category?: string }[],
  ) =>
    apiClient
      .post<{
        totalProcessed: number;
        created: number;
        skipped: number;
        errors: { clientCode: string; ownerName: string; message: string }[];
      }>('/services/import', data)
      .then((res) => res.data),
};
