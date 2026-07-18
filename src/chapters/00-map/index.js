import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { CHAPTERS } from '../manifest.js'
import { seriesColor } from '../../theme/palette.js'
import { damp } from '../../theme/motion.js'
import { ui } from '../../i18n/index.js'

export const layout = 'hero'

export const hero = `
  <span class="eyebrow">An interactive journey · 10 chapters</span>
  <h1>From a single neuron<br />to <span class="accent">frontier models</span></h1>
  <p class="sub">How large language models are actually built, trained, and run — rebuilt from the ground up as one continuous, visual story. Start with zero math; go as deep as you like.</p>
  <div class="cta-row">
    <a class="btn btn-primary" data-route="/neuron">Begin the journey →</a>
    <button class="btn" id="legend-open-hero">Read the legend</button>
  </div>
  <p class="sub" style="margin-top:2.4rem;font-size:.82rem;letter-spacing:.04em;opacity:.7">✦ each glowing waypoint is a chapter — hover and click to jump in</p>
`

const _ndc = new THREE.Vector2()
const _ray = new THREE.Raycaster()

// The Map: a rising constellation of the 8 learning chapters, connected by a
// luminous path with data flowing along it. Hover a waypoint to reveal it; click to enter.
export default class MapChapter extends Chapter {
  init() {
    this.setBloom(0.95, 0.5, 0.8)
    this.addAmbientField(700, 90)
    this.scene.fog.density = 0.018
    this.camera.position.set(0, 0.4, 12)
    this.camera.lookAt(0, 0, 0)

    this.learnable = CHAPTERS.filter((c) => c.index >= 1) // chapters 1..8
    this.nodes = []
    this.mouse = { x: 0, y: 0 }
    this.hover = -1

    const N = this.learnable.length
    const pts = []
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const x = -8.2 + t * 16.4
      const y = -4.1 + t * 7.0 + Math.sin(t * Math.PI * 2) * 0.5
      const z = -3.2 - Math.sin(t * Math.PI) * 3.6
      pts.push(new THREE.Vector3(x, y, z))
    }

    // path edges with flowing data
    this.edges = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.32, baseOpacity: 0.5, flowSize: 0.2 })
    for (let i = 0; i < N - 1; i++) {
      this.edges.addEdge(pts[i], pts[i + 1], seriesColor(i), 0.7)
    }
    this.edges.build()
    this.add(this.edges)

    // waypoint nodes
    this.learnable.forEach((entry, i) => {
      const color = seriesColor(i)
      const node = new GlowNode({ color, radius: 0.34, halo: 1.1, glow: 1.2 })
      node.position.copy(pts[i])
      node.setLevel(0.5)
      this.scene.add(node)
      const short = ui().chapters?.[entry.id]?.short || entry.short
      const label = this.label(`${String(entry.index).padStart(2, '0')} · ${short}`, {
        pill: true,
        position: pts[i].clone().add(new THREE.Vector3(0, 0.75, 0)),
        opacity: 0,
      })
      this.nodes.push({ node, entry, base: pts[i].clone(), color, label, level: 0.5 })
    })

    // interaction
    this._onMove = (e) => this._move(e)
    this._onClick = (e) => this._click(e)
    window.addEventListener('pointermove', this._onMove)
    window.addEventListener('click', this._onClick)

    // wire the hero legend button
    const lb = document.getElementById('legend-open-hero')
    if (lb) lb.onclick = () => this.ctx.app.chrome.openLegend()
  }

  enter() {
    if (this.ctx.reduced) return
    this.nodes.forEach((n, i) => {
      n.node.scale.setScalar(0.01)
      gsap.to(n.node.scale, { x: 1, y: 1, z: 1, duration: 0.9, delay: 0.2 + i * 0.08, ease: 'back.out(1.7)' })
    })
  }

  _move(e) {
    if (e.target.closest('a,button')) {
      this.mouse.x = 0
      this.mouse.y = 0
      return
    }
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
    _ndc.set(this.mouse.x, this.mouse.y)
    _ray.setFromCamera(_ndc, this.camera)
    let best = -1
    let bestD = 0.6
    for (let i = 0; i < this.nodes.length; i++) {
      const d = _ray.ray.distanceToPoint(this.nodes[i].base)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    this.hover = best
    document.body.style.cursor = best >= 0 ? 'pointer' : ''
  }

  _click() {
    if (this.hover >= 0) this.ctx.app.go(this.nodes[this.hover].entry.route)
  }

  update(dt, t) {
    // gentle parallax drift
    const px = this.mouse.x * 1.2
    const py = this.mouse.y * 0.8 + 0.4
    this.camera.position.x = damp(this.camera.position.x, px, 2, dt)
    this.camera.position.y = damp(this.camera.position.y, py, 2, dt)
    this.camera.lookAt(0, 0, -1)

    this.edges.update(dt)

    this.nodes.forEach((n, i) => {
      const targetLevel = this.hover === i ? 1 : 0.5
      n.level = damp(n.level, targetLevel, 6, dt)
      n.node.setLevel(n.level + Math.sin(t * 1.4 + i) * 0.06)
      n.label.setOpacity(damp(n.label._opacity, this.hover === i ? 1 : 0, 8, dt))
      const s = damp(n.node.scale.x, this.hover === i ? 1.35 : 1, 8, dt)
      if (!this.ctx.reduced) n.node.scale.setScalar(s)
    })
  }

  dispose() {
    window.removeEventListener('pointermove', this._onMove)
    window.removeEventListener('click', this._onClick)
    document.body.style.cursor = ''
    super.dispose()
  }
}
