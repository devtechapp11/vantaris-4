
import { useEffect } from 'react'

/**
 * Filtre SVG de réfraction pour le Liquid Glass. Monté UNE fois à la racine.
 * La réfraction (backdrop-filter: url(#vt-liquid)) n'est rendue que par Chromium :
 * on n'active la classe `has-liquid` que là, Safari/Firefox gardent le flou simple.
 */
export function LiquidGlassFilter() {
  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData
      ?.brands
    const chromium = !!brands?.some((b) => b.brand === 'Chromium')
    document.documentElement.classList.toggle('has-liquid', chromium)
  }, [])

  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="vt-liquid" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves={2} seed={7} result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale={38} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
