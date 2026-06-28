import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { palette } from '../../theme/palette.js'
import { damp, lerp, smoothstep } from '../../theme/motion.js'

// Accent: cyan (the forward-flow / "building block" color).
const CYAN = new THREE.Color(palette.cyan)
const AMBER = new THREE.Color(palette.amber)

// Base opacities per edge bundle; multiplied by a per-group crossfade alpha so the
// three compositions (one neuron → a layer → a network) dissolve into each other.
const SINGLE_LINE = 0.6
const SINGLE_FLOW = 0.95
const LAYER_LINE = 0.4
const LAYER_FLOW = 0.85
const NET_LINE = 0.32
const NET_FLOW = 0.8

export const beats = [
  {
    html: `<span class="eyebrow">Chapter 01 · the building block</span>
      <h2>The Neuron</h2>
      <p class="lead">Everything an AI does is built from one tiny part, repeated millions of times. A neuron — in its classic single-unit form, the <strong>perceptron</strong> — takes a handful of numbers as <strong>inputs</strong> and boils them down to a single number. The art is in <em>how</em> it combines them.</p>
      <p>Picture deciding whether to go for a walk. Is it raining? How busy are you? Did a friend ask along? Each fact sways you by a different amount — and that "how much it matters" is its <strong>weight</strong>. The neuron multiplies every input by its weight, then totals the results — each input <span class="tok">x</span> against its weight <span class="tok">w</span>, paired off and added up. Mathematicians call that one move a <strong>dot product</strong>, written <span class="tok">w·x</span>.</p>
      <p>Finally it adds a <strong>bias</strong>&nbsp;<span class="tok">b</span>: a baseline lean, like being someone who just tends to say yes. The tally so far is <span class="tok">w·x + b</span> — many numbers in, one running total out. Next we'll see what that total sets off.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The gate</h3>
      <p>That running total then meets a gate. Back to the walk: you don't head out the door for every faint nudge — your eagerness has to build first. A neuron works the same way. As the total climbs past a <strong>threshold</strong> it begins to <strong>fire</strong>, sending a stronger signal onward. But "fire" is a metaphor — nothing flips like a light switch. The response curves up smoothly, a steep bend rather than a sudden flip.</p>
      <p>That gate is the <em>activation</em>, written <span class="tok">σ</span>, so a neuron's full output is <span class="tok">y = σ(w·x + b)</span> — weigh, sum, lean, then bend. The bend is the <strong>nonlinearity</strong>, a fancy term for "the response isn't a straight line." <span class="tok">sigmoid</span> traces a soft S-curve that squashes any number into the range 0 to 1; <span class="tok">tanh</span> does the same but centered on zero; <span class="tok">ReLU</span> is simply <span class="tok">max(0, x)</span> — keep the positives, zero the rest, one clean kink.</p>
      <p>That bend is everything. Stack only straight-line steps and the whole stack collapses back into a single straight line — a hundred layers no wiser than one. Add the bend and the math stops folding flat: layer upon layer of gentle curves can trace patterns of startling intricacy. With enough neurons, a network can approximate essentially any function at all.</p>
      <p class="aside">Watch the core brighten as the total climbs, then rise steeply — not snap — as it clears the threshold.</p>`,
  },
  {
    html: `<h3>A layer</h3>
      <p>A single neuron asks a single question, so it can spot only one kind of pattern. Real problems need many at once. A <strong>layer</strong> is a row of neurons working <em>in parallel</em> — side by side, all at the same moment. Each one reads the very same inputs, but each carries its own private set of weights.</p>
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
    html: `<h3>Why this works</h3>
      <p>No single neuron is clever — each just weighs a few numbers and bends the result. The intelligence is in the stacking: layer upon layer, every gate adding a little curve, until the composed whole can mold itself to almost any pattern you can imagine.</p>
      <p>Every one of those weights and biases is a tunable knob — a small network has thousands, a large one has billions. And none of it is hand-written: the knobs start as random noise, and the network is <em>taught</em> the right settings, example by example, until its answers come out right. That search is exactly where we head next.</p>
      <p class="aside">That power has a formal name — the <em>universal approximation theorem</em>: with enough neurons, a network can match any continuous function as closely as you like. It promises such weights exist; it never says how to find them.</p>
      <div class="postcard">A neuron is a weighted sum passed through a gate. Stack enough of them and you get a system that can shape itself to fit almost anything.</div>
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

    this.camera.position.set(0, 0, 6.2)
    this.lookTarget = new THREE.Vector3(0.4, 0, 0)
    this._tmp = new THREE.Color()

    this._buildSingle()
    this._buildLayer()
    this._buildNetwork()

    // crossfade state: which composition is on screen
    this.alpha = { single: 1, layer: 0, network: 0 }
    this.target = { single: 1, layer: 0, network: 0 }
  }

  // --- scene construction ----------------------------------------------------
  _mkNode(group, x, y, opts) {
    const n = new GlowNode(opts)
    n.position.set(x, y, 0)
    n.setLevel(0)
    group.add(n)
    return n
  }

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

    const caps = ['input', 'hidden', 'hidden', 'output']
    this.lblNet = caps.map((c, l) => this.label(c, { pill: true, position: new THREE.Vector3(this.netX[l], -3.7, 0), opacity: 0 }))
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
    const T = { single: 0, layer: 0, network: 0 }
    if (i <= 1) T.single = 1
    else if (i === 2) T.layer = 1
    else T.network = 1
    this.target = T

    // [posX, posY, posZ, lookX, lookY]
    const cams = [
      [0, 0, 6.2, 0.4, 0], // 0 the neuron
      [0.6, 0, 5.2, 1.7, 0], // 1 the gate
      [0, 0, 9.0, -0.7, 0], // 2 a layer
      [0, 0, 13.0, 0, 0], // 3 a network (structure)
      [0, 0, 13.5, 0, 0], // 4 the forward pass (watch the wave sweep)
      [0, 0, 14.5, 0, 0], // 5 why this works
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
    const aS = (this.alpha.single = reduced ? this.target.single : damp(this.alpha.single, this.target.single, 7, dt))
    const aL = (this.alpha.layer = reduced ? this.target.layer : damp(this.alpha.layer, this.target.layer, 7, dt))
    const aN = (this.alpha.network = reduced ? this.target.network : damp(this.alpha.network, this.target.network, 7, dt))

    this._updateSingle(aS, t, dt, reduced)
    this._updateLayer(aL, t, dt, reduced)
    this._updateNetwork(aN, t, dt, reduced)

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
        const s = (Math.sin(t * 0.9) + 0.6 * Math.sin(t * 1.7 + 1.0)) / 1.6 * 0.5 + 0.5
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
    const g = this.gNet
    if (a < 0.02) {
      g.visible = false
      return
    }
    g.visible = true

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

    this.eNet.setLineOpacity(NET_LINE * a)
    this.eNet.setFlowOpacity(reduced ? 0 : NET_FLOW * a)
    if (!reduced) this.eNet.update(dt)
  }
}
