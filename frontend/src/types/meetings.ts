export interface Meeting {
  id: string
  title: string
  studentId?: string          // optional link to a Student
  person: string              // attendee name (from student or free text)
  date: string                // YYYY-MM-DD
  time: string                // HH:MM (24h)
  duration: number            // minutes
  type: 'trial' | 'lesson' | 'meeting' | 'call'
  location: string            // online link, address, or note
  notes: string
  status: 'scheduled' | 'done' | 'cancelled'
  created: string             // ISO date
}
