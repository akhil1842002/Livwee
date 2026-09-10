export const ACCENT_COLORS = [
  { name: 'Violet',  primary: '#7C3AED', light: '#8B5CF6' },
  { name: 'Cyan',    primary: '#0891B2', light: '#06B6D4' },
  { name: 'Emerald', primary: '#059669', light: '#10B981' },
  { name: 'Rose',    primary: '#E11D48', light: '#F43F5E' },
  { name: 'Amber',   primary: '#D97706', light: '#F59E0B' },
  { name: 'Indigo',  primary: '#4338CA', light: '#6366F1' },
] as const

export type Accent = typeof ACCENT_COLORS[number]

export function getAccentStorageKey(email?: string): string {
  if (!email) return 'medikit-accent-default'
  return `medikit-accent-${email.trim().toLowerCase()}`
}

export function getUserAccent(email?: string): Accent {
  if (!email) {
    const savedDefault = localStorage.getItem('medikit-accent')
    return ACCENT_COLORS.find(c => c.primary === savedDefault) ?? ACCENT_COLORS[0]
  }
  const saved = localStorage.getItem(getAccentStorageKey(email)) || localStorage.getItem('medikit-accent')
  return ACCENT_COLORS.find(c => c.primary === saved) ?? ACCENT_COLORS[0]
}

export function applyAccent(c: Accent, email?: string) {
  const root = document.documentElement
  root.style.setProperty('--p', c.primary)
  root.style.setProperty('--p-light', c.light)
  root.style.setProperty('--color-orbit-primary', c.primary)
  root.style.setProperty('--color-orbit-primary-light', c.light)
  if (email) {
    localStorage.setItem(getAccentStorageKey(email), c.primary)
  }
  localStorage.setItem('medikit-accent', c.primary)
}
