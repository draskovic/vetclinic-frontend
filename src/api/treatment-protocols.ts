import apiClient from './client';
import type {
  TreatmentProtocol,
  CreateTreatmentProtocolRequest,
  UpdateTreatmentProtocolRequest,
  TreatmentProtocolItem,
  CreateTreatmentProtocolItemRequest,
  UpdateTreatmentProtocolItemRequest,
  ApplyProtocolRequest,
  Treatment,
  PageResponse,
} from '@/types';

export const treatmentProtocolsApi = {
  getAll: (page = 0, size = 20, search?: string) =>
    apiClient
      .get<PageResponse<TreatmentProtocol>>('/treatment-protocols', {
        params: { page, size, search },
      })
      .then((res) => res.data),

  getById: (id: string) =>
    apiClient.get<TreatmentProtocol>(`/treatment-protocols/${id}`).then((res) => res.data),

  create: (data: CreateTreatmentProtocolRequest) =>
    apiClient.post<TreatmentProtocol>('/treatment-protocols', data).then((res) => res.data),

  update: (id: string, data: UpdateTreatmentProtocolRequest) =>
    apiClient.put<TreatmentProtocol>(`/treatment-protocols/${id}`, data).then((res) => res.data),

  remove: (id: string) => apiClient.delete(`/treatment-protocols/${id}`),

  getByDiagnosis: (diagnosisId: string) =>
    apiClient
      .get<TreatmentProtocol[]>(`/treatment-protocols/by-diagnosis/${diagnosisId}`)
      .then((res) => res.data),

  apply: (data: ApplyProtocolRequest) =>
    apiClient.post<Treatment[]>('/treatment-protocols/apply', data).then((res) => res.data),
};

export const treatmentProtocolItemsApi = {
  getByProtocol: (protocolId: string) =>
    apiClient
      .get<TreatmentProtocolItem[]>(`/treatment-protocol-items/by-protocol/${protocolId}`)
      .then((res) => res.data),

  create: (data: CreateTreatmentProtocolItemRequest) =>
    apiClient
      .post<TreatmentProtocolItem>('/treatment-protocol-items', data)
      .then((res) => res.data),

  update: (id: string, data: UpdateTreatmentProtocolItemRequest) =>
    apiClient
      .put<TreatmentProtocolItem>(`/treatment-protocol-items/${id}`, data)
      .then((res) => res.data),

  remove: (id: string) => apiClient.delete(`/treatment-protocol-items/${id}`),
};
