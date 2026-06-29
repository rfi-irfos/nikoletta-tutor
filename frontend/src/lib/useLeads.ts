import { useState, useEffect } from 'react'
import { proxyRead, proxyWrite, b64Encode, b64Decode } from './github'
import type { Lead } from '../types/leads'

const LEADS_PATH = 'data/leads.json'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const file = await proxyRead(LEADS_PATH)
      setLeads(JSON.parse(b64Decode(file.content)))
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
      await proxyWrite(LEADS_PATH, b64Encode(JSON.stringify(next, null, 2)))
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
