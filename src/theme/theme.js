import * as THREE from 'three'
import { palette, C, SERIES } from './palette.js'
import { resetBackground } from '../lib/textures.js'

// Theme manager. Background, glow blending, bloom, AND accent colors all adapt:
// dark theme uses softened neon on near-black; light theme uses darker, saturated
// accents that stay clearly visible on the light backdrop. Scenes read these at
// init() time, so a theme switch re-initialises the current chapter.
const KEY = 'net-theme'

const ACCENTS = {
  dark: {
    cyan: '#34C8DB',
    violet: '#9D6BEA',
    magenta: '#E263A4',
    amber: '#E0A24A',
    lime: '#A6CF66',
    blue: '#4C82E8',
    rose: '#F2849A',
  },
  light: {
    // darker + more saturated so they read on a light-gray scene background
    cyan: '#0E8FA6',
    violet: '#7C46C8',
    magenta: '#C43F86',
    amber: '#B5791E',
    lime: '#5E8A2E',
    blue: '#3A66C8',
    rose: '#D85C76',
  },
}

const THEMES = {
  dark: { void: '#06070C', void2: '#0B0F1B', hot: '#EEF2FB', bloom: 0.82, additive: true, accents: ACCENTS.dark },
  light: { void: '#E7EBF2', void2: '#F5F7FC', hot: '#0C1424', bloom: 0.08, additive: false, accents: ACCENTS.light },
}

let _name = 'dark'
try {
  _name = localStorage.getItem(KEY) || 'dark'
} catch {}
if (!THEMES[_name]) _name = 'dark'
let _cfg = THEMES[_name]

export const getTheme = () => _name
export const isLight = () => _name === 'light'
export const bloomScale = () => _cfg.bloom
export const blend = () => (_cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending)

function apply() {
  const a = _cfg.accents
  for (const k in a) {
    palette[k] = a[k]
    C[k].set(a[k])
  }
  palette.void = _cfg.void
  palette.void2 = _cfg.void2
  palette.hot = _cfg.hot
  C.void.set(_cfg.void)
  C.void2.set(_cfg.void2)
  C.hot.set(_cfg.hot)
  // keep SERIES (used for indexed colors) aligned with the live accents
  SERIES[0] = palette.cyan
  SERIES[1] = palette.magenta
  SERIES[2] = palette.amber
  SERIES[3] = palette.lime
  SERIES[4] = palette.violet
  SERIES[5] = palette.rose
  SERIES[6] = palette.blue
  resetBackground()
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = _name
}

export function initTheme() {
  apply()
}

export function setTheme(name) {
  if (!THEMES[name] || name === _name) return false
  _name = name
  _cfg = THEMES[name]
  try {
    localStorage.setItem(KEY, name)
  } catch {}
  apply()
  return true
}

export function toggleTheme() {
  setTheme(isLight() ? 'dark' : 'light')
  return _name
}
