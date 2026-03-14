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
  getAll: (page = 0, size = 10, search?: string) =>
    apiClient.get<PageResponse<Invoice>>('/invoices', { params: { page, size, search } }),

  getById: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`),

  getByOwner: (ownerId: string) => apiClient.get<Invoice[]>(`/invoices/by-owner/${ownerId}`),

  getByStatus: (status: InvoiceStatus) => apiClient.get<Invoice[]>(`/invoices/by-status/${status}`),

  create: (data: CreateInvoiceRequest) => apiClient.post<Invoice>('/invoices', data),

  update: (id: string, data: UpdateInvoiceRequest) =>
    apiClient.put<Invoice>(`/invoices/${id}`, data),

  delete: (id: string) => apiClient.delete(`/invoices/${id}`),

  downloadPdf: (id: string) =>
    apiClient.get<Blob>(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    }),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<Invoice>(`/invoices/by-medical-record/${medicalRecordId}`),
};

export const invoiceItemsApi = {
  getByInvoice: (invoiceId: string) =>
    apiClient.get<InvoiceItem[]>(`/invoice-items/by-invoice/${invoiceId}`),

  create: (data: CreateInvoiceItemRequest) => apiClient.post<InvoiceItem>('/invoice-items', data),

  update: (id: string, data: UpdateInvoiceItemRequest) =>
    apiClient.put<InvoiceItem>(`/invoice-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/invoice-items/${id}`),
};
