import apiClient from './client';
import type {
  DocumentRecord,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PageResponse,
} from '../types';

export const documentsApi = {
  getAll: (page = 0, size = 10, search?: string) =>
    apiClient.get<PageResponse<DocumentRecord>>('/documents', { params: { page, size, search } }),

  getById: (id: string) => apiClient.get<DocumentRecord>(`/documents/${id}`),

  getByPet: (petId: string) => apiClient.get<DocumentRecord[]>(`/documents/by-pet/${petId}`),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<DocumentRecord[]>(`/documents/by-medical-record/${medicalRecordId}`),

  create: (data: CreateDocumentRequest) => apiClient.post<DocumentRecord>('/documents', data),

  update: (id: string, data: UpdateDocumentRequest) =>
    apiClient.put<DocumentRecord>(`/documents/${id}`, data),

  delete: (id: string) => apiClient.delete(`/documents/${id}`),

  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<DocumentRecord>(`/documents/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadFile: (id: string) =>
    apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    }),

  deleteFile: (id: string) => apiClient.delete<DocumentRecord>(`/documents/${id}/file`),
};
