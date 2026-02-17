import apiClient from './client';
import type {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoiceItem,
  CreateInvoiceItemRequest,
  UpdateInvoiceItemRequest,
  PageResponse,
} from '@/types';
import type { InvoiceStatus } from '@/types';

export const invoicesApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<Invoice>>(`/invoices?page=${page}&size=${size}`),

  getById: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`),

  getByOwner: (ownerId: string) => apiClient.get<Invoice[]>(`/invoices/by-owner/${ownerId}`),

  getByStatus: (status: InvoiceStatus) => apiClient.get<Invoice[]>(`/invoices/by-status/${status}`),

  create: (data: CreateInvoiceRequest) => apiClient.post<Invoice>('/invoices', data),

  update: (id: string, data: UpdateInvoiceRequest) =>
    apiClient.put<Invoice>(`/invoices/${id}`, data),

  delete: (id: string) => apiClient.delete(`/invoices/${id}`),
};

export const invoiceItemsApi = {
  getByInvoice: (invoiceId: string) =>
    apiClient.get<InvoiceItem[]>(`/invoice-items/by-invoice/${invoiceId}`),

  create: (data: CreateInvoiceItemRequest) => apiClient.post<InvoiceItem>('/invoice-items', data),

  update: (id: string, data: UpdateInvoiceItemRequest) =>
    apiClient.put<InvoiceItem>(`/invoice-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/invoice-items/${id}`),
};
