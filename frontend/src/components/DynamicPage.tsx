import { useEffect } from 'react'
import type { SiteContent, PageItem } from '../types/content'

export function DynamicPage({ page, content }: { page: PageItem; content: SiteContent }) {
  useEffect(() => { window.scrollTo(0, 0) }, [page.id])
  useEffect(() => {
    const prev = document.title
    document.title = page.metaTitle ?? `${page.title} — ${content.meta?.title ?? ''}`
    return () => { document.title = prev }
  }, [page.id, page.metaTitle, page.title, content.meta?.title])

  return (
    <div className="static-page">
      <header className="static-page-nav">
        <a href="#" className="static-page-brand">{content.nav?.brand ?? 'Website'}</a>
        <a href="#" className="static-page-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zur Startseite
        </a>
      </header>
      <main className="static-page-main">
        <div className="static-page-content">
          <h1>{page.title}</h1>
          <div className="dynamic-page-body" dangerouslySetInnerHTML={{ __html: page.body }} />
        </div>
      </main>
    </div>
  )
}
