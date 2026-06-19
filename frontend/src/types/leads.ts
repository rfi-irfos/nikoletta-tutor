export type LeadStage = 'anfrage' | 'kontakt' | 'gebucht' | 'rechnung' | 'abgeschlossen' | 'verloren'

export interface Invoice {
  number: string
  amount: number          // EUR
  sentDate: string        // YYYY-MM-DD
  paid: boolean
  paidDate?: string       // YYYY-MM-DD
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string          // e.g. Website, Empfehlung, Instagram
  stage: LeadStage
  value: number           // agreed/expected price (EUR)
  notes: string
  meetingId?: string      // linked booked session
  studentId?: string      // once converted to a student
  invoice?: Invoice
  created: string         // ISO
  updated: string         // ISO
}

export const LEAD_STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: 'anfrage',       label: 'Anfrage',       color: '#0099CC' },
  { id: 'kontakt',       label: 'Kontakt',       color: '#7A5CC4' },
  { id: 'gebucht',       label: 'Gebucht',       color: '#B8975A' },
  { id: 'rechnung',      label: 'Rechnung',      color: '#D98324' },
  { id: 'abgeschlossen', label: 'Abgeschlossen', color: '#3A7A3A' },
  { id: 'verloren',      label: 'Verloren',      color: '#999999' },
]
