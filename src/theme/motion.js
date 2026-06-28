// Motion vocabulary — shared so every chapter moves with the same cadence.
export const DUR = { fast: 0.45, base: 0.85, slow: 1.6, epic: 2.8 }

export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  expo: 'expo.out',
  back: 'back.out(1.6)',
  elastic: 'elastic.out(1, 0.6)',
}

let _reduced = null
export function reducedMotion() {
  if (_reduced === null) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    _reduced = mq.matches
    mq.addEventListener?.('change', (e) => (_reduced = e.matches))
  }
  return _reduced
}

// Tiny helpers used all over the scene code.
export const lerp = (a, b, t) => a + (b - a) * t
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const clamp01 = (v) => clamp(v, 0, 1)
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
// Map x in [a,b] to [c,d], clamped.
export const remap = (x, a, b, c, d) => c + (clamp01((x - a) / (b - a)) * (d - c))
// Frame-rate independent damping toward a target.
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt))
