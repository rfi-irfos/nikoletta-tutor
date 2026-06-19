import { useState, useEffect } from 'react'
import { ghRead, ghWrite, b64Encode, b64Decode, isConfigured } from './github'
import type { Lead } from '../types/leads'

const LEADS_PATH = 'frontend/public/leads.json'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [sha, setSha] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      if (isConfigured()) {
        const file = await ghRead(LEADS_PATH)
        setSha(file.sha)
        setLeads(JSON.parse(b64Decode(file.content)))
      } else {
        const res = await fetch('leads.json')
        if (res.ok) setLeads(await res.json())
      }
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  async function save(next: Lead[]) {
    setSaving(true)
    setSaveError(false)
    try {
      const encoded = b64Encode(JSON.stringify(next, null, 2))
      const file = await ghWrite(LEADS_PATH, encoded, sha, 'update: pipeline leads')
      setSha(file.sha)
      setLeads(next)
    } catch (e) {
      console.error('Lead save failed:', e)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  function add(l: Omit<Lead, 'id' | 'created' | 'updated'>): Lead {
    const now = new Date().toISOString()
    const lead: Lead = { ...l, id: Date.now().toString(), created: now, updated: now }
    save([...leads, lead])
    return lead
  }

  function update(id: string, patch: Partial<Lead>) {
    save(leads.map(l => l.id === id ? { ...l, ...patch, updated: new Date().toISOString() } : l))
  }

  function remove(id: string) {
    save(leads.filter(l => l.id !== id))
  }

  return { leads, loading, saving, saveError, add, update, remove }
}
