import { useState, useEffect } from 'react';
import { publicBookingApi } from '@/api/public-booking';
import type { BookingSlot, BookingClinicInfo } from '@/api/public-booking';
import { TYPE_LABELS } from './BookingPage';
import type { BookingState } from './BookingPage';

import { bookingStyles as s } from './bookingStyles';

interface Props {
  clinicId: string;
  clinicInfo: BookingClinicInfo;
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
}

export default function BookingStepDateTime({ clinicId, clinicInfo, state, updateState }: Props) {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Min datum = sutra, max = danas + maxAdvanceDays
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + clinicInfo.maxAdvanceDays);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Fetch slotova kad se promeni datum
  useEffect(() => {
    if (!state.date || !state.locationId || !state.type) return;

    setLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    updateState({ slot: null });

    publicBookingApi
      .getAvailableSlots(clinicId, {
        locationId: state.locationId,
        date: state.date,
        type: state.type,
        vetId: state.preferredVetId || undefined,
      })
      .then((res) => {
        setSlots(res.data);
        setLoadingSlots(false);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Greška pri učitavanju slobodnih termina.';
        setSlotsError(msg);
        setLoadingSlots(false);
      });
  }, [state.date, state.locationId, state.type, state.preferredVetId, clinicId]);

  // Grupisanje slotova: prepodne / popodne / veče
  const groupSlots = (slots: BookingSlot[]) => {
    const morning: BookingSlot[] = [];
    const afternoon: BookingSlot[] = [];
    const evening: BookingSlot[] = [];

    slots.forEach((slot) => {
      const hour = parseInt(slot.startTime.substring(11, 13), 10);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  };

  const formatTime = (isoString: string) => {
    return isoString.substring(11, 16); // HH:mm
  };

  const isSlotSelected = (slot: BookingSlot) => {
    return state.slot?.startTime === slot.startTime && state.slot?.vetId === slot.vetId;
  };

  const handleSelectSlot = (slot: BookingSlot) => {
    updateState({
      slot: {
        startTime: slot.startTime,
        endTime: slot.endTime,
        vetId: slot.vetId,
        vetName: slot.vetName,
      },
    });
  };

  const canProceed = state.date !== null && state.slot !== null;

  const { morning, afternoon, evening } = groupSlots(slots);

  const renderSlotGroup = (label: string, groupSlots: BookingSlot[]) => {
    if (groupSlots.length === 0) return null;
    return (
      <div>
        <p style={s.groupLabel}>{label}</p>
        <div style={s.slotGrid}>
          {groupSlots.map((slot, idx) => (
            <div
              key={idx}
              style={s.slotButton(isSlotSelected(slot))}
              onClick={() => handleSelectSlot(slot)}
            >
              {formatTime(slot.startTime)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <p style={s.sectionTitle}>Izaberite datum</p>

      {/* Info box sa izabranim tipom */}
      <div style={s.infoBox}>
        {TYPE_LABELS[state.type || ''] || state.type}
        {state.preferredVetId && clinicInfo.vets && (
          <span> — {clinicInfo.vets.find((v) => v.id === state.preferredVetId)?.name}</span>
        )}
      </div>

      {/* Datum input */}
      <input
        type='date'
        style={s.input}
        value={state.date || ''}
        min={minDate}
        max={maxDateStr}
        onChange={(e) => updateState({ date: e.target.value, slot: null })}
      />

      {/* Slotovi */}
      {state.date && (
        <div style={{ marginTop: '20px' }}>
          {loadingSlots && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={s.spinner} />
              <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
                Učitavanje slobodnih termina...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {slotsError && <p style={s.errorText}>{slotsError}</p>}

          {!loadingSlots && !slotsError && slots.length === 0 && (
            <div style={s.noSlots}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <p>Nema slobodnih termina za izabrani datum.</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Pokušajte drugi datum.</p>
            </div>
          )}

          {!loadingSlots && !slotsError && slots.length > 0 && (
            <>
              {renderSlotGroup('Prepodne', morning)}
              {renderSlotGroup('Popodne', afternoon)}
              {renderSlotGroup('Veče', evening)}
            </>
          )}
        </div>
      )}

      {/* Dugmad */}
      <div style={s.buttonRow}>
        <button style={{ ...s.secondaryButton, flex: 1 }} onClick={() => updateState({ step: 1 })}>
          Nazad
        </button>
        <button
          style={{ ...(canProceed ? s.primaryButton : s.disabledButton), flex: 2 }}
          disabled={!canProceed}
          onClick={() => updateState({ step: 3 })}
        >
          Dalje
        </button>
      </div>
    </div>
  );
}
