import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicBookingApi } from '@/api/public-booking';
import type { BookingClinicInfo } from '@/api/public-booking';
import { bookingStyles as s } from './bookingStyles';
import BookingStepService from './BookingStepService';
import BookingStepDateTime from './BookingStepDateTime';
import BookingStepOwner from './BookingStepOwner';
import BookingStepConfirm from './BookingStepConfirm';

export interface BookingState {
  step: 1 | 2 | 3 | 4;
  type: string | null;
  locationId: string | null;
  preferredVetId: string | null;
  date: string | null;
  slot: { startTime: string; endTime: string; vetId: string; vetName: string } | null;
  phone: string;
  ownerFound: boolean;
  ownerId: string | null;
  ownerName: string | null;
  pets: Array<{ id: string; name: string; speciesName: string | null }>;
  selectedPetId: string | null;
  newPetName: string;
  newSpeciesName: string;
  firstName: string;
  lastName: string;
  email: string;
  reason: string;
  honeypot: string;
  // Rezultat posle zakazivanja
  result: {
    appointmentId: string;
    status: string;
    message: string;
    cancellationToken: string;
  } | null;
}

const initialState: BookingState = {
  step: 1,
  type: null,
  locationId: null,
  preferredVetId: null,
  date: null,
  slot: null,
  phone: '',
  ownerFound: false,
  ownerId: null,
  ownerName: null,
  pets: [],
  selectedPetId: null,
  newPetName: '',
  newSpeciesName: '',
  firstName: '',
  lastName: '',
  email: '',
  reason: '',
  honeypot: '',
  result: null,
};

const TYPE_LABELS: Record<string, string> = {
  CHECKUP: 'Pregled',
  VACCINATION: 'Vakcinacija',
  SURGERY: 'Operacija',
  EMERGENCY: 'Hitno',
  FOLLOW_UP: 'Kontrola',
  GROOMING: 'Šišanje',
  DENTAL: 'Stomatologija',
  OTHER: 'Ostalo',
};

export { TYPE_LABELS };

export default function BookingPage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [state, setState] = useState<BookingState>(initialState);
  const [clinicInfo, setClinicInfo] = useState<BookingClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    publicBookingApi
      .getClinicInfo(clinicId)
      .then((res) => {
        setClinicInfo(res.data);

        // Ako ima samo jedna lokacija, auto-selektuj
        if (res.data.locations.length === 1) {
          setState((prev) => ({ ...prev, locationId: res.data.locations[0].id }));
        }
        setLoading(false);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message || 'Online zakazivanje nije dostupno za ovu kliniku.';
        setError(msg);
        setLoading(false);
      });
  }, [clinicId]);

  const updateState = (updates: Partial<BookingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetBooking = () => {
    setState(initialState);
    // Ako ima samo jedna lokacija, ponovo auto-selektuj
    if (clinicInfo && clinicInfo.locations.length === 1) {
      setState((prev) => ({ ...prev, locationId: clinicInfo.locations[0].id }));
    }
  };

  if (loading) {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={s.spinner} />
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Učitavanje...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !clinicInfo || !clinicId) {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
          <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>
            {error || 'Klinika nije pronađena.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {clinicInfo.logoUrl && <img src={clinicInfo.logoUrl} alt='Logo' style={s.logo} />}
          <h1 style={s.clinicName}>{clinicInfo.clinicName}</h1>
          <p style={s.subtitle}>Online zakazivanje termina</p>
        </div>

        {/* Step indicator */}
        {state.step < 4 && (
          <div style={s.stepIndicator}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={s.stepDot(state.step === i, state.step > i)} />
            ))}
          </div>
        )}

        {/* Steps */}
        {state.step === 1 && (
          <BookingStepService clinicInfo={clinicInfo} state={state} updateState={updateState} />
        )}
        {state.step === 2 && (
          <BookingStepDateTime
            clinicInfo={clinicInfo}
            clinicId={clinicId}
            state={state}
            updateState={updateState}
          />
        )}
        {state.step === 3 && (
          <BookingStepOwner clinicId={clinicId} state={state} updateState={updateState} />
        )}
        {state.step === 4 && (
          <BookingStepConfirm state={state} clinicInfo={clinicInfo} onReset={resetBooking} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
