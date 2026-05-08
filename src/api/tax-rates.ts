import apiClient from './client';
import type { TaxRate } from '@/types';

export const taxRatesApi = {
  getAll: (country = 'RS') =>
    apiClient.get<TaxRate[]>('/tax-rates', { params: { country } }).then((res) => res.data),

  getById: (id: string) => apiClient.get<TaxRate>(`/tax-rates/${id}`).then((res) => res.data),
};
