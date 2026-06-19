export interface NavLink { label: string; href: string; tab?: string }
export interface FeatureItem { id: string; title: string; description: string }

export interface ProductItem {
  id: string
  name: string
  description: string
  price: string
  image: string
  images?: string[]
  badge?: string
  category: string
  specs?: string[]
}

export interface PageItem {
  id: string
  title: string
  slug: string
  body: string
  showInNav?: boolean
  metaTitle?: string
}

export interface CategoryItem {
  id: string
  name: string
  sub: string
  image: string
  href?: string
  tab?: string   // which Sessions filter tab this audience drills into
}

export interface NewsItem {
  id: string
  date: string
  title: string
  body: string
  image?: string
}

export interface TrustItem {
  id: string
  icon: string
  bold: string
  text: string
}

export interface CertificateItem {
  id: string
  title: string
  subtitle: string
  file: string
}

export type SectionId = 'trust' | 'categories' | 'products' | 'usp' | 'news' | 'location'
export const DEFAULT_SECTION_ORDER: SectionId[] = ['trust', 'categories', 'products', 'usp', 'news', 'location']

export interface CanvasPos { x: number; y: number }

export interface AboutStat { value: string; label: string }

export interface SiteContent {
  sectionOrder?: SectionId[]
  hiddenSections?: SectionId[]
  pages?: PageItem[]
  positions?: Record<string, CanvasPos>
  about?: {
    eyebrow?: string
    headline: string
    bio: string
    photo?: string
    stats?: AboutStat[]
  }
  meta: {
    title: string
    description: string
    primaryColor: string
    accentColor: string
    font: string
  }
  nav: {
    logo: string
    brand: string
    links: NavLink[]
    phone?: string
    ctaLabel?: string
    ctaHref?: string
  }
  hero: {
    tag?: string
    headline: string
    subheadline: string
    ctaLabel: string
    ctaHref: string
    ctaSecLabel?: string
    ctaSecHref?: string
    image: string
    bgX?: number
    bgY?: number
    minHeight?: number
  }
  trust: { items: TrustItem[] }
  categories: { eyebrow?: string; title: string; items: CategoryItem[] }
  products: { title: string; tabs: string[]; items: ProductItem[] }
  usp: { eyebrow?: string; title: string; items: FeatureItem[] }
  news: { eyebrow?: string; title: string; items: NewsItem[] }
  contact: {
    title: string
    subtitle?: string
    photo?: string
    email: string
    phone: string
    address: string
    whatsapp?: string
    mapSrc?: string
    formEnabled?: boolean
  }
  whatsapp: { enabled: boolean; number: string; message: string }
  pricing?: { title: string; body: string }
  certificates?: { title?: string; items: CertificateItem[] }
  ssp?: {
    badge?: string
    title?: string
    sub?: string
    button?: string
  }
  research?: {
    form?: Record<string, string>
    landing?: Record<string, string>
  }
  footer: {
    brand: string
    tagline: string
    description?: string
    cols: Array<{ title: string; links: NavLink[] }>
    links: NavLink[]
    copyright: string
  }
}
