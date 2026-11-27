
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

/**
 * Scène de scroll de la LANDING uniquement (jamais dans /app).
 * - Lenis piloté par le ticker GSAP (une seule boucle rAF).
 * - `progress` : 0 → ACTS.length, lu par CameraRig dans useFrame (ref, pas de state React).
 * - `velocity` : lu par l'aberration chromatique (proportionnelle à la vitesse de scroll).
 */
export const stageState = { progress: 0, velocity: 0, /** Vale's screen x for the stereo panner, −0.6…0.6 */ pan: 0 }

/**
 * The act on screen (the section under the viewport's centre), decided by the
 * DOM: the dress code's act is four screens tall, so scroll progress alone
 * would call act 5 halfway through it.
 */
type ActListener = (act: number, from: number) => void
const actListeners = new Set<ActListener>()
export const actBus = {
  current: 0,
  set(n: number) {
    if (n === actBus.current) return
    const from = actBus.current
    actBus.current = n
    actListeners.forEach((l) => l(n, from))
  },
  subscribe(l: ActListener) {
    actListeners.add(l)
    return () => {
      actListeners.delete(l)
    }
  },
}

export function createStage(root: HTMLElement, actSelector = '[data-act]') {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const lenis = reduced ? null : new Lenis({ autoRaf: false, lerp: 0.09, smoothWheel: true })

  const tick = (time: number) => lenis?.raf(time * 1000)
  if (lenis) {
    lenis.on('scroll', (l: Lenis) => {
      stageState.velocity = l.velocity
      ScrollTrigger.update()
    })
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }

  const acts = Array.from(root.querySelectorAll<HTMLElement>(actSelector))
  const triggers = acts.map((act, i) =>
    ScrollTrigger.create({
      trigger: act,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        stageState.progress = i + self.progress
      },
    }),
  )

  // Révélation des titres mot par mot (une seule fois par acte)
  const splits = acts.map((act) => {
    const title = act.querySelector<HTMLElement>('[data-split]')
    if (!title || reduced) return null
    const split = SplitText.create(title, { type: 'words', mask: 'words' })
    gsap.from(split.words, {
      yPercent: 110,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: act, start: 'top 70%', once: true },
    })
    return split
  })

  return {
    lenis,
    destroy() {
      gsap.ticker.remove(tick)
      triggers.forEach((t) => t.kill())
      splits.forEach((s) => s?.revert())
      lenis?.destroy()
    },
  }
}
