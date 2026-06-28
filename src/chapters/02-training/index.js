import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { LossLandscape } from '../../lib/LossLandscape.js'
import { palette } from '../../theme/palette.js'
import { damp, clamp, DUR, EASE } from '../../theme/motion.js'
import { blend } from '../../theme/theme.js'

// Chapter 02 — Learning. Training is minimizing a loss by gradient descent: a
// "weights" ball rolls downhill on a neon error landscape, the loss ticks down,
// and backprop is the trick that finds "downhill" for every weight at once.

// Start high on a slope whose basin drains into the landscape's GLOBAL minimum
// (the suggested -5.5,4.5 sits in a ripple-induced local min and never reaches the
// valley). From here pure GD descends ~37 steps to (minX,minZ); starting loss ≈ 4.84.
const START = { x: -2.5, z: -7.0 }
const LR = 0.35 // gradient-descent step size
const STEP_EVERY = 0.12 // seconds between discrete GD steps — so the descent reads
const MAX_STEPS = 100
const BOUND = 9.2 // keep the ball on the terrain

// Per-beat camera rig: a spherical framing (dist/az/el) + a look target. gsap
// tweens these; update() derives camera.position so a gentle orbit can be layered
// on top without fighting the tweens.
const FRAMES = [
  { dist: 26.0, az: 0.30, el: 0.5, lx: -0.5, ly: -0.4, lz: -3.0, orbit: 0.016 }, // 0 learning — the whole bowl floating in the void
  { dist: 23.0, az: 0.30, el: 0.46, lx: -1.6, ly: -0.1, lz: -4.6, orbit: 0.012 }, // 1 examples — the untrained ball, high on the slope
  { dist: 22.0, az: 0.32, el: 0.45, lx: -1.2, ly: -0.2, lz: -4.0, orbit: 0.013 }, // 2 the loss
  { dist: 20.0, az: 0.18, el: 0.42, lx: 0.0, ly: -0.8, lz: -3.2, orbit: 0.035 }, // 3 gradient descent
  { dist: 16.0, az: 0.05, el: 0.34, lx: 1.8, ly: -1.3, lz: -2.4, orbit: 0.02 }, // 4 learning rate — close on the valley
  { dist: 30.0, az: 0.20, el: 0.66, lx: 0.0, ly: -0.7, lz: -2.0, orbit: 0.026 }, // 5 backprop — pull way back
]

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 02 · how it learns</span>
      <h2>Learning</h2>
      <p class="lead">A fresh network is nothing but <strong>weights</strong> — millions of internal dials (its <em>parameters</em>), every one set to a small random value. Random dials give random answers, so at the very start the model is wrong about almost everything — no better than guessing.</p>
      <p>Nobody tunes those dials by hand; there are far too many. Instead the network is <em>taught</em> — shown example after example and nudged, a little at a time, until its answers turn reliably right. That whole process is <strong>training</strong>.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Learning from examples</h3>
      <p>To learn, the network needs a <strong>question whose answer we already know</strong>. Show it the start of a sentence and the real next word; show it a photo already labelled <em>cat</em>. The network makes its own guess, and we compare that guess against the truth.</p>
      <p>The distance between guess and truth is the <strong>error</strong>. Repeat across millions of examples and the errors stop being random noise — they form a <em>pattern</em>. And a pattern of mistakes is something we can systematically fix.</p>
      <p>There's a catch. A network with enough dials can simply <em>memorize</em> the examples it studied — scoring perfectly on those, then flubbing anything new. That trap is called <strong>overfitting</strong>, and to catch it we hold back data the network never trains on — a <strong>validation set</strong>. Acing the study sheet is easy; the real aim is to <em>generalize</em> to examples it has never seen.</p>
      <p class="aside">The glowing ball is the network's weights right now — untrained, perched high above the valley.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The loss</h3>
      <p>To act on all those errors we need to boil them down to one number: the <strong>loss</strong>. It sums up how wrong the network is across the examples — a high loss means lots of bad answers, while a loss of zero would mean flawless.</p>
      <p>What that number actually is depends on the task. When the network picks from categories — <em>cat</em> vs <em>dog</em>, or the next token out of a whole vocabulary — the loss is <strong>cross-entropy</strong>: it rewards heaping probability on the correct answer and punishes confident mistakes. When it predicts a bare number, the loss is <strong>mean-squared error</strong> — the gap between guess and truth, squared. Different rulers, same job: a single score for how wrong.</p>
      <p>Now picture that number as <strong>height</strong>. Every possible setting of the weights is a spot on the ground, and its loss is how high the land sits there — a vast rolling landscape. Training has exactly one aim: <em>get down to the lowest valley</em>.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Gradient descent</h3>
      <p>The landscape is far too huge to map — but you never need the map. Standing anywhere on it, you can always feel which way tips <strong>downhill</strong>. That direction is the <strong>gradient</strong>. Precisely, it's a vector of slopes — one partial derivative ∂L/∂wᵢ per weight, each saying how much the loss would shift if you nudged that one dial. The downhill of millions of dials, read all at once.</p>
      <p>So the recipe is almost embarrassingly simple: feel the slope, take one small step downhill, then feel the slope again from where you land. Repeat. Watch the loss tick down with every step — that, quite literally, is the network learning.</p>
      <p class="aside">Each breadcrumb the ball drops is one step. In practice you don't measure the slope over all the data at once — you estimate it from a small random <strong>minibatch</strong> and step on that. This is <strong>stochastic gradient descent</strong>: many fast, noisy steps instead of a few exact ones, and the jitter itself helps the ball rattle out of shallow dead-ends.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The learning rate</h3>
      <p>How big should each downhill step be? That size is the <strong>learning rate</strong>, and it's a delicate balance.</p>
      <p>Too large and the ball <em>overshoots</em> — it vaults clear across the valley and lands high on the opposite slope, sloshing back and forth without ever settling. Too small and it creeps along, needing far more steps to arrive. Good training keeps the step just right: brisk, but still under control.</p>
      <p>And unlike the weights, nobody learns this number — we set it. The learning rate is the most consequential <strong>hyperparameter</strong> in training, usually <em>scheduled</em> to shrink as you go: big strides early to cover ground, fine steps as the ball closes on the valley floor.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Backpropagation</h3>
      <p>One ball on one slope is easy to picture. But a real network has <strong>millions of weights</strong>, and each is its own separate direction to move — a landscape with millions of dimensions, impossible to hold in your head.</p>
      <p>The trick that makes it all tractable is <strong>backpropagation</strong>. Starting from the error at the output, it works <em>backward</em> through the layers — like tracing a flood upstream to find every spring that fed it — and hands each individual weight its own share of the blame: which way to move, and by how much. Its engine is a single idea from calculus — the <strong>chain rule</strong> — applied layer by layer: the blame at each layer is multiplied back into the layer before it, step by step, until that one backward pass has computed the whole gradient.</p>
      <p>Put it together and you have the full loop, repeated millions of times: <em>guess → measure the loss → backpropagate → nudge every weight a step downhill → guess again</em>.</p>
      <div class="postcard">Training is rolling downhill on the error landscape — and backpropagation is what tells every single weight which way is down.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/embeddings">next: Meaning as Geometry →</a></div>`,
  },
]

export default class Training extends Chapter {
  init() {
    this.setBloom(0.95, 0.5, 0.78)
    this.addAmbientField(360, 70)
    this.addLights()
    // a strong neutral key light so the light-mode terrain ramp gets clear
    // slope shading (no effect on the dark emissive terrain)
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(-7, 12, 5)
    this.scene.add(sun)

    // thinner fog so the pulled-back landscape reads as a glowing object in the void
    this.scene.fog.density = 0.01

    // the error landscape (violet) and its global minimum (relief tuning is
    // baked into LossLandscape, theme-aware)
    this.land = new LossLandscape({ size: 20, seg: 90, color: palette.violet })
    this.add(this.land)
    this.minHeight = this.land.height(this.land.minX, this.land.minZ)

    // the "weights" — a hot ball that rolls downhill
    this.ball = { x: START.x, z: START.z }
    this.ballNode = new GlowNode({ color: palette.amber, radius: 0.34, halo: 1.1, glow: 1.6 })
    this.ballNode.setLevel(0.95)
    this.add(this.ballNode)

    // a faint breadcrumb trail dropped at each GD step
    this._trailPos = new Float32Array(MAX_STEPS * 3)
    this._trailCount = 0
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this._trailPos, 3))
    trailGeo.setDrawRange(0, 0)
    const trailMat = new THREE.PointsMaterial({
      size: 0.16,
      color: new THREE.Color(palette.amber),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: blend(),
      toneMapped: false,
    })
    this.trail = new THREE.Points(trailGeo, trailMat)
    this.trail.frustumCulled = false
    this.add(this.trail)

    // floating loss readout, anchored above the ball
    this.lossLabel = this.label('loss', { pill: true, opacity: 0.95 })
    this.lossLabel.setVisible(false)
    this._lossStr = ''

    // gradient-descent runtime state
    this.gdActive = false
    this._converged = false
    this._gdT = 0
    this._gdSteps = 0
    this.wobbleAmp = 0

    // camera rig — start framed on beat 0
    const f = FRAMES[0]
    this.cam = { dist: f.dist, az: f.az, el: f.el }
    this.lookTarget = new THREE.Vector3(f.lx, f.ly, f.lz)
    this.orbit = 0
    this.orbitSpeed = f.orbit

    this._resetBall()
  }

  enter() {
    // park the ball high on the slope; onStep drives the rest
    this._resetBall()
  }

  onStep(i) {
    const reduced = this.ctx.reduced

    // ball / descent state per beat
    if (i <= 2) {
      this._resetBall() // high on the slope — random, wrong (intro, examples, the loss)
    } else if (reduced) {
      this._snapToMin() // skip the roll, show the end state
    } else {
      this.gdActive = true // beats 3–5: keep rolling downhill
    }
    if (i === 4 && !reduced) this.wobbleAmp = 0.5 // learning rate: a little overshoot to settle

    // camera framing
    const f = FRAMES[i] || FRAMES[0]
    this.orbitSpeed = f.orbit
    if (reduced) {
      this.cam.dist = f.dist
      this.cam.az = f.az
      this.cam.el = f.el
      this.lookTarget.set(f.lx, f.ly, f.lz)
    } else {
      gsap.to(this.cam, { dist: f.dist, az: f.az, el: f.el, duration: DUR.slow, ease: EASE.inOut })
      gsap.to(this.lookTarget, { x: f.lx, y: f.ly, z: f.lz, duration: DUR.slow, ease: EASE.inOut })
    }
  }

  _resetBall() {
    this.ball.x = START.x
    this.ball.z = START.z
    this.gdActive = false
    this._converged = false
    this._gdT = 0
    this._gdSteps = 0
    this._trailCount = 0
    this.wobbleAmp = 0
    if (this.trail) this.trail.geometry.setDrawRange(0, 0)
    this.ballNode.position.set(START.x, this.land.height(START.x, START.z) + 0.3, START.z)
  }

  _snapToMin() {
    this.ball.x = this.land.minX
    this.ball.z = this.land.minZ
    this.ballNode.position.set(this.ball.x, this.land.height(this.ball.x, this.ball.z) + 0.3, this.ball.z)
    this.gdActive = false
    this._converged = true
  }

  // one gradient-descent step: read the slope, step downhill, drop a breadcrumb
  _gdStep() {
    const g = this.land.grad(this.ball.x, this.ball.z)
    const nx = clamp(this.ball.x - LR * g[0], -BOUND, BOUND)
    const nz = clamp(this.ball.z - LR * g[1], -BOUND, BOUND)
    const moved = Math.abs(nx - this.ball.x) + Math.abs(nz - this.ball.z)
    this.ball.x = nx
    this.ball.z = nz
    this._gdSteps++
    this._dropTrail(nx, nz)
    if (moved < 1.5e-3) this._converged = true // settled in the valley
  }

  _dropTrail(x, z) {
    const i = Math.min(this._trailCount, MAX_STEPS - 1)
    this._trailPos[i * 3] = x
    this._trailPos[i * 3 + 1] = this.land.height(x, z) + 0.14
    this._trailPos[i * 3 + 2] = z
    this._trailCount = Math.min(this._trailCount + 1, MAX_STEPS)
    this.trail.geometry.setDrawRange(0, this._trailCount)
    this.trail.geometry.attributes.position.needsUpdate = true
  }

  update(dt, t) {
    const reduced = this.ctx.reduced

    // --- gradient descent, in discrete readable steps ---
    if (this.gdActive && !reduced && !this._converged) {
      this._gdT += dt
      let guard = 0
      while (this._gdT >= STEP_EVERY && this._gdSteps < MAX_STEPS && guard++ < 8) {
        this._gdT -= STEP_EVERY
        this._gdStep()
      }
    }

    // --- ball follows the descent (damped), with a settling wobble on beat 3 ---
    let tx = this.ball.x
    let tz = this.ball.z
    if (this.step === 4 && !reduced && this.wobbleAmp > 1e-3) {
      this.wobbleAmp = damp(this.wobbleAmp, 0, 1.2, dt)
      tx += Math.sin(t * 6.0) * this.wobbleAmp
      tz += Math.cos(t * 5.3) * this.wobbleAmp
    }
    const ty = this.land.height(tx, tz) + 0.3
    if (reduced) {
      this.ballNode.position.set(tx, ty, tz)
    } else {
      this.ballNode.position.x = damp(this.ballNode.position.x, tx, 9, dt)
      this.ballNode.position.y = damp(this.ballNode.position.y, ty, 9, dt)
      this.ballNode.position.z = damp(this.ballNode.position.z, tz, 9, dt)
    }
    this.ballNode.setLevel(0.9 + Math.sin(t * 2.2) * 0.07)

    // --- loss readout, from the ball's current height ---
    const loss = Math.max(0, this.ballNode.position.y - 0.3 - this.minHeight)
    this.lossLabel.setVisible(this.step >= 2)
    this.lossLabel.position.set(
      this.ballNode.position.x,
      this.ballNode.position.y + 0.8,
      this.ballNode.position.z,
    )
    const str = `${this.L('loss')} ${loss.toFixed(2)}`
    if (str !== this._lossStr) {
      this.lossLabel.setText(str)
      this._lossStr = str
    }

    // --- camera: derive position from the gsap-tweened rig + a gentle orbit ---
    if (!reduced) this.orbit = (this.orbit + dt * this.orbitSpeed) % (Math.PI * 2)
    const ce = Math.cos(this.cam.el)
    const se = Math.sin(this.cam.el)
    const az = this.cam.az + this.orbit
    this.camera.position.set(
      this.lookTarget.x + this.cam.dist * ce * Math.sin(az),
      this.lookTarget.y + this.cam.dist * se,
      this.lookTarget.z + this.cam.dist * ce * Math.cos(az),
    )
    this.camera.lookAt(this.lookTarget)
  }
}
