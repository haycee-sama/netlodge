// lib/format.ts
// Shared formatting helpers used across student, landlord, and admin
// areas. Previously each area redefined its own currency/date formatting
// inline (e.g. `₦${x.toLocaleString()}`, ad-hoc toLocaleDateString calls,
// and a local timeAgo() inside NotificationBell.jsx).

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString()}`
}

export function formatDateShort(dateInput: string | Date): string {
  if (!dateInput) return '—'
  return new Date(dateInput).toLocaleDateString()
}

export function formatDateLong(dateInput: string | Date): string {
  if (!dateInput) return ''
  return new Date(dateInput).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(dateInput: string | Date): string {
  if (!dateInput) return ''
  return new Date(dateInput).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}