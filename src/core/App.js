import { Engine } from './Engine.js'
import { ScrollController } from './ScrollController.js'
import { Chrome } from '../ui/Chrome.js'
import { findEntry, isDeepDive, CHAPTERS } from '../chapters/manifest.js'
import { reducedMotion } from '../theme/motion.js'
import { toggleTheme as flipThemeState, initTheme } from '../theme/theme.js'
import { getLang, setLang, ui, loadOverlay, initLang, isRTL } from '../i18n/index.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// The orchestrator: hash router + chapter lifecycle + prose injection + scroll.
export class App {
  constructor() {
    this.engine = null
    this.scroll = new ScrollController()
    this.current = null
    this.currentEntry = null
    this.lastChapterRoute = '/'
    this.navigating = false
    this.queuedRoute = null
  }

  boot() {
    initTheme() // apply saved theme to palette + <html> before anything builds
    initLang() // apply saved language + text direction
    if (!this._webglOK()) {
      document.getElementById('webgl-fallback').hidden = false
      return
    }
    const canvas = document.getElementById('gl')
    this.engine = new Engine(canvas)
    this.ctx = {
      engine: this.engine,
      renderer: this.engine.renderer,
      labels: document.getElementById('labels'),
      reduced: reducedMotion(),
      app: this,
    }
    this.chrome = new Chrome(this)

    window.addEventListener('hashchange', () => this._onHash())
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]')
      if (link) {
        e.preventDefault()
        this.go(link.getAttribute('data-route'))
      }
    })
    window.addEventListener(
      'scroll',
      () => {
        document.body.dataset.scrolled = window.scrollY > 60 ? '1' : '0'
      },
      { passive: true },
    )

    // ←/→ move between chapters. Up/Down/Space keep their normal scrolling.
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (e.target.closest('input, textarea, [contenteditable]')) return
      if (document.querySelector('#legend-modal.open')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        this.goRelative(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.goRelative(-1)
      }
    })

    this.engine.start()
    this._onHash()
  }

  // Move to the next/previous chapter. From a deep dive, any arrow returns to the journey.
  // Uses pendingRoute (the latest intent) so presses during a transition still chain.
  goRelative(dir) {
    const cur = this.pendingRoute || this.currentEntry?.route
    const idx = CHAPTERS.findIndex((c) => c.route === cur)
    if (idx === -1) {
      this.go(this.lastChapterRoute)
      return
    }
    const next = CHAPTERS[idx + dir]
    if (next) this.go(next.route)
  }

  _webglOK() {
    try {
      const c = document.createElement('canvas')
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
    } catch {
      return false
    }
  }

  go(route) {
    this.pendingRoute = route // track intent immediately so rapid arrow presses chain
    if ('#' + route === location.hash) return
    location.hash = route
  }

  // Switch language: rebuild the chrome (new UI strings) and re-render the current
  // route with localized content, preserving scroll position.
  setLanguage(code) {
    if (!setLang(code)) return
    this._restoreY = window.scrollY
    this.chrome?.refresh()
    this.navigate(this._route())
  }

  // Flip light/dark and rebuild the current scene (which reads theme at init),
  // preserving scroll position so you don't lose your place.
  flipTheme() {
    this._restoreY = window.scrollY
    flipThemeState()
    this.engine.applyThemeClear()
    this.chrome?.syncTheme()
    this.navigate(this._route())
  }

  _route() {
    const h = location.hash.replace(/^#/, '')
    return h && h.startsWith('/') ? h : '/'
  }

  _onHash() {
    this.navigate(this._route())
  }

  async navigate(route) {
    if (this.navigating) {
      this.queuedRoute = route
      return
    }
    this.navigating = true

    const restoreY = this._restoreY || 0 // set by flipTheme() to keep scroll position
    this._restoreY = 0

    let entry = findEntry(route) || findEntry('/')
    this.pendingRoute = entry.route // keep intent in sync for arrow-key nav

    const veil = document.getElementById('veil')
    veil.classList.add('show')
    await wait(380)

    // ---- teardown ----
    this.scroll.clear()
    this.engine.setActive(null)
    this.current?.dispose()
    this.current = null
    document.getElementById('labels').innerHTML = ''
    const scrollEl = document.getElementById('scroll')
    scrollEl.innerHTML = ''
    window.scrollTo(0, 0)
    document.body.dataset.scrolled = '0'
    this.engine.postfx.setBloom(0.82, 0.4, 0.85) // default each chapter

    // ---- load module ----
    let mod
    try {
      mod = await entry.loader()
    } catch (err) {
      console.error('[NET] failed to load chapter', entry.route, err)
      veil.classList.remove('show')
      this.navigating = false
      return
    }

    const layout = mod.layout || (isDeepDive(entry) ? 'deep' : 'chapter')
    document.body.dataset.mode = layout
    this.engine.allowVShift = layout === 'chapter' || layout === 'deep' // mobile: raise 3D above bottom card
    if (layout === 'chapter') this.lastChapterRoute = route

    // ---- localized content (English from the module; others from overlay files) ----
    let beats = []
    if (layout !== 'hero') {
      const overlay = await loadOverlay(entry.id)
      beats = overlay?.beats || mod.beats || []
    }

    // ---- build prose ----
    this._buildContent(mod, entry, layout, scrollEl, beats)

    // ---- instantiate scene ----
    const ChapterClass = mod.default
    const chapter = new ChapterClass(this.ctx)
    chapter.entry = entry
    chapter.numSteps = beats.length || 1
    chapter.init()
    chapter.resize(window.innerWidth, window.innerHeight)
    this.engine.setActive(chapter)
    this.current = chapter
    this.currentEntry = entry

    // ---- scroll wiring ----
    const beatEls = [...scrollEl.querySelectorAll('.beat')]
    this._beatEls = beatEls
    if (beatEls.length) {
      this.scroll.setup({
        container: scrollEl,
        beats: beatEls,
        onProgress: (p) => this.engine.setScroll(p),
        onStep: (i) => {
          chapter._setStep(i)
          this.engine.setShiftSide(this._effSide(beatEls[i]?.dataset.side))
        },
      })
      chapter._setStep(0) // ensure the first beat's state is applied on load
      this.engine.setShiftSide(this._effSide(beatEls[0]?.dataset.side))
      if (restoreY) window.scrollTo(0, restoreY)
    } else {
      this.engine.setScroll(0)
      this.engine.setShiftSide('center') // hero / no beats: no shift
    }

    this.chrome.setActive(entry, layout)

    veil.classList.remove('show')
    chapter.enter()
    this.navigating = false

    if (this.queuedRoute && this.queuedRoute !== route) {
      const q = this.queuedRoute
      this.queuedRoute = null
      this.navigate(q)
    } else {
      this.queuedRoute = null
    }
  }

  _buildContent(mod, entry, layout, scrollEl, beats) {
    if (layout === 'hero') {
      const h = ui().hero || {}
      scrollEl.innerHTML = `<div class="hero">
        <span class="eyebrow">${h.eyebrow || ''}</span>
        <h1>${h.title || ''} <span class="accent">${h.accent || ''}</span></h1>
        <p class="sub">${h.sub || ''}</p>
        <div class="cta-row">
          <a class="btn btn-primary" data-route="/neuron">${h.begin || 'Begin'}</a>
          <button class="btn" id="legend-open-hero">${h.legend || 'Legend'}</button>
        </div>
        <p class="sub" style="margin-top:2.4rem;font-size:.82rem;letter-spacing:.04em;opacity:.7">${h.hint || ''}</p>
      </div>`
      return
    }
    let html = ''
    if (layout === 'deep') {
      // Rendered as a fixed link, NOT a .beat, so it doesn't count as a scroll step.
      html += `<a class="deep-back deep-back-fixed" data-route="${this.lastChapterRoute}">${ui().nav?.back || '← back'}</a>`
    }
    html += (beats || [])
      .map(
        (b, i) =>
          `<section class="beat" data-side="${b.side || 'left'}" data-step="${i}">
             <div class="beat-card">${b.html}</div>
           </section>`,
      )
      .join('')
    scrollEl.innerHTML = html
  }

  // RTL flips which side the prose sits on, so flip the view-shift to match.
  _effSide(side) {
    side = side || 'left'
    if (!isRTL()) return side
    return side === 'left' ? 'right' : side === 'right' ? 'left' : side
  }
}
