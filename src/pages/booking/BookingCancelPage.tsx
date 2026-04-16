import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicBookingApi } from '@/api/public-booking';
import { bookingStyles as s } from './bookingStyles';

export default function BookingCancelPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'confirm' | 'loading' | 'success' | 'error'>('confirm');
  const [message, setMessage] = useState('');

  const handleCancel = () => {
    if (!token) return;
    setStatus('loading');

    publicBookingApi
      .cancelBooking(token)
      .then((res) => {
        setMessage(res.data.message || 'Termin je uspešno otkazan.');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err?.response?.data?.message || 'Greška pri otkazivanju termina.');
        setStatus('error');
      });
  };

  if (!token) {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>
            Nevažeći link za otkazivanje.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        {status === 'confirm' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗓️</div>
            <h2 style={{ ...s.clinicName, fontSize: '20px', marginBottom: '8px' }}>
              Otkazivanje termina
            </h2>
            <p style={{ ...s.subtitle, marginBottom: '24px' }}>
              Da li ste sigurni da želite da otkažete zakazani termin?
            </p>
            <div style={s.buttonRow}>
              <button
                style={{ ...s.secondaryButton, flex: 1 }}
                onClick={() => window.history.back()}
              >
                Ne, zadrži
              </button>
              <button
                style={{ ...s.primaryButton, flex: 1, background: '#ef4444' }}
                onClick={handleCancel}
              >
                Da, otkaži
              </button>
            </div>
          </>
        )}

        {status === 'loading' && (
          <>
            <div style={s.spinner} />
            <p style={{ color: '#6b7280', marginTop: '16px' }}>Otkazivanje...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={s.successIcon}>
              <span>✅</span>
            </div>
            <h2 style={{ ...s.clinicName, fontSize: '20px', marginBottom: '8px' }}>
              Termin je otkazan
            </h2>
            <p style={s.subtitle}>{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ ...s.clinicName, fontSize: '20px', marginBottom: '8px' }}>Greška</h2>
            <p style={{ color: '#ef4444', fontSize: '14px' }}>{message}</p>
            <button
              style={{ ...s.secondaryButton, marginTop: '16px' }}
              onClick={() => setStatus('confirm')}
            >
              Pokušaj ponovo
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
