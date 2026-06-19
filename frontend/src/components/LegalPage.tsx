interface LegalPageProps {
  slug: string
  brand?: string
  email?: string
  phone?: string
  address?: string
}

export function LegalPage({ slug, brand, email, phone, address }: LegalPageProps) {
  const displayBrand = brand ?? 'Nikoletta Csonka'

  return (
    <div className="static-page">
      <header className="static-page-nav">
        <a href="#" className="static-page-brand">{displayBrand}</a>
        <a href="#" onClick={e => { e.preventDefault(); window.history.back() }} className="static-page-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück
        </a>
      </header>
      <main className="static-page-main">
        <div className="static-page-content">
          {slug === 'impressum' && <ImpressumContent brand={displayBrand} email={email} phone={phone} address={address} />}
          {slug === 'datenschutz' && <DatenschutzContent brand={displayBrand} email={email} />}
          {slug === 'agb' && <AgbContent brand={displayBrand} />}
          {slug !== 'impressum' && slug !== 'datenschutz' && slug !== 'agb' && (
            <p style={{ color: 'var(--text-soft)', marginTop: '2rem' }}>Diese Seite konnte nicht gefunden werden.</p>
          )}
        </div>
      </main>
    </div>
  )
}

function ImpressumContent({ brand, email, phone, address }: { brand: string; email?: string; phone?: string; address?: string }) {
  return (
    <>
      <h1>Impressum</h1>
      <p><strong>Angaben gemäß §5 ECG</strong></p>

      <h2>Dienstleistung</h2>
      <p>
        Sprachcoaching in Englisch, Deutsch und Ungarisch wird erbracht durch <strong>{brand}</strong>.
        {address && <> · {address}</>}
        {phone && <> · Tel: <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></>}
        {email && <> · <a href={`mailto:${email}`}>{email}</a></>}
      </p>

      <h2>Betreiber &amp; Rechnungssteller</h2>
      <p>
        Diese Website wird betrieben und die Rechnungsstellung erfolgt durch:<br />
        <strong>Research Focus Institute — Interdisciplinary Research Facility for Open Sciences</strong><br />
        Kurzbezeichnung: RFI-IRFOS<br />
        Elisabethinergasse 25/10, 8020 Graz, Austria<br />
        E-Mail: <a href="mailto:rfi.irfos@gmail.com">rfi.irfos@gmail.com</a><br />
        Website: <a href="https://ternlang.com" target="_blank" rel="noopener">ternlang.com</a>
      </p>
      <p>
        Rechtsform: Eingetragener Verein (gemeinnützig)<br />
        ZVR-Zahl: 1015608684<br />
        GISA-Zahl: 39261441<br />
        Steuernummer: 68 028/0989<br />
        Gewerbebehörde: Magistrat der Stadt Graz<br />
        Gewerbeanmeldung: 19.03.2026
      </p>

      <h2>Verantwortliche Personen</h2>
      <p>
        Simeon Kepp (Geschäftsführung, Head of Research)<br />
        Nikoletta Csonka (Co-Gründerin, Head of International Relations)
      </p>

      <h2>Haftungsausschluss</h2>
      <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden. Eine Haftung für den Lernerfolg kann nicht übernommen werden.</p>

      <h2>Urheberrecht</h2>
      <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf dieser Website unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>

      <h2>Anwendbares Recht</h2>
      <p>Es gilt das Recht der Republik Österreich sowie das Recht der Europäischen Union.</p>
    </>
  )
}

function DatenschutzContent({ brand, email }: { brand: string; email?: string }) {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <p><strong>Gemäß DSGVO (EU) 2016/679</strong></p>

      <h2>Verantwortlicher</h2>
      <p>
        RFI-IRFOS (Research Focus Institute — Interdisciplinary Research Facility for Open Sciences)<br />
        Elisabethinergasse 25/10, 8020 Graz, Austria<br />
        E-Mail: <a href="mailto:rfi.irfos@gmail.com">rfi.irfos@gmail.com</a>
      </p>
      <p>
        Sprachcoaching-Dienstleistung: <strong>{brand}</strong>
        {email && <> · <a href={`mailto:${email}`}>{email}</a></>}
      </p>

      <h2>Erhobene Daten</h2>
      <p>
        Server-Logs: IP-Adresse, Zugriffszeitpunkt, URL, HTTP-Statuscode, Referrer, User-Agent (durch GitHub Pages erhoben, nicht durch uns kontrolliert).<br />
        Kontaktformular: Name, E-Mail-Adresse, Telefonnummer (optional), Nachrichteninhalt — übermittelt über Web3Forms (<a href="https://web3forms.com/privacy" target="_blank" rel="noopener">web3forms.com/privacy</a>).<br />
        Sprachpräferenz und Farbschema: ausschließlich lokal im Browser (localStorage), kein Server-Zugriff.
      </p>

      <h2>Zweck der Verarbeitung</h2>
      <p>Kontaktformular-Daten werden ausschließlich zur Beantwortung von Anfragen und zur Terminvereinbarung für Sprachcoaching verwendet. Es erfolgt keine Weitergabe an Dritte zu Werbezwecken.</p>

      <h2>Hosting</h2>
      <p>
        Diese Website wird über GitHub Pages (GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA) gehostet.
        Die Datenschutzerklärung von GitHub ist abrufbar unter: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener">docs.github.com/privacy</a>
      </p>

      <h2>Cookies</h2>
      <p>Diese Website verwendet keine Tracking-Cookies. Technisch notwendige Speicherung (localStorage) wird ausschließlich für Sprachpräferenz und Farbschema verwendet.</p>

      <h2>Aufbewahrung</h2>
      <p>Kontaktanfragen werden nach Abschluss der Kommunikation gelöscht, spätestens nach 7 Jahren gemäß österreichischer Aufbewahrungspflicht.</p>

      <h2>Ihre Rechte</h2>
      <p>Sie haben gemäß Art. 15–21 DSGVO das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich dazu an: <a href="mailto:rfi.irfos@gmail.com">rfi.irfos@gmail.com</a></p>

      <h2>Beschwerderecht</h2>
      <p>Sie haben das Recht, eine Beschwerde bei der <a href="https://www.dsb.gv.at" target="_blank" rel="noopener">Österreichischen Datenschutzbehörde (dsb.gv.at)</a> einzureichen.</p>
    </>
  )
}

function AgbContent({ brand }: { brand: string }) {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <p><strong>Anbieter:</strong> RFI-IRFOS, Elisabethinergasse 25/10, 8020 Graz, Austria (ZVR 1015608684) — Rechnungsstellung und Website-Betrieb im Auftrag von <strong>{brand}</strong></p>

      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für alle Sprachcoaching-Leistungen von <strong>{brand}</strong>, vermittelt und abgerechnet über RFI-IRFOS.</p>

      <h2>2. Leistungserbringung</h2>
      <p>Die konkreten Leistungen (Einzelstunden, Pakete, Formate) und Konditionen werden individuell vereinbart. Die Beschreibungen auf dieser Website dienen der Orientierung und stellen kein verbindliches Angebot dar.</p>

      <h2>3. Preise &amp; Zahlung</h2>
      <p>Einzelstunden liegen je nach Format, Häufigkeit und individuellem Bedarf zwischen €25 und €40. Paketpreise werden separat vereinbart. Rechnungen sind innerhalb von 14 Tagen zu begleichen. Die Mehrwertsteuer ist, soweit gesetzlich erforderlich, im ausgewiesenen Preis enthalten.</p>

      <h2>4. Stornierung &amp; Absage</h2>
      <p>Absagen sind mindestens 24 Stunden vor dem vereinbarten Termin mitzuteilen. Bei kurzfristiger Absage (unter 24 Stunden) ohne wichtigen Grund kann ein Ausfallhonorar in Höhe von 50 % der vereinbarten Stunde verrechnet werden.</p>

      <h2>5. Haftung</h2>
      <p>Die Haftung von RFI-IRFOS und {brand} beschränkt sich auf Vorsatz und grobe Fahrlässigkeit. Eine Haftung für leichte Fahrlässigkeit, indirekte Schäden oder einen bestimmten Lernerfolg ist gesetzlich ausgeschlossen, soweit zulässig.</p>

      <h2>6. Änderungen dieser AGB</h2>
      <p>Änderungen werden mit einer Frist von 30 Tagen per E-Mail angekündigt. Die fortgesetzte Nutzung der Dienste gilt als Zustimmung.</p>

      <h2>7. Anwendbares Recht &amp; Gerichtsstand</h2>
      <p>Es gilt österreichisches Recht. Gerichtsstand ist Graz, Österreich.</p>

      <h2>8. Kontakt</h2>
      <p><a href="mailto:rfi.irfos@gmail.com">rfi.irfos@gmail.com</a></p>
    </>
  )
}
