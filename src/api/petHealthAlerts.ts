import apiClient from './client';
import type {
  PetHealthAlert,
  CreatePetHealthAlertRequest,
  UpdatePetHealthAlertRequest,
} from '@/types';

export const petHealthAlertsApi = {
  // activeOnly=true (default) → samo aktivni alert-i (za banner)
  // activeOnly=false → svi uključujući deaktivirane (za editor modal)
  getByPet: (petId: string, activeOnly = true) =>
    apiClient.get<PetHealthAlert[]>(`/pet-health-alerts/by-pet/${petId}`, {
      params: { activeOnly },
    }),

  getById: (id: string) => apiClient.get<PetHealthAlert>(`/pet-health-alerts/${id}`),

  create: (data: CreatePetHealthAlertRequest) =>
    apiClient.post<PetHealthAlert>('/pet-health-alerts', data),

  update: (id: string, data: UpdatePetHealthAlertRequest) =>
    apiClient.put<PetHealthAlert>(`/pet-health-alerts/${id}`, data),

  delete: (id: string) => apiClient.delete(`/pet-health-alerts/${id}`),
};
