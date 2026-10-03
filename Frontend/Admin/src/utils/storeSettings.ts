export interface StoreSettings {
  storeName: string
  tagline: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin: string
  pan: string
  drugLicense: string
  termsAndConditions: string
}

export const STORE_SETTINGS_KEY = 'livwee_store_settings'

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Livwee Pharmacy',
  tagline: 'Pharmacy Management System',
  address: 'Ground Floor, Livwee Building',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  phone: '+91 22 1234 5678',
  email: 'billing@livwee.io',
  gstin: '27AABCL1234A1Z9',
  pan: 'AABCL1234A',
  drugLicense: 'MH-MUM-12345 / DL-67890',
  termsAndConditions: 'Subject to local jurisdiction. Goods once sold can be returned within 7 days with original invoice.',
}

export function getStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(STORE_SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_STORE_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.warn('Failed to parse store settings from localStorage:', err)
  }
  return { ...DEFAULT_STORE_SETTINGS }
}

export function saveStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
  const current = getStoreSettings()
  const updated = { ...current, ...settings }
  try {
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('store-settings-updated'))
  } catch (err) {
    console.error('Failed to save store settings:', err)
  }
  return updated
}

export function formatFullAddress(s: StoreSettings): string {
  const parts = [s.address, s.city, s.state ? `${s.state} – ${s.pincode}` : s.pincode].filter(Boolean)
  return parts.join(', ')
}
