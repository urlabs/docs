import * as THREE from 'three'
import { glowBasic } from './materials.js'
import { damp } from '../theme/motion.js'

// A row of glowing vertical bars = a probability distribution over tokens.
// Used by the transformer output, inference, and the sampling deep dive.
export class BarField extends THREE.Group {
  constructor({ count = 12, width = 0.26, gap = 0.12, maxHeight = 3, color = '#22d3ee' } = {}) {
    super()
    this.count = count
    this.maxHeight = maxHeight
    this.color = new THREE.Color(color)
    this.bars = []
    this.values = new Array(count).fill(0)
    this._target = new Array(count).fill(0)

    this.geo = new THREE.BoxGeometry(1, 1, width)
    const span = count * (width + gap) - gap
    for (let i = 0; i < count; i++) {
      const mat = glowBasic(color, 0.9)
      const m = new THREE.Mesh(this.geo, mat)
      m.position.x = -span / 2 + i * (width + gap) + width / 2
      m.scale.set(width, 0.001, 1)
      this.add(m)
      this.bars.push(m)
    }
    this.span = span
    this.highlight = -1
  }

  // Set immediately. vals need not be normalized.
  setValues(vals, { highlight = -1, color, hot = '#ffffff' } = {}) {
    const max = Math.max(1e-4, ...vals)
    this.highlight = highlight
    for (let i = 0; i < this.count; i++) {
      const v = vals[i] || 0
      this.values[i] = v
      this._target[i] = v
      this._apply(i, v / max, highlight, color, hot)
    }
  }

  // Set targets and ease there over frames (call lerp() in update()).
  setTargets(vals, { highlight = -1 } = {}) {
    for (let i = 0; i < this.count; i++) this._target[i] = vals[i] || 0
    this.highlight = highlight
  }

  lerp(dt, { color, hot = '#ffffff' } = {}) {
    const max = Math.max(1e-4, ...this._target)
    for (let i = 0; i < this.count; i++) {
      this.values[i] = damp(this.values[i], this._target[i], 9, dt)
      this._apply(i, this.values[i] / max, this.highlight, color, hot)
    }
  }

  _apply(i, norm, highlight, color, hot) {
    const b = this.bars[i]
    b.scale.y = Math.max(0.001, norm * this.maxHeight)
    b.position.y = b.scale.y / 2
    b.material.color.set(i === highlight ? hot : color || this.color)
    b.material.opacity = 0.35 + 0.65 * norm
  }
}
