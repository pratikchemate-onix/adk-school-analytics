import { useState, useEffect } from 'react'
import { DARK_COLORS, LIGHT_COLORS } from './chartUtils'

// Compute a font scale factor (0.72 – 1.0) from the current viewport width.
// This is multiplied against all ECharts pixel font sizes in chartUtils.js
// via getChartFonts(scale), giving the charts fluid, screen-responsive typography.
function computeFontScale(w) {
  if (w < 480)  return 0.72
  if (w < 640)  return 0.80
  if (w < 900)  return 0.88
  if (w < 1200) return 0.94
  return 1.0
}

export function useThemeColors() {
  const [isDark,    setIsDark]    = useState(true)
  const [fontScale, setFontScale] = useState(1.0)

  useEffect(() => {
    // ── Theme detection ───────────────────────────────────────────────────────
    const detect = () =>
      document.documentElement.getAttribute('data-theme') !== 'light'

    setIsDark(detect())

    const observer = new MutationObserver(() => setIsDark(detect()))
    observer.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ['data-theme'],
    })

    // ── Font scale (viewport-responsive) ─────────────────────────────────────
    const updateScale = () => setFontScale(computeFontScale(window.innerWidth))
    updateScale()
    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  return {
    colors:    isDark ? DARK_COLORS : LIGHT_COLORS,
    fontScale,
  }
}
