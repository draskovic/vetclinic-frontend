import type { InvoiceStatus } from '@/types';

export const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Nacrt', color: '#8c8c8c' },
  ISSUED: { label: 'Izdata', color: '#1890ff' },
  PAID: { label: 'Plaćena', color: '#52c41a' },
  PARTIALLY_PAID: { label: 'Delimično', color: '#fa8c16' },
  OVERDUE: { label: 'Dospela', color: '#ff4d4f' },
  CANCELLED: { label: 'Stornirana', color: '#8c8c8c' },
  REFUNDED: { label: 'Refundirana', color: '#722ed1' },
};
