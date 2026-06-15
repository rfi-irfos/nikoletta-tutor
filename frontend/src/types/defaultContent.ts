import type { SiteContent } from './content'

export const defaultContent: SiteContent = {
  meta: {
    title: 'e-techbike.at — Elektromobilität Graz',
    description: 'Premium E-Bikes, E-Scooter und E-Motorräder. Direktimporteur in Graz. 2 Jahre Garantie.',
    primaryColor: '#0099CC',
    accentColor: '#B3E600',
    font: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  nav: {
    logo: 'uploads/etb-logo.jpg',
    brand: 'e-techbike.at',
    links: [
      { label: 'Kategorien', href: '#categories' },
      { label: 'Produkte', href: '#products' },
      { label: 'Standort', href: '#location' },
      { label: 'Förderungen', href: '#location' },
      { label: 'Neuigkeiten', href: '#news' },
    ],
    phone: '+43 664 7372 6965',
    ctaLabel: 'Beratung anfragen',
    ctaHref: '#location',
  },
  hero: {
    tag: 'Direktimporteur · Graz · Österreich',
    headline: 'Elektro&shy;mobilität.<br><span>Jetzt.</span>',
    subheadline: 'Premium E-Bikes, E-Scooter und E-Motorräder — direkt vom Hersteller, mit voller Garantie und persönlicher Beratung in Graz.',
    ctaLabel: 'Shop entdecken',
    ctaHref: '#products',
    ctaSecLabel: 'Beratung anfragen',
    ctaSecHref: '#location',
    image: 'uploads/etb-rks-mx25.jpg',
    bgX: 50,
    bgY: 40,
    minHeight: 680,
  },
  trust: {
    items: [
      { id: 't1', icon: 'delivery', bold: '5–7 Tage', text: 'Versand österreichweit' },
      { id: 't2', icon: 'shield', bold: '2 Jahre', text: 'Herstellergarantie' },
      { id: 't3', icon: 'tag', bold: 'Direktimport', text: 'kein Aufschlag' },
      { id: 't4', icon: 'location', bold: 'Beratung', text: 'in Graz' },
    ],
  },
  categories: {
    eyebrow: 'Sortiment',
    title: 'Für jeden das richtige Fahrzeug',
    items: [
      { id: 'c1', name: 'E-Bikes', sub: 'City · Faltrad · Mountain', image: 'uploads/etb-rks-faltbike.jpg' },
      { id: 'c2', name: 'E-Mopeds', sub: '25 km/h · 45 km/h', image: 'uploads/etb-tailg-runner.png' },
      { id: 'c3', name: 'E-Scooter', sub: 'Führerscheinfrei', image: 'uploads/etb-escooter.png' },
      { id: 'c4', name: 'Seniorenmobile', sub: 'Komfort & Sicherheit', image: 'uploads/etb-kuba-grape.png' },
      { id: 'c5', name: 'Batterien & Akkus', sub: 'Lithium · Bleigel', image: 'uploads/etb-akku-48v.jpg' },
      { id: 'c6', name: 'Neue Modelle', sub: 'Jetzt verfügbar', image: 'uploads/etb-ebike2.jpg' },
    ],
  },
  products: {
    title: 'Bestseller',
    tabs: ['Alle', 'E-Bikes', 'E-Mopeds', 'E-Scooter', 'Senioren', 'Batterien'],
    items: [
      {
        id: 'p1', name: 'RKS Falt-E-Bike Pro', badge: 'Bestseller',
        category: 'E-Bikes', description: 'Kompaktes Falt-E-Bike für Stadt und Alltag.',
        price: 'ab €899', image: 'uploads/etb-rks-faltbike.jpg',
        specs: ['48V', '20Ah', '80 km', 'Shimano 7G'],
      },
      {
        id: 'p2', name: 'RKS MX25 PRO Faltrad', badge: '',
        category: 'E-Bikes', description: 'Führerscheinfreies 25 km/h Faltrad mit 250W Motor.',
        price: 'ab €799', image: 'uploads/etb-rks-mx25.jpg',
        specs: ['25 km/h', '250W', '35–45 km', 'führerscheinfrei'],
      },
      {
        id: 'p3', name: 'TailG E-Moped Runner', badge: 'Beliebt',
        category: 'E-Mopeds', description: 'Straßenzugelassenes E-Moped mit Topcase inklusive.',
        price: 'ab €1.290', image: 'uploads/etb-tailg-runner.png',
        specs: ['45 km/h', '60 km', 'Topcase', 'StVO'],
      },
      {
        id: 'p4', name: 'Bikely ZL9 E-Scooter', badge: '',
        category: 'E-Scooter', description: 'Kompakter Stadtscooter, führerscheinfrei.',
        price: 'ab €690', image: 'uploads/etb-bikely-zl9.jpg',
        specs: ['25 km/h', '45 km', 'kompakt', 'führerscheinfrei'],
      },
      {
        id: 'p5', name: 'Lithium Akku 48V 25Ah', badge: '',
        category: 'Batterien', description: 'Hochleistungs-Akku mit BMS-Schutz und 5 Jahren Garantie.',
        price: 'ab €599', image: 'uploads/etb-akku-48v.jpg',
        specs: ['48V', '25Ah', 'BMS', '3.000+ Zyklen'],
      },
      {
        id: 'p6', name: 'KUBA Grape 25 MAX', badge: '',
        category: 'Senioren', description: 'Überdachtes 3-rädriges Seniorenmobil mit CE/EEC-Zulassung.',
        price: 'ab €1.890', image: 'uploads/etb-kuba-grape.png',
        specs: ['25 km/h', '3-rädrig', 'Überdachung', 'CE/EEC'],
      },
    ],
  },
  usp: {
    eyebrow: 'Warum e-techbike.at?',
    title: 'Was uns unterscheidet',
    items: [
      { id: 'u1', title: 'Direktimport-Preise', description: 'Kein Zwischenhändler. Wir importieren direkt vom Hersteller und geben die volle Ersparnis weiter.' },
      { id: 'u2', title: '2 Jahre Garantie', description: 'Herstellergarantie auf alle Fahrzeuge und Akkus. Reparatur und Ersatzteile direkt bei uns.' },
      { id: 'u3', title: 'Persönliche Beratung', description: 'Testfahrten und Beratung vor Ort in Graz. Terminvereinbarung per Anruf oder E-Mail.' },
      { id: 'u4', title: 'Schnelle Lieferung', description: 'Österreichweiter Versand in 5–7 Werktagen. Vollversichert und mit Sendungsverfolgung.' },
      { id: 'u5', title: 'Förderungsberatung', description: 'Bis zu €3.000 staatliche Förderung. Wir begleiten Sie kostenlos durch die Beantragung.' },
      { id: 'u6', title: 'Werkstatt & Service', description: 'Vollständige Werkstatt in Graz. Wartung, Zubehör und Ersatzteile immer verfügbar.' },
    ],
  },
  news: {
    eyebrow: 'Neuigkeiten',
    title: 'Aktuell bei e-techbike.at',
    items: [
      {
        id: 'n1', date: '2024-06-01',
        title: 'Neue RKS E-Bike Modelle 2024 eingetroffen',
        body: 'Wir freuen uns, die neueste Kollektion der RKS E-Bikes in unserem Showroom in Graz vorstellen zu können. Jetzt Probefahrt vereinbaren!',
      },
      {
        id: 'n2', date: '2024-05-15',
        title: 'Bis zu €3.000 E-Bike Förderung — wir helfen!',
        body: 'Der Bund fördert die Anschaffung von E-Bikes und E-Rollern mit bis zu €3.000. Unser Team unterstützt Sie kostenlos bei der Antragstellung.',
      },
      {
        id: 'n3', date: '2024-04-20',
        title: 'Neue Werkstatt für alle Marken geöffnet',
        body: 'Unsere Werkstatt in der Ghegagasse 29 ist nun für alle E-Bike und E-Scooter Marken geöffnet. Wartung, Ersatzteile und Zubehör direkt vor Ort.',
      },
    ],
  },
  contact: {
    title: 'Besuchen Sie uns in Graz.',
    subtitle: 'Persönliche Beratung, Testfahrten und direkte Abholung. Wir freuen uns auf Ihren Besuch.',
    email: 'graz@bikelyshop.at',
    phone: '+43 664 7372 6965',
    address: 'Ghegagasse 29, 8020 Graz, Österreich',
    whatsapp: '+436647372965',
    mapSrc: 'https://maps.google.com/maps?q=Ghegagasse+29,+8020+Graz,+Austria&output=embed&z=16',
    formEnabled: true,
  },
  whatsapp: {
    enabled: true,
    number: '+436647372965',
    message: 'Hallo! Ich interessiere mich für Ihre E-Bikes und möchte eine Beratung.',
  },
  footer: {
    brand: 'e-techbike.at',
    tagline: 'Direktimporteur für Premium-Elektromobilität',
    description: 'Österreichs Direktimporteur für Premium-Elektromobilität. Beratung, faire Preise, voller Service in Graz.',
    cols: [
      {
        title: 'Shop',
        links: [
          { label: 'E-Bikes', href: '#products' },
          { label: 'E-Scooter', href: '#products' },
          { label: 'E-Motorräder', href: '#products' },
          { label: 'Kabinenroller', href: '#products' },
          { label: 'Batterien', href: '#products' },
        ],
      },
      {
        title: 'Service',
        links: [
          { label: 'Über uns', href: '#location' },
          { label: 'Förderungen', href: '#location' },
          { label: 'Wie kaufen?', href: '#location' },
          { label: 'Akku-Pflege', href: '#location' },
          { label: 'Wartung', href: '#location' },
        ],
      },
      {
        title: 'Rechtliches',
        links: [
          { label: 'AGB', href: '/agb' },
          { label: 'Datenschutz', href: '/datenschutz' },
          { label: 'Impressum', href: '/impressum' },
          { label: 'Kontakt', href: '#location' },
        ],
      },
    ],
    links: [
      { label: 'AGB', href: '/agb' },
      { label: 'Datenschutz', href: '/datenschutz' },
      { label: 'Impressum', href: '/impressum' },
    ],
    copyright: '© 2026 e-techbike.at — made with love by RFI-IRFOS',
  },
}
