export interface NavLink { label: string; href: string }
export interface FeatureItem { id: string; title: string; description: string }

export interface ProductItem {
  id: string
  name: string
  description: string
  price: string
  image: string
  badge?: string
  category: string
  specs?: string[]
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

export type SectionId = 'trust' | 'categories' | 'products' | 'usp' | 'news' | 'location'
export const DEFAULT_SECTION_ORDER: SectionId[] = ['trust', 'categories', 'products', 'usp', 'news', 'location']

export interface CanvasPos { x: number; y: number }

export interface SiteContent {
  sectionOrder?: SectionId[]
  positions?: Record<string, CanvasPos>
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
    email: string
    phone: string
    address: string
    whatsapp?: string
    mapSrc?: string
    formEnabled?: boolean
  }
  whatsapp: { enabled: boolean; number: string; message: string }
  footer: {
    brand: string
    tagline: string
    description?: string
    cols: Array<{ title: string; links: NavLink[] }>
    links: NavLink[]
    copyright: string
  }
}
