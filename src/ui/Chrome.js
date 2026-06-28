import { CHAPTERS } from '../chapters/manifest.js'
import { getTheme } from '../theme/theme.js'
import { ui, LANGS, getLang } from '../i18n/index.js'

// Persistent UI: the Spine (progress nav), topbar (language + theme + legend),
// chapter counter, and legend modal. All text comes from ui(); refresh() rebuilds
// it for a new language.
export class Chrome {
  constructor(app) {
    this.app = app
    this.root = document.getElementById('ui')
    this.visited = new Set()
    this._bindGlobal()
    this._build()
  }

  _bindGlobal() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeLegend()
    })
  }

  _build() {
    const t = ui()
    const ch = t.chapters || {}
    const nav = t.nav || {}
    const lg = t.legend || {}
    const a11y = t.a11y || {}
    const lastIdx = String(CHAPTERS.length - 1).padStart(2, '0')
    const short = (c) => ch[c.id]?.short || c.short
    const title = (c) => ch[c.id]?.title || c.title

    this.root.innerHTML = `
      <header class="topbar">
        <div></div>
        <div class="topbar-right">
          <select class="lang-select" id="lang-select" aria-label="${a11y.language || 'Language'}">
            ${LANGS.map((l) => `<option value="${l.code}"${l.code === getLang() ? ' selected' : ''}>${l.label}</option>`).join('')}
          </select>
          <button class="icon-btn" id="theme-btn" title="Toggle light / dark" aria-label="${a11y.theme || 'Theme'}">☾</button>
          <button class="icon-btn" id="legend-btn" title="Visual legend" aria-label="${a11y.legend || 'Legend'}">?</button>
        </div>
      </header>

      <nav class="spine" aria-label="Journey progress">
        ${CHAPTERS.map(
          (c) => `<button class="spine-node" data-route="${c.route}" data-index="${c.index}" aria-label="${title(c)}">
            <span class="spine-dot"></span><span class="spine-label">${short(c)}</span>
          </button>`,
        ).join('')}
      </nav>

      <div class="chapter-meta" hidden>
        <div class="idx"><b id="meta-cur">00</b> / ${lastIdx}</div>
        <div class="nav"><a id="meta-prev" data-route="/">← ${nav.prev || 'prev'}</a> &nbsp;·&nbsp; <a id="meta-next" class="next-cta" data-route="/">${nav.next || 'next'} →</a></div>
        <div class="keyhint">${nav.keyhint || ''}</div>
      </div>

      <div class="scroll-hint" id="scroll-hint"><span>${nav.scroll || 'scroll'}</span><span class="arrow"></span></div>

      <div class="modal" id="legend-modal" role="dialog" aria-modal="true" aria-label="${lg.title || 'Legend'}">
        <div class="modal-card">
          <span class="eyebrow">${lg.eyebrow || ''}</span>
          <h2>${lg.title || ''}</h2>
          <p style="color:var(--muted);margin-top:.7rem;max-width:42ch">${lg.intro || ''}</p>
          <div class="legend-grid">
            ${(lg.rows || []).map(([s, d]) => `<div class="swatch">${s}</div><div class="desc">${d}</div>`).join('')}
          </div>
          <div style="margin-top:1.6rem"><button class="btn" id="legend-close">${lg.done || 'OK'}</button></div>
        </div>
      </div>`

    // element handlers (fresh each rebuild)
    this.root.querySelector('#lang-select').onchange = (e) => this.app.setLanguage(e.target.value)
    this._themeBtn = this.root.querySelector('#theme-btn')
    this._themeBtn.onclick = () => this.app.flipTheme()
    this.root.querySelector('#legend-btn').onclick = () => this.openLegend()
    this.root.querySelector('#legend-close').onclick = () => this.closeLegend()
    this.root.querySelector('#legend-modal').onclick = (e) => {
      if (e.target.id === 'legend-modal') this.closeLegend()
    }

    this._meta = this.root.querySelector('.chapter-meta')
    this._hint = this.root.querySelector('#scroll-hint')
    this._metaCur = this.root.querySelector('#meta-cur')
    this._metaPrev = this.root.querySelector('#meta-prev')
    this._metaNext = this.root.querySelector('#meta-next')
    this._navStrings = nav
    this.syncTheme()
  }

  refresh() {
    this._build()
  }

  setActive(entry, layout) {
    const isChapter = layout === 'chapter'
    const isHero = layout === 'hero'
    const ch = (ui().chapters) || {}

    if (layout !== 'deep' && entry.index != null) this.visited.add(entry.index)

    this.root.querySelectorAll('.spine-node').forEach((n) => {
      const idx = +n.dataset.index
      n.classList.toggle('active', layout !== 'deep' && n.dataset.route === entry.route)
      n.classList.toggle('visited', this.visited.has(idx))
    })

    if (isChapter) {
      this._meta.hidden = false
      this._metaCur.textContent = String(entry.index).padStart(2, '0')
      const prev = CHAPTERS[entry.index - 1]
      const next = CHAPTERS[entry.index + 1]
      const sh = (c) => ch[c.id]?.short || c.short
      if (prev) {
        this._metaPrev.style.visibility = 'visible'
        this._metaPrev.dataset.route = prev.route
        this._metaPrev.textContent = '← ' + sh(prev)
      } else this._metaPrev.style.visibility = 'hidden'
      if (next) {
        this._metaNext.style.visibility = 'visible'
        this._metaNext.dataset.route = next.route
        this._metaNext.textContent = sh(next) + ' →'
      } else this._metaNext.style.visibility = 'hidden'
      this._hint.style.display = 'flex'
    } else {
      this._meta.hidden = true
      this._hint.style.display = 'none'
    }
    if (isHero) this._hint.style.display = 'none'
  }

  syncTheme() {
    if (this._themeBtn) this._themeBtn.textContent = getTheme() === 'light' ? '☀' : '☾'
  }

  openLegend() {
    this.root.querySelector('#legend-modal').classList.add('open')
  }
  closeLegend() {
    this.root.querySelector('#legend-modal')?.classList.remove('open')
  }
}
