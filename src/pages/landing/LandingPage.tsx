import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const MAIL_TO = 'mailto:draskovic.nenad@gmail.com?subject=Demo VetClinic';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  // Kalkulator state
  const [patients, setPatients] = useState(10);
  const [rate, setRate] = useState(2000);

  const { hoursSaved, moneyEarned } = useMemo(() => {
    const MINS_PER_PATIENT = 15;
    const WORK_DAYS = 22;
    const hours = Math.round((patients * MINS_PER_PATIENT * WORK_DAYS) / 60);
    return {
      hoursSaved: hours,
      moneyEarned: hours * (rate || 0),
    };
  }, [patients, rate]);

  const scrollToKontakt = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className='landing-page'>
      {/* ═══ NAVIGACIJA ═══ */}
      <nav className='lp-nav'>
        <a href='/' className='lp-logo'>
          VetClinic
        </a>

        {isAuthenticated ? (
          <a href='/appointments' className='btn-demo'>
            Otvori aplikaciju →
          </a>
        ) : (
          <div className='lp-nav-actions'>
            <a href='/login' className='lp-nav-link'>
              Prijava
            </a>
            <a href='#kontakt' onClick={scrollToKontakt} className='btn-demo'>
              Zakaži demo
            </a>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <header className='hero'>
        <h1>Vi lečite, VetClinic radi ostalo.</h1>
        <p>
          Softver za srpsko tržište koji vam štedi vreme na administraciji i sam vraća pacijente
          putem SMS podsetnika.
        </p>
        <div className='hero-image-wrap'>
          <img
            src='https://via.placeholder.com/800x450?text=Prikaz+Dashboard-a+na+Tabletu'
            alt='Dashboard'
          />
        </div>
      </header>

      {/* ═══ SEGMENTACIJA ═══ */}
      <section className='segments'>
        <div className='segment-card segment-card--small'>
          <div className='icon'>📱</div>
          <h2>Za male ambulante</h2>
          <p className='segment-slogan'>
            <strong>"Vaš digitalni asistent koji nikad ne spava."</strong>
          </p>
          <p>
            Radite sami ili sa jednim tehničarem? Ne dozvolite da vas administracija uspori.
            VetClinic preuzima brigu o pozivima i papirima.
          </p>
          <ul>
            <li>
              <strong>SMS koji zarađuje:</strong> Sistem sam šalje podsetnike za vakcinaciju. Vaš
              kalendar se puni dok ste vi u operacionoj sali.
            </li>
            <li>
              <strong>Karton u 1 klik:</strong> Dugme "Start" automatski otvara istoriju bolesti i
              priprema sve za unos.
            </li>
            <li>
              <strong>Telefon kao skener:</strong> Slikajte laboratorijski nalaz direktno u
              digitalni karton. Nema više gubljenja papira.
            </li>
          </ul>
          <div className='segment-quote'>
            "Knjiga lečenja je gotova onog trenutka kada završite pregled. Bez kucanja nakon radnog
            vremena."
          </div>
        </div>

        <div className='segment-card segment-card--large'>
          <div className='icon'>🏢</div>
          <h2>Za velike klinike</h2>
          <p className='segment-slogan'>
            <strong>"Gvozdena disciplina i nula gubitaka."</strong>
          </p>
          <p>
            Vodite tim i želite potpunu preglednost? VetClinic vam daje uvid u svaki mililitar leka
            i svaki minut radnog vremena.
          </p>
          <ul>
            <li>
              <strong>FIFO (pametan) Lager:</strong> Sistem automatski troši lekove kojima najranije
              ističe rok. Stop bacanju novca zbog isteka zaliha.
            </li>
            <li>
              <strong>Online zakazivanje:</strong> Oslobodite recepciju. Klijenti sami biraju
              slobodne termine, vi ih samo potvrđujete.
            </li>
            <li>
              <strong>Analitika tima:</strong> Pratite učinak svakog veterinara i profitabilnost
              klinike u realnom vremenu.
            </li>
          </ul>
          <div className='segment-quote'>
            "Sprečite curenje novca. Znate tačno gde je završila svaka ampula i ko je izvršio koju
            uslugu."
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className='features'>
        <h2>Diferencijacija: Zašto veterinari biraju nas?</h2>
        <div className='f-grid'>
          <div className='f-item'>
            <h3>⚡ Brzina ispred svega</h3>
            <p>
              Od ulaska pacijenta do izdatog računa u 3 klika. Naše "Start" dugme rešava svu
              birokratiju za vas.
            </p>
          </div>
          <div className='f-item'>
            <h3>📱 Mobilni karton</h3>
            <p>
              Skenirajte QR kod i slikajte ranu ili nalaz krvi telefonom. Slika je trenutno u
              digitalnom kartonu na računaru.
            </p>
          </div>
          <div className='f-item'>
            <h3>📦 Pametan lager</h3>
            <p>
              Prvi trošite lekove kojima rok najranije ističe. Sistem vas upozorava pre nego što
              ostanete bez zaliha.
            </p>
          </div>
          <div className='f-item'>
            <h3>📅 Online zakazivanje</h3>
            <p>
              Klijenti sami biraju slobodne termine preko mobilnog telefona, 24/7. Manje poziva na
              recepciji, više potvrđenih termina.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ KALKULATOR ═══ */}
      <section className='calculator-section'>
        <h2>Izračunajte koliko vam VetClinic štedi vremena</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Zahvaljujući automatizaciji "Start" workflow-a, štedite bar 15 minuta po pacijentu.
        </p>

        <div className='calc-container'>
          <div className='calc-grid'>
            <div className='input-group'>
              <label htmlFor='patients'>
                Broj pacijenata dnevno: <span className='patient-count'>{patients}</span>
              </label>
              <input
                type='range'
                id='patients'
                min={1}
                max={40}
                value={patients}
                onChange={(e) => setPatients(parseInt(e.target.value, 10))}
              />

              <label htmlFor='rate' style={{ marginTop: 20 }}>
                Vrednost vašeg radnog sata (RSD):
              </label>
              <input
                type='number'
                id='rate'
                value={rate}
                onChange={(e) => setRate(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className='result-box'>
              <span className='result-label'>Mesečno oslobođeno:</span>
              <span className='result-value'>{hoursSaved}</span>
              <span className='result-label' style={{ marginBottom: 15, display: 'block' }}>
                radnih sati
              </span>

              <div className='result-divider'>
                <span className='result-label'>Potencijalni dodatni prihod:</span>
                <span className='result-money'>{moneyEarned.toLocaleString('sr-RS')} RSD</span>
              </div>
            </div>
          </div>
          <p className='calc-note'>*Računato na bazi 22 radna dana u mesecu.</p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className='cta' id='kontakt'>
        <h2>Spremni da oslobodite 1h dnevno?</h2>
        <p>Probajte besplatno 30 dana. Bez obaveza. Bez kartice.</p>
        <a href={MAIL_TO} className='cta-btn-white'>
          Pokreni besplatnu probu →
        </a>
        <p className='cta-subtle'>Prebacićemo vaše podatke iz starog softvera besplatno.</p>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className='lp-footer'>
        © 2026 VetClinic. Veterinarski softver za srpsko tržište.
      </footer>
    </div>
  );
}
