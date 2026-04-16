import apiClient from './client';

export interface BookingSettings {
  id: string;
  clinicId: string;
  enabled: boolean;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxAdvanceDays: number;
  allowedTypes: string[];
  autoConfirm: boolean;
  allowVetSelection: boolean;
  cancellationHours: number;
  timezone: string;
}

export interface UpdateBookingSettingsRequest {
  enabled?: boolean;
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  maxAdvanceDays?: number;
  allowedTypes?: string[];
  autoConfirm?: boolean;
  allowVetSelection?: boolean;
  cancellationHours?: number;
  timezone?: string;
}

export const bookingSettingsApi = {
  get: () => apiClient.get<BookingSettings>('/booking-settings'),
  update: (data: UpdateBookingSettingsRequest) =>
    apiClient.put<BookingSettings>('/booking-settings', data),
};
