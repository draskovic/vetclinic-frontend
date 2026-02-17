import apiClient from './client';
import type { ClinicLocation } from '@/types';

export const clinicLocationsApi = {
  getActive: () => apiClient.get<ClinicLocation[]>('/clinic-locations/active'),
};
