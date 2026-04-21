import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  // Kontakt forma state
  const [form, setForm] = useState({ name: '', contact: '' });

  // Kalkulator state
  const [patients, setPatients] = useState(10);
  const [rate, setRate] = useState(2000);

  const { hoursSaved, moneyEarned } = useMemo(() => {
    const MINS_PER_PATIENT = 10;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Ime: ${form.name}%0AKontakt: ${form.contact}`;
    window.location.href = `mailto:draskovic.nenad@gmail.com?subject=Demo VetClinic&body=${body}`;
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
        <div className='hero-content'>
          <h1>Manje administracije. Više dolazaka i bolja kontrola rada.</h1>
          <p>
            Softver koji preuzima vašu administraciju i smanjuje gužvu na recepciji pomoću on-line
            zakazivanja, kako biste mogli više vremena da posvetite lečenju. Sistem sam vraća
            pacijente putem SMS-a i vodi računa o vašem lageru.
          </p>
          <div className='hero-trust-badge'>
            <span className='hero-trust-icon'>✅</span>
            <span>Prebacujemo vaše stare podatke besplatno</span>
          </div>
        </div>
        <div className='hero-image-container'>
          <img src='/dashboard-preview.webp' alt='VetClinic Dashboard' />
        </div>
      </header>

      {/* ═══ PAIN POINTS ═══ */}
      <section className='pain-points-section'>
        <div className='container'>
          <h2 className='section-title'>Da li vam se ovo dešava?</h2>
          <div className='pain-grid'>
            <div className='pain-item'>
              <span className='pain-icon'>📅</span>
              <p>Klijenti zaboravljaju vakcine i kontrole</p>
            </div>
            <div className='pain-item'>
              <span className='pain-icon'>🤯</span>
              <p>Haos sa terminima ili preklapanja u smeni</p>
            </div>
            <div className='pain-item'>
              <span className='pain-icon'>🔍</span>
              <p>Nemate jasan pregled istorije lečenja pacijenta</p>
            </div>
            <div className='pain-item'>
              <span className='pain-icon'>⏳</span>
              <p>Gubite vreme na administraciju i traženje podataka</p>
            </div>
            <div className='pain-item pain-item--highlight'>
              <span className='pain-icon'>🐌</span>
              <p>Softver koji trenutno koristite vas usporava</p>
            </div>
            <div className='pain-item'>
              <span className='pain-icon'>💸</span>
              <p>Bacate novac zbog isteklih rokova trajanja lekova</p>
            </div>
          </div>
        </div>
      </section>

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
              <strong>Karton na 1 klik:</strong> Dugme "Start" automatski popunjava podatke o
              vlasniku i pacijentu, vi samo unosite dijagnozu i protokol po potrebi, a sistem sam
              upisuje usluge, kreira fakturu i sve je odmah spremno za štampu. Nema duplih unosa
              podataka.
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
            <strong>Imate pregled nad zalihama i manje bacanja lekova.</strong>
          </p>
          <p>
            Vodite tim i želite potpunu preglednost? VetClinic vam daje uvid u svaki mililitar leka
            i svaki minut radnog vremena.
          </p>
          <ul>
            <li>
              <strong>Online zakazivanje:</strong> Oslobodite recepciju. Klijenti sami biraju
              slobodne termine, vi ih samo potvrđujete.
            </li>
            <li>
              <strong>Analitika tima:</strong> Pratite učinak svakog veterinara i profitabilnost
              klinike u realnom vremenu.
            </li>
            <li>
              <strong>FIFO (pametan) Lager:</strong> Sistem automatski troši lekove kojima najranije
              ističe rok. Stop bacanju novca zbog isteka zaliha.
            </li>
          </ul>
          <div className='segment-quote'>
            "Sprečite curenje novca. Znate tačno gde je završila svaka ampula i ko je izvršio koju
            uslugu."
          </div>
        </div>
      </section>
      {/* ═══ KAKO POČINJETE ═══ */}
      <section className='how-it-works'>
        <h2>Kako počinjete</h2>
        <p className='how-subtitle'>Bez komplikacija. Bez instalacije. Bez rizika.</p>
        <div className='steps-grid'>
          <div className='step-card'>
            <div className='step-number'>1</div>
            <h3>Mi unesemo vaše podatke</h3>
            <p>Prebacujemo istoriju iz starog programa ili sveski — dok vi radite.</p>
          </div>
          <div className='step-card'>
            <div className='step-number'>2</div>
            <h3>Podesimo sistem za vas</h3>
            <p>Prilagođavamo VetClinic vašoj ambulanti. Sve je veoma brzo gotovo .</p>
          </div>
          <div className='step-card'>
            <div className='step-number'>3</div>
            <h3>Vi radite kao i do sada</h3>
            <p>Samo bez papira, bez propuštenih vakcina i termina, bez stresa.</p>
          </div>
        </div>
      </section>
      {/* ═══ FEATURES ═══ */}
      <section className='features'>
        <h2>Zašto kolege biraju VetClinic i šta vam stvarno štedi vreme svaki dan?</h2>
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
              Prvo trošite lekove kojima rok najranije ističe. Sistem vas upozorava pre nego što
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
          Zahvaljujući automatizaciji "Start" workflow-a, štedite bar 10 minuta po pacijentu.
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
      {/* ═══ FAQ ═══ */}
      <section className='faq-section'>
        <h2>Česta pitanja</h2>
        <div className='faq-list'>
          <details className='faq-item'>
            <summary>
              Da li je komplikovano za korišćenje?
              <span className='faq-icon'>+</span>
            </summary>
            <div className='faq-answer'>
              Ne. Mi sve podešavamo i obučavamo vas besplatno. Nije potrebno tehničko znanje — ako
              znate da koristite Facebook, znate da koristite VetClinic.
            </div>
          </details>

          <details className='faq-item'>
            <summary>
              Da li moram da menjam način rada?
              <span className='faq-icon'>+</span>
            </summary>
            <div className='faq-answer'>
              Ne. VetClinic se prilagođava vama, ne vi njemu. Radite kao i do sada, samo bez papira
              i bez propuštenih vakcina i termina.
            </div>
          </details>

          <details className='faq-item'>
            <summary>
              Šta sa mojim starim podacima?
              <span className='faq-icon'>+</span>
            </summary>
            <div className='faq-answer'>
              Prebacujemo ih besplatno. Kartoteka iz sveski, Excela ili starog softvera — sve možemo
              uvesti u VetClinic bez dodatnih troškova.
            </div>
          </details>

          <details className='faq-item'>
            <summary>
              Koliko košta?
              <span className='faq-icon'>+</span>
            </summary>
            <div className='faq-answer'>
              Prvih nekoliko klinika koje uđu u Partner Osnivač program dobija Professional paket
              besplatno dok razvijamo + dodatnih godinu dana ili po dogovoru. Za ostale ćemo
              dogovoriti cenu u direktnom razgovoru, bez obaveza.
            </div>
          </details>

          <details className='faq-item'>
            <summary>
              Da li radi na tabletu ili telefonu?
              <span className='faq-icon'>+</span>
            </summary>
            <div className='faq-answer'>
              Da. VetClinic radi u pretraživaču — na računaru, tabletu i telefonu. Nema instalacije,
              nema ažuriranja. Slikajte nalaze telefonom direktno u karton pacijenta.
            </div>
          </details>
        </div>
      </section>

      {/* ═══ PIONEER BADGE ═══ */}
      <div className='pioneer-badge'>
        <h3>🚀 Program za prve korisnike</h3>
        <p className='pioneer-intro'>Otvaramo saradnju sa nekoliko ambulanti u Srbiji:</p>
        <ul className='pioneer-list'>
          <li>
            <span className='pioneer-check'>✔</span> Besplatno korišćenje sistema
          </li>
          <li>
            <span className='pioneer-check'>✔</span> Kompletno podešavanje i podrška
          </li>
          <li>
            <span className='pioneer-check'>✔</span> Prilagođavanje sistema vašem načinu rada
          </li>
          <li>👉 Mi sve podešavamo za vas — ne morate da menjate način rada.</li>
        </ul>
        <p className='pioneer-closing'>Prilagođavamo sistem vašem načinu rada, ne obrnuto.</p>
      </div>

      {/* ═══ CTA / KONTAKT FORMA ═══ */}
      <section className='cta' id='kontakt'>
        <h2>Spremni da oslobodite 1h dnevno?</h2>
        <p>Probajte besplatno 30 dana. Bez obaveza. Bez kartice.</p>

        <form className='cta-form' onSubmit={handleSubmit}>
          <input
            type='text'
            placeholder='Vaše ime'
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className='cta-input'
          />
          <input
            type='text'
            placeholder='Telefon ili email'
            required
            value={form.contact}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            className='cta-input'
          />
          <button type='submit' className='cta-btn-white'>
            Pokreni besplatnu probu →
          </button>
        </form>

        <p className='cta-subtle'>Prebacićemo vaše podatke iz starog softvera besplatno.</p>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className='lp-footer'>
        © 2026 VetClinic. Veterinarski softver za srpsko tržište.
      </footer>
    </div>
  );
}
