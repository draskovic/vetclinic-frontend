import apiClient from './client';
import type { PageResponse } from '../types';

import type {
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from '../types';
import type {
  InventoryTransaction,
  CreateInventoryTransactionRequest,
  UpdateInventoryTransactionRequest,
} from '../types';

// ===================== Inventory Items =====================

export const inventoryItemsApi = {
  getAll: (page = 0, size = 20) =>
    apiClient.get<PageResponse<InventoryItem>>('/inventory-items', { params: { page, size } }),

  getById: (id: string) => apiClient.get<InventoryItem>(`/inventory-items/${id}`),

  create: (data: CreateInventoryItemRequest) =>
    apiClient.post<InventoryItem>('/inventory-items', data),

  update: (id: string, data: UpdateInventoryItemRequest) =>
    apiClient.put<InventoryItem>(`/inventory-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/inventory-items/${id}`),

  getByCategory: (category: string) =>
    apiClient.get<InventoryItem[]>(`/inventory-items/by-category/${category}`),
};

// ===================== Inventory Transactions =====================

export const inventoryTransactionsApi = {
  getAll: (page = 0, size = 20) =>
    apiClient.get<PageResponse<InventoryTransaction>>('/inventory-transactions', {
      params: { page, size },
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
