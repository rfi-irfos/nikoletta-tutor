import { useState, useEffect } from 'react'
import { ghRead, ghWrite, b64Encode, b64Decode, isConfigured } from './github'
import type { Testimonial } from '../types/testimonials'

const TESTIMONIALS_PATH = 'frontend/public/testimonials.json'

export function useTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [sha, setSha] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      if (isConfigured()) {
        const file = await ghRead(TESTIMONIALS_PATH)
        setSha(file.sha)
        setTestimonials(JSON.parse(b64Decode(file.content)))
      } else {
        const res = await fetch('testimonials.json')
        if (res.ok) setTestimonials(await res.json())
      }
    } catch {
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  async function persist(next: Testimonial[]) {
    setSaving(true)
    setSaveError(false)
    try {
      const encoded = b64Encode(JSON.stringify(next, null, 2))
      const file = await ghWrite(TESTIMONIALS_PATH, encoded, sha, 'update: testimonials')
      setSha(file.sha)
      setTestimonials(next)
    } catch (e) {
      console.error('Testimonials save failed:', e)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  function add(t: Omit<Testimonial, 'id'>) {
    persist([...testimonials, { ...t, id: Date.now().toString() }])
  }

  function update(id: string, patch: Partial<Testimonial>) {
    persist(testimonials.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function remove(id: string) {
    persist(testimonials.filter(t => t.id !== id))
  }

  return { testimonials, loading, saving, saveError, add, update, remove }
}
