import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additiveLine } from '../../lib/materials.js'
import { palette } from '../../theme/palette.js'
import { blend, isLight } from '../../theme/theme.js'
import { damp, lerp, clamp01, smoothstep } from '../../theme/motion.js'

// Accent: cyan (the forward-flow / "building block" color).
const CYAN = new THREE.Color(palette.cyan)
const AMBER = new THREE.Color(palette.amber)
const MAGENTA = new THREE.Color(palette.magenta)
const VIOLET = new THREE.Color(palette.violet)
const LIME = new THREE.Color(palette.lime)
const MUTED = new THREE.Color(palette.muted)

// Base opacities per edge bundle; multiplied by a per-group crossfade alpha so the
// six compositions (neuron → gate → gate gallery → XOR plane → layer → network →
// bump-sum) dissolve into each other.
const SINGLE_LINE = 0.6
const SINGLE_FLOW = 0.95
const LAYER_LINE = 0.4
const LAYER_FLOW = 0.85
const NET_LINE = 0.32
const NET_FLOW = 0.8

// --- the real activation functions (plotted as-is, no artistic swooshes) ------
const ACTS = [
  { name: 'step', formula: '0 / 1', f: (x) => (x >= 0 ? 1 : 0) },
  { name: 'sigmoid', formula: '1/(1+e⁻ˣ)', f: (x) => 1 / (1 + Math.exp(-x)) },
  { name: 'tanh', formula: 'tanh(x)', f: (x) => Math.tanh(x) },
  { name: 'ReLU', formula: 'max(0, x)', f: (x) => Math.max(0, x) },
  {
    name: 'GELU',
    formula: 'x·Φ(x)',
    f: (x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x))),
  },
]

// XOR truth table: output 0 on one diagonal, output 1 on the other.
const XOR_PTS = [
  { u: 0, v: 0, c: 0 },
  { u: 1, v: 1, c: 0 },
  { u: 0, v: 1, c: 1 },
  { u: 1, v: 0, c: 1 },
]

// the bump-sum target: an arbitrary wiggly (but continuous) function
const bumpF = (x) => 1.12 * Math.sin(1.15 * x + 0.4) + 0.42 * Math.sin(2.6 * x + 1.6)
// unit triangular tent centered on m with half-width hw
const tent = (x, m, hw) => Math.max(0, 1 - Math.abs(x - m) / hw)
// back-out ease (slight overshoot) for bumps popping into place
const backOut = (u) => {
  const s = 1.70158
  const q = u - 1
  return 1 + (s + 1) * q * q * q + s * q * q
}

export const beats = [
  {
    html: `<span class="eyebrow">Chapter 01 · the building block</span>
      <h2>The Neuron</h2>
      <p class="lead">Everything an AI does is built from one tiny part, repeated millions of times. A neuron — in its classic single-unit form, the <strong>perceptron</strong> — takes a handful of numbers as <strong>inputs</strong> and boils them down to a single number. The art is in <em>how</em> it combines them.</p>
      <p>Picture deciding whether to go for a walk. Is it raining? How busy are you? Did a friend ask along? Each fact sways you by a different amount — and that "how much it matters" is its <strong>weight</strong>. The neuron multiplies every input by its weight, then totals the results — each input <span class="tok">x</span> against its weight <span class="tok">w</span>, paired off and added up. Mathematicians call that one move a <strong>dot product</strong>, written <span class="tok">w·x</span>.</p>
      <p>Finally it adds a <strong>bias</strong>&nbsp;<span class="tok">b</span>: a baseline lean, like being someone who just tends to say yes. The tally so far is <span class="tok">w·x + b</span> — many numbers in, one running total out. Next we'll see what that total sets off.</p>
      <p class="aside">The perceptron has a birthday: 1958, when Frank Rosenblatt wired one together — not as software but as a room-sized machine, its weights set by motor-driven dials. The press promptly promised a machine that would "walk, talk, see, and be conscious of its existence." The hype cycle is older than the chips.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The gate</h3>
      <p>That running total then meets a gate. Back to the walk: you don't head out the door for every faint nudge — your eagerness has to build first. A neuron works the same way. As the total climbs past a <strong>threshold</strong> it begins to <strong>fire</strong>, sending a stronger signal onward. But "fire" is a metaphor — in a modern neuron nothing flips like a light switch. The response curves up smoothly, a steep bend rather than a sudden flip.</p>
      <p>That gate is the <strong>activation</strong>, written <span class="tok">σ</span>, so a neuron's full output is <span class="tok">y = σ(w·x + b)</span> — weigh, sum, lean, then bend. The bend is the <strong>nonlinearity</strong>, a fancy term for "the response isn't a straight line" — and it is the one part a neuron cannot do without. Strip it out and, as you'll see shortly, no amount of stacking buys you anything.</p>
      <p class="aside">Watch the core brighten as the total climbs, then rise steeply — not snap — as it clears the threshold. The amber flush is the gate opening.</p>`,
  },
  {
    html: `<h3>A gallery of gates</h3>
      <p>So what shape is the bend? That's a design choice, and the field has cycled through a whole gallery of them. Rosenblatt's perceptron used a hard <strong>step</strong> — 0 below threshold, 1 above, nothing in between. Then came the smooth squashers: <strong>sigmoid</strong>, easing from 0 up to 1, and <span class="tok">tanh</span>, the same S centered on zero.</p>
      <p>Modern nets got ruthless. <strong>ReLU</strong> is just <span class="tok">max(0, x)</span> — kill the negatives, pass the positives untouched. One kink, almost zero arithmetic. And today's transformers mostly use <strong>GELU</strong>, which is ReLU with the corner filed smooth.</p>
      <p>Why fuss over smoothness? Because training — next chapter — learns by feeling for <em>slopes</em>: nudge a knob, watch the output move, follow the trend. Watch the rose tangent riding each curve. On the step it lies flat everywhere — the answer never moves, until it suddenly does — so it offers learning no trend to follow. The smooth gates always answer back.</p>
      <p class="aside">ReLU's cheapness, plus a slope that never fades for positive signals, is a quiet hero of the deep-learning boom (AlexNet, 2012): sigmoid's slope collapses toward zero at both ends, so in deep stacks the learning signal starves. GELU keeps ReLU's virtues and removes its dead corner.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The straight-line ceiling</h3>
      <p>Time to prove the bend earns its keep. Strip it out and a neuron is pure straight-line math — and straight lines compose into straight lines. Feed one linear neuron into another: a slope times a slope is just another slope. A hundred stacked linear layers fold flat into one, and however deep you build, the whole tower can still only draw a single straight cut through its inputs.</p>
      <p>Now the famous counterexample. <strong>XOR</strong> — "exactly one, not both" — is about the smallest question you can ask of two inputs: fire for <span class="tok">(0,1)</span> or <span class="tok">(1,0)</span>, stay quiet for <span class="tok">(0,0)</span> and <span class="tok">(1,1)</span>. Plot the four cases and the matching answers sit on <em>opposite corners</em>. Watch the straight cut hunt: one straight cut can never isolate opposite corners, so some case always lands on the wrong side. In 1969 Minsky and Papert made this small, brutal observation the centerpiece of their book <em>Perceptrons</em> — and neural-net funding froze for a decade.</p>
      <p>Then watch the fix: one <em>hidden</em> layer and one bend. Two cuts, each made by a neuron, combined through the gate — and a diagonal band snaps around the two firing corners. All four right. The ceiling was never intelligence; it was geometry.</p>
      <p class="aside">The stinging irony of the first AI winter: the cure was already suspected — Rosenblatt himself guessed that hidden layers were the way out. What was missing until the 1980s was a practical way to <em>train</em> them. The idea wasn't wrong; the search was unsolved.</p>`,
  },
  {
    html: `<h3>A layer</h3>
      <p>A single neuron asks a single question — XOR just showed how low that ceiling sits. Real problems need many questions asked at once. A <strong>layer</strong> is a row of neurons working <em>in parallel</em> — side by side, all at the same moment. Each one reads the very same inputs, but each carries its own private set of weights.</p>
      <p>So every neuron ends up tuned to something different — one keys on the weather, another on your free time, another on who's coming along. Same facts in, different questions asked. Together they notice far more than any one of them could alone.</p>
      <p>Stack those private weight rows and they form a grid — a <strong>matrix</strong>&nbsp;<span class="tok">W</span> — and the layer's whole job shrinks to one line, <span class="tok">σ(Wx + b)</span>: one matrix multiply, one bias, one bend, every neuron at once. It's the same move as a single neuron, just run in bulk — which is exactly why this math flies on hardware built to multiply matrices.</p>`,
  },
  {
    side: 'right',
    html: `<h3>A network</h3>
      <p>Now stack the layers, each one feeding the next: <span class="tok">input</span> → <span class="tok">hidden</span> → <span class="tok">hidden</span> → <span class="tok">output</span>. The input layer takes in the raw numbers. The <strong>hidden</strong> layers in the middle — hidden because nothing outside ever reads them directly — refine those into steadily richer patterns. The output layer reports the answer.</p>
      <p>Under the hood it's plain nesting: each layer's output vector becomes the next layer's input, so the network is just <span class="tok">σ(Wx + b)</span> wrapped around itself again and again — functions composed, one tucked inside the next.</p>
      <p>Depth is the whole point. Each layer combines what the one before it found into something more abstract — much the way strokes build into letters, and letters into words. One wide layer could in theory fit almost anything; depth simply gets there far more cheaply, each layer building on the last one's work.</p>`,
  },
  {
    html: `<h3>The forward pass</h3>
      <p>Watching it run is the best part. Feed numbers into the left edge and they ripple rightward, each layer waking the next, until an answer lights up at the far end. That single left-to-right sweep is a <strong>forward pass</strong> — one trip through the network that turns an input into an output.</p>
      <p>The travelling wave is the entire computation unfolding in order: all those weighted sums and smooth bends, one layer lighting up after another — and the order is strict, since each layer needs the one before it to finish first. Fix the weights and it's perfectly repeatable: the same numbers in always give the same answer out. That, quite literally, is the network <em>thinking</em> — and this very sweep runs every time you prompt one of the models we're building toward.</p>
      <p class="aside">Follow the bright pulse as it crosses from input to output.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Any curve you can draw</h3>
      <p>Earlier I claimed layers of gentle bends can trace "patterns of startling intricacy." Strong words — so let's construct the proof. The dashed line is a target: some arbitrary curve, wiggles and all. The only parts we're allowed are ReLU neurons.</p>
      <p>Three ReLUs — one bending up, one bending down twice as hard, one bending back up — sum into a little <strong>bump</strong>: a tent that lives on one patch of the x-axis and is zero everywhere else. Scale each tent to touch the target, slide one under each stretch of curve, and <em>add</em>. Watch the amber sum assemble: six bumps rough out the silhouette; twelve hug it. Every extra bump pins the error down further — name any tolerance and enough bumps will beat it.</p>
      <p>That's the <strong>universal approximation theorem</strong> (Cybenko 1989, Hornik 1991): a single hidden layer, wide enough, can match any continuous function as closely as you like. Mind the fine print, though. The theorem says the right weights <em>exist</em>. It says nothing about how to <em>find</em> them — and that search is the entire next chapter.</p>
      <p class="aside">The theorem is a statement about width, and it can demand absurd widths — the real lesson of deep learning is that depth finds compact solutions the theorem never promised. Existence, efficiency, and learnability are three different things; the theorem only ever guaranteed the first.</p>`,
  },
  {
    html: `<h3>Billions of knobs</h3>
      <p>Step back and look at what we've assembled. No single neuron is clever — each just weighs a few numbers and bends the result. The intelligence is in the stacking: layer upon layer, every gate adding its little bend, until the composed whole can mold itself to almost any pattern there is.</p>
      <p>Now count what you can turn. Our first neuron had three weights and a bias — <strong>four knobs</strong>. This modest network has ninety-three. A frontier language model has <strong>billions</strong>, sometimes trillions — and not one of them is set by hand. They start as random noise, and the network is <em>taught</em>: shown examples, corrected, nudged, millions of times, until its answers come out right. How that teaching works is where we go next.</p>
      <div class="postcard">A neuron is a weighted sum passed through a gate. Stack enough of them and you get a machine that can shape itself to almost anything — provided something sets its billions of knobs. Nobody does. They're learned.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/training">next: Learning →</a></div>`,
  },
]

export default class Neuron extends Chapter {
  init() {
    this.setBloom(0.9, 0.45, 0.8)
    this.addAmbientField(360, 70)
    this.addLights()
    // refresh captured colors from the live (theme-aware) palette
    CYAN.set(palette.cyan)
    AMBER.set(palette.amber)
    MAGENTA.set(palette.magenta)
    VIOLET.set(palette.violet)
    LIME.set(palette.lime)
    MUTED.set(palette.muted)
    this._light = isLight()

    this.camera.position.set(0, 0, 6.2)
    this.lookTarget = new THREE.Vector3(0.4, 0, 0)
    this._tmp = new THREE.Color()

    // per-function plot colors (step is gray — the defunct gate)
    this._actCols = [MUTED, CYAN, AMBER, LIME, VIOLET]

    this._buildSingle()
    this._buildGallery()
    this._buildXor()
    this._buildLayer()
    this._buildNetwork()
    this._buildBump()

    // crossfade state: which composition is on screen
    this.alpha = { single: 1, gallery: 0, xor: 0, layer: 0, network: 0, bump: 0 }
    this.target = { single: 1, gallery: 0, xor: 0, layer: 0, network: 0, bump: 0 }
    this._xorClock = 0
    this._bumpClock = 0
    this._resetGallery()
  }

  // --- small builders ---------------------------------------------------------
  _mkNode(group, x, y, opts) {
    const n = new GlowNode(opts)
    n.position.set(x, y, 0)
    n.setLevel(0)
    group.add(n)
    return n
  }

  // a Line with a dynamic position attribute (n points), never frustum-culled
  _dynLine(parent, n, color, opacity) {
    const geo = new THREE.BufferGeometry()
    const attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', attr)
    const line = new THREE.Line(geo, additiveLine(color, opacity))
    line.frustumCulled = false
    parent.add(line)
    return { line, attr, mat: line.material }
  }

  _segs(parent, arr, color, opacity) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3))
    const seg = new THREE.LineSegments(geo, additiveLine(color, opacity))
    seg.frustumCulled = false
    parent.add(seg)
    return seg
  }

  // --- scene construction ------------------------------------------------------
  // One neuron: a few weighted inputs summed into a bright core that fires onward.
  _buildSingle() {
    this.gSingle = new THREE.Group()
    this.add(this.gSingle)

    this.inW = [0.95, 0.4, 0.72] // "learned" weights → edge brightness
    this.inNodes = []
    const inY = [1.6, 0, -1.6]
    const inPos = []
    // inputs sit at x=-1.05 (not -2.4) so they + their x₁₂₃ labels clear the
    // left card on beat 0 without moving the whole composition
    inY.forEach((y) => {
      this.inNodes.push(this._mkNode(this.gSingle, -1.05, y, { color: palette.cyan, radius: 0.16, halo: 0.7, glow: 1.0 }))
      inPos.push(new THREE.Vector3(-1.05, y, 0))
    })

    this.neuron = this._mkNode(this.gSingle, 1.8, 0, { color: palette.cyan, radius: 0.42, halo: 1.15, glow: 1.2 })
    this.outNode = this._mkNode(this.gSingle, 3.6, 0, { color: palette.cyan, radius: 0.18, halo: 0.8, glow: 1.05 })
    const neuPos = new THREE.Vector3(1.8, 0, 0)
    const outPos = new THREE.Vector3(3.6, 0, 0)

    this.eIn = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.6, baseOpacity: SINGLE_LINE, flowSize: 0.16 })
    for (let i = 0; i < 3; i++) this.eIn.addEdge(inPos[i], neuPos, palette.cyan, this.inW[i])
    this.outIdx = this.eIn.addEdge(neuPos, outPos, palette.cyan, 0.06)
    this.eIn.build()
    this.gSingle.add(this.eIn)

    this.lblSingle = [
      this.label('x₁', { pill: true, position: new THREE.Vector3(-1.7, 1.6, 0), opacity: 0 }),
      this.label('x₂', { pill: true, position: new THREE.Vector3(-1.7, 0, 0), opacity: 0 }),
      this.label('x₃', { pill: true, position: new THREE.Vector3(-1.7, -1.6, 0), opacity: 0 }),
      this.label('neuron', { pill: true, position: new THREE.Vector3(1.8, 1.25, 0), opacity: 0 }),
      this.label('ŷ', { pill: true, position: new THREE.Vector3(3.6, 0.95, 0), opacity: 0 }),
    ]
  }

  // The activation gallery: one real plot (thin axes, x from −4..4) where the
  // bright curve MORPHS between the true functions; ghost curves keep the whole
  // family on stage; a live dot rides x with its output height + local slope.
  _buildGallery() {
    const g = (this.gGal = new THREE.Group())
    g.visible = false
    this.add(g)
    const L = this._light
    const sx = (this._galSX = 0.72)
    const sy = (this._galSY = 0.5)
    const oy = (this._galOY = -0.8)
    const X = (x) => x * sx
    const Y = (v) => oy + v * sy

    // thin axes + integer ticks
    const seg = []
    seg.push(-3.05, oy, 0, 3.05, oy, 0) // x axis
    seg.push(0, oy - 0.75, 0, 0, oy + 2.3, 0) // y axis
    for (let k = -4; k <= 4; k++) {
      if (!k) continue
      seg.push(X(k), oy - 0.07, 0, X(k), oy + 0.07, 0)
    }
    this.galAxes = this._segs(g, seg, palette.violet, L ? 0.6 : 0.45)

    // dashed guide at σ = 1 (ceiling of step/sigmoid, asymptote of tanh)
    const dash = []
    for (let x = -2.88; x < 2.86; x += 0.34) dash.push(x, Y(1), 0, Math.min(x + 0.17, 2.88), Y(1), 0)
    this.galGuide = this._segs(g, dash, palette.violet, L ? 0.4 : 0.24)

    // ghost curves: the whole family stays faintly on stage
    const N = (this._galN = 181)
    this.galGhosts = []
    for (let i = 0; i < ACTS.length; i++) {
      const pts = new Float32Array(N * 3)
      for (let j = 0; j < N; j++) {
        const x = -4 + (8 * j) / (N - 1)
        pts[3 * j] = X(x)
        pts[3 * j + 1] = Y(ACTS[i].f(x))
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const line = new THREE.Line(geo, additiveLine(this._actCols[i], 0.15))
      line.frustumCulled = false
      g.add(line)
      this.galGhosts.push(line.material)
    }

    // the bright morphing curve
    const bright = this._dynLine(g, N, palette.cyan, 0.98)
    this.galCurve = bright.line
    this.galCurveAttr = bright.attr
    const ba = bright.attr.array
    for (let j = 0; j < N; j++) {
      const x = -4 + (8 * j) / (N - 1)
      ba[3 * j] = X(x)
      ba[3 * j + 1] = Y(ACTS[0].f(x))
    }

    // live input dot + vertical guide + tangent (the slope training will follow)
    this.galDot = new GlowNode({ color: palette.hot, radius: 0.075, halo: 0.45, glow: 1.1 })
    this.galDot.setLevel(0)
    g.add(this.galDot)
    const vg = this._dynLine(g, 2, palette.hot, 0.4)
    this.galVAttr = vg.attr
    this.galVMat = vg.mat
    const tg = this._dynLine(g, 2, palette.rose, 0.95)
    this.galTanAttr = tg.attr
    this.galTanMat = tg.mat

    // tabs (the gallery row) + tiny color keys above each
    const tabX = [-2.4, -1.2, 0, 1.2, 2.4]
    this.galTabs = ACTS.map((a2, i) => this.label(a2.name, { pill: true, position: new THREE.Vector3(tabX[i], -2.12, 0), opacity: 0 }))
    this.galTabDots = tabX.map((x, i) => {
      const n = new GlowNode({ color: this._actCols[i], radius: 0.055, halo: 0.5, glow: 1.1 })
      n.position.set(x, -1.8, 0)
      n.setLevel(0)
      g.add(n)
      return n
    })
    this.lblFormula = this.label(ACTS[0].formula, { pill: true, position: new THREE.Vector3(-1.9, 1.5, 0), opacity: 0 })
    this.lblSlope = this.label('slope', { className: 'tiny', position: new THREE.Vector3(0, 0, 0), opacity: 0 })
    this.lblGalX = this.label('x', { className: 'tiny muted', position: new THREE.Vector3(3.42, oy - 0.28, 0), opacity: 0 })
    this.lblGalY = this.label('σ(x)', { className: 'tiny muted', position: new THREE.Vector3(0.44, oy + 2.32, 0), opacity: 0 })
    this.lblGalOne = this.label('1', { className: 'tiny muted', position: new THREE.Vector3(-0.24, Y(1), 0), opacity: 0 })
    this.lblGalM4 = this.label('−4', { className: 'tiny muted', position: new THREE.Vector3(X(-4), oy - 0.26, 0), opacity: 0 })
    this.lblGal4 = this.label('4', { className: 'tiny muted', position: new THREE.Vector3(X(4), oy - 0.26, 0), opacity: 0 })

    this._gal = { from: 0, to: 0, mix: 1, clock: 0 }
  }

  _resetGallery() {
    const gal = this._gal
    gal.clock = 0
    gal.mix = 1
    gal.from = gal.to = this.ctx.reduced ? 4 : 0
    this.lblFormula.setText(this.L(ACTS[gal.to].formula))
  }

  // The XOR mini-plane: the four truth-table cases on a small grid, a straight
  // cut sweeping and failing, then the bent (band) boundary snapping in.
  _buildXor() {
    const g = (this.gXor = new THREE.Group())
    g.visible = false
    this.add(g)
    const L = this._light
    const S = 2.2 // data → world scale
    const W = (u) => (u - 0.5) * S
    const HB = 1.76 // half box (data −0.3 … 1.3)

    // faint grid
    const gp = []
    for (let k = 0; k <= 8; k++) {
      const c = -HB + (k * 2 * HB) / 8
      gp.push(-HB, c, 0, HB, c, 0, c, -HB, 0, c, HB, 0)
    }
    this.xorGrid = this._segs(g, gp, palette.violet, L ? 0.3 : 0.18)

    // axes along the bottom/left edges
    this.xorAxes = this._segs(g, [-HB, -HB, 0, HB + 0.35, -HB, 0, -HB, -HB, 0, -HB, HB + 0.35, 0], palette.violet, L ? 0.6 : 0.45)
    this.lblXorX1 = this.label('x₁', { className: 'tiny muted', position: new THREE.Vector3(HB + 0.18, -HB - 0.32, 0), opacity: 0 })
    this.lblXorX2 = this.label('x₂', { className: 'tiny muted', position: new THREE.Vector3(-HB, HB + 0.56, 0), opacity: 0 })

    // the four cases (true classes always shown: the LINE is what fails)
    this._xorP = XOR_PTS.map((p) => [W(p.u), W(p.v), p.c])
    this.xorPts = XOR_PTS.map((p) => {
      const n = new GlowNode({ color: p.c ? palette.magenta : palette.cyan, radius: 0.19, halo: 0.9, glow: 1.15 })
      n.position.set(W(p.u), W(p.v), 0.05)
      n.setLevel(0)
      g.add(n)
      return n
    })
    const off = [
      [-0.44, -0.34],
      [0.44, 0.34],
      [-0.44, 0.34],
      [0.44, -0.34],
    ]
    this.lblXorCorners = XOR_PTS.map((p, i) =>
      this.label(`(${p.u},${p.v})`, { className: 'tiny muted', position: new THREE.Vector3(W(p.u) + off[i][0], W(p.v) + off[i][1], 0), opacity: 0 }),
    )

    // error rings (rose) around misclassified cases
    const ring = []
    for (let i = 0; i < 28; i++) {
      const aa = (i / 28) * Math.PI * 2
      ring.push(new THREE.Vector3(Math.cos(aa) * 0.34, Math.sin(aa) * 0.34, 0))
    }
    this.xorRings = this.xorPts.map((p) => {
      const rl = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring), additiveLine(palette.rose, 0))
      rl.position.copy(p.position)
      rl.frustumCulled = false
      g.add(rl)
      return rl
    })
    this._xorWrong = [0, 0, 0, 0]

    // the sweeping straight cut (amber = the attempt)
    const sl = this._dynLine(g, 2, palette.amber, 0)
    this.xorLineAttr = sl.attr
    this.xorLineMat = sl.mat

    // the bent solution: two cuts + the band between them (class-1 region)
    this.xorSol = new THREE.Group()
    g.add(this.xorSol)
    this.xorBound = this._segs(this.xorSol, [-HB, 0.66, 0, 0.66, -HB, 0, -0.66, HB, 0, HB, -0.66, 0], palette.magenta, 0)
    const hex = [
      [-HB, 0.66],
      [-HB, HB],
      [-0.66, HB],
      [HB, -0.66],
      [HB, -HB],
      [0.66, -HB],
    ]
    const bandGeo = new THREE.BufferGeometry()
    const bandPos = []
    const fan = [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 4],
      [0, 4, 5],
    ]
    for (const tr of fan) for (const vi of tr) bandPos.push(hex[vi][0], hex[vi][1], -0.02)
    bandGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bandPos), 3))
    this.xorBandMat = new THREE.MeshBasicMaterial({
      color: MAGENTA,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: blend(),
      toneMapped: false,
    })
    const band = new THREE.Mesh(bandGeo, this.xorBandMat)
    band.frustumCulled = false
    this.xorSol.add(band)

    // legend + status labels
    this.xorLegendDots = [
      this._mkNode(g, -1.52, 2.12, { color: palette.cyan, radius: 0.09, halo: 0.6, glow: 1.0 }),
      this._mkNode(g, 0.38, 2.12, { color: palette.magenta, radius: 0.09, halo: 0.6, glow: 1.0 }),
    ]
    this.lblXorOut0 = this.label('output 0', { className: 'tiny', position: new THREE.Vector3(-0.95, 2.12, 0), opacity: 0 })
    this.lblXorOut1 = this.label('output 1', { className: 'tiny', position: new THREE.Vector3(0.97, 2.12, 0), opacity: 0 })
    this.lblXorFail = this.label('every straight cut fails', { className: 'tiny', position: new THREE.Vector3(0, -2.3, 0), opacity: 0 })
    this.lblXorSolve = this.label('one bend — all 4 right', { className: 'tiny', position: new THREE.Vector3(0, -2.3, 0), opacity: 0 })
  }

  // A layer: the same three inputs fully connected to a column of neurons.
  _buildLayer() {
    this.gLayer = new THREE.Group()
    this.gLayer.visible = false
    this.add(this.gLayer)

    this.inNodesL = []
    const inYL = [1.7, 0, -1.7]
    const inPosL = inYL.map((y) => {
      this.inNodesL.push(this._mkNode(this.gLayer, -3.6, y, { color: palette.cyan, radius: 0.16, halo: 0.7, glow: 1.0 }))
      return new THREE.Vector3(-3.6, y, 0)
    })

    const LN = 6
    this.layerNodes = []
    const neuPosL = []
    for (let i = 0; i < LN; i++) {
      const y = (i - (LN - 1) / 2) * 1.2
      this.layerNodes.push(this._mkNode(this.gLayer, 1.4, y, { color: palette.cyan, radius: 0.27, halo: 0.9, glow: 1.1 }))
      neuPosL.push(new THREE.Vector3(1.4, y, 0))
    }

    this.eLayer = new EdgeField({ flow: true, flowPerEdge: 1, flowSpeed: 0.5, baseOpacity: LAYER_LINE, flowSize: 0.12 })
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < LN; j++) {
        const w = 0.3 + 0.45 * (((i * 7 + j * 3) % 5) / 4) // varied private weights
        this.eLayer.addEdge(inPosL[i], neuPosL[j], palette.cyan, w)
      }
    }
    this.eLayer.build()
    this.gLayer.add(this.eLayer)

    this.lblLayer = [
      this.label('inputs', { pill: true, position: new THREE.Vector3(-3.6, 2.7, 0), opacity: 0 }),
      this.label('a layer', { pill: true, position: new THREE.Vector3(1.4, 4.0, 0), opacity: 0 }),
    ]
  }

  // A network: four layers, adjacent ones fully connected, lit by a forward wave.
  _buildNetwork() {
    this.gNet = new THREE.Group()
    this.gNet.visible = false
    this.add(this.gNet)

    const sizes = [4, 6, 6, 3]
    this.netX = [-5.4, -1.8, 1.8, 5.4]
    this.netXMin = -5.4
    this.netXMax = 5.4
    const spacing = 1.15

    this.netLayers = []
    this.netPos = []
    this.netLevels = []
    sizes.forEach((s, l) => {
      const arr = []
      const parr = []
      const lvls = []
      for (let i = 0; i < s; i++) {
        const y = (i - (s - 1) / 2) * spacing
        arr.push(this._mkNode(this.gNet, this.netX[l], y, { color: palette.cyan, radius: 0.2, halo: 0.85, glow: 1.1 }))
        parr.push(new THREE.Vector3(this.netX[l], y, 0))
        lvls.push(0.12)
      }
      this.netLayers.push(arr)
      this.netPos.push(parr)
      this.netLevels.push(lvls)
    })

    this.eNet = new EdgeField({ flow: true, flowPerEdge: 1, flowSpeed: 0.8, baseOpacity: NET_LINE, flowSize: 0.11 })
    this.netEdges = []
    for (let l = 0; l < sizes.length - 1; l++) {
      for (let i = 0; i < sizes[l]; i++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          const idx = this.eNet.addEdge(this.netPos[l][i], this.netPos[l + 1][j], palette.cyan, 0.1)
          this.netEdges.push({ idx, sl: l, si: i })
        }
      }
    }
    this.eNet.build()
    this.gNet.add(this.eNet)
    // one fixed "learned" setting per wire, for the closing every-wire-is-a-knob beat
    this._knobW = this.netEdges.map((e, i) => {
      const h = Math.sin(i * 12.9898) * 43758.5453
      return 0.14 + 0.8 * (h - Math.floor(h))
    })

    const caps = ['input', 'hidden', 'hidden', 'output']
    this.lblNet = caps.map((c, l) => this.label(c, { pill: true, position: new THREE.Vector3(this.netX[l], -3.7, 0), opacity: 0 }))
    this.labKnobs = this.label('93 knobs — none set by hand', { pill: true, position: new THREE.Vector3(0, 3.55, 0), opacity: 0 })
  }

  // Bump-sum: a dashed target curve, ReLU tents rising one at a time, and their
  // bright sum converging onto the target — the universal approximation theorem,
  // constructed live.
  _buildBump() {
    const g = (this.gBump = new THREE.Group())
    g.visible = false
    this.add(g)
    const L = this._light
    const sy = (this._bmpSY = 0.78)
    const oy = (this._bmpOY = 0.05)

    // thin axes (y axis at the left edge, chart-style)
    this.bmpAxes = this._segs(g, [-3.3, oy, 0, 3.3, oy, 0, -3.3, oy - 1.5, 0, -3.3, oy + 1.6, 0], palette.violet, L ? 0.55 : 0.4)

    // dashed target (dash pattern walked by arc length)
    const NT = 161
    const dpts = []
    let px = -3
    let py = oy + bumpF(-3) * sy
    let acc = 0
    for (let j = 1; j < NT; j++) {
      const x = -3 + (6 * j) / (NT - 1)
      const y = oy + bumpF(x) * sy
      if (acc % 0.27 < 0.18) dpts.push(px, py, 0, x, y, 0)
      acc += Math.hypot(x - px, y - py)
      px = x
      py = y
    }
    this.bmpTarget = this._segs(g, dpts, palette.hot, L ? 0.65 : 0.5)

    // coarse (6) and fine (12) ReLU tents
    const mkTents = (n) => {
      const hw = 6 / (n - 1)
      const out = []
      for (let k = 0; k < n; k++) {
        const m = -3 + k * hw
        const h = bumpF(m)
        const xa = Math.max(m - hw, -3.15)
        const xb = Math.min(m + hw, 3.15)
        const rec = {
          m,
          hw,
          h,
          xs: [xa, m, xb],
          vs: [tent(xa, m, hw), 1, tent(xb, m, hw)],
          rise: 0,
        }
        const dl = this._dynLine(g, 3, palette.cyan, 0)
        for (let q = 0; q < 3; q++) {
          dl.attr.array[3 * q] = rec.xs[q]
          dl.attr.array[3 * q + 1] = oy
        }
        rec.attr = dl.attr
        rec.mat = dl.mat
        out.push(rec)
      }
      return out
    }
    this._tentC = mkTents(6)
    this._tentF = mkTents(12)

    // the bright sum
    const NS = (this._bmpNS = 241)
    const sum = this._dynLine(g, NS, palette.amber, 0)
    this.bmpSumAttr = sum.attr
    this.bmpSumMat = sum.mat
    for (let j = 0; j < NS; j++) {
      sum.attr.array[3 * j] = -3 + (6 * j) / (NS - 1)
      sum.attr.array[3 * j + 1] = oy
    }

    this.lblBmpTarget = this.label('target', { className: 'tiny muted', position: new THREE.Vector3(2.62, oy + bumpF(2.62) * sy + 0.52, 0), opacity: 0 })
    this.lblBmpSum = this.label('sum of 6 bumps', { pill: true, position: new THREE.Vector3(0, 1.98, 0), opacity: 0 })
    this.lblBmpBump = this.label('one bump = 3 ReLU neurons', { className: 'tiny muted', position: new THREE.Vector3(0, -1.98, 0), opacity: 0 })
    this._bmpN = 6
  }

  // --- intro -----------------------------------------------------------------
  enter() {
    if (this.ctx.reduced) return
    const pop = (n, d) => {
      n.scale.setScalar(0.01)
      gsap.to(n.scale, { x: 1, y: 1, z: 1, duration: 0.7, delay: d, ease: 'back.out(1.7)' })
    }
    this.inNodes.forEach((n, i) => pop(n, 0.1 + i * 0.08))
    pop(this.neuron, 0.42)
    pop(this.outNode, 0.62)
  }

  // --- beats -----------------------------------------------------------------
  onStep(i) {
    const T = { single: 0, gallery: 0, xor: 0, layer: 0, network: 0, bump: 0 }
    if (i <= 1) T.single = 1
    else if (i === 2) T.gallery = 1
    else if (i === 3) T.xor = 1
    else if (i === 4) T.layer = 1
    else if (i === 7) T.bump = 1
    else T.network = 1 // 5 structure, 6 forward pass, 8 knobs
    this.target = T

    if (i === 2) this._resetGallery()
    if (i === 3) this._xorClock = 0
    if (i === 7) this._bumpClock = 0

    // [posX, posY, posZ, lookX, lookY]
    const cams = [
      [0, 0, 6.2, 0.4, 0], // 0 the neuron
      [0.6, 0, 5.2, 1.7, 0], // 1 the gate
      [0, -0.1, 8.0, 0.1, -0.25], // 2 gallery of gates (the plot)
      [0, 0.05, 6.3, 0, 0.05], // 3 XOR mini-plane
      [0, 0, 9.0, -0.7, 0], // 4 a layer
      [1.0, 0, 13.2, 1.0, 0], // 5 a network (structure; nudged left, clear of the card)
      [-1.15, 0, 13.8, -1.15, 0], // 6 the forward pass (scene nudged right, input column clear of the left card)
      [0.55, 0.05, 8.3, 0.55, 0.1], // 7 bump-sum (universal approximation)
      [-0.55, 0, 14.5, -0.55, 0], // 8 billions of knobs (nudged right so the input pill clears the card)
    ]
    const c = cams[i] || cams[0]
    this._setCam(c[0], c[1], c[2], c[3], c[4])
  }

  _setCam(x, y, z, lx, ly) {
    if (this.ctx.reduced) {
      this.camera.position.set(x, y, z)
      this.lookTarget.set(lx, ly, 0)
      return
    }
    gsap.to(this.camera.position, { x, y, z, duration: 1.4, ease: 'power3.inOut' })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: 0, duration: 1.4, ease: 'power3.inOut' })
  }

  // --- per-frame -------------------------------------------------------------
  update(dt, t) {
    const reduced = this.ctx.reduced
    const A = this.alpha
    const T = this.target
    for (const k in A) A[k] = reduced ? T[k] : damp(A[k], T[k], 7, dt)

    this._updateSingle(A.single, t, dt, reduced)
    this._updateGallery(A.gallery, t, dt, reduced)
    this._updateXor(A.xor, t, dt, reduced)
    this._updateLayer(A.layer, t, dt, reduced)
    this._updateNetwork(A.network, t, dt, reduced)
    this._updateBump(A.bump, t, dt, reduced)

    this.camera.lookAt(this.lookTarget)
  }

  _updateSingle(a, t, dt, reduced) {
    for (const l of this.lblSingle) l.setOpacity(a * 0.9)
    const g = this.gSingle
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    // beat 1 = the gate: a wandering weighted sum that snaps past a threshold.
    let fired = 0
    if (this.step === 1) {
      if (reduced) fired = 1
      else {
        const s = ((Math.sin(t * 0.9) + 0.6 * Math.sin(t * 1.7 + 1.0)) / 1.6) * 0.5 + 0.5
        fired = smoothstep(0.42, 0.62, s)
      }
    }

    for (let i = 0; i < 3; i++) {
      const shimmer = reduced ? 0 : Math.sin(t * 1.6 + i * 1.3) * 0.05
      this.inNodes[i].setLevel((0.32 + this.inW[i] * 0.5 + shimmer) * a)
    }

    const isGate = this.step === 1
    const nLevel = isGate ? 0.16 + fired * 0.84 : 0.5 + (reduced ? 0 : Math.sin(t * 1.2) * 0.05)
    this._tmp.copy(CYAN).lerp(AMBER, isGate ? fired : 0)
    this.neuron.setColor(this._tmp)
    this.neuron.setLevel(nLevel * a)

    this.eIn.setWeight(this.outIdx, isGate ? 0.05 + fired * 0.95 : 0.06)
    this.outNode.setColor(isGate ? this._tmp : CYAN)
    this.outNode.setLevel((isGate ? 0.1 + fired * 0.9 : 0.12) * a)

    this.eIn.setLineOpacity(SINGLE_LINE * a)
    this.eIn.setFlowOpacity(reduced ? 0 : SINGLE_FLOW * a)
    if (!reduced) this.eIn.update(dt)
  }

  _updateGallery(a, t, dt, reduced) {
    const gal = this._gal
    // labels first, so they vanish with the group
    this.lblFormula.setOpacity(a * 0.95)
    this.lblSlope.setOpacity(a * 0.85)
    this.lblGalX.setOpacity(a * 0.7)
    this.lblGalY.setOpacity(a * 0.7)
    this.lblGalOne.setOpacity(a * 0.6)
    this.lblGalM4.setOpacity(a * 0.6)
    this.lblGal4.setOpacity(a * 0.6)
    for (let i = 0; i < this.galTabs.length; i++) {
      const active = i === gal.to
      this.galTabs[i].setOpacity(a * (active ? 1 : 0.42))
      this.galTabDots[i].setLevel((active ? 0.95 : 0.22) * a)
    }
    const g = this.gGal
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    // cycle: hold each gate ~3.3s, then morph to the next over 0.9s
    if (!reduced && this.step === 2) {
      gal.clock += dt
      if (gal.mix < 1) gal.mix = Math.min(1, gal.mix + dt / 0.9)
      else if (gal.clock > 3.3) {
        gal.from = gal.to
        gal.to = (gal.to + 1) % ACTS.length
        gal.mix = 0
        gal.clock = 0
        this.lblFormula.setText(this.L(ACTS[gal.to].formula))
      }
    }
    const mm = smoothstep(0, 1, gal.mix)
    const fA = ACTS[gal.from].f
    const fB = ACTS[gal.to].f
    const sx = this._galSX
    const sy = this._galSY
    const oy = this._galOY

    // morph the bright curve between the two true functions
    const arr = this.galCurveAttr.array
    const N = this._galN
    for (let j = 0; j < N; j++) {
      const x = -4 + (8 * j) / (N - 1)
      arr[3 * j + 1] = oy + lerp(fA(x), fB(x), mm) * sy
    }
    this.galCurveAttr.needsUpdate = true
    this.galCurve.material.color.lerpColors(this._actCols[gal.from], this._actCols[gal.to], mm)

    const ghostBase = this._light ? (reduced ? 0.6 : 0.5) : reduced ? 0.42 : 0.15
    for (const m of this.galGhosts) m.opacity = ghostBase * a
    this.galCurve.material.opacity = 0.98 * a
    this.galAxes.material.opacity = (this._light ? 0.6 : 0.45) * a
    this.galGuide.material.opacity = (this._light ? 0.4 : 0.24) * a

    // the live input dot: x slides, output height tracks σ(x)
    const xd = reduced ? 1.4 : 3.6 * Math.sin(t * 0.5)
    const yd = lerp(fA(xd), fB(xd), mm)
    const dx0 = xd * sx
    const dy0 = oy + yd * sy
    this.galDot.position.set(dx0, dy0, 0.02)
    this.galDot.setLevel(0.9 * a)
    const va = this.galVAttr.array
    va[0] = dx0
    va[1] = oy
    va[3] = dx0
    va[4] = dy0
    this.galVAttr.needsUpdate = true
    this.galVMat.opacity = 0.4 * a

    // tangent: the local slope of the on-screen function (training's foothold)
    const h = 0.045
    const sl = (lerp(fA(xd + h), fB(xd + h), mm) - lerp(fA(xd - h), fB(xd - h), mm)) / (2 * h)
    let tx = sx
    let ty = sl * sy
    const inv = 0.5 / Math.hypot(tx, ty)
    tx *= inv
    ty *= inv
    const ta = this.galTanAttr.array
    ta[0] = dx0 - tx
    ta[1] = dy0 - ty
    ta[2] = 0.04
    ta[3] = dx0 + tx
    ta[4] = dy0 + ty
    ta[5] = 0.04
    this.galTanAttr.needsUpdate = true
    this.galTanMat.opacity = 0.95 * a
    this.lblSlope.position.set(dx0 + 0.6, dy0 - 0.3, 0)
  }

  _updateXor(a, t, dt, reduced) {
    const g = this.gXor
    if (!reduced && this.step === 3) this._xorClock += dt
    const P = 8.5
    const tp = reduced ? 6.0 : this._xorClock % P
    let bandA = smoothstep(4.4, 5.1, tp) * (1 - smoothstep(8.0, 8.45, tp))
    let lineA = Math.min(1, 1 - smoothstep(4.2, 4.9, tp) + smoothstep(8.05, 8.5, tp))
    if (reduced) {
      bandA = 1
      lineA = 0.35
    }

    // labels (scaled by group alpha so they vanish off-beat)
    for (const l of this.lblXorCorners) l.setOpacity(a * 0.75)
    this.lblXorX1.setOpacity(a * 0.6)
    this.lblXorX2.setOpacity(a * 0.6)
    this.lblXorOut0.setOpacity(a * 0.85)
    this.lblXorOut1.setOpacity(a * 0.85)
    this.lblXorFail.setOpacity(a * 0.9 * lineA)
    this.lblXorSolve.setOpacity(a * 0.95 * bandA)
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    // the sweeping straight cut, always through the plane's center
    const th = reduced ? 0.9 : 0.55 + this._xorClock * 0.5
    const dx = Math.cos(th)
    const dy = Math.sin(th)
    const sm = 1.76 / Math.max(Math.abs(dx), Math.abs(dy))
    const la = this.xorLineAttr.array
    la[0] = -dx * sm
    la[1] = -dy * sm
    la[3] = dx * sm
    la[4] = dy * sm
    this.xorLineAttr.needsUpdate = true
    this.xorLineMat.opacity = 0.9 * lineA * a

    // classify with the friendliest polarity — it still always fails
    const nx = -dy
    const ny = dx
    let errsP = 0
    for (const [qx, qy, c] of this._xorP) {
      const s = nx * qx + ny * qy
      if (s > 0 !== (c === 1)) errsP++
    }
    const flip = errsP > 2
    for (let i = 0; i < 4; i++) {
      const [qx, qy, c] = this._xorP[i]
      const s = nx * qx + ny * qy
      const guess1 = flip ? s <= 0 : s > 0
      this._xorWrong[i] = guess1 !== (c === 1) ? 1 : 0
    }
    const pulse = reduced ? 0.55 : 0.55 + 0.3 * Math.sin(t * 5.5)
    for (let i = 0; i < 4; i++) this.xorRings[i].material.opacity = this._xorWrong[i] * lineA * pulse * a

    // the bent boundary (band) snapping in
    const snap = reduced ? 1 : smoothstep(4.4, 5.05, tp)
    this.xorSol.scale.setScalar(1.22 - 0.22 * snap)
    this.xorBound.material.opacity = 0.85 * bandA * a
    this.xorBandMat.opacity = (this._light ? 0.16 : 0.12) * bandA * a

    this.xorGrid.material.opacity = (this._light ? 0.3 : 0.18) * a
    this.xorAxes.material.opacity = (this._light ? 0.6 : 0.45) * a
    const breathe = reduced ? 0 : Math.sin(t * 1.6) * 0.05
    for (const n of this.xorPts) n.setLevel((0.5 + 0.32 * bandA + breathe) * a)
    for (const n of this.xorLegendDots) n.setLevel(0.6 * a)
  }

  _updateLayer(a, t, dt, reduced) {
    for (const l of this.lblLayer) l.setOpacity(a * 0.9)
    const g = this.gLayer
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    for (let i = 0; i < this.inNodesL.length; i++) {
      this.inNodesL[i].setLevel((0.4 + (reduced ? 0 : Math.sin(t * 1.4 + i) * 0.05)) * a)
    }
    for (let i = 0; i < this.layerNodes.length; i++) {
      const lvl = reduced ? 0.62 : 0.5 + 0.16 * Math.sin(t * 1.2 + i * 0.7)
      this.layerNodes[i].setLevel(lvl * a)
    }

    this.eLayer.setLineOpacity(LAYER_LINE * a)
    this.eLayer.setFlowOpacity(reduced ? 0 : LAYER_FLOW * a)
    if (!reduced) this.eLayer.update(dt)
  }

  _updateNetwork(a, t, dt, reduced) {
    for (const l of this.lblNet) l.setOpacity(a * 0.85)
    this.labKnobs.setOpacity(this.step === 8 ? a * 0.95 : 0)
    const g = this.gNet
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    if (this.step === 8) {
      // the closing beat: freeze the wave — every wire shows its own "learned"
      // setting (a knob), nodes just breathe
      for (let l = 0; l < this.netLayers.length; l++) {
        const arr = this.netLayers[l]
        for (let i = 0; i < arr.length; i++) {
          const lvl = reduced ? 0.5 : 0.45 + 0.09 * Math.sin(t * 1.3 + i * 0.8 + l * 1.7)
          arr[i].setLevel(lvl * a)
        }
      }
      for (let j = 0; j < this.netEdges.length; j++) {
        this.eNet.setWeight(this.netEdges[j].idx, this._knobW[j])
      }
    } else {
      // a Gaussian activation front travelling left → right (the forward pass)
      const period = 3.6
      const fx = lerp(this.netXMin - 2.2, this.netXMax + 2.2, (t / period) % 1)
      const s2 = 2 * 2.2 * 2.2
      for (let l = 0; l < this.netLayers.length; l++) {
        const dx = fx - this.netX[l]
        const lvl = reduced ? 0.9 : 0.12 + 0.88 * Math.exp(-(dx * dx) / s2)
        const arr = this.netLayers[l]
        const lvls = this.netLevels[l]
        for (let i = 0; i < arr.length; i++) {
          lvls[i] = lvl
          arr[i].setLevel(lvl * a)
        }
      }
      // edges glow from their source layer, so the wave travels through the wires too
      for (const e of this.netEdges) {
        this.eNet.setWeight(e.idx, 0.06 + this.netLevels[e.sl][e.si] * 1.0)
      }
    }

    this.eNet.setLineOpacity(NET_LINE * a)
    this.eNet.setFlowOpacity(reduced ? 0 : NET_FLOW * a)
    if (!reduced) this.eNet.update(dt)
  }

  _updateBump(a, t, dt, reduced) {
    const g = this.gBump
    if (!reduced && this.step === 7) this._bumpClock += dt
    const P = 12
    const tp = reduced ? 8 : this._bumpClock % P
    const fade = reduced ? 1 : 1 - smoothstep(10.9, 11.6, tp)
    const m = reduced ? 1 : smoothstep(5.4, 6.6, tp)
    const sumIn = reduced ? 1 : smoothstep(0.35, 0.95, tp)

    // labels
    this.lblBmpTarget.setOpacity(a * 0.8)
    this.lblBmpSum.setOpacity(a * 0.95 * sumIn * fade)
    this.lblBmpBump.setOpacity(a * 0.8 * (reduced ? 1 : smoothstep(0.5, 1.2, tp)) * fade)
    const n = m > 0.5 ? 12 : 6
    if (n !== this._bmpN) {
      this._bmpN = n
      this.lblBmpSum.setText(this.L(n === 12 ? 'sum of 12 bumps' : 'sum of 6 bumps'))
    }
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

    const sy = this._bmpSY
    const oy = this._bmpOY
    // coarse tents rise one at a time (with a little overshoot)
    for (let k = 0; k < this._tentC.length; k++) {
      const tn = this._tentC[k]
      const u = clamp01((tp - (0.35 + 0.5 * k)) / 0.55)
      tn.rise = reduced ? 1 : backOut(u)
      const hh = tn.h * tn.rise
      const va = tn.attr.array
      for (let q = 0; q < 3; q++) va[3 * q + 1] = oy + tn.vs[q] * hh * sy
      tn.attr.needsUpdate = true
      tn.mat.opacity = (this._light ? 0.8 : 0.5) * (1 - m * 0.92) * fade * a * (tn.rise > 0.01 ? 1 : 0)
    }
    // fine tents grow together during the refine stage
    for (const tn of this._tentF) {
      const hh = tn.h * m
      const va = tn.attr.array
      for (let q = 0; q < 3; q++) va[3 * q + 1] = oy + tn.vs[q] * hh * sy
      tn.attr.needsUpdate = true
      tn.mat.opacity = (this._light ? 0.7 : 0.42) * m * fade * a
    }
    // the sum: exactly the sum of the on-screen bumps, converging to the target
    const sa = this.bmpSumAttr.array
    const NS = this._bmpNS
    for (let j = 0; j < NS; j++) {
      const x = -3 + (6 * j) / (NS - 1)
      let sc = 0
      for (const tn of this._tentC) sc += tn.h * tn.rise * tent(x, tn.m, tn.hw)
      let sf = 0
      for (const tn of this._tentF) sf += tn.h * tent(x, tn.m, tn.hw)
      sa[3 * j + 1] = oy + lerp(sc, sf, m) * sy
    }
    this.bmpSumAttr.needsUpdate = true
    this.bmpSumMat.opacity = 0.95 * sumIn * fade * a
    this.bmpTarget.material.opacity = (this._light ? 0.65 : 0.5) * a
    this.bmpAxes.material.opacity = (this._light ? 0.55 : 0.4) * a
  }
}
