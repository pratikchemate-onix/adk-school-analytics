import { useState, useEffect } from 'react'
import { DARK_COLORS, LIGHT_COLORS } from './chartUtils'

export function useThemeColors() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const detect = () =>
      document.documentElement.getAttribute('data-theme') !== 'light'

    setIsDark(detect())

    const observer = new MutationObserver(() => setIsDark(detect()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark ? DARK_COLORS : LIGHT_COLORS
}
