import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const C = {
  primary: '#1890ff',
  green: '#52c41a',
  purple: '#722ed1',
  dark: '#1a1a2e',
  gray: '#f8f9fa',
  textSecondary: '#666',
  white: '#fff',
  border: '#e8e8e8',
};

const btn = (variant: 'primary' | 'outline' | 'white', size?: 'lg'): React.CSSProperties => ({
  padding: size === 'lg' ? '14px 28px' : '10px 20px',
  fontSize: size === 'lg' ? 16 : 14,
  fontWeight: 700,
  borderRadius: 8,
  cursor: 'pointer',
  border: variant === 'outline' ? `2px solid ${C.primary}` : 'none',
  backgroundColor:
    variant === 'primary' ? C.primary : variant === 'white' ? C.white : 'transparent',
  color: variant === 'primary' ? C.white : variant === 'white' ? C.primary : C.primary,
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'opacity 0.2s',
  letterSpacing: '-0.2px',
});

const segCard = (accent: string): React.CSSProperties => ({
  flex: 1,
  backgroundColor: C.white,
  borderRadius: 16,
  padding: '32px 28px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  borderTop: `4px solid ${accent}`,
});

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 16,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: C.dark,
};

function SmsMockup() {
  return (
    <div
      style={{
        width: 250,
        backgroundColor: '#16213e',
        borderRadius: 32,
        padding: '28px 14px 20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        border: '7px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span>9:41</span>
        <span style={{ fontWeight: 600 }}>VetClinic</span>
        <span>📶</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <div
          style={{
            backgroundColor: '#2a2a3e',
            color: 'rgba(255,255,255,0.85)',
            padding: '10px 13px',
            borderRadius: '16px 16px 16px 3px',
            fontSize: 13,
            maxWidth: '88%',
            lineHeight: 1.5,
          }}
        >
          Poštovani, Max treba da primi godišnju vakcinu. Javite se za termin 🐾
        </div>
        <div
          style={{
            backgroundColor: C.primary,
            color: C.white,
            padding: '10px 13px',
            borderRadius: '16px 16px 3px 16px',
            fontSize: 13,
            maxWidth: '80%',
            alignSelf: 'flex-end',
          }}
        >
          Hvala! Dolazimo sutra u 10h.
        </div>
        <div
          style={{
            backgroundColor: '#2a2a3e',
            color: 'rgba(255,255,255,0.85)',
            padding: '10px 13px',
            borderRadius: '16px 16px 16px 3px',
            fontSize: 13,
            maxWidth: '88%',
            lineHeight: 1.5,
          }}
        >
          ✅ Termin potvrđen za Max. Vidimo se! 🐾
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const [form, setForm] = useState({ name: '', contact: '' });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('landing-visible');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Ime: ${form.name}%0AKontakt: ${form.contact}`;
    window.location.href = `mailto:draskovic.nenad@gmail.com?subject=Demo VetClinic&body=${body}`;
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: C.dark,
        lineHeight: 1.6,
      }}
    >
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: C.white,
          borderBottom: `1px solid ${C.border}`,
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            color: C.primary,
            letterSpacing: '-0.5px',
          }}
        >
          🐾 VetClinic
        </div>
        {isAuthenticated ? (
          <a href='/appointments' style={btn('primary')}>
            Otvori aplikaciju →
          </a>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href='/login' style={btn('outline')}>
              Prijava
            </a>
            <button onClick={() => scrollTo('contact')} style={btn('primary')}>
              Zakažite demo
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ backgroundColor: C.white, padding: '72px 24px 64px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className='landing-hero-content' style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#e6f4ff',
                  color: C.primary,
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 20,
                  letterSpacing: '0.2px',
                }}
              >
                Veterinarski softver za srpsko tržište
              </div>
              <h1
                style={{
                  fontSize: 'clamp(30px, 4.5vw, 50px)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  margin: '0 0 20px',
                  color: C.dark,
                  letterSpacing: '-1px',
                }}
              >
                Ne zaboravljate više vakcine —{' '}
                <span style={{ color: C.primary }}>klijenti dolaze sami</span>
              </h1>
              <p style={{ fontSize: 18, color: C.textSecondary, marginBottom: 28, maxWidth: 480 }}>
                Automatski podseća klijente i vodi evidenciju umesto vas.
              </p>

              {/* Trust signal — blizu hero, highest conversion driver */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 8,
                  padding: '10px 16px',
                  marginBottom: 36,
                }}
              >
                <span style={{ fontSize: 17 }}>✅</span>
                <span style={{ fontWeight: 600, color: '#389e0d', fontSize: 15 }}>
                  Prebacujemo vaše stare podatke besplatno
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => scrollTo('contact')} style={btn('primary', 'lg')}>
                  Besplatno podešavanje
                </button>
                <button onClick={() => scrollTo('how')} style={btn('outline', 'lg')}>
                  Pogledajte kako radi
                </button>
              </div>
            </div>
            <div style={{ flexShrink: 0 }} className='landing-sms-mockup'>
              <SmsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section
        className='landing-reveal'
        style={{ backgroundColor: C.dark, padding: '72px 24px', color: C.white }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: '-0.5px',
            }}
          >
            Da li vam se ovo dešava?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, marginBottom: 44 }}>
            Prepoznajete li se u ovim situacijama?
          </p>
          <div
            className='landing-diff-grid'
            style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {[
              'Klijenti zaborave kada je vakcina trebalo da bude',
              'Vodite evidenciju u svesci ili Excelu',
              'Tražite podatke pacijenta po papirima',
              'Nemate pregled istorije lečenja na jednom mestu',
            ].map((text) => (
              <div
                key={text}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: '20px 22px',
                  maxWidth: 230,
                  textAlign: 'left',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>❌</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEGMENTATION ── */}
      <section
        className='landing-reveal'
        style={{ backgroundColor: C.gray, padding: '80px 24px' }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: '-0.5px',
            }}
          >
            Izaberite svoj izazov
          </h2>
          <p style={{ textAlign: 'center', color: C.textSecondary, marginBottom: 44, fontSize: 16 }}>
            VetClinic rešava probleme i malih i velikih veterinarskih praksi
          </p>
          <div className='landing-seg-grid' style={{ display: 'flex', gap: 28 }}>
            {/* Mala ambulanta */}
            <div style={segCard(C.primary)}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏥</div>
              <h3 style={{ fontWeight: 700, fontSize: 19, marginBottom: 8 }}>Mala ambulanta</h3>
              <p style={{ color: C.textSecondary, marginBottom: 20, fontSize: 15 }}>
                Zaboravljaju vam vakcine i vodite sve u svesci?
              </p>
              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {[
                  'SMS podsetnici — klijenti se vraćaju sami',
                  'Karton uvek spreman za inspekciju',
                  'Jedan klik — pregled se otvara odmah',
                ].map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                    <span style={{ color: C.green, fontWeight: 700, flexShrink: 0 }}>✔</span>
                    <span style={{ color: '#333' }}>{b}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: '10px 14px',
                  backgroundColor: '#e6f4ff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.primary,
                }}
              >
                Prodajemo vam: MIR — spavajte mirno, inspekcija pokrivena
              </div>
            </div>

            {/* Veća klinika */}
            <div style={segCard(C.purple)}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
              <h3 style={{ fontWeight: 700, fontSize: 19, marginBottom: 8 }}>Veća klinika</h3>
              <p style={{ color: C.textSecondary, marginBottom: 20, fontSize: 15 }}>
                Imate haos sa terminima i organizacijom rada?
              </p>
              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {[
                  'Online zakazivanje — manje poziva na telefon',
                  'FIFO praćenje lekova — nema bačenih ampula',
                  'Pregled rada cele klinike na jednom mestu',
                ].map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                    <span style={{ color: C.purple, fontWeight: 700, flexShrink: 0 }}>✔</span>
                    <span style={{ color: '#333' }}>{b}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: '10px 14px',
                  backgroundColor: '#f9f0ff',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.purple,
                }}
              >
                Prodajemo vam: PROFIT — smanjite otpis lekova i povećajte broj termina
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ── */}
      <section
        className='landing-reveal'
        style={{ backgroundColor: C.white, padding: '80px 24px' }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              marginBottom: 44,
              letterSpacing: '-0.5px',
            }}
          >
            Zašto VetClinic?
          </h2>
          <div
            className='landing-diff-grid'
            style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {[
              {
                icon: '⚡',
                title: 'Brži rad',
                desc: 'Karton se otvara jednim klikom. Nema traženja po papirima, sveskama ili Excelu.',
              },
              {
                icon: '📷',
                title: 'Sva dokumentacija na jednom mestu',
                desc: 'Slikajte nalaz krvi telefonom — slika je odmah u kartonu pacijenta.',
              },
              {
                icon: '📦',
                title: 'Manje bačenih lekova',
                desc: 'Sistem prati rokove trajanja i upozorava vas na vreme. Nema iznenađenja.',
              },
            ].map((item) => (
              <div key={item.title} style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: C.textSecondary, fontSize: 15, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id='how'
        className='landing-reveal'
        style={{ backgroundColor: C.gray, padding: '80px 24px' }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: '-0.5px',
            }}
          >
            Kako počinjete
          </h2>
          <p style={{ color: C.textSecondary, marginBottom: 48, fontSize: 16 }}>
            Bez komplikacija. Bez instalacije. Bez rizika.
          </p>
          <div
            className='landing-steps-grid'
            style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'center' }}
          >
            {[
              {
                n: '1',
                title: 'Mi unesemo vaše podatke',
                desc: 'Prebacujemo istoriju iz starog programa ili sveski — dok vi radite.',
              },
              {
                n: '2',
                title: 'Podesimo sistem za vas',
                desc: 'Prilagođavamo VetClinic vašoj ambulanti. Sve je gotovo za jedan dan.',
              },
              {
                n: '3',
                title: 'Vi radite kao i do sada',
                desc: 'Samo bez papira, bez zaboravljenih vakcina, bez stresa.',
              },
            ].map((step) => (
              <div key={step.n} style={{ flex: 1, maxWidth: 260 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: C.primary,
                    color: C.white,
                    fontSize: 22,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: `0 4px 16px ${C.primary}40`,
                  }}
                >
                  {step.n}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RISK REVERSAL ── */}
      <section
        className='landing-reveal'
        style={{ backgroundColor: C.primary, padding: '80px 24px', color: C.white }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: '-0.5px',
            }}
          >
            Počnite bez obaveza
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 36, fontSize: 16 }}>
            Tri razloga da probate odmah
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            {[
              {
                icon: '📂',
                title: 'Besplatan uvoz podataka',
                desc: 'Dajte nam vašu bazu iz starog programa — prebacujemo dok vi spavate.',
              },
              {
                icon: '📅',
                title: '30 dana probe',
                desc: 'Pustite sistem da vam sam vrati klijente kroz SMS podsetnike. Pa procenite.',
              },
              {
                icon: '💻',
                title: 'Bez instalacije',
                desc: 'Ako znate da otvorite Facebook, znate da koristite VetClinic.',
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  backgroundColor: 'rgba(255,255,255,0.13)',
                  borderRadius: 12,
                  padding: '18px 22px',
                  textAlign: 'left',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => scrollTo('contact')} style={btn('white', 'lg')}>
            Prijavite se besplatno →
          </button>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        className='landing-reveal'
        style={{ backgroundColor: C.gray, padding: '80px 24px' }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 40,
              letterSpacing: '-0.5px',
            }}
          >
            Česta pitanja
          </h2>
          {[
            {
              q: 'Da li je komplikovano za korišćenje?',
              a: 'Ne. Mi sve podešavamo i obučavamo vas besplatno. Nije potrebno tehničko znanje.',
            },
            {
              q: 'Da li moram da menjam način rada?',
              a: 'Ne. VetClinic se prilagođava vama, ne vi njemu. Radite kao i do sada, samo efikasnije.',
            },
            {
              q: 'Šta sa mojim starim podacima?',
              a: 'Prebacujemo ih besplatno. Kartoteka iz sveski, Excela ili starog softvera — sve možemo uvesti.',
            },
            {
              q: 'Koliko košta?',
              a: 'Besplatno za prve korisnike. Prijavite se i dogovorimo detalje bez obaveza.',
            },
          ].map((item) => (
            <details
              key={item.q}
              style={{
                backgroundColor: C.white,
                borderRadius: 10,
                marginBottom: 8,
                border: `1px solid ${C.border}`,
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  padding: '16px 20px',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  listStyle: 'none',
                  userSelect: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {item.q}
                <span style={{ color: C.primary, fontSize: 20, flexShrink: 0, marginLeft: 12 }}>+</span>
              </summary>
              <div style={{ padding: '0 20px 16px', color: C.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section
        id='contact'
        className='landing-reveal'
        style={{ backgroundColor: C.white, padding: '80px 24px' }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(22px, 3vw, 34px)',
              fontWeight: 700,
              marginBottom: 12,
              letterSpacing: '-0.5px',
            }}
          >
            Mogu vam pokazati kako radi za 5 minuta
          </h2>
          <p style={{ color: C.textSecondary, marginBottom: 36, fontSize: 16 }}>
            Ostavite ime i broj telefona — javimo se u toku dana.
          </p>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <input
              type='text'
              placeholder='Vaše ime'
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
            <input
              type='text'
              placeholder='Telefon ili email'
              required
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              style={inputStyle}
            />
            <button type='submit' style={{ ...btn('primary', 'lg'), width: '100%', textAlign: 'center' }}>
              Zakažite demo →
            </button>
          </form>
          <p style={{ marginTop: 14, fontSize: 13, color: '#bbb' }}>Bez obaveza. Bez kartice.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          backgroundColor: C.dark,
          color: 'rgba(255,255,255,0.45)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 19, color: C.white, marginBottom: 6 }}>
          🐾 VetClinic
        </div>
        <div style={{ fontSize: 13 }}>© 2026 VetClinic. Veterinarski softver za srpsko tržište.</div>
      </footer>
    </div>
  );
}
