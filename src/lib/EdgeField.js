import * as THREE from 'three'
import { additiveLine, additivePoints } from './materials.js'

// A batched set of glowing edges (one LineSegments) plus optional particles that
// flow along them (one Points system). Built once per chapter; lets a network of
// hundreds of connections render and animate cheaply.
export class EdgeField extends THREE.Group {
  constructor({ flow = true, flowPerEdge = 1, flowSpeed = 0.5, baseOpacity = 0.5, flowSize = 0.16 } = {}) {
    super()
    this.edges = [] // { a, b, color, weight }
    this.flow = flow
    this.flowPerEdge = flowPerEdge
    this.flowSpeed = flowSpeed
    this.baseOpacity = baseOpacity
    this.flowSize = flowSize
    this._built = false
  }

  // NOTE: named addEdge (not add) so we don't shadow THREE.Group.add().
  addEdge(a, b, color = '#22d3ee', weight = 1) {
    this.edges.push({ a: a.clone(), b: b.clone(), color: new THREE.Color(color), weight })
    return this.edges.length - 1
  }

  build() {
    const n = this.edges.length
    const lp = new Float32Array(n * 6)
    const lc = new Float32Array(n * 6)
    for (let i = 0; i < n; i++) {
      const e = this.edges[i]
      lp.set([e.a.x, e.a.y, e.a.z, e.b.x, e.b.y, e.b.z], i * 6)
      this._writeColor(lc, i, e)
    }
    this.lineGeo = new THREE.BufferGeometry()
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3))
    this.lineMat = additiveLine(null, this.baseOpacity, true)
    this.lines = new THREE.LineSegments(this.lineGeo, this.lineMat)
    this.add(this.lines)
    this._lc = lc

    if (this.flow && n > 0) {
      const m = n * this.flowPerEdge
      this._phase = new Float32Array(m)
      this._edgeOf = new Int32Array(m)
      const fp = new Float32Array(m * 3)
      const fc = new Float32Array(m * 3)
      for (let i = 0; i < m; i++) {
        const ei = i % n
        this._edgeOf[i] = ei
        this._phase[i] = Math.random()
        const e = this.edges[ei]
        const w = Math.max(0, e.weight)
        // fold weight into flow color so dormant (weight 0) edges show no motes
        // (additive black contributes nothing).
        fc.set([e.color.r * w, e.color.g * w, e.color.b * w], i * 3)
      }
      this.flowGeo = new THREE.BufferGeometry()
      this.flowGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3))
      this.flowGeo.setAttribute('color', new THREE.BufferAttribute(fc, 3))
      this.flowMat = additivePoints(null, this.flowSize, 0.95, true)
      this.flowPts = new THREE.Points(this.flowGeo, this.flowMat)
      this.add(this.flowPts)
      this._fp = fp
      this._fc = fc
      this._updateFlow(0)
    }
    this._built = true
    return this
  }

  _writeColor(lc, i, e) {
    const w = Math.max(0, e.weight)
    const r = e.color.r * w
    const g = e.color.g * w
    const b = e.color.b * w
    lc.set([r, g, b, r, g, b], i * 6)
  }

  _writeFlowColor(i) {
    if (!this.flow || !this._fc) return
    const e = this.edges[i]
    const w = Math.max(0, e.weight)
    const n = this.edges.length
    for (let k = i; k < this._edgeOf.length; k += n) {
      this._fc.set([e.color.r * w, e.color.g * w, e.color.b * w], k * 3)
    }
    this.flowGeo.attributes.color.needsUpdate = true
  }

  setWeight(i, w) {
    const e = this.edges[i]
    e.weight = w
    this._writeColor(this._lc, i, e)
    this.lineGeo.attributes.color.needsUpdate = true
    this._writeFlowColor(i)
  }

  setColor(i, color) {
    const e = this.edges[i]
    e.color.set(color)
    this._writeColor(this._lc, i, e)
    this.lineGeo.attributes.color.needsUpdate = true
    this._writeFlowColor(i)
  }

  setLineOpacity(o) {
    if (this.lineMat) this.lineMat.opacity = o
  }
  setFlowOpacity(o) {
    if (this.flowMat) this.flowMat.opacity = o
  }

  _updateFlow(dt) {
    const m = this._phase.length
    const fp = this._fp
    for (let i = 0; i < m; i++) {
      const e = this.edges[this._edgeOf[i]]
      this._phase[i] = (this._phase[i] + dt * this.flowSpeed * (0.5 + 0.9 * e.weight)) % 1
      const t = this._phase[i]
      fp[i * 3] = e.a.x + (e.b.x - e.a.x) * t
      fp[i * 3 + 1] = e.a.y + (e.b.y - e.a.y) * t
      fp[i * 3 + 2] = e.a.z + (e.b.z - e.a.z) * t
    }
    this.flowGeo.attributes.position.needsUpdate = true
  }

  update(dt) {
    if (this.flow && this._built) this._updateFlow(dt)
  }
}
