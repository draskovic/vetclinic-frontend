import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface BookingClinicInfo {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicCity: string;
  logoUrl: string | null;
  locations: Array<{ id: string; name: string; address: string }>;
  allowedTypes: string[];
  slotDurationMinutes: number;
  maxAdvanceDays: number;
  allowVetSelection: boolean;
  vets: Array<{ id: string; name: string; specialization: string | null }> | null;
}

export interface BookingSlot {
  startTime: string;
  endTime: string;
  vetId: string;
  vetName: string;
}

export interface BookingOwnerLookup {
  found: boolean;
  ownerId: string | null;
  ownerName: string | null;
  pets: Array<{ id: string; name: string; speciesName: string | null }> | null;
}

export interface BookingCreateRequest {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  petId?: string;
  petName?: string;
  speciesName?: string;
  locationId: string;
  type: string;
  startTime: string;
  preferredVetId?: string;
  reason?: string;
  honeypot?: string;
}

export interface BookingCreateResponse {
  appointmentId: string;
  status: string;
  message: string;
  cancellationToken: string;
}

export const publicBookingApi = {
  getClinicInfo: (clinicId: string) =>
    axios.get<BookingClinicInfo>(`${API_BASE}/public/booking/${clinicId}/info`),

  getAvailableSlots: (
    clinicId: string,
    params: {
      locationId: string;
      date: string;
      type: string;
      vetId?: string;
    },
  ) => axios.get<BookingSlot[]>(`${API_BASE}/public/booking/${clinicId}/slots`, { params }),

  lookupOwner: (clinicId: string, phone: string) =>
    axios.get<BookingOwnerLookup>(`${API_BASE}/public/booking/${clinicId}/owner-lookup`, {
      params: { phone },
    }),

  createBooking: (clinicId: string, data: BookingCreateRequest) =>
    axios.post<BookingCreateResponse>(`${API_BASE}/public/booking/${clinicId}/book`, data),

  cancelBooking: (token: string) =>
    axios.post<{ success: boolean; message: string }>(`${API_BASE}/public/booking/cancel`, null, {
      params: { token },
    }),
};
