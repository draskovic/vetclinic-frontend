import apiClient from './client';
import type { PageResponse } from '../types';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types';

export const productsApi = {
  getAll: (page = 0, size = 20, search?: string, category?: string) =>
    apiClient.get<PageResponse<Product>>('/products', {
      params: { page, size, search, category },
    }),

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),

  create: (data: CreateProductRequest) => apiClient.post<Product>('/products', data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: string) => apiClient.delete(`/products/${id}`),
};
