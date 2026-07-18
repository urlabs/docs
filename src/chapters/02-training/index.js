import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { LossLandscape } from '../../lib/LossLandscape.js'
import { additiveLine, additivePoints, glowBasic } from '../../lib/materials.js'
import { palette } from '../../theme/palette.js'
import { damp, lerp, clamp, clamp01, smoothstep, DUR, EASE } from '../../theme/motion.js'
import { blend, isLight } from '../../theme/theme.js'

// Chapter 02 — Learning. Training is minimizing a loss by gradient descent: a
// "weights" ball rolls downhill on a neon error landscape. Around that spine the
// chapter visits the step-size dial (three balls, three fates on one 2D bowl),
// backpropagation (a forward wave, an error flare, and a backward blame wave on a
// real little network), stochastic gradient descent (a jittery minibatch path
// racing a stately full-batch path down the same landscape), overfitting (two real
// fits of the same noisy points + a computed train-vs-validation curve), and ends
// on the full loop: forward → loss → backward → nudge, once per breadcrumb.

// Start high on a slope whose basin drains into the landscape's GLOBAL minimum.
// From here pure GD descends ~37 steps to (minX,minZ); starting loss ≈ 4.84.
const START = { x: -2.5, z: -7.0 }
const LR = 0.35 // gradient-descent step size
const STEP_EVERY = 0.12 // seconds between discrete GD steps — so the descent reads
const MAX_STEPS = 100
const BOUND = 9.2 // keep the ball on the terrain

// Theme-mutated accents, captured at module level and refreshed in init().
const CYAN = new THREE.Color(palette.cyan)
const AMBER = new THREE.Color(palette.amber)
const ROSE = new THREE.Color(palette.rose)
const MAGENTA = new THREE.Color(palette.magenta)

// --- deterministic pseudo-randomness (scenes must look the same every visit) ----
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (rng) => (rng() + rng() + rng() - 1.5) * 1.15 // ≈ unit normal

// --- tiny numerics for the overfitting panel (all curves really computed) ------
function solveLin(A, b) {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    ;[A[c], A[p]] = [A[p], A[c]]
    ;[b[c], b[p]] = [b[p], b[c]]
    const d = A[c][c] || 1e-12
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = s / (A[r][r] || 1e-12)
  }
  return x
}

// least-squares polynomial fit (x pre-scaled to ≈[-1,1] for conditioning)
function polyfit(us, vs, deg) {
  const n = deg + 1
  const A = Array.from({ length: n }, () => new Array(n).fill(0))
  const b = new Array(n).fill(0)
  for (let i = 0; i < us.length; i++) {
    const x = us[i] / 3
    const pw = [1]
    for (let k = 1; k < 2 * n; k++) pw.push(pw[k - 1] * x)
    for (let r = 0; r < n; r++) {
      b[r] += pw[r] * vs[i]
      for (let c = 0; c < n; c++) A[r][c] += pw[r + c]
    }
  }
  const coef = solveLin(A, b)
  return (u) => {
    const x = u / 3
    let s = 0
    let p = 1
    for (let k = 0; k < n; k++) {
      s += coef[k] * p
      p *= x
    }
    return s
  }
}

// natural cubic spline through all points — the "memorizes every point" curve
function spline(us, vs) {
  const idx = us.map((_, i) => i).sort((a, b) => us[a] - us[b])
  const x = idx.map((i) => us[i])
  const y = idx.map((i) => vs[i])
  const n = x.length
  const h = []
  const al = []
  for (let i = 0; i < n - 1; i++) h.push(x[i + 1] - x[i])
  for (let i = 1; i < n - 1; i++) al[i] = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1])
  const l = [1]
  const mu = [0]
  const z = [0]
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]
    mu[i] = h[i] / l[i]
    z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i]
  }
  const c = new Array(n).fill(0)
  const bb = new Array(n).fill(0)
  const dd = new Array(n).fill(0)
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1]
    bb[j] = (y[j + 1] - y[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3
    dd[j] = (c[j + 1] - c[j]) / (3 * h[j])
  }
  return (u) => {
    let j = n - 2
    for (let i = 0; i < n - 1; i++)
      if (u < x[i + 1]) {
        j = i
        break
      }
    const dx = u - x[j]
    return y[j] + bb[j] * dx + c[j] * dx * dx + dd[j] * dx * dx * dx
  }
}

// Per-beat camera rig: a spherical framing (dist/az/el) + a look target. gsap
// tweens these; update() derives camera.position so a gentle orbit can be layered
// on top without fighting the tweens.
const FRAMES = [
  { dist: 26.0, az: 0.3, el: 0.5, lx: -0.5, ly: -0.4, lz: -3.0, orbit: 0.016 }, // 0 learning — the whole bowl in the void
  { dist: 23.0, az: 0.3, el: 0.46, lx: -1.6, ly: -0.1, lz: -4.6, orbit: 0.012 }, // 1 examples — the untrained ball, high on the slope
  { dist: 22.0, az: 0.32, el: 0.45, lx: -1.2, ly: -0.2, lz: -4.0, orbit: 0.013 }, // 2 the loss
  { dist: 20.0, az: 0.18, el: 0.42, lx: 0.0, ly: -0.8, lz: -3.2, orbit: 0.03 }, // 3 gradient descent + downhill arrow
  { dist: 12.6, az: 0.0, el: 0.06, lx: -27.4, ly: 6.7, lz: 0.0, orbit: 0.004 }, // 4 learning rate — the 2D bowl panel
  { dist: 10.4, az: 0.0, el: 0.06, lx: -0.3, ly: 8.8, lz: 0.0, orbit: 0.004 }, // 5 backprop — the little network, face on
  { dist: 19.0, az: 0.35, el: 0.85, lx: 0.2, ly: -0.6, lz: -4.4, orbit: 0.01 }, // 6 SGD — map view of the two descent paths
  { dist: 13.2, az: 0.0, el: 0.05, lx: 19.2, ly: 6.8, lz: 0.0, orbit: 0.004 }, // 7 overfitting — scatter + loss chart panel
  { dist: 25.5, az: 0.12, el: 0.21, lx: 0.8, ly: 3.3, lz: -0.5, orbit: 0.008 }, // 8 the loop — network above, landscape below
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
      <p>The gap between guess and truth is the <strong>error</strong>. One error says little — maybe the example was odd. But repeat across millions of examples and the errors stop being noise: they form a <em>pattern</em>. And a pattern of mistakes is something we can systematically fix.</p>
      <p class="aside">The glowing ball is the network's weights right now — untrained, perched high above the valley. Everything that follows is about moving it.</p>`,
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
      <p class="aside">The arrow is the gradient, flipped — straight downhill from wherever the ball stands. Each breadcrumb is one step, and the steps shrink as the ground flattens: a gentler slope means a smaller gradient, so the same recipe automatically eases off near the bottom.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The learning rate</h3>
      <p>How big should each step be? Every update is the same little formula — <span class="tok">new w = w − η · slope</span> — and that scale factor <span class="tok">η</span>, the <strong>learning rate</strong>, is the step-size dial for the entire network.</p>
      <p>Watch three fates on the same bowl. Set the dial <em>too small</em> and the ball creeps — every step is safe and every step is tiny, thousands of them needed for a stroll's worth of progress. <em>Just right</em>, and it strides down and settles into the valley. <em>Too large</em>, and each stride vaults clear across the valley and lands <strong>higher</strong> on the far slope: overshoot feeding on overshoot until the ball flies out of the bowl entirely. That runaway is <strong>divergence</strong> — the loss climbing instead of falling.</p>
      <p>And unlike the weights, nobody learns η. We choose it — it's the most consequential <strong>hyperparameter</strong> in training: a knob about the learning, set from outside the learning.</p>
      <p class="aside">Real runs turn the dial mid-flight. A <strong>schedule</strong> starts gentle (<em>warmup</em>), rises to cruise, then decays toward zero so the last steps settle instead of slosh. The three fates still apply at every instant along the way.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Backpropagation</h3>
      <p>The rolling ball hides a question. "Take a step downhill" means changing <strong>millions of weights at once</strong> — so when the network guesses wrong, who exactly was at fault? Which dials, buried layers deep, should move, and which way?</p>
      <p>Think of a relay team reviewing a lost race. The clock only scores the finish, but the team traces the result <em>backward</em> — this leg lost half a second, that handoff was clean — until every runner knows their own share of the blame and what to fix. <strong>Backpropagation</strong> is that review run through the network: the error at the output flows backward along the very connections that produced it, splitting at each junction in proportion to the weight that carried it, until every single weight holds its answer — <em>this much was my fault, and this is my direction</em>.</p>
      <p>Watch the two sweeps. Forward, left to right: the guess. Backward, right to left: the blame. One pass to be wrong, one pass to know — for <strong>every weight at once</strong> — how to be less wrong. Then every weight takes its little step, and the loop begins again.</p>
      <p class="aside">Under the hood this is the calculus <strong>chain rule</strong>, organized so nothing is computed twice: blame flows layer by layer, and one backward sweep costs roughly as much as one forward pass. That efficiency — popularized for neural networks by Rumelhart, Hinton &amp; Williams in 1986 — is why deep learning is trainable at all: the full million-dimensional gradient for the price of about two passes.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Stochastic gradient descent</h3>
      <p>One honest problem remains: the <em>true</em> slope is defined over the <strong>entire dataset</strong>. Measuring it exactly means running every example through the network before taking a single step — at millions of examples per step, training would take geological time.</p>
      <p>So don't measure — <strong>estimate</strong>. Grab a small random <strong>minibatch</strong> of examples, read the slope on just those, and step immediately. Each estimate is a little off, so the path turns jittery — but the errors average out across steps, and in the time one exact step costs, you take dozens of cheap ones. Watch the race: the zigzag walker is already circling the valley while the careful one is still measuring its third step.</p>
      <p>That's the <strong>stochastic</strong> in stochastic gradient descent — and the noise isn't purely a tax. The rattle helps the ball hop out of shallow dips that would trap an exact descender, and past flat stretches where it would stall.</p>
      <p class="aside">Modern optimizers refine the walk: <strong>momentum</strong> smooths the jitter by averaging recent steps, and <strong>Adam</strong> also adapts the step size for each weight individually. Under them all, it's still the same noisy stroll downhill.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Overfitting</h3>
      <p>One trap is left, and it's the deepest: a low score was never the actual goal. A network with enough dials can <strong>memorize</strong> its training set outright — like a student who memorizes the answer key and calls it studying. Perfect score, zero understanding.</p>
      <p>Here are two fits of the same noisy points. The wild curve threads <em>every single one</em> — its training loss is essentially zero — but between points it thrashes, because what it learned is the <strong>noise</strong>. The calm curve misses many points slightly and catches the <em>trend</em>. Drop in fresh points it has never seen, and the calm curve predicts them while the wild one is lost. That failure is <strong>overfitting</strong>; the ability we actually wanted is <strong>generalization</strong>.</p>
      <p>The honest referee is data the network never trains on — a held-out <strong>validation set</strong> — and it draws one of the most important pictures in the field: as the fit grows more flexible, training loss only falls, while validation loss falls, turns, and climbs. That turn is the moment memorization begins.</p>
      <p class="aside">Everything that fights the turn has a name. <strong>Early stopping</strong> quits at the bottom of the validation curve; <strong>regularization</strong> (weight decay, dropout) leans on the network to stay simpler than its budget allows.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The loop</h3>
      <p>Now run it all as one motion. <strong>Forward</strong>: guess. <strong>Loss</strong>: score the guess. <strong>Backward</strong>: split the blame. <strong>Nudge</strong>: every weight steps downhill. One turn of the loop leaves the ball one breadcrumb lower — that's the entire secret.</p>
      <p>Everything in this chapter was that loop wearing different clothes. The learning rate sizes the nudge; minibatches make each turn cheap enough to run billions of times; validation tells you when to stop looping. There is no separate magic called "learning" — just this cycle, repeated until the valley.</p>
      <p>And the loop doesn't care what it trains. The same four steps tune a three-neuron toy and the largest model ever built; only the size of the landscape changes. Which raises the next question: after all those nudges, what do the weights actually <em>know</em>?</p>
      <div class="postcard">Training is one loop — guess forward, score the loss, send blame backward, nudge every weight downhill — repeated millions of times over the examples. Backpropagation is the step that tells every single weight which way is down.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/embeddings">next: Meaning as Geometry →</a></div>`,
  },
]

// --- learning-rate panel constants (a real 1D bowl: h(x) = A·x²) ---------------
const LRP = { cx: -27, by: 4.6, A: 0.16, rim: 5.2, hopEvery: 0.62, hopDur: 0.38, cycle: 11.8 }

// --- backprop network constants -------------------------------------------------
const NET = { y0: 8.9, xs: [-3.6, -1.4, 0.8, 3.0], sizes: [3, 4, 4, 1], spread: 1.05 }
// phase windows of one training cycle (fractions of the cycle)
const BP = { fw: [0, 0.26], er: [0.26, 0.4], bw: [0.4, 0.72], ng: [0.72, 0.88] }

// --- overfitting panel constants -------------------------------------------------
const OFP = { cx: 19.1, sy: 8.5, sxs: 1.1, sys: 0.72, chx0: 17.0, chx1: 20.4, chy0: 3.85, chh: 1.9 }

const _tmpC = new THREE.Color()

export default class Training extends Chapter {
  init() {
    this.setBloom(0.95, 0.5, 0.78)
    this.addAmbientField(360, 70)
    this.addLights()
    // refresh captured colors from the live (theme-aware) palette
    CYAN.set(palette.cyan)
    AMBER.set(palette.amber)
    ROSE.set(palette.rose)
    MAGENTA.set(palette.magenta)
    this._light = isLight()

    // a strong neutral key light so the light-mode terrain ramp gets clear
    // slope shading (no effect on the dark emissive terrain)
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(-7, 12, 5)
    this.scene.add(sun)

    // thinner fog so the pulled-back landscape reads as a glowing object in the void
    this.scene.fog.density = 0.01

    // the error landscape (violet) and its global minimum
    this.land = new LossLandscape({ size: 20, seg: 90, color: palette.violet })
    this.add(this.land)
    this.minHeight = this.land.height(this.land.minX, this.land.minZ)
    this._wireBase = this.land.wire.material.opacity // dimmed on the SGD map view
    this._emisBase = this.land.surface.material.emissiveIntensity

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
      size: 0.2,
      color: new THREE.Color(palette.amber),
      transparent: true,
      opacity: this._light ? 0.9 : 0.7,
      depthWrite: false,
      blending: blend(),
      toneMapped: false,
    })
    this.trail = new THREE.Points(trailGeo, trailMat)
    this.trail.frustumCulled = false
    this.trail.renderOrder = 5 // above the transparent terrain surface
    this.add(this.trail)

    // the gradient arrow — steepest descent, planted on the ball
    this._buildArrow()

    // floating loss readout, anchored above the ball
    this.lossLabel = this.label('loss', { pill: true, opacity: 0.95 })
    this.lossLabel.setVisible(false)
    this._lossStr = ''

    // gradient-descent runtime state
    this.gdActive = false
    this._converged = false
    this._gdT = 0
    this._gdSteps = 0

    // side scenes (each lives at its own spot in the world; camera flies between)
    this._buildLRPanel()
    this._buildNet()
    this._buildSGD()
    this._buildOverfit()

    // camera rig — start framed on beat 0
    const f = FRAMES[0]
    this.cam = { dist: f.dist, az: f.az, el: f.el }
    this.lookTarget = new THREE.Vector3(f.lx, f.ly, f.lz)
    this.orbit = 0
    this.orbitSpeed = f.orbit

    this._resetBall()
  }

  enter() {
    this._resetBall()
  }

  // ==========================================================================
  // gradient arrow (beats 3 & 8): -∇L as a physical arrow tangent to the slope
  // ==========================================================================
  _buildArrow() {
    this.arrow = new THREE.Group()
    const mat = glowBasic(palette.cyan, 0.95)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.5, 8), mat)
    shaft.position.y = 0.85
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 12), mat)
    head.position.y = 1.85
    shaft.renderOrder = 5
    head.renderOrder = 5
    this.arrow.add(shaft, head)
    this.arrow.visible = false
    this.add(this.arrow)
    this._arrowDir = new THREE.Vector3()
    this._arrowQ = new THREE.Quaternion()
    this._UP = new THREE.Vector3(0, 1, 0)
    this.labDownhill = this.label('downhill', { pill: true, opacity: 0 })
  }

  _updateArrow(labelOn) {
    const g = this.land.grad(this.ball.x, this.ball.z)
    const gm2 = g[0] * g[0] + g[1] * g[1]
    const gm = Math.sqrt(gm2)
    if (gm < 0.06) {
      this.arrow.visible = false
      this.labDownhill.setOpacity(0)
      return
    }
    this.arrow.visible = true
    this._arrowDir.set(-g[0], -gm2, -g[1]).normalize()
    this._arrowQ.setFromUnitVectors(this._UP, this._arrowDir)
    this.arrow.quaternion.copy(this._arrowQ)
    this.arrow.position.copy(this.ballNode.position)
    const s = clamp(0.7 + gm * 0.35, 0.75, 1.7)
    this.arrow.scale.setScalar(s)
    this.labDownhill.setOpacity(labelOn ? 0.9 : 0)
    this.labDownhill.position.copy(this.ballNode.position).addScaledVector(this._arrowDir, s * 2.2 + 0.55)
  }

  // ==========================================================================
  // beat 4 — the learning-rate bowl: three balls, three fates, real dynamics
  // x ← x − η·h'(x) on h(x)=A·x² is x ← (1−2Aη)·x, so each ball is one factor
  // ==========================================================================
  _buildLRPanel() {
    this.lrGroup = new THREE.Group()
    this.lrGroup.visible = false
    this.add(this.lrGroup)
    const { cx, by, A, rim } = LRP

    // the bowl itself — a real parabola, plus a faint baseline + minimum marker
    const N = 96
    const pts = []
    for (let i = 0; i <= N; i++) {
      const x = -rim + (2 * rim * i) / N
      pts.push(new THREE.Vector3(cx + x, by + A * x * x, 0))
    }
    const bowl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), additiveLine(palette.violet, this._light ? 0.95 : 0.8))
    this.lrGroup.add(bowl)
    const base = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx - rim - 0.5, by - 0.55, 0), new THREE.Vector3(cx + rim + 0.5, by - 0.55, 0)]),
      additiveLine(palette.violet, 0.25),
    )
    this.lrGroup.add(base)
    const minDot = new GlowNode({ color: palette.violet, radius: 0.09, halo: 0.6, glow: 1.0 })
    minDot.position.set(cx, by + 0.04, 0)
    minDot.setLevel(0.55)
    this.lrGroup.add(minDot)

    // the three runners: factor per hop = (1 − 2Aη)
    const defs = [
      { f: 0.95, x0: -4.6, z: -0.24, color: AMBER, text: 'too small' },
      { f: 0.42, x0: -4.6, z: 0, color: CYAN, text: 'just right' },
      { f: -1.07, x0: -4.0, z: 0.24, color: ROSE, text: 'too large' },
    ]
    this.lrBalls = defs.map((d) => {
      const seq = [d.x0]
      let x = d.x0
      for (let k = 0; k < 16; k++) {
        x *= d.f
        seq.push(x)
        if (Math.abs(x) < 0.06 || Math.abs(x) > rim) break
      }
      const out = Math.abs(seq[seq.length - 1]) > rim // diverged past the rim
      const node = new GlowNode({ color: d.color, radius: 0.17, halo: 0.9, glow: 1.3 })
      node.position.set(cx + d.x0, by + A * d.x0 * d.x0 + 0.22, d.z)
      node.setLevel(0.9)
      this.lrGroup.add(node)
      // breadcrumbs at every landing point
      const tp = new Float32Array(seq.length * 3)
      seq.forEach((sx, i) => {
        tp[3 * i] = cx + sx
        tp[3 * i + 1] = by + A * sx * sx + 0.12
        tp[3 * i + 2] = d.z
      })
      const tg = new THREE.BufferGeometry()
      tg.setAttribute('position', new THREE.BufferAttribute(tp, 3))
      tg.setDrawRange(0, 1)
      const dots = new THREE.Points(tg, additivePoints(d.color, 0.17, this._light ? 0.9 : 0.8))
      dots.frustumCulled = false
      this.lrGroup.add(dots)
      const lab = this.label(d.text, { pill: true, opacity: 0 })
      return { ...d, seq, out, node, dots, lab }
    })
    this._lrT = 0
  }

  _lrReset(reduced) {
    this._lrT = 0
    for (const b of this.lrBalls) {
      gsap.killTweensOf(b.node.scale)
      b.node.scale.setScalar(1)
      if (reduced) {
        // static end state: full trails; diverger's ball is gone (it flew out)
        const last = b.seq.length - 1
        const li = b.out ? last - 1 : last
        const lx = b.seq[li]
        b.node.position.set(LRP.cx + lx, LRP.by + LRP.A * lx * lx + 0.22, b.z)
        b.node.visible = !b.out
        b.dots.geometry.setDrawRange(0, b.out ? b.seq.length - 1 : b.seq.length)
        b.lab.setOpacity(0.92)
        b.lab.position.set(LRP.cx + lx, LRP.by + LRP.A * lx * lx + 0.95, b.z)
      } else {
        b.node.visible = true
        b.node.position.set(LRP.cx + b.x0, LRP.by + LRP.A * b.x0 * b.x0 + 0.22, b.z)
        b.dots.geometry.setDrawRange(0, 1)
      }
    }
  }

  _updateLR(dt, t) {
    const { cx, by, A, hopEvery, hopDur, cycle } = LRP
    if (this.ctx.reduced) {
      for (const b of this.lrBalls) if (b.node.visible) b.node.setLevel(0.85)
      return
    }
    this._lrT += dt
    if (this._lrT >= cycle) this._lrReset(false)
    const T = this._lrT
    for (const b of this.lrBalls) {
      const last = b.seq.length - 1
      let k = Math.floor(T / hopEvery)
      let px
      let py
      let landed
      if (k >= last) {
        // finished: sit on the final point (diverger is long gone)
        landed = last
        if (b.out) {
          b.node.visible = false
        } else {
          px = b.seq[last]
          py = by + A * px * px + 0.22
          b.node.position.set(cx + px, py, b.z)
          b.node.setLevel(0.8 + Math.sin(t * 4) * 0.15) // settled pulse
        }
      } else {
        const tau = clamp01((T - k * hopEvery) / hopDur)
        const x0 = b.seq[k]
        const x1 = b.seq[k + 1]
        landed = tau >= 1 ? k + 1 : k
        const flyingOut = b.out && k + 1 === last
        if (flyingOut) {
          // the diverger's last vault: exaggerated exit past the rim, then gone
          const tau2 = clamp01((T - k * hopEvery) / (hopDur * 2.1))
          const fx = Math.sign(x1) * 7.6
          const fy = by + A * x1 * x1 + 2.6
          px = lerp(x0, fx, tau2)
          py = lerp(by + A * x0 * x0 + 0.22, fy, tau2) + Math.sin(tau2 * Math.PI) * 1.4
          b.node.visible = tau2 < 0.97
          b.node.setLevel(0.95 * (1 - smoothstep(0.7, 1, tau2)))
          landed = k
        } else {
          const y0 = by + A * x0 * x0 + 0.22
          const y1 = by + A * x1 * x1 + 0.22
          px = lerp(x0, x1, tau)
          py = lerp(y0, y1, tau) + Math.sin(tau * Math.PI) * (0.28 + 0.1 * Math.abs(x1 - x0))
          b.node.setLevel(0.9)
        }
        if (px !== undefined) b.node.position.set(cx + px, py, b.z)
      }
      b.dots.geometry.setDrawRange(0, Math.min(landed + 1, b.out ? b.seq.length - 1 : b.seq.length))
      // label follows its ball (parks at the exit rim once the diverger is gone)
      const lx = b.node.visible ? b.node.position.x : cx + Math.sign(b.seq[b.seq.length - 1]) * 4.9
      const ly = b.node.visible ? b.node.position.y + 0.72 : by + A * 24 + 0.9
      b.lab.position.set(lx, ly, b.z)
      b.lab.setOpacity(0.92)
    }
  }

  // ==========================================================================
  // beat 5 (+8) — backpropagation on a real little network. One training cycle:
  // forward wave (cyan) → error flare at the output (rose) → backward blame wave
  // (magenta, brightness ∝ each edge's blame) → weights visibly nudged (amber)
  // ==========================================================================
  _buildNet() {
    this.netGroup = new THREE.Group()
    this.netGroup.visible = false
    this.add(this.netGroup)
    const rng = mulberry32(7)
    const { y0, xs, sizes, spread } = NET

    // nodes
    this.netNodes = [] // [layer][i] -> GlowNode
    this.netPos = []
    sizes.forEach((s, l) => {
      const row = []
      const prow = []
      for (let i = 0; i < s; i++) {
        const y = y0 + (i - (s - 1) / 2) * spread
        const n = new GlowNode({
          color: palette.cyan,
          radius: l === sizes.length - 1 ? 0.26 : 0.17,
          halo: 0.9,
          glow: 1.2,
        })
        n.position.set(xs[l], y, 0)
        n.setLevel(0.35)
        this.netGroup.add(n)
        row.push(n)
        prow.push(new THREE.Vector3(xs[l], y, 0))
      }
      this.netNodes.push(row)
      this.netPos.push(prow)
    })

    // edges with fixed pseudo-random weights; blame flows backward through them
    this.netEdges = [] // { l, i, j, w, wN, blame, mx, iF, iB }
    this.eFwd = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.55, baseOpacity: 0.5, flowSize: 0.13 })
    this.eBwd = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.15 })
    for (let l = 0; l < sizes.length - 1; l++) {
      for (let i = 0; i < sizes[l]; i++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          const w = 0.3 + 0.7 * rng()
          const a = this.netPos[l][i]
          const b = this.netPos[l + 1][j]
          const iF = this.eFwd.addEdge(a, b, palette.cyan, w)
          const iB = this.eBwd.addEdge(b, a, palette.magenta, 0) // reversed: motes run right → left
          this.netEdges.push({ l, i, j, w, mx: (a.x + b.x) / 2, iF, iB, blame: 0, wN: w })
        }
      }
    }
    // blame: δ at the output is 1; earlier nodes inherit Σ w·δ (chain rule shape)
    const delta = sizes.map((s) => new Array(s).fill(0))
    delta[sizes.length - 1][0] = 1
    for (let l = sizes.length - 2; l >= 0; l--) {
      for (const e of this.netEdges) if (e.l === l) delta[l][e.i] += e.w * delta[l + 1][e.j]
      const mx = Math.max(...delta[l], 1e-9)
      for (let i = 0; i < delta[l].length; i++) delta[l][i] /= mx
    }
    this.netDelta = delta
    // per-edge blame (normalized per layer) + the nudged weight it leads to
    for (let l = 0; l < sizes.length - 1; l++) {
      const es = this.netEdges.filter((e) => e.l === l)
      const mx = Math.max(...es.map((e) => e.w * delta[l + 1][e.j]), 1e-9)
      for (const e of es) {
        e.blame = (e.w * delta[l + 1][e.j]) / mx
        const sign = rng() < 0.5 ? -1 : 1
        e.wN = clamp(e.w + sign * (0.1 + 0.55 * e.blame), 0.1, 1)
      }
    }
    this.eFwd.build()
    this.eBwd.build()
    this.eBwd.setFlowOpacity(0)
    this.netGroup.add(this.eFwd, this.eBwd)

    // error flare ring at the output node
    const outP = this.netPos[sizes.length - 1][0]
    this.errRing = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.42, 40),
      new THREE.MeshBasicMaterial({
        color: ROSE.clone(),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: blend(),
        toneMapped: false,
      }),
    )
    this.errRing.position.copy(outP)
    this.netGroup.add(this.errRing)

    // phase labels
    this.labFwd = this.label('forward pass →', { pill: true, position: new THREE.Vector3(-2.2, y0 + 2.45, 0), opacity: 0 })
    this.labBwd = this.label('← backward pass', { pill: true, position: new THREE.Vector3(1.6, y0 + 2.45, 0), opacity: 0 })
    this.labErr = this.label('error', { pill: true, position: new THREE.Vector3(xs[3], y0 + 1.0, 0), opacity: 0 })
    this.labNudge = this.label('weights nudged', { pill: true, position: new THREE.Vector3(-0.3, y0 - 2.5, 0), opacity: 0 })
    this._netLabT = { fwd: 0, bwd: 0, err: 0, ng: 0 }
    this._bpT = 0
    this._bpCycle = -1
    this._fwOp = 0.5
    this._bwOp = 0
  }

  // static composite for reduced motion: both passes visible at once
  _netStatic() {
    for (const e of this.netEdges) {
      this.eFwd.setWeight(e.iF, e.w * 0.9)
      this.eFwd.setColor(e.iF, CYAN)
      this.eBwd.setWeight(e.iB, e.blame)
    }
    this.eFwd.setLineOpacity(0.5)
    this.eFwd.setFlowOpacity(0)
    this.eBwd.setLineOpacity(0.6)
    this.eBwd.setFlowOpacity(0)
    const L = NET.sizes.length
    this.netNodes.forEach((row, l) =>
      row.forEach((n, i) => {
        n.setColor(l === L - 1 ? ROSE : CYAN)
        n.setLevel(l === L - 1 ? 0.95 : 0.45 + 0.35 * this.netDelta[l][i])
      }),
    )
    this.errRing.material.opacity = 0.4
    this.errRing.scale.setScalar(1.5)
    this.labFwd.setOpacity(0.9)
    this.labBwd.setOpacity(0.9)
    this.labErr.setOpacity(0.9)
    this.labNudge.setOpacity(0)
  }

  _updateNet(dt, t) {
    const D = this.step === 8 ? 3.6 : 5.6 // the finale loops faster
    this._bpT += dt
    const cyc = Math.floor(this._bpT / D)
    const ph = (this._bpT % D) / D
    const seg = (a, b) => (ph >= a && ph < b ? (ph - a) / (b - a) : -1)
    const tF = seg(BP.fw[0], BP.fw[1])
    const tE = seg(BP.er[0], BP.er[1])
    const tB = seg(BP.bw[0], BP.bw[1])
    const tN = seg(BP.ng[0], BP.ng[1])
    const tR = seg(BP.ng[1], 1)

    // finale: each cycle's nudge = one gradient-descent step for the ball
    if (this.step === 8 && tN >= 0 && cyc !== this._bpCycle) {
      this._bpCycle = cyc
      if (this._converged || this._gdSteps >= MAX_STEPS) this._resetBall()
      else this._gdStep()
    }

    // wave fronts
    const fwFront = tF >= 0 ? lerp(-4.2, 4.2, tF) : 99
    const bwFront = tB >= 0 ? lerp(4.2, -4.2, tB) : -99
    const prox = (x, front) => Math.exp(-((x - front) * (x - front)) / 1.4)

    // line/flow opacities per phase (damped so transitions feel continuous)
    let fwT = 0.42
    let bwT = 0
    if (tF >= 0) fwT = 0.62
    else if (tE >= 0) fwT = 0.3
    else if (tB >= 0) {
      fwT = 0.1
      bwT = 0.75
    } else if (tN >= 0) fwT = 0.62
    this._fwOp = damp(this._fwOp, fwT, 8, dt)
    this._bwOp = damp(this._bwOp, bwT, 8, dt)
    this.eFwd.setLineOpacity(this._fwOp)
    this.eFwd.setFlowOpacity(tF >= 0 ? 0.95 : 0)
    this.eBwd.setLineOpacity(this._bwOp)
    this.eBwd.setFlowOpacity(tB >= 0 ? 0.95 : 0)
    this.eFwd.update(dt)
    if (tB >= 0) this.eBwd.update(dt)

    // per-edge state
    const flash = tN >= 0 ? Math.sin(tN * Math.PI) : 0
    for (const e of this.netEdges) {
      let w = e.w * 0.85
      if (tF >= 0) w = e.w * (0.15 + 0.85 * prox(this.netPos[e.l][e.i].x, fwFront))
      else if (tN >= 0) w = lerp(e.w, e.wN, smoothstep(0, 1, tN))
      else if (tR >= 0) w = lerp(e.wN, e.w, smoothstep(0, 1, tR))
      this.eFwd.setWeight(e.iF, w)
      if (tN >= 0 || (tR >= 0 && tR < 0.4)) {
        _tmpC.copy(CYAN).lerp(AMBER, tN >= 0 ? flash * (0.35 + 0.65 * e.blame) : 0)
        this.eFwd.setColor(e.iF, _tmpC)
      }
      this.eBwd.setWeight(e.iB, tB >= 0 ? e.blame * (0.08 + 0.92 * prox(e.mx, bwFront)) : 0)
    }

    // per-node state
    const L = NET.sizes.length
    this.netNodes.forEach((row, l) =>
      row.forEach((n, i) => {
        const x = this.netPos[l][i].x
        const isOut = l === L - 1
        let lvl = 0.32
        let mag = 0 // 0 = cyan, 1 = magenta (blame)
        if (tF >= 0) lvl = 0.3 + 0.8 * prox(x, fwFront)
        else if (tE >= 0) lvl = isOut ? 0.6 + 0.5 * Math.sin(tE * Math.PI * 3) : 0.32
        else if (tB >= 0) {
          const p = prox(x, bwFront)
          mag = p
          lvl = 0.3 + 0.85 * p * this.netDelta[l][i]
        } else if (tN >= 0) lvl = 0.35 + 0.5 * flash * this.netDelta[l][i]
        if (isOut && (tE >= 0 || tB >= 0)) {
          n.setColor(ROSE)
          if (tE >= 0) lvl = Math.max(lvl, 0.7)
        } else if (tN >= 0) {
          n.setColor(_tmpC.copy(CYAN).lerp(AMBER, flash * 0.6))
        } else {
          n.setColor(mag > 0.04 ? _tmpC.copy(CYAN).lerp(MAGENTA, mag) : CYAN)
        }
        n.setLevel(lvl)
      }),
    )

    // error flare ring
    if (tE >= 0) {
      this.errRing.scale.setScalar(0.5 + tE * 2.6)
      this.errRing.material.opacity = (1 - tE) * 0.85
    } else this.errRing.material.opacity = Math.max(0, this.errRing.material.opacity - dt * 2)

    // phase labels (damped fades)
    const T = this._netLabT
    T.fwd = damp(T.fwd, tF >= 0 ? 0.95 : 0, 7, dt)
    T.err = damp(T.err, tE >= 0 || (tB >= 0 && tB < 0.3) ? 0.95 : 0, 7, dt)
    T.bwd = damp(T.bwd, tB >= 0 ? 0.95 : 0, 7, dt)
    T.ng = damp(T.ng, tN >= 0 ? 0.95 : 0, 7, dt)
    this.labFwd.setOpacity(T.fwd)
    this.labErr.setOpacity(T.err)
    this.labBwd.setOpacity(T.bwd)
    this.labNudge.setOpacity(T.ng)
  }

  // ==========================================================================
  // beat 6 — SGD vs full batch: two descents from the same start. The minibatch
  // walker steps cheap, noisy and often; the full-batch walker steps exact and
  // rarely (each of its steps must read the WHOLE dataset).
  // ==========================================================================
  _buildSGD() {
    this.sgdGroup = new THREE.Group()
    this.sgdGroup.visible = false
    this.add(this.sgdGroup)
    const mkRunner = (colorKey, every, noisy) => {
      const cap = 340
      const pos = new Float32Array(cap * 3)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setDrawRange(0, 0)
      const line = new THREE.Line(geo, additiveLine(palette[colorKey], this._light ? 0.9 : 0.85))
      line.frustumCulled = false
      line.renderOrder = 5
      this.sgdGroup.add(line)
      let dots = null
      if (noisy) {
        dots = new THREE.Points(geo, additivePoints(palette[colorKey], 0.18, this._light ? 0.95 : 0.85))
        dots.frustumCulled = false
        dots.renderOrder = 6
        this.sgdGroup.add(dots)
      }
      const ball = new GlowNode({ color: palette[colorKey], radius: 0.3, halo: 1.0, glow: 1.5 })
      ball.setLevel(0.9)
      this.sgdGroup.add(ball)
      return { x: START.x, z: START.z, t: 0, every, noisy, cap, pos, geo, ball, count: 0, done: false, steps: 0 }
    }
    this.sgdMini = mkRunner('amber', 0.11, true)
    this.sgdBatch = mkRunner('cyan', 1.45, false)
    this.labMini = this.label('minibatch', { pill: true, opacity: 0, offset: [0, -34] })
    this.labBatch = this.label('full batch', { pill: true, opacity: 0, offset: [0, 34] })
    // the shared destination, so the race has a visible finish line
    const valley = new GlowNode({ color: palette.violet, radius: 0.16, halo: 0.7, glow: 1.1 })
    valley.position.set(this.land.minX, this.minHeight + 0.16, this.land.minZ)
    valley.setLevel(0.65)
    this.sgdGroup.add(valley)
    this.labValley = this.label('the valley', { className: 'tiny muted', opacity: 0, offset: [0, 26] })
    this.labValley.position.copy(valley.position)
    this._sgdRng = mulberry32(4242)
    this._sgdHold = 0
  }

  _sgdPush(r) {
    if (r.count >= r.cap) return
    const i = r.count
    r.pos[3 * i] = r.x
    r.pos[3 * i + 1] = this.land.height(r.x, r.z) + 0.3
    r.pos[3 * i + 2] = r.z
    r.count++
    r.geo.setDrawRange(0, r.count)
    r.geo.attributes.position.needsUpdate = true
  }

  _sgdStep(r) {
    const g = this.land.grad(r.x, r.z)
    let gx = g[0]
    let gz = g[1]
    if (r.noisy) {
      // noisy gradient estimate: jitter ∝ |∇L| (+ a floor so flats still rattle),
      // calming as the walker closes on the basin so it can settle
      const gm = Math.hypot(gx, gz)
      const dmin = Math.hypot(r.x - this.land.minX, r.z - this.land.minZ)
      const s = 0.85 * Math.min(1, dmin / 1.2)
      gx += gauss(this._sgdRng) * s * (gm + 0.35)
      gz += gauss(this._sgdRng) * s * (gm + 0.35)
    }
    const nx = clamp(r.x - LR * gx, -BOUND, BOUND)
    const nz = clamp(r.z - LR * gz, -BOUND, BOUND)
    const moved = Math.abs(nx - r.x) + Math.abs(nz - r.z)
    r.x = nx
    r.z = nz
    r.steps++
    this._sgdPush(r)
    if (moved < 2e-3 || r.steps >= r.cap - 2) r.done = true
  }

  _resetSGD(reduced) {
    this._sgdRng = mulberry32(4242)
    this._sgdHold = 0
    for (const r of [this.sgdMini, this.sgdBatch]) {
      r.x = START.x
      r.z = START.z
      r.t = 0
      r.count = 0
      r.steps = 0
      r.done = false
      this._sgdPush(r)
      r.ball.position.set(r.x, this.land.height(r.x, r.z) + 0.3, r.z)
    }
    if (reduced) {
      // static end state: both full paths drawn, balls parked at their ends
      let guard = 0
      while (!this.sgdMini.done && guard++ < 400) this._sgdStep(this.sgdMini)
      guard = 0
      while (!this.sgdBatch.done && guard++ < 200) this._sgdStep(this.sgdBatch)
      for (const r of [this.sgdMini, this.sgdBatch]) r.ball.position.set(r.x, this.land.height(r.x, r.z) + 0.3, r.z)
    }
  }

  _updateSGD(dt, t) {
    const reduced = this.ctx.reduced
    if (!reduced) {
      for (const r of [this.sgdMini, this.sgdBatch]) {
        if (!r.done) {
          r.t += dt
          let guard = 0
          while (r.t >= r.every && !r.done && guard++ < 10) {
            r.t -= r.every
            this._sgdStep(r)
          }
        }
        const ty = this.land.height(r.x, r.z) + 0.3
        r.ball.position.x = damp(r.ball.position.x, r.x, 11, dt)
        r.ball.position.y = damp(r.ball.position.y, ty, 11, dt)
        r.ball.position.z = damp(r.ball.position.z, r.z, 11, dt)
        r.ball.setLevel(r.done ? 0.85 + Math.sin(t * 3.5) * 0.12 : 0.9)
      }
      // once the minibatch walker has settled, let the contrast sink in, then replay
      if (this.sgdMini.done) {
        this._sgdHold += dt
        if (this._sgdHold > 9) this._resetSGD(false)
      }
    }
    this.labMini.setOpacity(0.95)
    this.labBatch.setOpacity(0.95)
    this.labValley.setOpacity(0.8)
    this.labMini.position.copy(this.sgdMini.ball.position)
    this.labBatch.position.copy(this.sgdBatch.ball.position)
  }

  // ==========================================================================
  // beat 7 — overfitting: noisy samples of a true curve, a spline that memorizes
  // every point vs a cubic that follows the trend, fresh validation points, and a
  // computed train-vs-validation loss chart (poly degree 1…12 on the same data)
  // ==========================================================================
  _buildOverfit() {
    this.ofGroup = new THREE.Group()
    this.ofGroup.visible = false
    this.add(this.ofGroup)
    const { cx, sy, sxs, sys, chx0, chx1, chy0, chh } = OFP
    const X = (u) => cx + u * sxs
    const Y = (v) => sy + v * sys
    const rng = mulberry32(77)
    const g3 = () => gauss(rng)
    const fTrue = (u) => 1.05 * Math.sin(1.05 * u) + 0.18 * u

    // training data (13 noisy samples of the true curve)
    const NU = 13
    const tu = []
    const tv = []
    for (let i = 0; i < NU; i++) {
      const u = -3 + (6 * i) / (NU - 1) + (rng() - 0.5) * 0.4
      tu.push(u)
      tv.push(fTrue(u) + g3() * 0.4)
    }
    // held-out validation data (26 points power the chart; we display 4)
    const vu = []
    const vv = []
    for (let i = 0; i < 26; i++) {
      const u = -2.9 + 5.8 * rng()
      vu.push(u)
      vv.push(fTrue(u) + g3() * 0.4)
    }

    // train scatter
    const tp = new Float32Array(NU * 3)
    tu.forEach((u, i) => {
      tp[3 * i] = X(u)
      tp[3 * i + 1] = Y(tv[i])
      tp[3 * i + 2] = 0
    })
    const tgeo = new THREE.BufferGeometry()
    tgeo.setAttribute('position', new THREE.BufferAttribute(tp, 3))
    const trainPts = new THREE.Points(tgeo, additivePoints(palette.hot, 0.23, 0.95))
    trainPts.frustumCulled = false
    this.ofGroup.add(trainPts)

    // the two fits — really computed on those points
    const cubic = polyfit(tu, tv, 3)
    const wild = spline(tu, tv)
    const u0 = Math.min(...tu)
    const u1 = Math.max(...tu)
    const mkCurve = (fn, a, b, n, color, op) => {
      const pts = []
      for (let i = 0; i <= n; i++) {
        const u = a + ((b - a) * i) / n
        pts.push(new THREE.Vector3(X(u), Y(fn(u)), 0))
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), additiveLine(color, op))
      line.frustumCulled = false
      this.ofGroup.add(line)
      return { line, n: n + 1, pts }
    }
    this.ofCyan = mkCurve(cubic, -3.15, 3.15, 180, palette.cyan, this._light ? 0.95 : 0.9)
    this.ofRose = mkCurve(wild, u0, u1, 220, palette.rose, this._light ? 0.95 : 0.85)

    // 4 display validation points, chosen (deterministically) near the trend
    const cand = vu
      .map((u, i) => ({ u, v: vv[i], d: Math.abs(vv[i] - cubic(u)) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 10)
    const targets = [-2.4, -0.7, 1.7, 2.5]
    this.ofVal = targets.map((tgt) => {
      let best = cand[0]
      for (const c of cand) if (Math.abs(c.u - tgt) < Math.abs(best.u - tgt)) best = c
      const n = new GlowNode({ color: palette.lime, radius: 0.075, halo: 0.3, glow: 1.1 })
      n.position.set(X(best.u), Y(best.v), 0.05)
      n.setLevel(0.7)
      this.ofGroup.add(n)
      return n
    })

    // labels anchored to real curve features
    let pkI = 0
    this.ofRose.pts.forEach((p, i) => {
      if (p.y > this.ofRose.pts[pkI].y) pkI = i
    })
    const pk = this.ofRose.pts[pkI]
    this.labWild = this.label('memorizes the noise', { className: 'tiny', position: new THREE.Vector3(pk.x, pk.y + 0.5, 0), opacity: 0 })
    this.labTrend = this.label('follows the trend', { className: 'tiny', position: new THREE.Vector3(X(2.0), Y(cubic(2.0)) - 0.62, 0), opacity: 0 })
    this.labNew = this.label('new data', { pill: true, position: new THREE.Vector3(this.ofVal[0].position.x, this.ofVal[0].position.y - 0.62, 0), opacity: 0 })

    // --- the loss chart: RMSE of degree-d fits on train vs validation ---------
    const chart = new THREE.Group()
    this.ofGroup.add(chart)
    this.ofChartMats = []
    const axis = (pts) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), additiveLine(palette.violet, 0.4))
      chart.add(l)
      this.ofChartMats.push({ mat: l.material, base: 0.4 })
    }
    axis([new THREE.Vector3(chx0 - 0.15, chy0, 0), new THREE.Vector3(chx1 + 0.25, chy0, 0)])
    axis([new THREE.Vector3(chx0 - 0.15, chy0, 0), new THREE.Vector3(chx0 - 0.15, chy0 + chh + 0.3, 0)])
    const rmse = (f, us, vs) => Math.sqrt(us.reduce((s, u, i) => s + (f(u) - vs[i]) ** 2, 0) / us.length)
    const trL = []
    const vaL = []
    for (let d = 1; d <= 12; d++) {
      const f = polyfit(tu, tv, d)
      trL.push(rmse(f, tu, tv))
      vaL.push(rmse(f, vu, vv))
    }
    const CX = (d) => chx0 + ((d - 1) / 11) * (chx1 - chx0)
    const CY = (l) => chy0 + Math.min(l / 1.75, 1.02) * chh
    const mkChart = (arr, color, op) => {
      const pts = arr.map((l, i) => new THREE.Vector3(CX(i + 1), CY(l), 0))
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), additiveLine(color, op))
      line.frustumCulled = false
      chart.add(line)
      this.ofChartMats.push({ mat: line.material, base: op })
      return pts
    }
    mkChart(trL, palette.hot, 0.85)
    const vaPts = mkChart(vaL, palette.lime, 0.95)
    // the turn: validation minimum = the moment memorization begins
    let mnI = 0
    vaL.forEach((l, i) => {
      if (l < vaL[mnI]) mnI = i
    })
    this.ofTurn = new GlowNode({ color: palette.rose, radius: 0.1, halo: 0.9, glow: 1.4 })
    this.ofTurn.position.copy(vaPts[mnI])
    chart.add(this.ofTurn)
    this.labTurn = this.label('memorization begins', { className: 'tiny', position: new THREE.Vector3(vaPts[mnI].x + 0.4, vaPts[mnI].y + 0.62, 0), opacity: 0 })
    this.labTrain = this.label('train', { className: 'tiny muted', position: new THREE.Vector3(chx1 + 0.55, CY(trL[11]), 0), opacity: 0 })
    this.labVal = this.label('validation', { className: 'tiny muted', position: new THREE.Vector3(chx1 + 0.78, CY(vaL[11]), 0), opacity: 0 })
    this.labFlex = this.label('flexibility →', { className: 'tiny muted', position: new THREE.Vector3((chx0 + chx1) / 2, chy0 - 0.42, 0), opacity: 0 })
    this.ofChart = chart
    this._ofProxy = { rose: 0, cyan: 0, val: 0, chart: 0 }
  }

  _revealOverfit(reduced) {
    const P = this._ofProxy
    gsap.killTweensOf(P)
    const apply = () => {
      this.ofCyan.line.geometry.setDrawRange(0, Math.floor(P.cyan * this.ofCyan.n))
      this.ofRose.line.geometry.setDrawRange(0, Math.floor(P.rose * this.ofRose.n))
      for (const v of this.ofVal) v.scale.setScalar(Math.max(P.val, 0.001))
      for (const m of this.ofChartMats) m.mat.opacity = m.base * P.chart
      this.ofTurn.scale.setScalar(Math.max(P.chart, 0.001))
      this.labTrend.setOpacity(P.cyan * 0.95)
      this.labWild.setOpacity(P.rose * 0.95)
      this.labNew.setOpacity(P.val * 0.95)
      this.labTurn.setOpacity(P.chart * 0.95)
      this.labTrain.setOpacity(P.chart * 0.85)
      this.labVal.setOpacity(P.chart * 0.85)
      this.labFlex.setOpacity(P.chart * 0.8)
    }
    if (reduced) {
      P.rose = P.cyan = P.val = P.chart = 1
      apply()
      return
    }
    P.rose = P.cyan = P.val = P.chart = 0
    apply()
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', onUpdate: apply } })
    tl.to(P, { cyan: 1, duration: 0.7 }, 0.15)
    tl.to(P, { rose: 1, duration: 0.9 }, 0.7)
    tl.to(P, { val: 1, duration: 0.4, ease: 'back.out(1.8)' }, 1.5)
    tl.to(P, { chart: 1, duration: 0.6 }, 1.7)
  }

  _hideOverfitLabels() {
    for (const l of [this.labWild, this.labTrend, this.labNew, this.labTurn, this.labTrain, this.labVal, this.labFlex]) l.setOpacity(0)
  }

  // ==========================================================================
  // beats + camera
  // ==========================================================================
  onStep(i) {
    const reduced = this.ctx.reduced

    // which pieces of the world exist right now
    this.lrGroup.visible = i === 4
    this.netGroup.visible = i === 5 || i === 8
    this.sgdGroup.visible = i === 6
    this.ofGroup.visible = i === 7
    // on the SGD map view, dim the terrain so the two paths pop
    this.land.wire.material.opacity = i === 6 ? (this._light ? 0.2 : 0.1) : this._wireBase
    if (!this._light) this.land.surface.material.emissiveIntensity = i === 6 ? 0.16 : this._emisBase
    const ballOn = i <= 3 || i === 8
    this.ballNode.visible = ballOn
    this.trail.visible = ballOn
    this.arrowOn = i === 3 || i === 8
    if (!this.arrowOn) {
      this.arrow.visible = false
      this.labDownhill.setOpacity(0)
    }

    // ball / descent state per beat
    if (i <= 2) this._resetBall()
    if (i === 3) {
      this._resetBall()
      if (reduced) this._runSteps(14)
      else this.gdActive = true
    }
    if (i >= 4) this.gdActive = false
    if (i === 4) this._lrReset(reduced)
    if (i === 5 || i === 8) {
      this._bpT = 0
      this._bpCycle = -1
      if (reduced) this._netStatic()
      else {
        this.eBwd.setLineOpacity(0)
        this.eBwd.setFlowOpacity(0)
      }
    }
    if (i === 8) {
      this._resetBall()
      if (reduced) this._runSteps(MAX_STEPS)
    }
    if (i === 6) this._resetSGD(reduced)
    if (i === 7) this._revealOverfit(reduced)

    // hide labels that belong to scenes we just left
    if (i !== 4) for (const b of this.lrBalls) b.lab.setOpacity(0)
    if (i !== 5 && i !== 8) for (const l of [this.labFwd, this.labBwd, this.labErr, this.labNudge]) l.setOpacity(0)
    if (i !== 6) {
      this.labMini.setOpacity(0)
      this.labBatch.setOpacity(0)
      this.labValley.setOpacity(0)
    }
    if (i !== 7) this._hideOverfitLabels()

    // camera framing (fold the accumulated orbit into az so flat panels face us)
    this.cam.az += this.orbit
    this.orbit = 0
    const f = FRAMES[i] || FRAMES[0]
    this.orbitSpeed = f.orbit
    if (reduced) {
      this.cam.dist = f.dist
      this.cam.az = f.az
      this.cam.el = f.el
      this.lookTarget.set(f.lx, f.ly, f.lz)
    } else {
      gsap.to(this.cam, { dist: f.dist, az: f.az, el: f.el, duration: DUR.slow, ease: EASE.inOut, overwrite: true })
      gsap.to(this.lookTarget, { x: f.lx, y: f.ly, z: f.lz, duration: DUR.slow, ease: EASE.inOut, overwrite: true })
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
    if (this.trail) this.trail.geometry.setDrawRange(0, 0)
    this.ballNode.position.set(START.x, this.land.height(START.x, START.z) + 0.3, START.z)
  }

  // run n descent steps instantly (reduced-motion static states)
  _runSteps(n) {
    let guard = 0
    while (!this._converged && this._gdSteps < Math.min(n, MAX_STEPS) && guard++ < MAX_STEPS) this._gdStep()
    this.ballNode.position.set(this.ball.x, this.land.height(this.ball.x, this.ball.z) + 0.3, this.ball.z)
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

    // --- gradient descent, in discrete readable steps (beat 3) ---
    if (this.gdActive && !reduced && !this._converged) {
      this._gdT += dt
      let guard = 0
      while (this._gdT >= STEP_EVERY && this._gdSteps < MAX_STEPS && guard++ < 8) {
        this._gdT -= STEP_EVERY
        this._gdStep()
      }
    }

    // --- ball follows the descent (damped) ---
    const tx = this.ball.x
    const tz = this.ball.z
    const ty = this.land.height(tx, tz) + 0.3
    if (reduced) {
      this.ballNode.position.set(tx, ty, tz)
    } else {
      this.ballNode.position.x = damp(this.ballNode.position.x, tx, 9, dt)
      this.ballNode.position.y = damp(this.ballNode.position.y, ty, 9, dt)
      this.ballNode.position.z = damp(this.ballNode.position.z, tz, 9, dt)
    }
    this.ballNode.setLevel(0.9 + Math.sin(t * 2.2) * 0.07)

    // --- gradient arrow ---
    if (this.arrowOn && this.ballNode.visible) this._updateArrow(this.step === 3)

    // --- loss readout, from the ball's current height ---
    const lossOn = this.step === 2 || this.step === 3 || this.step === 8
    this.lossLabel.setVisible(lossOn)
    if (lossOn) {
      const loss = Math.max(0, this.ballNode.position.y - 0.3 - this.minHeight)
      this.lossLabel.position.set(this.ballNode.position.x, this.ballNode.position.y + 0.8, this.ballNode.position.z)
      const str = `${this.L('loss')} ${loss.toFixed(2)}`
      if (str !== this._lossStr) {
        this.lossLabel.setText(str)
        this._lossStr = str
      }
    }

    // --- side scenes ---
    if (this.lrGroup.visible) this._updateLR(dt, t)
    if (this.netGroup.visible && !reduced) this._updateNet(dt, t)
    if (this.sgdGroup.visible) this._updateSGD(dt, t)

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
