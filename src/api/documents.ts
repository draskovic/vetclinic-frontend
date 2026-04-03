import apiClient from './client';
import type {
  DocumentRecord,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PageResponse,
} from '../types';
import axios from 'axios';

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

  generateUploadToken: (petId: string) =>
    apiClient.post<{ token: string }>('/documents/upload-token', null, {
      params: { petId },
    }),

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

  uploadWithFile: (petId: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('petId', petId);
    if (description) formData.append('description', description);
    return apiClient.post<DocumentRecord>('/documents/upload-with-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Public API - BEZ autentifikacije, koristi token iz URL-a
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const publicDocumentsApi = {
  getTokenInfo: (token: string) =>
    axios.get<{ petName: string; expiresAt: string; valid: boolean }>(
      `${API_BASE}/public/documents/token-info`,
      { params: { token } },
    ),

  upload: (token: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    return axios.post<{ success: boolean; documentId: string; fileName: string }>(
      `${API_BASE}/public/documents/upload`,
      formData,
      {
        params: { token },
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
  },
};
