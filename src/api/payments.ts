import client from './client';
import type { Payment, CreatePaymentRequest, UpdatePaymentRequest } from '../types';

const BASE = '/payments';

export const getByInvoice = (invoiceId: string) =>
  client.get<Payment[]>(`${BASE}/by-invoice/${invoiceId}`).then((res) => res.data);

export const create = (data: CreatePaymentRequest) =>
  client.post<Payment>(BASE, data).then((res) => res.data);

export const update = (id: string, data: UpdatePaymentRequest) =>
  client.put<Payment>(`${BASE}/${id}`, data).then((res) => res.data);

export const remove = (id: string) => client.delete(`${BASE}/${id}`);
