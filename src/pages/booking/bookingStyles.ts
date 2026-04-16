export const bookingStyles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,

  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '480px',
    padding: '32px 24px',
    marginTop: '16px',
  } as React.CSSProperties,

  logo: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: '12px',
  } as React.CSSProperties,

  clinicName: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 4px 0',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '24px',
  } as React.CSSProperties,

  stepDot: (active: boolean, completed: boolean) =>
    ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: completed ? '#1677ff' : active ? '#1677ff' : '#d9d9d9',
      opacity: active || completed ? 1 : 0.5,
      transition: 'all 0.3s',
    }) as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '16px',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '16px',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fff',
    appearance: 'none' as const,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '16px',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    minHeight: '80px',
  } as React.CSSProperties,

  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '16px',
  } as React.CSSProperties,

  radioOption: (selected: boolean) =>
    ({
      padding: '14px 16px',
      border: `2px solid ${selected ? '#1677ff' : '#e5e7eb'}`,
      borderRadius: '12px',
      cursor: 'pointer',
      background: selected ? '#eff6ff' : '#fff',
      transition: 'all 0.2s',
      fontSize: '15px',
      fontWeight: selected ? 600 : 400,
      color: selected ? '#1677ff' : '#374151',
    }) as React.CSSProperties,

  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  } as React.CSSProperties,

  slotButton: (selected: boolean) =>
    ({
      padding: '12px 8px',
      border: `2px solid ${selected ? '#1677ff' : '#e5e7eb'}`,
      borderRadius: '10px',
      cursor: 'pointer',
      background: selected ? '#1677ff' : '#fff',
      color: selected ? '#fff' : '#374151',
      fontSize: '15px',
      fontWeight: 600,
      textAlign: 'center' as const,
      transition: 'all 0.2s',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }) as React.CSSProperties,

  primaryButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    background: '#1677ff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'background 0.2s',
  } as React.CSSProperties,

  secondaryButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'background 0.2s',
  } as React.CSSProperties,

  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 12px 0',
  } as React.CSSProperties,

  groupLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '16px 0 8px 0',
  } as React.CSSProperties,

  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    fontSize: '32px',
  } as React.CSSProperties,

  errorText: {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '4px',
  } as React.CSSProperties,

  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#1e40af',
    marginBottom: '16px',
  } as React.CSSProperties,

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
  } as React.CSSProperties,

  summaryLabel: {
    color: '#6b7280',
    fontWeight: 500,
  } as React.CSSProperties,

  summaryValue: {
    color: '#1a1a2e',
    fontWeight: 600,
  } as React.CSSProperties,

  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,

  honeypot: {
    position: 'absolute' as const,
    left: '-9999px',
    tabIndex: -1,
    autoComplete: 'off',
  } as React.CSSProperties,

  disabledButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#9ca3af',
    background: '#e5e7eb',
    border: 'none',
    borderRadius: '12px',
    cursor: 'not-allowed',
    minHeight: '48px',
  } as React.CSSProperties,

  noSlots: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  } as React.CSSProperties,

  foundOwner: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '15px',
    color: '#166534',
    fontWeight: 600,
  } as React.CSSProperties,
};
