import apiClient from './client';
import type { QuickSaleRequest, QuickSaleResponse } from '@/types';

export const quickSaleApi = {
  create: (data: QuickSaleRequest) => apiClient.post<QuickSaleResponse>('/quick-sale', data),
};
