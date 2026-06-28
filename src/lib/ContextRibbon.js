import * as THREE from 'three'
import { glowBasic } from './materials.js'
import { seriesColor } from '../theme/palette.js'

// A sideways-growing strip of glowing tiles = the KV cache / context window.
// Pre-builds maxCells tiles (hidden) and reveals the first k with setFilled(k).
export class ContextRibbon extends THREE.Group {
  constructor({ maxCells = 36, cell = 0.42, height = 0.5, gap = 0.06, color = '#a855f7' } = {}) {
    super()
    this.maxCells = maxCells
    this.cell = cell
    this.gap = gap
    this.tiles = []
    this.filled = 0
    this.color = new THREE.Color(color)

    this.geo = new THREE.BoxGeometry(cell, height, 0.12)
    const step = cell + gap
    const span = maxCells * step - gap
    for (let i = 0; i < maxCells; i++) {
      const mat = glowBasic(color, 0.9)
      const m = new THREE.Mesh(this.geo, mat)
      m.position.x = -span / 2 + i * step + cell / 2
      m.scale.setScalar(0.001)
      m.visible = false
      this.add(m)
      this.tiles.push(m)
    }
    this.step = step
    this.span = span
  }

  setFilled(k, { rainbow = false } = {}) {
    k = Math.max(0, Math.min(this.maxCells, k))
    for (let i = 0; i < this.maxCells; i++) {
      const t = this.tiles[i]
      const on = i < k
      t.visible = on
      if (on) {
        const c = rainbow ? seriesColor(i) : this.color
        t.material.color.set(c)
        // newest tile is brightest
        t.material.opacity = i === k - 1 ? 1 : 0.5 + 0.3 * (i / Math.max(1, k))
      }
    }
    this._targetK = k
    // pop the newest
    if (k > this.filled && k > 0) {
      const t = this.tiles[k - 1]
      t.scale.setScalar(1.25)
      t.userData.pop = 1
    }
    for (let i = 0; i < k; i++) if (this.tiles[i].userData.pop == null) this.tiles[i].scale.setScalar(1)
    this.filled = k
  }

  worldXOf(i) {
    return this.position.x - this.span / 2 + i * this.step + this.cell / 2
  }

  update(dt) {
    for (let i = 0; i < this.filled; i++) {
      const t = this.tiles[i]
      if (t.userData.pop) {
        const s = t.scale.x + (1 - t.scale.x) * Math.min(1, dt * 10)
        t.scale.setScalar(s)
        if (Math.abs(s - 1) < 0.01) {
          t.scale.setScalar(1)
          t.userData.pop = 0
        }
      }
    }
  }
}
