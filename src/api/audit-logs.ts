import apiClient from './client';
import type { AuditLog, AuditAction, PageResponse } from '@/types';

export const auditLogsApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<PageResponse<AuditLog>>('/audit-logs', {
      params: { page, size },
    }),

  getById: (id: string) => apiClient.get<AuditLog>(`/audit-logs/${id}`),

  getByAction: (action: AuditAction, page = 0, size = 10) =>
    apiClient.get<PageResponse<AuditLog>>(`/audit-logs/by-action/${action}`, {
      params: { page, size },
    }),

  getByUser: (userId: string, page = 0, size = 10) =>
    apiClient.get<PageResponse<AuditLog>>(`/audit-logs/by-user/${userId}`, {
      params: { page, size },
    }),

  getByEntity: (entityType: string, entityId: string, page = 0, size = 10) =>
    apiClient.get<PageResponse<AuditLog>>(`/audit-logs/by-entity/${entityType}/${entityId}`, {
      params: { page, size },
    }),

  getByDateRange: (from: string, to: string, page = 0, size = 10) =>
    apiClient.get<PageResponse<AuditLog>>('/audit-logs/by-date-range', {
      params: { page, size, from, to },
    }),
};
