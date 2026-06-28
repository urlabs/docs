import * as THREE from 'three'
import { palette } from '../theme/palette.js'
import { radialBackground, isSharedTexture } from '../lib/textures.js'
import { Label3D } from '../lib/Label3D.js'
import { blend } from '../theme/theme.js'
import { trLabel } from '../i18n/index.js'

// Base class every chapter and deep dive extends. Owns a scene + camera, tracks
// resources for clean teardown, and provides the common cinematic backdrop.
//
// Lifecycle (called by App / Engine):
//   init()            build the scene
//   enter(direction)  intro animation
//   _frame(dt,t,s)    per-frame (calls update() + drives labels/ambient) — do NOT override
//   update(dt,t,s)    per-frame hook to override (s = scroll progress 0..1)
//   onStep(i)         a prose beat became active
//   resize(w,h)
//   dispose()         free GPU + DOM
export class Chapter {
  constructor(ctx) {
    this.ctx = ctx
    this.scene = new THREE.Scene()
    this.scene.background = radialBackground()
    this.scene.fog = new THREE.FogExp2(palette.void, 0.022)

    this._baseFov = 50
    this.camera = new THREE.PerspectiveCamera(this._baseFov, this._aspect(), 0.1, 300)
    this.camera.position.set(0, 0, 14)

    this._disposables = []
    this._labels = []
    this._ambient = null
    this.numSteps = 1
    this.step = -1
    this.t = 0
    this.scrollP = 0
  }

  _aspect() {
    return window.innerWidth / window.innerHeight
  }

  // --- helpers ---------------------------------------------------------------
  track(obj) {
    this._disposables.push(obj)
    return obj
  }

  add(obj) {
    this.scene.add(obj)
    return obj
  }

  // Static labels auto-localize by their English string (see i18n/trLabel).
  label(text, opts = {}) {
    const l = new Label3D(trLabel(text), opts, this.ctx.labels)
    this._labels.push(l)
    return l
  }

  // Localize a string for dynamic labels built in update() (setText). Example
  // tokens and math pass through unchanged (no dictionary entry).
  L(s) {
    return trLabel(s)
  }

  addLights({ key = 0x66ddff, rim = 0xa855f7, amb = 0x1a2740 } = {}) {
    this.scene.add(new THREE.AmbientLight(amb, 1.1))
    const k = new THREE.PointLight(key, 90, 120, 1.4)
    k.position.set(7, 9, 12)
    this.scene.add(k)
    const r = new THREE.PointLight(rim, 55, 120, 1.6)
    r.position.set(-9, -5, -8)
    this.scene.add(r)
  }

  // A subtle drifting starfield for depth — present in (almost) every chapter.
  addAmbientField(count = 420, spread = 70) {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[3 * i] = (Math.random() - 0.5) * spread
      pos[3 * i + 1] = (Math.random() - 0.5) * spread
      pos[3 * i + 2] = (Math.random() - 0.5) * spread - 12
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.07,
      color: 0x3c5680,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: blend(),
    })
    this._ambient = new THREE.Points(geo, mat)
    this.scene.add(this._ambient)
    return this._ambient
  }

  setBloom(strength, radius, threshold) {
    this.ctx.engine.postfx.setBloom(strength, radius, threshold)
  }

  // --- lifecycle (override the lowercase ones) -------------------------------
  init() {}
  enter() {}
  update() {}
  onStep() {}

  resize(w, h) {
    const aspect = w / h
    this.camera.aspect = aspect
    // Lock the HORIZONTAL field of view to the 16:9 design so wide scenes (rings,
    // towers, pipelines) fit on narrow/portrait phones instead of being cropped —
    // the vertical FOV widens to compensate (content gets smaller, never clipped).
    const DESIGN = 16 / 9
    if (aspect < DESIGN) {
      const baseV = THREE.MathUtils.degToRad(this._baseFov)
      const hFov = 2 * Math.atan(Math.tan(baseV / 2) * DESIGN)
      const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect)
      this.camera.fov = Math.min(THREE.MathUtils.radToDeg(vFov), 105)
    } else {
      this.camera.fov = this._baseFov
    }
    this.camera.updateProjectionMatrix()
  }

  // Called by the engine. Not for overriding — guarantees labels + ambient run.
  _frame(dt, t, scroll) {
    this.t = t
    this.scrollP = scroll
    if (this._ambient && !this.ctx.reduced) this._ambient.rotation.y += dt * 0.008
    this.update(dt, t, scroll)
    for (const l of this._labels) l.update(this.camera)
  }

  _setStep(i) {
    if (i === this.step) return
    this.step = i
    this.onStep(i)
  }

  dispose() {
    for (const l of this._labels) l.dispose()
    this._labels.length = 0
    this.scene.traverse((o) => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of mats) {
        for (const key in m) {
          const val = m[key]
          if (val && val.isTexture && !isSharedTexture(val)) val.dispose()
        }
        m.dispose?.()
      }
    })
    for (const d of this._disposables) d.dispose?.()
    this._disposables.length = 0
    this.scene.clear()
  }
}
