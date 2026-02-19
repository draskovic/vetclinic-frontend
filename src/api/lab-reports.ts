import apiClient from './client';
import type {
  LabReport,
  CreateLabReportRequest,
  UpdateLabReportRequest,
  PageResponse,
  LabReportStatus,
  PdfParseResult,
} from '@/types';

export const labReportsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<LabReport>>(
      `/lab-reports?page=${page}&size=${size}&sort=requestedAt,desc`,
    ),

  getById: (id: string) => apiClient.get<LabReport>(`/lab-reports/${id}`),

  getByPet: (petId: string) => apiClient.get<LabReport[]>(`/lab-reports/by-pet/${petId}`),

  getByStatus: (status: LabReportStatus) =>
    apiClient.get<LabReport[]>(`/lab-reports/by-status?status=${status}`),

  getByVet: (vetId: string) => apiClient.get<LabReport[]>(`/lab-reports/by-vet/${vetId}`),

  getByMedicalRecord: (medicalRecordId: string) =>
    apiClient.get<LabReport[]>(`/lab-reports/by-medical-record/${medicalRecordId}`),

  create: (data: CreateLabReportRequest) => apiClient.post<LabReport>('/lab-reports', data),

  update: (id: string, data: UpdateLabReportRequest) =>
    apiClient.put<LabReport>(`/lab-reports/${id}`, data),

  delete: (id: string) => apiClient.delete(`/lab-reports/${id}`),

  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<LabReport>(`/lab-reports/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadFile: (id: string) =>
    apiClient.get(`/lab-reports/${id}/download`, {
      responseType: 'blob',
    }),

  deleteFile: (id: string) => apiClient.delete<LabReport>(`/lab-reports/${id}/file`),

  parsePdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<PdfParseResult>('/lab-reports/parse-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
