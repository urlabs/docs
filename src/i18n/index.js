// Language manager. English is the source of truth: chapter beats live in each
// chapter's index.js (mod.beats / mod.hero) and English UI in content/en/ui.js.
// Other languages are overlays: content/<lang>/<id>.js for beats and
// content/<lang>/ui.js for interface strings. Arabic switches the page to RTL.

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
]
const CODES = new Set(LANGS.map((l) => l.code))
const RTL = new Set(['ar'])
const KEY = 'net-lang'

let _lang = 'en'
try {
  const saved = localStorage.getItem(KEY)
  if (saved && CODES.has(saved)) _lang = saved
} catch {}

// UI strings: eager (small, needed synchronously by the chrome).
const uiMods = import.meta.glob('../content/*/ui.js', { eager: true, import: 'default' })
// In-scene 3D label strings: eager + small, keyed by the English string. English
// has no file (it IS the source), so en falls through to the literal.
const labelMods = import.meta.glob('../content/*/labels.js', { eager: true, import: 'default' })
// Beat overlays: lazy (code-split per language/chapter).
const beatMods = import.meta.glob('../content/*/*.js')

export const getLang = () => _lang
export const isRTL = (l = _lang) => RTL.has(l)

export function ui() {
  return uiMods[`../content/${_lang}/ui.js`] || uiMods['../content/en/ui.js'] || {}
}

// Localize an in-scene 3D label by its English string. Returns the original text
// when there is no translation (English, missing key, or example tokens/math that
// are intentionally left untranslated).
export function trLabel(s) {
  if (_lang === 'en' || s == null) return s
  const d = labelMods[`../content/${_lang}/labels.js`]
  return (d && d[s]) || s
}

function applyDir() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = _lang
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr'
}

export function initLang() {
  applyDir()
}

export function setLang(code) {
  if (!CODES.has(code) || code === _lang) return false
  _lang = code
  try {
    localStorage.setItem(KEY, code)
  } catch {}
  applyDir()
  return true
}

// Returns the localized module for a chapter id ({beats}|{hero}), or null to fall
// back to the English source baked into the chapter's own module.
export async function loadOverlay(id) {
  if (_lang === 'en') return null
  const loader = beatMods[`../content/${_lang}/${id}.js`]
  if (!loader) return null
  try {
    const m = await loader()
    return m.default
  } catch (e) {
    console.warn('[NET] missing translation', _lang, id, e)
    return null
  }
}
