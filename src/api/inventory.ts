import apiClient from './client';
import type { PageResponse } from '../types';

import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryTransaction,
  CreateInventoryTransactionRequest,
  UpdateInventoryTransactionRequest,
  ServiceInventoryItem,
  CreateServiceInventoryItemRequest,
  UpdateServiceInventoryItemRequest,
} from '../types';

// ===================== Inventory Items =====================

export const inventoryItemsApi = {
  getAll: (page = 0, size = 20, search?: string, category?: string) =>
    apiClient.get<PageResponse<InventoryItem>>('/inventory-items', {
      params: { page, size, search, category },
    }),

  getById: (id: string) => apiClient.get<InventoryItem>(`/inventory-items/${id}`),

  create: (data: CreateInventoryItemRequest) =>
    apiClient.post<InventoryItem>('/inventory-items', data),

  update: (id: string, data: UpdateInventoryItemRequest) =>
    apiClient.put<InventoryItem>(`/inventory-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/inventory-items/${id}`),

  getByCategory: (category: string) =>
    apiClient.get<InventoryItem[]>(`/inventory-items/by-category/${category}`),

  getLowStock: () => apiClient.get<InventoryItem[]>('/inventory-items/low-stock'),

  getLowStockCount: () => apiClient.get<number>('/inventory-items/low-stock/count'),
};

// ===================== Inventory Transactions =====================

export const inventoryTransactionsApi = {
  getAll: (page = 0, size = 20, search?: string, type?: string, inventoryItemId?: string) =>
    apiClient.get<PageResponse<InventoryTransaction>>('/inventory-transactions', {
      params: { page, size, search, type, inventoryItemId },
    }),

  getById: (id: string) => apiClient.get<InventoryTransaction>(`/inventory-transactions/${id}`),

  create: (data: CreateInventoryTransactionRequest) =>
    apiClient.post<InventoryTransaction>('/inventory-transactions', data),

  update: (id: string, data: UpdateInventoryTransactionRequest) =>
    apiClient.put<InventoryTransaction>(`/inventory-transactions/${id}`, data),

  delete: (id: string) => apiClient.delete(`/inventory-transactions/${id}`),

  getByItem: (inventoryItemId: string) =>
    apiClient.get<InventoryTransaction[]>(`/inventory-transactions/by-item/${inventoryItemId}`),
};

// ===================== Service Inventory Items =====================

export const serviceInventoryItemsApi = {
  getByService: (serviceId: string) =>
    apiClient.get<ServiceInventoryItem[]>(`/service-inventory-items/by-service/${serviceId}`),

  getByInventoryItem: (inventoryItemId: string) =>
    apiClient.get<ServiceInventoryItem[]>(
      `/service-inventory-items/by-inventory-item/${inventoryItemId}`,
    ),

  create: (data: CreateServiceInventoryItemRequest) =>
    apiClient.post<ServiceInventoryItem>('/service-inventory-items', data),

  update: (id: string, data: UpdateServiceInventoryItemRequest) =>
    apiClient.put<ServiceInventoryItem>(`/service-inventory-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/service-inventory-items/${id}`),
};
// ===================== Inventory Batches =====================

import type {
  InventoryBatch,
  CreateInventoryBatchRequest,
  UpdateInventoryBatchRequest,
} from '../types';

export const inventoryBatchesApi = {
  getByItem: (itemId: string) =>
    apiClient.get<InventoryBatch[]>(`/inventory-batches/by-item/${itemId}`),

  getById: (id: string) => apiClient.get<InventoryBatch>(`/inventory-batches/${id}`),

  getExpiring: (days = 30) =>
    apiClient.get<InventoryBatch[]>('/inventory-batches/expiring', { params: { days } }),

  getExpiringCount: (days = 30) =>
    apiClient.get<number>('/inventory-batches/expiring/count', { params: { days } }),

  create: (data: CreateInventoryBatchRequest) =>
    apiClient.post<InventoryBatch>('/inventory-batches', data),

  update: (id: string, data: UpdateInventoryBatchRequest) =>
    apiClient.put<InventoryBatch>(`/inventory-batches/${id}`, data),

  delete: (id: string) => apiClient.delete(`/inventory-batches/${id}`),
};
