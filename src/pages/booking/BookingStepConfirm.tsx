import type { BookingClinicInfo } from '@/api/public-booking';
import { TYPE_LABELS } from './BookingPage';
import type { BookingState } from './BookingPage';
import { bookingStyles as s } from './bookingStyles';

interface Props {
  state: BookingState;
  clinicInfo: BookingClinicInfo;
  onReset: () => void;
}

export default function BookingStepConfirm({ state, clinicInfo, onReset }: Props) {
  const isPending = state.result?.status === 'PENDING';

  const formatSlotTime = () => {
    if (!state.slot || !state.date) return '';
    const date = new Date(state.date);
    const dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
    const months = [
      'januar',
      'februar',
      'mart',
      'april',
      'maj',
      'jun',
      'jul',
      'avgust',
      'septembar',
      'oktobar',
      'novembar',
      'decembar',
    ];
    const day = dayNames[date.getDay()];
    const dateStr = `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
    const time = state.slot.startTime.substring(11, 16);
    return `${day}, ${dateStr}. u ${time}h`;
  };

  const locationName = clinicInfo.locations.find((l) => l.id === state.locationId)?.name || '';

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Ikonica uspeha */}
      <div style={s.successIcon}>
        <span>{isPending ? '⏳' : '✅'}</span>
      </div>

      <h2 style={{ ...s.clinicName, fontSize: '20px', marginBottom: '8px' }}>
        {isPending ? 'Termin je primljen!' : 'Termin je zakazan!'}
      </h2>

      <p style={{ ...s.subtitle, marginBottom: '24px' }}>
        {isPending
          ? 'Klinika će potvrditi vaš termin u najkraćem roku.'
          : 'Vaš termin je uspešno potvrđen.'}
      </p>

      {/* Rezime */}
      <div style={{ textAlign: 'left', marginBottom: '24px' }}>
        <div style={s.summaryRow}>
          <span style={s.summaryLabel}>Tip termina</span>
          <span style={s.summaryValue}>{TYPE_LABELS[state.type || ''] || state.type}</span>
        </div>
        <div style={s.summaryRow}>
          <span style={s.summaryLabel}>Datum i vreme</span>
          <span style={s.summaryValue}>{formatSlotTime()}</span>
        </div>
        {state.slot?.vetName && (
          <div style={s.summaryRow}>
            <span style={s.summaryLabel}>Veterinar</span>
            <span style={s.summaryValue}>{state.slot.vetName}</span>
          </div>
        )}
        {locationName && (
          <div style={s.summaryRow}>
            <span style={s.summaryLabel}>Lokacija</span>
            <span style={s.summaryValue}>{locationName}</span>
          </div>
        )}
        {(state.ownerName || `${state.firstName} ${state.lastName}`.trim()) && (
          <div style={s.summaryRow}>
            <span style={s.summaryLabel}>Vlasnik</span>
            <span style={s.summaryValue}>
              {state.ownerName || `${state.firstName} ${state.lastName}`.trim()}
            </span>
          </div>
        )}
      </div>

      {/* Info poruka */}
      {isPending && (
        <div style={s.infoBox}>
          Dobićete obaveštenje putem SMS-a ili emaila kada klinika potvrdi vaš termin.
        </div>
      )}

      {/* Kontakt */}
      <div
        style={{ ...s.infoBox, background: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{clinicInfo.clinicName}</div>
        {clinicInfo.clinicPhone && <div>📞 {clinicInfo.clinicPhone}</div>}
        {clinicInfo.clinicAddress && <div>📍 {clinicInfo.clinicAddress}</div>}
      </div>

      {/* Dugme za novi termin */}
      <button style={{ ...s.primaryButton, marginTop: '16px' }} onClick={onReset}>
        Zakaži novi termin
      </button>
    </div>
  );
}
