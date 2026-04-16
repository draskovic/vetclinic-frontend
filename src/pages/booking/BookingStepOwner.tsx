import { useState } from 'react';
import { publicBookingApi } from '@/api/public-booking';
import { TYPE_LABELS } from './BookingPage';
import type { BookingState } from './BookingPage';
import { bookingStyles as s } from './bookingStyles';

interface Props {
  clinicId: string;
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
}

export default function BookingStepOwner({ clinicId, state, updateState }: Props) {
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleLookup = () => {
    if (!state.phone || state.phone.trim().length < 6) return;
    setLookupLoading(true);
    setLookupError(null);

    publicBookingApi
      .lookupOwner(clinicId, state.phone.trim())
      .then((res) => {
        const data = res.data;
        if (data.found) {
          updateState({
            ownerFound: true,
            ownerId: data.ownerId,
            ownerName: data.ownerName,
            pets: data.pets || [],
            selectedPetId: data.pets && data.pets.length === 1 ? data.pets[0].id : null,
          });
        } else {
          updateState({
            ownerFound: false,
            ownerId: null,
            ownerName: null,
            pets: [],
            selectedPetId: null,
          });
        }
        setLookupDone(true);
        setLookupLoading(false);
      })
      .catch((err) => {
        setLookupError(err?.response?.data?.message || 'Greška pri pretrazi.');
        setLookupLoading(false);
      });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setSubmitError(null);

    publicBookingApi
      .createBooking(clinicId, {
        phone: state.phone.trim(),
        firstName: state.ownerFound ? undefined : state.firstName || undefined,
        lastName: state.ownerFound ? undefined : state.lastName || undefined,
        email: state.email || undefined,
        petId: state.selectedPetId || undefined,
        petName: !state.selectedPetId ? state.newPetName || undefined : undefined,
        speciesName: !state.selectedPetId ? state.newSpeciesName || undefined : undefined,
        locationId: state.locationId!,
        type: state.type!,
        startTime: state.slot!.startTime,
        preferredVetId: state.slot!.vetId || undefined,
        reason: state.reason || undefined,
        honeypot: state.honeypot || undefined,
      })
      .then((res) => {
        updateState({
          step: 4,
          result: res.data,
        });
        setSubmitting(false);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Greška pri zakazivanju. Pokušajte ponovo.';
        setSubmitError(msg);
        setSubmitting(false);
      });
  };

  const formatSlotTime = () => {
    if (!state.slot || !state.date) return '';
    const date = new Date(state.date);
    const dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
    const day = dayNames[date.getDay()];
    const dateStr = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    const time = state.slot.startTime.substring(11, 16);
    return `${day}, ${dateStr} u ${time}`;
  };

  // Validacija — može se zakazati ako:
  // 1. Telefon je unet i lookup je urađen
  // 2. Ili je vlasnik pronađen i ljubimac izabran, ili su podaci za novog uneti
  const canSubmit =
    lookupDone &&
    state.phone.trim().length >= 6 &&
    ((state.ownerFound && (state.selectedPetId || state.newPetName.trim().length > 0)) ||
      (!state.ownerFound &&
        state.firstName.trim().length > 0 &&
        state.lastName.trim().length > 0 &&
        (state.selectedPetId || state.newPetName.trim().length > 0)));

  return (
    <div>
      {/* Rezime termina */}
      <div style={s.infoBox}>
        {TYPE_LABELS[state.type || ''] || state.type} — {formatSlotTime()}
      </div>

      {/* Telefon */}
      <p style={s.sectionTitle}>Vaš broj telefona</p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          type='tel'
          style={{ ...s.input, flex: 1 }}
          placeholder='Npr. 0641234567'
          value={state.phone}
          onChange={(e) => {
            updateState({
              phone: e.target.value,
              ownerFound: false,
              ownerId: null,
              ownerName: null,
              pets: [],
              selectedPetId: null,
            });
            setLookupDone(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLookup();
          }}
        />
        <button
          style={{ ...s.primaryButton, width: 'auto', padding: '12px 20px', whiteSpace: 'nowrap' }}
          onClick={handleLookup}
          disabled={lookupLoading || state.phone.trim().length < 6}
        >
          {lookupLoading ? '...' : 'Pretraži'}
        </button>
      </div>
      {lookupError && <p style={s.errorText}>{lookupError}</p>}

      {/* Vlasnik pronađen */}
      {lookupDone && state.ownerFound && (
        <>
          <div style={s.foundOwner}>Zdravo, {state.ownerName}! 👋</div>

          {/* Izbor ljubimca */}
          {state.pets.length > 0 && (
            <>
              <p style={s.sectionTitle}>Izaberite ljubimca</p>
              <div style={s.radioGroup}>
                {state.pets.map((pet) => (
                  <div
                    key={pet.id}
                    style={s.radioOption(state.selectedPetId === pet.id)}
                    onClick={() =>
                      updateState({ selectedPetId: pet.id, newPetName: '', newSpeciesName: '' })
                    }
                  >
                    <div style={{ fontWeight: 600 }}>{pet.name}</div>
                    {pet.speciesName && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                        {pet.speciesName}
                      </div>
                    )}
                  </div>
                ))}
                <div
                  style={s.radioOption(state.selectedPetId === null && state.newPetName !== '')}
                  onClick={() => updateState({ selectedPetId: null })}
                >
                  + Drugi ljubimac
                </div>
              </div>
            </>
          )}

          {/* Novi ljubimac (ako izabrao "Drugi ljubimac" ili nema ljubimaca) */}
          {state.selectedPetId === null && (
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>Ime ljubimca *</label>
              <input
                type='text'
                style={{ ...s.input, marginBottom: '10px' }}
                placeholder='Ime ljubimca'
                value={state.newPetName}
                onChange={(e) => updateState({ newPetName: e.target.value })}
              />
              <label style={s.label}>Vrsta (pas, mačka...)</label>
              <input
                type='text'
                style={s.input}
                placeholder='Npr. Pas'
                value={state.newSpeciesName}
                onChange={(e) => updateState({ newSpeciesName: e.target.value })}
              />
            </div>
          )}
        </>
      )}

      {/* Vlasnik NIJE pronađen */}
      {lookupDone && !state.ownerFound && (
        <>
          <div
            style={{
              ...s.infoBox,
              background: '#fef9c3',
              borderColor: '#fde68a',
              color: '#92400e',
            }}
          >
            Nismo pronašli vaš nalog. Molimo unesite podatke.
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={s.label}>Ime *</label>
            <input
              type='text'
              style={s.input}
              placeholder='Vaše ime'
              value={state.firstName}
              onChange={(e) => updateState({ firstName: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={s.label}>Prezime *</label>
            <input
              type='text'
              style={s.input}
              placeholder='Vaše prezime'
              value={state.lastName}
              onChange={(e) => updateState({ lastName: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={s.label}>Email (opciono)</label>
            <input
              type='email'
              style={s.input}
              placeholder='email@primer.com'
              value={state.email}
              onChange={(e) => updateState({ email: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={s.label}>Ime ljubimca *</label>
            <input
              type='text'
              style={s.input}
              placeholder='Ime ljubimca'
              value={state.newPetName}
              onChange={(e) => updateState({ newPetName: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Vrsta (pas, mačka...)</label>
            <input
              type='text'
              style={s.input}
              placeholder='Npr. Pas'
              value={state.newSpeciesName}
              onChange={(e) => updateState({ newSpeciesName: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Razlog posete */}
      {lookupDone && (
        <div style={{ marginBottom: '16px' }}>
          <label style={s.label}>Razlog posete (opciono)</label>
          <textarea
            style={s.textarea}
            placeholder='Opišite razlog posete...'
            value={state.reason}
            onChange={(e) => updateState({ reason: e.target.value })}
          />
        </div>
      )}

      {/* Honeypot — skriveno polje */}
      <div style={s.honeypot}>
        <input
          type='text'
          tabIndex={-1}
          autoComplete='off'
          value={state.honeypot}
          onChange={(e) => updateState({ honeypot: e.target.value })}
        />
      </div>

      {/* Greška pri slanju */}
      {submitError && <p style={s.errorText}>{submitError}</p>}

      {/* Dugmad */}
      <div style={s.buttonRow}>
        <button style={{ ...s.secondaryButton, flex: 1 }} onClick={() => updateState({ step: 2 })}>
          Nazad
        </button>
        <button
          style={{ ...(canSubmit && !submitting ? s.primaryButton : s.disabledButton), flex: 2 }}
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Zakazivanje...' : 'Zakaži termin'}
        </button>
      </div>
    </div>
  );
}
