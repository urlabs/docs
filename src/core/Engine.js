import * as THREE from 'three'
import { palette } from '../theme/palette.js'
import { damp } from '../theme/motion.js'
import { PostFX } from './PostFX.js'

// Owns the one WebGLRenderer, the one RAF loop, and the bloom composer.
// Delegates per-frame work to the active chapter via chapter._frame().
export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // MSAA happens in the composer's render target
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(this._dpr())
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(new THREE.Color(palette.void), 1)
    this.renderer.toneMapping = THREE.NoToneMapping

    this.postfx = new PostFX(this.renderer)
    this.clock = new THREE.Clock()
    this.active = null
    this.scroll = 0
    this.elapsed = 0
    this.running = false
    this.shiftCur = 0 // horizontal view-shift to keep 3D clear of the prose column
    this.shiftTarget = 0
    this.vShiftCur = 0 // vertical shift: on mobile, raise 3D above the bottom card
    this.vShiftTarget = 0
    this.allowVShift = false // set true by App for chapter/deep layouts (not the hero)
    this._tick = this._tick.bind(this)

    window.addEventListener('resize', () => this.resize(), { passive: true })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop()
      else this.start()
    })
    this.resize()
  }

  setActive(mod) {
    this.active = mod
    if (mod) this.postfx.setScene(mod.scene, mod.camera)
  }

  setScroll(p) {
    this.scroll = p
  }

  _dpr() {
    // lower pixel ratio on phones — bloom + fill-rate are the cost; this keeps it smooth
    const cap = window.innerWidth < 820 ? 1.5 : 2
    return Math.min(window.devicePixelRatio || 1, cap)
  }

  // Desktop: pan the 3D opposite the active prose card so visuals don't sit under text.
  // Mobile: no horizontal pan; instead raise the 3D up so it sits above the bottom card.
  setShiftSide(side) {
    const mobile = window.innerWidth < 820
    this.shiftTarget = mobile ? 0 : side === 'left' ? 0.13 : side === 'right' ? -0.13 : 0
    this.vShiftTarget = mobile && this.allowVShift ? 0.17 : 0
  }

  applyThemeClear() {
    this.renderer.setClearColor(new THREE.Color(palette.void), 1)
  }

  start() {
    if (this.running) return
    this.running = true
    this.clock.start()
    this._raf = requestAnimationFrame(this._tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this._raf)
    this.clock.stop()
  }

  _tick() {
    if (!this.running) return
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt
    const a = this.active
    if (a && a.scene && a.camera) {
      a._frame(dt, this.elapsed, this.scroll)
      this._applyViewShift(a.camera, dt)
      this.postfx.setScene(a.scene, a.camera)
      this.postfx.render()
    }
    this._raf = requestAnimationFrame(this._tick)
  }

  _applyViewShift(cam, dt) {
    this.shiftCur = damp(this.shiftCur, this.shiftTarget, 5, dt)
    this.vShiftCur = damp(this.vShiftCur, this.vShiftTarget, 5, dt)
    if (!cam.isPerspectiveCamera) return
    const w = window.innerWidth
    const h = window.innerHeight
    // x: shiftCur>0 (card on left) pans content right. y: vShiftCur>0 raises content up.
    cam.setViewOffset(w, h, -this.shiftCur * w, this.vShiftCur * h, w, h)
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setPixelRatio(this._dpr())
    this.renderer.setSize(w, h)
    this.postfx.setSize(w, h)
    this.active?.resize?.(w, h)
  }
}
