import { useState, useEffect } from 'react'
import { DARK_COLORS, LIGHT_COLORS } from './chartUtils'

// Compute a font scale factor (0.72 – 1.0) from the current viewport width.
function computeFontScale(w) {
  if (w < 480)  return 0.72
  if (w < 640)  return 0.80
  if (w < 900)  return 0.88
  if (w < 1200) return 0.94
  return 1.0
}

function readTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

// Tracks the app's `data-theme` attribute (set by the theme toggle in
// app/page.jsx) so components can react to light/dark switches.
export function useAppTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const target = document.documentElement
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

export function useThemeColors() {
  const [fontScale, setFontScale] = useState(1.0)
  const theme = useAppTheme()

  useEffect(() => {
    // ── Font scale (viewport-responsive) ─────────────────────────────────────
    const updateScale = () => setFontScale(computeFontScale(window.innerWidth))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return {
    colors: theme === 'light' ? LIGHT_COLORS : DARK_COLORS,
    fontScale,
  }
}
