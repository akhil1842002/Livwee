import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Restore accent color from localStorage before first render
// Must run synchronously before React mounts so all pages see the right color.
const ACCENT_MAP: Record<string, string> = {
  '#7C3AED': '#8B5CF6',
  '#0891B2': '#06B6D4',
  '#059669': '#10B981',
  '#E11D48': '#F43F5E',
  '#D97706': '#F59E0B',
  '#4338CA': '#6366F1',
}
;(function bootstrapAccent() {
  const saved = localStorage.getItem('medikit-accent')
  if (saved) {
    const light = ACCENT_MAP[saved] ?? saved
    const root = document.documentElement
    root.style.setProperty('--p', saved)
    root.style.setProperty('--p-light', light)
    root.style.setProperty('--color-orbit-primary', saved)
    root.style.setProperty('--color-orbit-primary-light', light)
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
