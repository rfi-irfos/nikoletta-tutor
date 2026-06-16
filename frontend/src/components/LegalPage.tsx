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
        <a href="#" className="static-page-back">
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
            <p style={{ color: 'var(--muted, #888)', marginTop: '2rem' }}>Diese Seite konnte nicht gefunden werden.</p>
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
      <h2>Diensteanbieter</h2>
      <p><strong>{brand}</strong></p>
      {address && <p>{address}</p>}
      {phone && <p>Tel: <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></p>}
      {email && <p>E-Mail: <a href={`mailto:${email}`}>{email}</a></p>}
      <h2>Haftungsausschluss</h2>
      <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.</p>
      <h2>Urheberrecht</h2>
      <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf dieser Website unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
    </>
  )
}

function DatenschutzContent({ brand, email }: { brand: string; email?: string }) {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <p><strong>Gemäß DSGVO (EU) 2016/679</strong></p>
      <h2>Verantwortlicher</h2>
      <p>{brand}{email && <> · <a href={`mailto:${email}`}>{email}</a></>}</p>
      <h2>Erhebung und Verarbeitung von Daten</h2>
      <p>Diese Website erhebt keine personenbezogenen Daten ohne Ihre ausdrückliche Einwilligung. Beim Besuch dieser Website werden technisch notwendige Daten (z.B. IP-Adresse, Zeitpunkt des Abrufs) durch den Hosting-Anbieter gespeichert.</p>
      <h2>Hosting</h2>
      <p>Diese Website wird über GitHub Pages (GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA) gehostet. Die Datenschutzerklärung von GitHub finden Sie unter: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener">github.com/privacy</a></p>
      <h2>Cookies</h2>
      <p>Diese Website verwendet keine Tracking-Cookies. Technisch notwendige Speicherung (localStorage) wird ausschließlich für die Funktionalität der Website verwendet.</p>
      <h2>Ihre Rechte</h2>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer personenbezogenen Daten sowie das Recht auf Datenübertragbarkeit und Widerspruch. Wenden Sie sich dazu an die oben genannte Kontaktadresse.</p>
      <h2>Beschwerderecht</h2>
      <p>Sie haben das Recht, eine Beschwerde bei der <a href="https://www.dsb.gv.at" target="_blank" rel="noopener">Österreichischen Datenschutzbehörde</a> einzureichen.</p>
    </>
  )
}

function AgbContent({ brand }: { brand: string }) {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <h2>1. Geltungsbereich</h2>
      <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Leistungen von <strong>{brand}</strong> an Kunden.</p>
      <h2>2. Leistungserbringung</h2>
      <p>Die konkreten Leistungen, Preise und Konditionen werden individuell vereinbart und in einem gesonderten Vertrag festgehalten.</p>
      <h2>3. Zahlung</h2>
      <p>Zahlungsbedingungen werden individuell vereinbart. Rechnungen sind innerhalb der vereinbarten Frist zu begleichen.</p>
      <h2>4. Stornierung</h2>
      <p>Stornierungen sind mindestens 24 Stunden vor dem vereinbarten Termin mitzuteilen. Bei kurzfristiger Absage kann ein Ausfallhonorar verrechnet werden.</p>
      <h2>5. Haftung</h2>
      <p>Die Haftung beschränkt sich auf Vorsatz und grobe Fahrlässigkeit. Eine Haftung für den Lernerfolg kann nicht übernommen werden.</p>
      <h2>6. Anwendbares Recht</h2>
      <p>Es gilt österreichisches Recht. Gerichtsstand ist der Sitz des Dienstleisters.</p>
    </>
  )
}
