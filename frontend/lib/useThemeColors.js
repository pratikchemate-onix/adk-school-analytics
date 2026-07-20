import { useState, useEffect } from 'react'
import { DARK_COLORS } from './chartUtils'

// Compute a font scale factor (0.72 – 1.0) from the current viewport width.
function computeFontScale(w) {
  if (w < 480)  return 0.72
  if (w < 640)  return 0.80
  if (w < 900)  return 0.88
  if (w < 1200) return 0.94
  return 1.0
}

export function useThemeColors() {
  const [fontScale, setFontScale] = useState(1.0)

  useEffect(() => {
    // ── Font scale (viewport-responsive) ─────────────────────────────────────
    const updateScale = () => setFontScale(computeFontScale(window.innerWidth))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // Charts are ALWAYS dark — they live in their own dark universe regardless
  // of whether the app shell is in light or dark mode. This keeps charts
  // vibrant and consistent no matter what the user's theme preference is.
  return {
    colors: DARK_COLORS,
    fontScale,
  }
}
