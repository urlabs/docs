import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { BarField } from '../../lib/BarField.js'
import { glowBasic } from '../../lib/materials.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp, lerp, clamp01, smoothstep } from '../../theme/motion.js'
import { blend, isLight } from '../../theme/theme.js'

// Chapter 10 — FRONTIER LLMs. The payoff: the same transformer core you built,
// scaled up and bolted with upgrades. A persistent glowing "core" anchors the
// scene; each beat reveals one upgrade station while the camera reframes it:
// dense FFN → mixture of experts (a morph: the slab splits into 8 routed
// expert columns), the quadratic long-context quilt, the multimodal shatter,
// the reasoning tree + thinking budget, the agent loop (think/act/observe),
// teacher→student distillation, the open problems, and the full-journey finale.

const _tmp = new THREE.Vector3()
const _tmpC = new THREE.Color()
const _tmpC2 = new THREE.Color()
const _m4 = new THREE.Matrix4()

// dense-FFN ↔ MoE morph geometry (beats 1–2 share one station)
const FFN = { E: 8, ROWS: 7, COLW: 2, STEP: 0.3, PD: 0.6, PM: 0.8, DX: -0.6, MX: 1.5, RX: -2.4, RY: -2.0, TX: -3.9 }

// distillation: soft-target distributions per prompt + the student's naive priors
const DIST = [
  [0.05, 0.62, 0.18, 0.06, 0.04, 0.03, 0.02],
  [0.3, 0.06, 0.04, 0.38, 0.12, 0.06, 0.04],
  [0.04, 0.1, 0.05, 0.08, 0.55, 0.1, 0.08],
  [0.12, 0.05, 0.3, 0.05, 0.08, 0.34, 0.06],
]
const NOISY = [
  [0.16, 0.1, 0.15, 0.17, 0.13, 0.16, 0.13],
  [0.1, 0.2, 0.16, 0.08, 0.14, 0.17, 0.15],
  [0.18, 0.13, 0.16, 0.15, 0.09, 0.14, 0.15],
  [0.14, 0.17, 0.1, 0.16, 0.15, 0.11, 0.17],
]
const HARD = [0, 1, 0, 0, 0, 0, 0]

export const beats = [
  {
    side: 'center',
    html: `<span class="eyebrow">Chapter 10 · where we are now</span>
      <h2>Frontier LLMs</h2>
      <p class="lead">You built the core. Today's <strong>frontier models</strong> — the most capable systems running right now — are that same core: <span class="tok">embeddings</span> turn tokens into vectors, <span class="tok">attention</span> lets them trade meaning, stacked blocks add depth, and the whole machine predicts one token at a time.</p>
      <p>Nothing new was slipped in underneath. What changed is <strong>scale</strong> — vastly more parameters, data, and compute, exactly as the scaling laws promised — and a set of upgrades bolted on top: sparse experts, book-length context, more senses, learned reasoning, tools to act with, and distilled small siblings. This chapter visits each, then retraces the whole journey.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Every weight, every token</h3>
      <p>Before the upgrades, look at the bill. Inside each block sits the <strong>feed-forward network</strong>, and in a classic model it is <strong>dense</strong>: every token that passes through is multiplied against <em>every one</em> of its weights. Watch the slab — a single <span class="tok">token</span> enters, and the entire block lights up.</p>
      <p>That is the tax of density: compute per token rises in lockstep with parameter count, so making a model smarter-by-bigger makes every <span class="tok">the</span> and every comma proportionally more expensive. It's a hospital where each patient must be examined by every doctor in the building.</p>
      <p class="aside">In a standard transformer block the feed-forward layer holds roughly two-thirds of the parameters — attention is the smaller part. So if you want a bigger brain without a bigger per-token bill, this dense slab is the layer to attack.</p>`,
  },
  {
    side: 'left',
    html: `<h3>A mixture of experts</h3>
      <p>Now the fix. A <strong>mixture of experts</strong> replaces that one slab with <strong>eight expert</strong> sub-networks plus a tiny learned <strong>router</strong> — a softmax gate that reads each token's vector and forwards it to just its <strong>top-2</strong> experts. This is a triage desk: you don't see every doctor in the hospital, you see the two who fit your case.</p>
      <p>For any given token, most of the network stays dark — and the darkness is the whole point. <em>Total</em> parameters can grow enormous while <em>active</em> parameters per token stay small. When a model card says "47B total, 13B active", this routing is exactly what it means: a giant brain, billed like a small one.</p>
      <p class="aside">Experts specialize by <em>pattern</em>, not by human topic — one drifts toward punctuation, another toward numbers or code; nobody assigns them subjects. Open models like Mixtral and DeepSeek ship this design, trained with an extra <strong>load-balancing loss</strong> so the router can't overuse a favorite expert while the others starve.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Long context — and why it's costly</h3>
      <p>The <strong>context window</strong> is everything the model can see at once: its working memory. Early models held a few thousand tokens; today's hold <strong>hundreds of thousands</strong> — a whole book, a long transcript, an entire codebase at a glance.</p>
      <p>But attention compares <em>every token with every other</em>, so the work grows with the <strong>square</strong> of the length: double the tokens and you quadruple the cost. Watch the grid — the same every-token-by-every-token table you shaded in the attention chapter, now blowing up. That N×N explosion, plus the ever-growing KV cache feeding it, is the real price of a long memory, and where much of frontier engineering goes.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Many senses, one space</h3>
      <p><strong>Multimodal</strong> means many kinds of input, one model. Text is not the only thing you can cut into tokens: an <span style="color:var(--amber)">image</span> is sliced into square patches, <span style="color:var(--violet)">audio</span> into short windows of sound. Each piece runs through a small learned projection that lands it in the <em>same</em> vector space as <span style="color:var(--cyan)">words</span>.</p>
      <p>Once a patch of photo and a word are both just tokens in that one shared space, the very same attention you already understand can weigh them <em>together</em> — a picture and a sentence becoming one continuous thought.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Thinking before answering</h3>
      <p>On a hard problem, blurting the first token is a poor strategy. So models are trained to <strong>think first</strong> — to write a private <em>chain of thought</em>: a scratchpad of steps, attempts, and <span style="color:var(--magenta)">dead ends</span> to abandon, all before the visible answer.</p>
      <p>They learn to think well through <strong>reinforcement learning</strong> on problems with checkable answers: try many times, reinforce the reasoning that reaches the correct result. And the surprise — <span class="tok">test-time compute</span> — is that simply letting a model spend <em>more</em> tokens thinking at inference reliably buys better answers. The same next-token machine, now pointed inward before it speaks; the thinking budget trades latency for accuracy.</p>
      <p class="aside">This is the recipe from the RL chapter pointed at reasoning: <strong>outcome rewards</strong> for checkable answers, plus <strong>process rewards</strong> that score the steps themselves — so good chains of thought get reinforced, not just lucky endings.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Agents: think, act, observe</h3>
      <p>A frontier model doesn't just answer — it can <strong>act</strong>. Its output can be an instruction: <span style="color:var(--amber)">search the web</span>, <span style="color:var(--rose)">run this code</span>, <span style="color:var(--blue)">call this API</span>. A harness executes the call and drops the <span style="color:var(--lime)">result</span> back into the context window, where the model reads it like any other tokens.</p>
      <p>Loop it — <strong>think → act → observe</strong> — and you have an <strong>agent</strong>. Watch the cycle: a thought, a tool call, a result tile appended to the context strip, then the next thought, each decision conditioned on everything gathered so far. Retrieval, last chapter, was the first tool; code execution and web search are the same move with a different glyph.</p>
      <p class="aside">An "agent" is nothing more exotic than an LLM in a loop with tools and a goal. The hard engineering frontier is reliability: chain fifty steps and a 2% per-step error rate compounds to a ~64% chance that something breaks — which is why long-horizon agents live or die by checking their own work.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Distillation: frontier in your pocket</h3>
      <p>Frontier quality is expensive to serve. <strong>Distillation</strong> shrinks it: a giant <strong>teacher</strong> model answers a huge pile of prompts, and a small <strong>student</strong> trains to match — not just the teacher's final answers, but its full <strong>probability distributions</strong>.</p>
      <p>Those <span class="tok">soft targets</span> are the trick. A hard label says only "the answer is <span class="tok">cat</span>"; the teacher's distribution says <span class="tok">cat</span> 62%, <span class="tok">kitten</span> 21%, <span class="tok">dog</span> 4%… — how plausible every alternative is, and in what ways a wrong answer is <em>almost</em> right. Each example carries far more signal, so the student learns judgment it could never mine from raw text at its size.</p>
      <p class="aside">This is why the "mini / flash / fast" tier of a model family behaves like its big sibling: distillation — training small models on a flagship's outputs — transfers the shape of its judgment. The idea is old: Hinton and colleagues named it in 2015, calling what soft targets carry "dark knowledge".</p>`,
  },
  {
    side: 'left',
    html: `<h3>The open problems</h3>
      <p>Honesty about the frontier: it is not finished. Models still <strong>hallucinate</strong> — the next-token machine writes fluent text even where it holds no grounded answer, because from inside the distribution a confident guess and a known fact feel identical.</p>
      <p><strong>Interpretability</strong>: we can read every weight and still struggle to say <em>why</em> the model answered as it did — researchers are mapping internal features and circuits, but most of the network remains unread. And <strong>alignment</strong>: as capability grows, so does the cost of a system whose goals or honesty bend under pressure.</p>
      <p class="aside">These three orbit every frontier lab's roadmap. Progress is real — retrieval grounds claims in sources, sparse autoencoders pull human-readable features out of the residual stream, RL from feedback shapes behavior — but none of them is solved.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The whole journey</h3>
      <p>Step back, and it is all one idea unfolding. A single <span class="tok">neuron</span> weighs its inputs. <span class="tok">Attention</span> lets tokens share meaning. The <span class="tok">transformer</span> stacks that into depth. <span class="tok">Training</span> shapes the weights from data; <span class="tok">inference</span> runs them to write the next token. Everything in this chapter is that same foundation — scaled, and pointed at the world.</p>
      <p>You now hold the whole map — from one weighted sum to a machine that routes tokens to experts, reads books in a glance, sees and hears, thinks before speaking, acts through tools, and teaches smaller versions of itself. Whatever ships next will be built from these same parts.</p>
      <div class="postcard">A frontier model is the same transformer core you built — scaled up, with sparse experts, vast context, many senses, reasoning it can be taught, tools to act in the world, and distilled siblings that carry its judgment at pocket cost.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/">replay the journey ↺</a><a class="deepdive" data-route="/attention">revisit attention</a></div>`,
  },
]

const BLOOM = [
  [1.2, 0.6, 0.7], // 0 hero core
  [1.0, 0.55, 0.78], // 1 dense FFN
  [1.05, 0.55, 0.74], // 2 MoE
  [1.05, 0.6, 0.74], // 3 long context
  [1.1, 0.6, 0.72], // 4 multimodal
  [1.45, 0.7, 0.6], // 5 reasoning (signature)
  [1.05, 0.55, 0.76], // 6 agents
  [1.1, 0.6, 0.72], // 7 distillation
  [1.15, 0.62, 0.68], // 8 open problems
  [1.28, 0.66, 0.66], // 9 journey
]

export default class Frontier extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(...BLOOM[0])
    this.addAmbientField(680, 95)
    this.scene.fog.density = 0.015
    this.addLights({ key: 0xffffff, rim: 0xa855f7, amb: 0x141d33 })
    this.camera.position.set(0, 0, 18)
    this.lookTarget = new THREE.Vector3(0, 0, 0)

    this._mylabels = []

    this._buildCore()
    this._buildFFN()
    this._buildContext()
    this._buildModal()
    this._buildSpiral()
    this._buildAgent()
    this._buildDistill()
    this._buildProblems()
    this._buildJourney()

    // stations are revealed/hidden per beat; core is always present
    this.stations = [this.ffn, this.context, this.modal, this.spiral, this.agent, this.distill, this.problems, this.journey]
    for (const g of this.stations) {
      g.visible = false
      g.scale.setScalar(0.001)
    }
    // beats 1 & 2 share the FFN station (dense slab morphs into routed experts)
    this._stationFor = [null, this.ffn, this.ffn, this.context, this.modal, this.spiral, this.agent, this.distill, this.problems, this.journey]

    this._ctxK = 0
    this._ctxLastK = -1

    this._setStep(0)
  }

  enter() {
    if (this.reduced) return
    gsap.killTweensOf(this.core.scale)
    this.core.scale.setScalar(0.18)
    gsap.to(this.core.scale, { x: 1, y: 1, z: 1, duration: 1.3, ease: 'back.out(1.4)' })
  }

  // --- builders --------------------------------------------------------------

  _blabel(text, pos, beat, shown = 0.92) {
    const l = this.label(text, { pill: true, position: pos.clone(), opacity: 0 })
    l.beat = beat
    l._shown = shown
    this._mylabels.push(l)
    return l
  }

  _glowRing(r, tube, color, opacity, seg = 60) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: blend(),
      depthWrite: false,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, seg), mat)
    return { mesh, mat }
  }

  // The grand, persistent transformer core: a stack of layer rings around a
  // glowing residual spine, wrapped in slow orbital halos.
  _buildCore() {
    const g = new THREE.Group()
    this.core = g
    this.add(g)
    this.coreLevel = 0.6
    this._coreTargetLevel = 1

    const spin = new THREE.Group()
    this.coreSpin = spin
    g.add(spin)

    const layers = 9
    this.coreNodes = []
    this.coreRings = []
    const colPts = []
    for (let i = 0; i < layers; i++) {
      const u = i / (layers - 1)
      const y = lerp(-3.1, 3.1, u)
      colPts.push(new THREE.Vector3(0, y, 0))

      const node = new GlowNode({ color: palette.hot, radius: 0.13, halo: 0.85, glow: 1.5 })
      node.position.set(0, y, 0)
      node.setLevel(0.6)
      spin.add(node)
      this.coreNodes.push(node)

      const pivot = new THREE.Group()
      pivot.position.y = y
      const r = 1.65 - Math.abs(u - 0.5) * 0.5
      const col = new THREE.Color(seriesColor(i)).lerp(new THREE.Color(palette.hot), 0.22)
      const ring = this._glowRing(r, 0.045, col, 0.5)
      ring.mesh.rotation.x = Math.PI / 2
      pivot.add(ring.mesh)
      spin.add(pivot)
      this.coreRings.push({ pivot, mat: ring.mat, base: 0.5, speed: (i % 2 ? 1 : -1) * (0.18 + 0.04 * i) })
    }

    // residual spine: data flowing up the stack
    this.coreEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0.45, flowSize: 0.12 })
    for (let i = 0; i < layers - 1; i++) this.coreEdges.addEdge(colPts[i], colPts[i + 1], palette.cyan, 0.8)
    this.coreEdges.build()
    spin.add(this.coreEdges)

    // outer orbital halos for grandeur
    this.coreHalo = []
    for (let k = 0; k < 2; k++) {
      const ring = this._glowRing(2.5 + k * 0.7, 0.03, k ? palette.violet : palette.cyan, 0.18, 88)
      ring.mesh.rotation.x = Math.PI / 2 + (k ? 0.5 : -0.4)
      ring.mesh.rotation.y = k ? 0.3 : -0.2
      ring.mesh.userData = { base: 0.18, sp: k ? 0.05 : -0.07 }
      g.add(ring.mesh)
      this.coreHalo.push(ring.mesh)
    }

    this._blabel('the transformer core', new THREE.Vector3(0, 3.9, 0), 0)
  }

  // Beats 1–2: one station, two states. Dense mode: the 8 columns sit flush as a
  // single slab and a passing token lights EVERY cell. MoE mode: the columns
  // spread apart into 8 experts, a router appears, and each token lights exactly
  // 2 expert columns (series colors) while the rest stay dark.
  _buildFFN() {
    const g = new THREE.Group()
    this.ffn = g
    this.add(g)

    const n = FFN.E * FFN.ROWS * FFN.COLW
    const cellGeo = new THREE.BoxGeometry(0.24, 0.24, 0.1)
    const cellMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: blend(),
      depthWrite: false,
      toneMapped: false,
    })
    this.cells = new THREE.InstancedMesh(cellGeo, cellMat, n)
    this.cells.frustumCulled = false
    g.add(this.cells)

    this._cellExpert = new Int8Array(n)
    this._cellDX = new Float32Array(n)
    this._cellY = new Float32Array(n)
    this._cellNoise = new Float32Array(n)
    let i = 0
    for (let e = 0; e < FFN.E; e++) {
      for (let r = 0; r < FFN.ROWS; r++) {
        for (let c = 0; c < FFN.COLW; c++) {
          this._cellExpert[i] = e
          this._cellDX[i] = (c - (FFN.COLW - 1) / 2) * FFN.STEP
          this._cellY[i] = ((FFN.ROWS - 1) / 2 - r) * FFN.STEP
          this._cellNoise[i] = 0.78 + ((this._hash(i * 37 + 11) % 100) / 100) * 0.22
          i++
        }
      }
    }
    this._cellDim = new THREE.Color(isLight() ? 0xc7d0e2 : 0x141d36)
    this._cellAmber = new THREE.Color(palette.amber)
    this._expCols = []
    for (let e = 0; e < FFN.E; e++) this._expCols.push(new THREE.Color(seriesColor(e)))
    this._expLevel = new Float32Array(FFN.E).fill(0.05)
    this._expTarget = new Float32Array(FFN.E).fill(0.05)

    // token + router + routed beams (beams live at the spread positions; they
    // carry weight 0 in dense mode so the morph needs no rebuilds)
    this.ffnToken = new GlowNode({ color: palette.cyan, radius: 0.17, halo: 0.9, glow: 1.4 })
    this.ffnToken.position.set(-4.3, 0, 0.3)
    g.add(this.ffnToken)
    this.moeRouter = new GlowNode({ color: palette.hot, radius: 0.24, halo: 0.7, glow: 1.6 })
    this.moeRouter.position.set(FFN.RX, FFN.RY, 0)
    g.add(this.moeRouter)

    // router sits BELOW the experts so its two beams fan out at distinct
    // angles (endpoints at the columns' bottom edges — the token enters there)
    this.moeBeams = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.85, baseOpacity: 0.6, flowSize: 0.14 })
    const rp = new THREE.Vector3(FFN.RX, FFN.RY, 0)
    for (let e = 0; e < FFN.E; e++) {
      const ex = FFN.MX + (e - (FFN.E - 1) / 2) * FFN.PM
      this.moeBeams.addEdge(rp, new THREE.Vector3(ex, -1.2, 0.12), seriesColor(e), 0)
    }
    this.moeBeams.addEdge(new THREE.Vector3(FFN.TX, FFN.RY, 0), rp, palette.cyan, 0)
    this.moeBeams.build()
    g.add(this.moeBeams)

    this._ffnSpread = 0
    this._ffnSpreadT = 0
    this._ffnSpreadLast = -1
    this._slabLit = 0.1
    this._moeCycle = -1
    this._layoutFFN(0)
    for (let j = 0; j < n; j++) this.cells.setColorAt(j, this._cellDim)
    this.cells.instanceColor.needsUpdate = true

    // beat-1 labels (dense)
    this._blabel('dense feed-forward', new THREE.Vector3(FFN.DX, 1.8, 0), 1, 0.9)
    this._blabel('every weight, every token', new THREE.Vector3(FFN.DX, -1.7, 0), 1, 0.85)
    this._blabel('active: 47B of 47B', new THREE.Vector3(FFN.DX, -2.35, 0), 1, 0.85)
    // beat-2 labels (MoE)
    this._blabel('router', new THREE.Vector3(FFN.RX, FFN.RY - 0.72, 0), 2, 0.88)
    this._blabel('8 experts · top-2 per token', new THREE.Vector3(FFN.MX, 1.8, 0), 2, 0.9)
    this._blabel('active: 13B of 47B', new THREE.Vector3(FFN.MX + 0.6, -2.55, 0), 2, 0.85)
    this._blabel('per token: 2 of 8 experts', new THREE.Vector3(FFN.MX + 0.6, -3.15, 0), 2, 0.85)
  }

  _layoutFFN(sp) {
    const cx = lerp(FFN.DX, FFN.MX, sp)
    const pitch = lerp(FFN.PD, FFN.PM, sp)
    for (let i = 0; i < this._cellExpert.length; i++) {
      const e = this._cellExpert[i]
      _m4.makeTranslation(cx + (e - (FFN.E - 1) / 2) * pitch + this._cellDX[i], this._cellY[i], 0)
      this.cells.setMatrixAt(i, _m4)
    }
    this.cells.instanceMatrix.needsUpdate = true
  }

  // Long context: a token sequence (linear) plus the N×N attention quilt it
  // spawns (quadratic). As the sequence grows, the quilt's area explodes and heats
  // cyan → amber → red — the cost of attending every token to every other.
  _buildContext() {
    const g = new THREE.Group()
    this.context = g
    this.add(g)

    const N = 18
    this.ctxN = N
    // the token sequence, growing linearly along the bottom
    this.ctxRibbon = new ContextRibbon({ maxCells: N, cell: 0.26, height: 0.32, gap: 0.05, color: palette.cyan })
    this.ctxRibbon.position.set(0, -2.7, 0)
    g.add(this.ctxRibbon)

    // the attention matrix: an N×N quilt of cells (per-instance colour)
    const cell = 0.2
    const step = cell + 0.025
    const span = N * step - 0.025
    this.quiltSpan = span
    const geo = new THREE.BoxGeometry(cell, cell, 0.06)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: blend(), depthWrite: false, toneMapped: false })
    this.quilt = new THREE.InstancedMesh(geo, mat, N * N)
    this.quilt.frustumCulled = false
    this.quilt.position.set(0, 0.8, 0)
    const m4 = new THREE.Matrix4()
    const c0 = new THREE.Color(palette.cyan)
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const x = -span / 2 + c * step + cell / 2
        const y = span / 2 - r * step - cell / 2
        m4.makeTranslation(x, y, 0)
        this.quilt.setMatrixAt(r * N + c, m4)
        this.quilt.setColorAt(r * N + c, c0)
      }
    }
    this.quilt.instanceMatrix.needsUpdate = true
    g.add(this.quilt)
    this._ctxK = 1
    this._ctxLastK = -1
    this._quiltDark = new THREE.Color(0x16203a) // faint, so the full N×N grid stays visible as it fills

    this._blabel('tokens →', new THREE.Vector3(0, -3.25, 0), 3, 0.82)
    this._blabel('attention · every token × every token', new THREE.Vector3(0, 0.8 + span / 2 + 0.55, 0), 3, 0.85)
    this._blabel('2× tokens → 4× work', new THREE.Vector3(span / 2 + 1.5, 0.8, 0), 3, 0.82)
  }

  // Multimodal: a paragraph, an image, and a waveform SHATTER into patches that
  // fly into one shared cloud — text patches and image patches landing as neighbours.
  _buildModal() {
    const g = new THREE.Group()
    this.modal = g
    this.add(g)
    this.modalPatches = []
    this._modalAssemble = 0

    const srcX = -3.5
    const cloud = new THREE.Vector3(2.7, 0.2, 0)
    this.modalCloud = cloud
    const add = (srcPos, color) => {
      const node = new GlowNode({ color, radius: 0.12, halo: 0.7, glow: 1.3 })
      node.position.copy(srcPos)
      node.setLevel(0.5)
      g.add(node)
      const u = Math.random() * Math.PI * 2
      const v = Math.acos(2 * Math.random() - 1)
      const r = 0.3 + Math.random() * 1.3
      const cloudPos = cloud.clone().add(new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)).multiplyScalar(r))
      this.modalPatches.push({ node, src: srcPos.clone(), cloud: cloudPos })
    }
    // text — rows of word patches
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) add(new THREE.Vector3(srcX + c * 0.34, 2.0 - r * 0.34, 0), palette.cyan)
    // image — a square of patches
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) add(new THREE.Vector3(srcX + c * 0.34, 0.4 - r * 0.34, 0), palette.amber)
    // audio — a waveform of slices
    for (let i = 0; i < 9; i++) add(new THREE.Vector3(srcX + i * 0.3, -1.8 + Math.sin(i * 0.9) * 0.42, 0), palette.violet)

    this._blabel('text', new THREE.Vector3(srcX - 0.8, 2.0, 0), 4, 0.85)
    this._blabel('image', new THREE.Vector3(srcX - 0.8, 0.4, 0), 4, 0.85)
    this._blabel('audio', new THREE.Vector3(srcX - 0.8, -1.8, 0), 4, 0.85)
    this._blabel('one shared space', new THREE.Vector3(cloud.x, cloud.y + 1.8, 0), 4, 0.9)
  }

  // SIGNATURE: a branching chain-of-thought tree. The model explores; dead-end
  // branches light up then wither; one surviving path reaches a bright answer,
  // while a "thinking budget" meter fills — more thinking buys a better answer.
  _buildSpiral() {
    const g = new THREE.Group()
    this.spiral = g // kept name: this group is the reasoning station in stations[]
    this.add(g)

    // explicit tree: winner path 0→2→7→10→11; the rest are dead ends.
    const defs = [
      { x: 0.0, y: 2.6, p: -1, dead: false, o: 0 },
      { x: -2.1, y: 1.4, p: 0, dead: true, o: 1 },
      { x: 0.2, y: 1.4, p: 0, dead: false, o: 1 },
      { x: 2.1, y: 1.4, p: 0, dead: true, o: 1 },
      { x: -2.7, y: 0.0, p: 1, dead: true, o: 2 },
      { x: -1.4, y: 0.0, p: 1, dead: true, o: 2 },
      { x: -0.7, y: 0.0, p: 2, dead: true, o: 2 },
      { x: 0.9, y: 0.0, p: 2, dead: false, o: 2 },
      { x: 2.3, y: 0.0, p: 3, dead: true, o: 2 },
      { x: 0.2, y: -1.3, p: 7, dead: true, o: 3 },
      { x: 1.2, y: -1.3, p: 7, dead: false, o: 3 },
      { x: 1.2, y: -2.6, p: 10, dead: false, o: 4, answer: true },
    ]
    this.treeMaxO = 4
    this.treeNodes = []
    this.treeEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.8, baseOpacity: 0.5, flowSize: 0.12 })
    defs.forEach((d) => {
      const answer = !!d.answer
      const node = new GlowNode({
        color: answer ? palette.hot : d.dead ? palette.magenta : palette.cyan,
        radius: answer ? 0.32 : 0.13,
        halo: answer ? 1.0 : 0.7,
        glow: answer ? 1.8 : 1.3,
      })
      node.position.set(d.x, d.y, 0)
      node.setLevel(0.08)
      g.add(node)
      const ei = d.p >= 0
        ? this.treeEdges.addEdge(new THREE.Vector3(defs[d.p].x, defs[d.p].y, 0), new THREE.Vector3(d.x, d.y, 0), d.dead ? palette.magenta : palette.cyan, 0)
        : -1
      this.treeNodes.push({ node, dead: d.dead, o: d.o, x: d.x, answer, ei })
    })
    this.treeEdges.build()
    g.add(this.treeEdges)
    this.answerNode = this.treeNodes[this.treeNodes.length - 1].node
    this._treeT = 0

    // thinking-budget meter
    const budgetMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.lime), transparent: true, opacity: 0.9, blending: blend(), depthWrite: false, toneMapped: false })
    this.budgetBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), budgetMat)
    this.budgetBar.position.set(-3.7, -2.9, 0)
    this.budgetBar.scale.y = 0.001
    g.add(this.budgetBar)

    this._blabel('problem', new THREE.Vector3(0, 3.25, 0), 5, 0.9)
    this._blabel('dead end ✕', new THREE.Vector3(-2.7, -0.6, 0), 5, 0.78)
    this._blabel('answer', this.answerNode.position.clone().add(new THREE.Vector3(0.65, -0.1, 0)), 5, 0.95)
    this._blabel('thinking budget', new THREE.Vector3(-3.7, -3.5, 0), 5, 0.8)
  }

  // Agents: the model core with three orbiting tool glyphs (magnifier, code
  // brackets, globe). A repeating think → act → observe loop: thought pulse,
  // beam to one tool, tool flash, result mote returns and appends a tile to the
  // context strip. Each cycle uses a different tool.
  _buildAgent() {
    const g = new THREE.Group()
    this.agent = g
    this.add(g)

    const M = new THREE.Vector3(0.4, 0.7, 0)
    this.agentM = M
    this.agentModel = new GlowNode({ color: palette.cyan, radius: 0.34, halo: 1.3, glow: 1.6 })
    this.agentModel.position.copy(M)
    g.add(this.agentModel)

    // orbit ring the tools sit on
    const orbit = this._glowRing(2.3, 0.018, palette.cyan, 0.14, 96)
    orbit.mesh.position.copy(M)
    g.add(orbit.mesh)

    // expanding "thought" ring pulse
    const tr = this._glowRing(1, 0.03, palette.cyan, 0, 64)
    tr.mesh.position.copy(M)
    g.add(tr.mesh)
    this.thinkRing = tr

    const tools = [
      { name: 'search', color: palette.amber, ang: 0.63, lab: [0.8, 0.62] },
      { name: 'run code', color: palette.rose, ang: -0.13, lab: [1.2, -0.05] },
      { name: 'call an API', color: palette.blue, ang: -0.9, lab: [0.55, -0.6] },
    ]
    this.toolGlyphs = []
    this.toolHalos = []
    this.agentEdges = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.95, baseOpacity: 0.55, flowSize: 0.15 })
    // results land at the strip's left end so return beams clear the globe glyph
    const CR = new THREE.Vector3(0.35, -2.0, 0)
    const toolPos = []
    tools.forEach((s, i) => {
      const p = new THREE.Vector3(M.x + Math.cos(s.ang) * 2.3, M.y + Math.sin(s.ang) * 2.3, 0)
      toolPos.push(p)
      const halo = new GlowNode({ color: s.color, radius: 0.09, halo: 2.2, glow: 1.3 })
      halo.position.copy(p)
      halo.position.z = -0.1
      halo.setLevel(0.25)
      g.add(halo)
      this.toolHalos.push(halo)
      const glyph = this._toolGlyph(i, s.color)
      glyph.position.copy(p)
      g.add(glyph)
      this.toolGlyphs.push(glyph)
      this._blabel(s.name, p.clone().add(new THREE.Vector3(s.lab[0], s.lab[1], 0)), 6, 0.8)
    })
    tools.forEach((s, i) => this.agentEdges.addEdge(M, toolPos[i], s.color, 0)) // 0..2 act beams
    tools.forEach((s, i) => this.agentEdges.addEdge(toolPos[i], CR, palette.lime, 0)) // 3..5 observe beams
    this.agentEdges.build()
    g.add(this.agentEdges)
    // light theme: weight-folding fades edges to BLACK (visible gray on a light
    // bg), so instead keep weight 1 and lerp the edge color from the background
    this._agLight = isLight()
    this._agBase = tools.map((s) => new THREE.Color(s.color))
    this._agLime = new THREE.Color(palette.lime)
    this._agBg = new THREE.Color(palette.void)
    if (this._agLight) {
      for (let i = 0; i < 6; i++) {
        this.agentEdges.setWeight(i, 1)
        this.agentEdges.setColor(i, this._agBg)
      }
    }

    // the context strip results accrete into
    this.agentRibbon = new ContextRibbon({ maxCells: 10, cell: 0.3, height: 0.34, gap: 0.06, color: palette.lime })
    this.agentRibbon.position.set(0.9, -2.55, 0)
    g.add(this.agentRibbon)

    this._agOutW = new Float32Array(3)
    this._agBackW = new Float32Array(3)
    this._agFill = 3
    this._agCycle = -1
    this._agPhaseIdx = -1
    this._agAppended = false

    this.phaseLabel = this._blabel('think', new THREE.Vector3(0.4, 3.35, 0), 6, 0.95)
    this._blabel('model', new THREE.Vector3(0.4, -0.25, 0), 6, 0.85)
    this._blabel('context', new THREE.Vector3(0.9, -3.15, 0), 6, 0.82)
  }

  // Distinct line-art tool glyphs: 0 = magnifier, 1 = code brackets, 2 = globe.
  _toolGlyph(kind, color) {
    const g = new THREE.Group()
    const mat = glowBasic(color, 0.95)
    const box = (w, h, x, y, rz = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), mat)
      m.position.set(x, y, 0)
      m.rotation.z = rz
      g.add(m)
      return m
    }
    if (kind === 0) {
      // magnifier: lens ring + angled handle
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 40), mat)
      ring.position.set(-0.08, 0.12, 0)
      g.add(ring)
      box(0.42, 0.09, 0.24, -0.22, Math.PI / 4)
    } else if (kind === 1) {
      // code brackets < / >
      box(0.3, 0.07, -0.33, 0.1, 0.6)
      box(0.3, 0.07, -0.33, -0.1, -0.6)
      box(0.3, 0.07, 0.33, 0.1, -0.6)
      box(0.3, 0.07, 0.33, -0.1, 0.6)
      box(0.4, 0.06, 0, 0, 1.15)
    } else {
      // globe: outline + equator + meridian
      const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 40), mat)
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 10, 40), mat)
      t2.scale.y = 0.42
      const t3 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 10, 40), mat)
      t3.scale.x = 0.42
      g.add(t1, t2, t3)
    }
    return g
  }

  // Distillation: a huge teacher and a small student. The teacher emits a soft
  // distribution per prompt (bar row); the student's row lerps toward it over
  // cycles — ending small AND matching. A dim one-hot row shows how little a
  // hard label carries by comparison.
  _buildDistill() {
    const g = new THREE.Group()
    this.distill = g
    this.add(g)

    const TE = new THREE.Vector3(-3.3, 1.7, 0)
    const ST = new THREE.Vector3(1.1, 1.7, 0)
    this.teacherNode = new GlowNode({ color: palette.violet, radius: 0.52, halo: 0.85, glow: 1.5 })
    this.teacherNode.position.copy(TE)
    g.add(this.teacherNode)
    const ring = this._glowRing(0.95, 0.03, palette.violet, 0.3, 72)
    ring.mesh.position.copy(TE)
    g.add(ring.mesh)
    this.teacherRing = ring.mesh
    this.studentNode = new GlowNode({ color: palette.cyan, radius: 0.2, halo: 0.9, glow: 1.4 })
    this.studentNode.position.copy(ST)
    g.add(this.studentNode)

    this.teacherBars = new BarField({ count: 7, width: 0.24, gap: 0.12, maxHeight: 1.5, color: palette.violet })
    this.teacherBars.position.set(TE.x, -0.75, 0)
    g.add(this.teacherBars)
    this.studentBars = new BarField({ count: 7, width: 0.24, gap: 0.12, maxHeight: 1.5, color: palette.cyan })
    this.studentBars.position.set(ST.x, -0.75, 0)
    g.add(this.studentBars)
    // contrast: a hard label is a single spike — one bit of signal
    this.hardBars = new BarField({ count: 7, width: 0.24, gap: 0.12, maxHeight: 1.2, color: palette.muted })
    this.hardBars.position.set(TE.x, -3.05, 0)
    g.add(this.hardBars)
    this.hardBars.setValues(HARD)

    this.distillEdges = new EdgeField({ flow: true, flowPerEdge: 6, flowSpeed: 0.55, baseOpacity: 0.5, flowSize: 0.15 })
    this.distillEdges.addEdge(new THREE.Vector3(TE.x + 0.7, TE.y, 0), new THREE.Vector3(ST.x - 0.35, ST.y, 0), palette.violet, 0.9)
    this.distillEdges.addEdge(new THREE.Vector3(TE.x + 1.35, -0.15, 0), new THREE.Vector3(ST.x - 1.35, -0.15, 0), palette.amber, 0.8)
    this.distillEdges.build()
    g.add(this.distillEdges)

    this._dTar = new Array(7).fill(0)
    this._dPrompt = -1
    this._dPct = -1

    this._blabel('teacher', TE.clone().add(new THREE.Vector3(0, 0.95, 0)), 7, 0.92)
    this._blabel('student', ST.clone().add(new THREE.Vector3(0, 0.62, 0)), 7, 0.92)
    this._blabel('soft targets', new THREE.Vector3(TE.x, -1.15, 0), 7, 0.85)
    this._blabel('hard label', new THREE.Vector3(TE.x, -3.42, 0), 7, 0.75)
    this.matchLabel = this._blabel('match', new THREE.Vector3(ST.x, -1.15, 0), 7, 0.88)
  }

  // Open problems: three unstable satellites flickering around the core —
  // hallucination, interpretability, alignment. Unsolved tension, not decoration.
  _buildProblems() {
    const g = new THREE.Group()
    this.problems = g
    this.add(g)
    const defs = [
      { name: 'hallucination', color: palette.rose, p: new THREE.Vector3(-1.3, 2.1, 0.4), fa: 2.3, fb: 1.35 },
      { name: 'interpretability', color: palette.violet, p: new THREE.Vector3(3.4, 0.6, 0.4), fa: 1.7, fb: 2.6 },
      { name: 'alignment', color: palette.amber, p: new THREE.Vector3(0.6, -2.3, 0.4), fa: 2.9, fb: 1.1 },
    ]
    const anchor = new THREE.Vector3(0.9, 0.1, -1.2)
    this.probEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0.45, flowSize: 0.12 })
    this.probNodes = []
    defs.forEach((d, j) => {
      const node = new GlowNode({ color: d.color, radius: 0.22, halo: 1.1, glow: 1.4 })
      node.position.copy(d.p)
      g.add(node)
      this.probEdges.addEdge(d.p, anchor, d.color, 0.3)
      this.probNodes.push({ node, base: d.p.clone(), fa: d.fa, fb: d.fb })
      this._blabel(d.name, d.p.clone().add(new THREE.Vector3(0, j === 2 ? -0.62 : 0.62, 0)), 8, 0.9)
    })
    this.probEdges.build()
    g.add(this.probEdges)
    this._blabel('open problems', new THREE.Vector3(0.9, 3.3, 0), 8, 0.85)
  }

  // The whole journey: a luminous path across all ten chapters, frontier brightest.
  _buildJourney() {
    const g = new THREE.Group()
    this.journey = g
    this.add(g)

    const stages = ['neuron', 'training', 'embeddings', 'attention', 'transformer', 'pretraining', 'RL', 'inference', 'retrieval', 'frontier']
    const n = stages.length
    const pts = []
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1)
      // arc ends early on the right so the final "frontier" node clears the card
      pts.push(new THREE.Vector3(lerp(-7.0, 5.2, u), Math.sin(u * Math.PI) * 0.9 - 0.3, 0))
    }

    this.journeyEdges = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.5, baseOpacity: 0.55, flowSize: 0.16 })
    for (let i = 0; i < n - 1; i++) this.journeyEdges.addEdge(pts[i], pts[i + 1], seriesColor(i), 0.9)
    this.journeyEdges.build()
    g.add(this.journeyEdges)

    this.journeyNodes = []
    stages.forEach((s, i) => {
      const last = i === n - 1
      const node = new GlowNode({
        color: last ? palette.hot : seriesColor(i),
        radius: last ? 0.34 : 0.18,
        halo: last ? 1.0 : 0.9,
        glow: last ? 1.6 : 1.2,
      })
      node.position.copy(pts[i])
      node.setLevel(0.5)
      g.add(node)
      this.journeyNodes.push({ node, last, i })
      // alternate labels above/below the arc so ten pills don't collide
      this._blabel(s, pts[i].clone().add(new THREE.Vector3(0, i % 2 ? -0.72 : 0.72, 0)), 9, 0.9)
    })
  }

  // --- transitions -----------------------------------------------------------

  _show(g) {
    if (g.userData.shown) return
    g.userData.shown = true
    g.visible = true
    gsap.killTweensOf(g.scale)
    if (this.reduced) {
      g.scale.setScalar(1)
      return
    }
    gsap.fromTo(g.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.5)' })
  }

  _hide(g) {
    if (!g.userData.shown) {
      g.visible = false
      return
    }
    g.userData.shown = false
    gsap.killTweensOf(g.scale)
    if (this.reduced) {
      g.visible = false
      g.scale.setScalar(0.001)
      return
    }
    gsap.to(g.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        g.visible = false
      },
    })
  }

  _coreTo(x, y, z, scale, level) {
    this._coreTargetLevel = level
    if (this.reduced) {
      this.core.position.set(x, y, z)
      this.core.scale.setScalar(scale)
      return
    }
    gsap.to(this.core.position, { x, y, z, duration: 1.5, ease: 'power3.inOut' })
    gsap.to(this.core.scale, { x: scale, y: scale, z: scale, duration: 1.5, ease: 'power3.inOut' })
  }

  _cam(x, y, z, lx = 0, ly = 0, lz = 0) {
    if (this.reduced) {
      this.camera.position.set(x, y, z)
      this.lookTarget.set(lx, ly, lz)
      return
    }
    gsap.to(this.camera.position, { x, y, z, duration: 1.5, ease: 'power3.inOut' })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: lz, duration: 1.5, ease: 'power3.inOut' })
  }

  onStep(i) {
    this.setBloom(...(BLOOM[i] || BLOOM[0]))

    const active = this._stationFor[i]
    for (const g of this.stations) if (g !== active) this._hide(g)
    if (active) this._show(active)

    // core presence: hero on beat 0, faded out on the upgrade beats (their
    // stations own the frame), forward again for the open problems, and a
    // distant crown above the recap path
    if (i === 0) this._coreTo(0, 0, 0, 1, 1)
    else if (i === 8) this._coreTo(0.9, 0.1, -1.8, 0.75, 0.5)
    else if (i === 9) this._coreTo(0, 4.4, -10, 0.55, 0.5)
    else this._coreTo(0, 0, -6.5, 0.55, 0)

    switch (i) {
      case 0:
        this._cam(0, 0, 13, 0, 0, 0)
        break
      case 1:
        this._cam(-0.6, 0, 10.8, -0.6, 0, 0)
        this._ffnSpreadT = 0
        break
      case 2:
        this._cam(0.8, -0.3, 11.8, 0.8, -0.4, 0)
        this._ffnSpreadT = 1
        this._moeCycle = -1
        break
      case 3:
        this._cam(0, 0.7, 11.5, 0, 0.7, 0)
        this._ctxK = 1
        this._ctxLastK = -1
        break
      case 4:
        this._cam(0, 0.2, 11.5, 0, 0.1, 0)
        this._modalAssemble = 0
        break
      case 5:
        this._cam(0, 0, 11.8, 0, 0, 0)
        this._treeT = 0
        break
      case 6:
        this._cam(0.9, 0.1, 11.2, 1.0, -0.1, 0)
        this._agCycle = -1
        this._agFill = this.reduced ? 6 : 3
        this._ribbonFill(this._agFill)
        break
      case 7:
        this._cam(-1.1, 0.3, 11.4, -1.1, 0.1, 0)
        break
      case 8:
        this._cam(0.8, 0.2, 12.5, 0.9, 0.1, 0)
        break
      case 9:
        this._cam(0, 0.4, 16.2, 0, 0, 0)
        break
    }
  }

  // --- per-station animation -------------------------------------------------

  _hash(n) {
    n = (n ^ 61) ^ (n >>> 16)
    n = n + (n << 3)
    n = n ^ (n >>> 4)
    n = Math.imul(n, 0x27d4eb2d)
    n = n ^ (n >>> 15)
    return n >>> 0
  }

  _updateCore(dt, t) {
    this.coreLevel = damp(this.coreLevel, this._coreTargetLevel, 3, dt)
    const cl = this.coreLevel
    // fade the whole core out as its level approaches 0 (station beats own the frame)
    const vis = clamp01((cl - 0.02) / 0.3)
    this.core.visible = vis > 0.02
    for (let i = 0; i < this.coreNodes.length; i++) {
      this.coreNodes[i].setLevel((0.35 + cl * 0.6 + Math.sin(t * 1.5 + i * 0.5) * 0.06) * vis)
    }
    for (const r of this.coreRings) {
      r.mat.opacity = r.base * (0.3 + cl * 0.9) * vis
      if (!this.reduced) r.pivot.rotation.y += dt * r.speed
    }
    for (const h of this.coreHalo) {
      h.material.opacity = h.userData.base * (0.25 + cl * 0.7) * vis
      if (!this.reduced) h.rotation.z += dt * h.userData.sp
    }
    this.coreEdges.setLineOpacity((0.2 + cl * 0.5) * vis)
    this.coreEdges.setFlowOpacity((0.3 + cl * 0.6) * vis)
    this.coreEdges.update(dt)
    if (!this.reduced) this.coreSpin.rotation.y += dt * 0.12 * (0.4 + cl)
  }

  // Beats 1–2. Dense: token sweeps through and the WHOLE slab lights. MoE: the
  // columns have spread; each token cycle picks exactly 2 of 8 experts — those
  // columns light in their series color, the rest stay dark.
  _updateFFN(dt, t) {
    const E = FFN.E
    if (this.reduced) this._ffnSpread = this._ffnSpreadT
    else this._ffnSpread = damp(this._ffnSpread, this._ffnSpreadT, 4, dt)
    const sp = this._ffnSpread
    if (Math.abs(sp - this._ffnSpreadLast) > 1e-4) {
      this._layoutFFN(sp)
      this._ffnSpreadLast = sp
    }

    // dense pass: token position + whole-slab lighting
    const ud = this.reduced ? 0.5 : (t % 2.8) / 2.8
    const denseX = lerp(-4.3, 2.6, ud)
    const inSlab = denseX > FFN.DX - 2.6 && denseX < FFN.DX + 2.6 ? 1 : 0.08
    this._slabLit = this.reduced ? 1 : damp(this._slabLit, inSlab, 6, dt)

    // MoE routing: top-2 choice changes each token cycle
    const um = this.reduced ? 0.4 : (t % 1.9) / 1.9
    const cyc = this.reduced ? 3 : Math.floor(t / 1.9)
    if (cyc !== this._moeCycle) {
      this._moeCycle = cyc
      const a = this._hash(cyc) % E
      const b = (a + 1 + (this._hash(cyc * 131 + 7) % (E - 1))) % E
      for (let e = 0; e < E; e++) this._expTarget[e] = e === a || e === b ? 1 : 0.05
    }
    for (let e = 0; e < E; e++) {
      this._expLevel[e] = this.reduced ? this._expTarget[e] : damp(this._expLevel[e], this._expTarget[e], 7, dt)
      this.moeBeams.setWeight(e, Math.max(0, this._expLevel[e] - 0.15) * 1.35 * sp)
    }
    this.moeBeams.setWeight(E, 0.6 * sp)
    // hide the beam fan entirely in dense mode (weight-0 lines would otherwise
    // show as a gray fan on the light theme's normal blending)
    this.moeBeams.setLineOpacity(0.6 * sp)
    this.moeBeams.setFlowOpacity(0.95 * sp)

    // cells: blend the dense whole-slab glow with per-expert MoE lighting
    const lit = this._slabLit
    for (let i = 0; i < this._cellExpert.length; i++) {
      const e = this._cellExpert[i]
      _tmpC2.copy(this._cellAmber).lerp(this._expCols[e], sp)
      const lvl = clamp01(lerp(lit, this._expLevel[e], sp) * this._cellNoise[i])
      _tmpC.copy(this._cellDim).lerp(_tmpC2, lvl)
      this.cells.setColorAt(i, _tmpC)
    }
    this.cells.instanceColor.needsUpdate = true

    // token: sweeps the slab in dense mode; feeds the router in MoE mode
    const mx = lerp(FFN.TX, FFN.RX, Math.min(1, um / 0.45))
    this.ffnToken.position.set(lerp(denseX, mx, sp), lerp(0, FFN.RY, sp), 0.3)
    const fadeM = um < 0.45 ? 0.95 : Math.max(0.25, 0.95 - (um - 0.45) * 1.6)
    this.ffnToken.setLevel(lerp(0.95, fadeM, sp))

    // router appears only in MoE mode; pulses when a token arrives
    this.moeRouter.scale.setScalar(Math.max(0.001, sp))
    this.moeRouter.visible = sp > 0.02
    const pulse = this.reduced ? 0.4 : Math.exp(-Math.pow((um - 0.5) * 7, 2))
    this.moeRouter.setLevel(0.5 + 0.4 * pulse)

    this.moeBeams.update(dt)
  }

  _updateContext(dt) {
    const N = this.ctxN
    if (this.reduced) {
      if (this._ctxLastK !== N) { this._setQuilt(N); this.ctxRibbon.setFilled(N, { rainbow: true }); this._ctxLastK = N }
      this.ctxRibbon.update(dt)
      return
    }
    this._ctxK += dt * 2.4
    if (this._ctxK > N + 7) this._ctxK = 1 // loop the growth; hold at full so the blow-up reads
    const k = Math.max(1, Math.min(N, Math.round(this._ctxK)))
    if (k !== this._ctxLastK) {
      this._setQuilt(k)
      this.ctxRibbon.setFilled(k, { rainbow: true })
      this._ctxLastK = k
    }
    this.ctxRibbon.update(dt)
  }

  // light the k×k sub-block; colour heats cyan → amber → red as k grows
  _setQuilt(k) {
    const N = this.ctxN
    const heat = clamp01((k - 1) / (N - 1))
    const c = new THREE.Color(palette.cyan).lerp(new THREE.Color(palette.amber), clamp01(heat * 1.8))
    if (heat > 0.55) c.lerp(new THREE.Color(palette.rose), clamp01((heat - 0.55) / 0.45))
    for (let r = 0; r < N; r++) {
      for (let cc = 0; cc < N; cc++) {
        this.quilt.setColorAt(r * N + cc, r < k && cc < k ? c : this._quiltDark)
      }
    }
    this.quilt.instanceColor.needsUpdate = true
  }

  _updateModal(dt, t) {
    this._modalAssemble = this.reduced ? 1 : Math.min(1, this._modalAssemble + dt * 0.5)
    const a = smoothstep(0, 1, this._modalAssemble)
    for (const p of this.modalPatches) {
      _tmp.copy(p.src).lerp(p.cloud, a)
      if (!this.reduced && a > 0.9) {
        _tmp.x += Math.sin(t * 1.2 + p.cloud.y * 3) * 0.05
        _tmp.y += Math.cos(t * 1.0 + p.cloud.x * 3) * 0.05
      }
      p.node.position.copy(_tmp)
      p.node.setLevel(0.55 + 0.25 * Math.sin(t * 2 + p.src.x))
    }
  }

  _updateSpiral(dt, t) {
    if (!this.reduced) {
      this._treeT += dt / 7
      if (this._treeT > 1.18) this._treeT = 0 // loop the reasoning so it re-plays
    } else this._treeT = 1
    const head = this._treeT * (this.treeMaxO + 0.6)

    for (const n of this.treeNodes) {
      const appear = clamp01(head - n.o + 1)
      let lvl
      if (this.reduced) {
        lvl = n.dead ? 0.18 : n.answer ? 1.5 : 0.6
      } else if (n.answer) {
        const arrived = clamp01(head - this.treeMaxO + 0.3)
        lvl = 0.15 + arrived * 1.55 + (arrived > 0.5 ? Math.sin(t * 7) * 0.12 : 0)
      } else if (n.dead) {
        const wither = clamp01(head - n.o - 0.7)
        lvl = (0.1 + appear * 0.6) * (1 - 0.85 * wither)
      } else {
        lvl = 0.2 + appear * 0.7 + Math.sin(t * 2 + n.x) * 0.05
      }
      n.node.setLevel(clamp01(lvl) * (n.answer ? 1.1 : 1))
      if (n.ei >= 0) {
        const wither = n.dead && !this.reduced ? clamp01(head - n.o - 0.7) : 0
        this.treeEdges.setWeight(n.ei, this.reduced ? (n.dead ? 0.12 : 0.8) : clamp01(appear) * (1 - 0.8 * wither) * 1.1)
      }
    }
    this.treeEdges.update(dt)

    // thinking-budget meter fills as the model spends more thinking
    const h = Math.max(0.001, clamp01(this._treeT) * 2.6)
    this.budgetBar.scale.y = h
    this.budgetBar.position.y = -2.9 + h / 2
  }

  // recolor the strip: first 3 tiles are the prompt (cyan), the rest are tool
  // results (lime) accreted by the loop
  _ribbonFill(k) {
    this.agentRibbon.setFilled(k)
    for (let i = 0; i < k; i++) {
      this.agentRibbon.tiles[i].material.color.set(i < 3 ? palette.cyan : palette.lime)
    }
  }

  _updateAgent(dt, t) {
    const CY = 5.4
    const cyc = Math.floor(t / CY)
    const u = (t % CY) / CY
    const k = this.reduced ? 0 : cyc % 3
    const phase = this.reduced ? 1 : u < 0.3 ? 0 : u < 0.62 ? 1 : 2

    if (!this.reduced && cyc !== this._agCycle) {
      this._agCycle = cyc
      if (this._agFill >= 10) {
        this._agFill = 3
        this._ribbonFill(3)
      }
    }
    if (phase !== this._agPhaseIdx) {
      this._agPhaseIdx = phase
      this.phaseLabel.setText(this.L(phase === 0 ? 'think' : phase === 1 ? 'act' : 'observe'))
    }
    // the returning result mote lands → a tile appends to the context strip
    if (!this.reduced && phase === 2 && u > 0.82 && !this._agAppended) {
      this._agAppended = true
      this._agFill = Math.min(10, this._agFill + 1)
      this._ribbonFill(this._agFill)
    }
    if (phase !== 2) this._agAppended = false

    for (let i = 0; i < 3; i++) {
      const wo = i === k && phase === 1 ? 1 : 0
      const wb = i === k && phase === 2 ? 1 : 0
      this._agOutW[i] = this.reduced ? wo * 0.9 : damp(this._agOutW[i], wo, 6, dt)
      this._agBackW[i] = this.reduced ? wb * 0.9 : damp(this._agBackW[i], wb, 6, dt)
      if (this._agLight) {
        this.agentEdges.setColor(i, _tmpC.copy(this._agBg).lerp(this._agBase[i], clamp01(this._agOutW[i])))
        this.agentEdges.setColor(3 + i, _tmpC.copy(this._agBg).lerp(this._agLime, clamp01(this._agBackW[i])))
      } else {
        this.agentEdges.setWeight(i, this._agOutW[i])
        this.agentEdges.setWeight(3 + i, this._agBackW[i])
      }
      this.toolHalos[i].setLevel(0.22 + 0.78 * Math.max(this._agOutW[i], this._agBackW[i] * 0.7))
      const gl = this.toolGlyphs[i]
      gl.rotation.z = this.reduced ? 0 : Math.sin(t * 0.6 + i * 2.1) * 0.07
      gl.scale.setScalar(1 + 0.18 * this._agOutW[i])
    }

    this.agentModel.setLevel(phase === 0 ? 0.95 + (this.reduced ? 0 : 0.18 * Math.sin(t * 8)) : 0.55)

    // expanding thought ring during the think phase
    if (!this.reduced && phase === 0) {
      const tr = u / 0.3
      this.thinkRing.mesh.scale.setScalar(0.45 + tr * 1.6)
      this.thinkRing.mat.opacity = (1 - tr) * 0.5
    } else {
      this.thinkRing.mat.opacity = Math.max(0, this.thinkRing.mat.opacity - dt * 2)
    }

    this.agentEdges.update(dt)
    this.agentRibbon.update(dt)
  }

  _updateDistill(dt, t) {
    const LOOP = 24
    const PD = 3.0
    const tl = this.reduced ? LOOP - 1 : t % LOOP
    const p = Math.floor(tl / PD) % 4
    // convergence rises over the loop: early prompts the student misses,
    // late prompts it matches — then the training replays
    const conv = this.reduced ? 1 : smoothstep(0, 1, clamp01((tl - 1.5) / 15))

    if (p !== this._dPrompt) {
      this._dPrompt = p
      this.teacherBars.setTargets(DIST[p])
    }
    for (let i = 0; i < 7; i++) this._dTar[i] = lerp(NOISY[p][i], DIST[p][i], conv)
    this.studentBars.setTargets(this._dTar)
    this.teacherBars.lerp(dt)
    this.studentBars.lerp(dt)

    // live similarity between the two distributions
    let d = 0
    for (let i = 0; i < 7; i++) d += Math.abs(this.studentBars.values[i] - this.teacherBars.values[i])
    const pct = Math.round(100 * clamp01(1 - 0.5 * d))
    if (pct !== this._dPct) {
      this._dPct = pct
      this.matchLabel.setText(this.L('match') + ' ' + pct + '%')
    }

    this.teacherNode.setLevel(0.78 + (this.reduced ? 0 : 0.08 * Math.sin(t * 2)))
    this.studentNode.setLevel(0.4 + 0.55 * conv)
    if (!this.reduced) this.teacherRing.rotation.z += dt * 0.15
    this.distillEdges.update(dt)
  }

  _updateProblems(dt, t) {
    for (let j = 0; j < this.probNodes.length; j++) {
      const pn = this.probNodes[j]
      const lvl = this.reduced ? 0.6 : 0.35 + 0.5 * Math.abs(Math.sin(t * pn.fa + j * 2.1) * Math.sin(t * pn.fb))
      pn.node.setLevel(lvl)
      if (!this.reduced) {
        pn.node.position.x = pn.base.x + Math.sin(t * 0.9 + j * 2.1) * 0.06
        pn.node.position.y = pn.base.y + Math.cos(t * 0.7 + j * 1.7) * 0.06
      }
      this.probEdges.setWeight(j, this.reduced ? 0.35 : 0.15 + 0.3 * Math.abs(Math.sin(t * pn.fb + j)))
    }
    this.probEdges.update(dt)
  }

  _updateJourney(dt, t) {
    const n = this.journeyNodes.length
    const sweep = ((t * 0.45) % 1) * n
    for (const jn of this.journeyNodes) {
      const d = jn.i - sweep
      let lvl = 0.5 + 0.5 * Math.exp(-d * d * 0.7)
      if (jn.last) lvl = Math.max(lvl, 0.95 + 0.05 * Math.sin(t * 3))
      jn.node.setLevel(lvl)
    }
    this.journeyEdges.update(dt)
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    this._updateCore(dt, t)

    switch (this.step) {
      case 1:
      case 2:
        this._updateFFN(dt, t)
        break
      case 3:
        this._updateContext(dt, t)
        break
      case 4:
        this._updateModal(dt, t)
        break
      case 5:
        this._updateSpiral(dt, t)
        break
      case 6:
        this._updateAgent(dt, t)
        break
      case 7:
        this._updateDistill(dt, t)
        break
      case 8:
        this._updateProblems(dt, t)
        break
      case 9:
        this._updateJourney(dt, t)
        break
    }

    const s = this.step
    for (const l of this._mylabels) l.setOpacity(damp(l._opacity, l.beat === s ? l._shown : 0, 8, dt))
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this.core.position)
    gsap.killTweensOf(this.core.scale)
    for (const g of this.stations) gsap.killTweensOf(g.scale)
    super.dispose()
  }
}
