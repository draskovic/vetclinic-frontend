import apiClient from './client';
import type { BillableItem } from '@/types';

export const billableItemsApi = {
  search: (q: string, limit = 25) =>
    apiClient
      .get<BillableItem[]>('/billable-items/search', { params: { q, limit } })
      .then((res) => res.data),
};
