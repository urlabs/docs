import * as THREE from 'three'

// The single source of truth for color. Mirrored into CSS variables in styles.css.
// Accent hues are shared by both themes; only `void`, `void2`, and `hot` are
// theme-dependent (mutated by theme.js). Brights are softened for eye comfort.
export const palette = {
  void: '#06070C', // background base (theme-dependent)
  void2: '#0B0F1B', // background mid (theme-dependent)
  cyan: '#34C8DB', // primary data / forward flow (softened from electric cyan)
  violet: '#9D6BEA', // structure / depth
  magenta: '#E263A4', // negative weights / contrast / head 2 (softened)
  amber: '#E0A24A', // activation / highlights (softened from harsh yellow)
  hot: '#EEF2FB', // hot cores / focus (theme-dependent; near-white in dark)
  ink: '#E6EAF2', // body text
  muted: '#8A93A6', // secondary text
  // extended accents for multi-head attention, experts, modalities
  lime: '#A6CF66', // softened from harsh lime
  blue: '#4C82E8',
  rose: '#F2849A',
}

// THREE.Color instances, keyed the same way (scene code reads C.cyan, etc.).
// Theme-dependent entries are kept in sync by theme.js via C.<key>.set(...).
export const C = Object.fromEntries(
  Object.entries(palette).map(([k, v]) => [k, new THREE.Color(v)]),
)

// Stable, perceptually-distinct colors for indexed things (attention heads, experts).
// Deliberately excludes theme-dependent `hot` so seriesColor is theme-safe.
export const SERIES = [
  palette.cyan,
  palette.magenta,
  palette.amber,
  palette.lime,
  palette.violet,
  palette.rose,
  palette.blue,
]

export const seriesColor = (i) => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length]
