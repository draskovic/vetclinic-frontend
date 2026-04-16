import type { BookingClinicInfo } from '@/api/public-booking';
import { TYPE_LABELS } from './BookingPage';
import type { BookingState } from './BookingPage';
import { bookingStyles as s } from './bookingStyles';

interface Props {
  clinicInfo: BookingClinicInfo;
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
}

export default function BookingStepService({ clinicInfo, state, updateState }: Props) {
  const canProceed = state.type !== null && state.locationId !== null;

  return (
    <div>
      {/* Tip termina */}
      <p style={s.sectionTitle}>Izaberite tip termina</p>
      <div style={s.radioGroup}>
        {clinicInfo.allowedTypes.map((type) => (
          <div
            key={type}
            style={s.radioOption(state.type === type)}
            onClick={() => updateState({ type })}
          >
            {TYPE_LABELS[type] || type}
          </div>
        ))}
      </div>

      {/* Lokacija — prikaži samo ako ima više od jedne */}
      {clinicInfo.locations.length > 1 && (
        <>
          <p style={s.sectionTitle}>Izaberite lokaciju</p>
          <div style={s.radioGroup}>
            {clinicInfo.locations.map((loc) => (
              <div
                key={loc.id}
                style={s.radioOption(state.locationId === loc.id)}
                onClick={() => updateState({ locationId: loc.id })}
              >
                <div style={{ fontWeight: 600 }}>{loc.name}</div>
                {loc.address && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    {loc.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Izbor veterinara — opciono, samo ako je uključeno */}
      {clinicInfo.allowVetSelection && clinicInfo.vets && clinicInfo.vets.length > 0 && (
        <>
          <p style={s.sectionTitle}>Preferirani veterinar</p>
          <div style={s.radioGroup}>
            <div
              style={s.radioOption(state.preferredVetId === null)}
              onClick={() => updateState({ preferredVetId: null })}
            >
              Svejedno — prvi slobodni
            </div>
            {clinicInfo.vets.map((vet) => (
              <div
                key={vet.id}
                style={s.radioOption(state.preferredVetId === vet.id)}
                onClick={() => updateState({ preferredVetId: vet.id })}
              >
                <div style={{ fontWeight: 600 }}>{vet.name}</div>
                {vet.specialization && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                    {vet.specialization}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dugme Dalje */}
      <button
        style={canProceed ? s.primaryButton : s.disabledButton}
        disabled={!canProceed}
        onClick={() => updateState({ step: 2 })}
      >
        Dalje
      </button>
    </div>
  );
}
