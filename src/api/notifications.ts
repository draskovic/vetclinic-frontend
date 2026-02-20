import apiClient from './client';

export interface Notification {
  id: string;
  recipientType: string;
  recipientId: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCount {
  count: number;
}

export const getMyNotifications = (page = 0, size = 50) =>
  apiClient.get('/notifications/my', { params: { page, size, sort: 'createdAt,desc' } });

export const getUnreadCount = () => apiClient.get<UnreadCount>('/notifications/my/unread-count');

export const markAsRead = (id: string) => apiClient.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => apiClient.patch('/notifications/my/read-all');
