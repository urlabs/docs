import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp, lerp, clamp01, smoothstep } from '../../theme/motion.js'
import { blend } from '../../theme/theme.js'

// Chapter 08 — FRONTIER LLMs. The payoff: the same transformer core you built,
// scaled up and bolted with upgrades — MoE, long context, multimodality,
// RL-trained reasoning, and tool-use/agents. A persistent glowing "core" anchors
// the scene; each beat reveals one upgrade station while the camera reframes it.

const _tmp = new THREE.Vector3()

export const beats = [
  {
    side: 'center',
    html: `<span class="eyebrow">Chapter 10 · where we are now</span>
      <h2>Frontier LLMs</h2>
      <p class="lead">You built the core. Today's <strong>frontier models</strong> — the most capable systems running right now — are that same core: <span class="tok">embeddings</span> turn tokens into vectors, <span class="tok">attention</span> lets them trade meaning, stacked blocks add depth, and the whole machine predicts one token at a time.</p>
      <p>Nothing new was slipped in underneath. What changed is <strong>scale</strong> — vastly more parameters, data, and compute, exactly as the scaling laws promised — and five upgrades bolted on top. This chapter visits each, then retraces the whole journey.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Mixture of experts</h3>
      <p>Picture a hospital of specialists instead of one exhausted generalist. A <strong>mixture of experts</strong> replaces the block's single feed-forward layer with many smaller <strong>expert</strong> networks, plus a tiny <strong>router</strong> that reads each token and sends it to just the top one or two. The rest stay dark.</p>
      <p>That is <span class="tok">sparse activation</span>: the model's <em>total</em> parameters can balloon into the trillions while the <em>active</em> parameters per token stay small — a far larger brain that costs about the same to run. The router is itself learned (a softmax gate), nudged to spread load so no expert is overworked or starved.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Long context — and why it's costly</h3>
      <p>The <strong>context window</strong> is everything the model can see at once: its working memory. Early models held a few thousand tokens; today's hold <strong>hundreds of thousands</strong> — a whole book, a long transcript, an entire codebase at a glance.</p>
      <p>But attention compares <em>every token with every other</em>, so the work grows with the <strong>square</strong> of the length: double the tokens and you quadruple the cost. Watch the grid — that N×N blow-up, plus the ever-growing KV cache feeding it, is the real price of a long memory, and where much of frontier engineering goes.</p>`,
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
      <p>They learn to think well through <strong>reinforcement learning</strong> on problems with checkable answers: try many times, reinforce the reasoning that reaches the correct result. And the surprise — <span class="tok">test-time compute</span> — is that simply letting a model spend <em>more</em> tokens thinking at inference reliably buys better answers. The same next-token machine, now pointed inward before it speaks; the thinking budget trades latency for accuracy.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Tools &amp; agents</h3>
      <p>A model on its own can only produce text. But that text can be an <strong>instruction</strong>: <span style="color:var(--amber)">search the web</span>, <span style="color:var(--rose)">run some code</span>, <span style="color:var(--blue)">edit a file</span>. A harness runs the tool and feeds the <span style="color:var(--lime)">result</span> back in as fresh context.</p>
      <p>Wrap that in a loop — decide an action, take it, observe the result, decide the next — and the model becomes an <strong>agent</strong>: a system pursuing a goal step by step instead of answering in one shot. It is still pure next-token prediction; the difference is that the transcript now includes the world writing back.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The whole journey</h3>
      <p>Step back, and it is all one idea unfolding. A single <span class="tok">neuron</span> weighs its inputs. <span class="tok">Attention</span> lets tokens share meaning. The <span class="tok">transformer</span> stacks that into depth. <span class="tok">Training</span> shapes the weights from data; <span class="tok">inference</span> runs them to write the next token. Everything in this chapter is that same foundation — scaled, and pointed at the world.</p>
      <div class="postcard">A frontier model is the same transformer core you built — scaled up, with sparse experts, vast context, many senses, reasoning it can be taught, and tools to act in the world.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/">replay the journey ↺</a><a class="deepdive" data-route="/attention">revisit attention</a></div>`,
  },
]

const BLOOM = [
  [1.2, 0.6, 0.7], // 0 hero core
  [1.0, 0.55, 0.78], // 1 MoE
  [1.05, 0.6, 0.74], // 2 long context
  [1.1, 0.6, 0.72], // 3 multimodal
  [1.45, 0.7, 0.6], // 4 reasoning (signature)
  [1.0, 0.55, 0.78], // 5 agents
  [1.28, 0.66, 0.66], // 6 journey
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
    this._buildMoE()
    this._buildContext()
    this._buildModal()
    this._buildSpiral()
    this._buildAgent()
    this._buildJourney()

    // stations are revealed/hidden per beat; core is always present
    this.stations = [this.moe, this.context, this.modal, this.spiral, this.agent, this.journey]
    for (const g of this.stations) {
      g.visible = false
      g.scale.setScalar(0.001)
    }
    this._stationFor = [null, this.moe, this.context, this.modal, this.spiral, this.agent, this.journey]

    this._pulse = 0
    this._moeCycle = -1
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

  // Mixture of Experts: a grid of experts, a router, and an incoming token. The
  // router lights only 1–2 experts per token; the rest stay dark.
  _buildMoE() {
    const g = new THREE.Group()
    this.moe = g
    this.add(g)

    const cols = 5
    const rows = 4
    const gx = 0.92
    const gy = 0.92
    const cx = 1.3 // bias the bright grid right (beat card is on the left)

    this.moeEdges = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.7, baseOpacity: 0.55, flowSize: 0.14 })

    const routerPos = new THREE.Vector3(cx - (cols / 2) * gx - 1.2, 0, 0)
    const tokenPos = new THREE.Vector3(routerPos.x - 1.4, 0, 0)

    this.moeToken = new GlowNode({ color: palette.cyan, radius: 0.18, halo: 0.9, glow: 1.4 })
    this.moeToken.position.copy(tokenPos)
    g.add(this.moeToken)
    this.moeRouter = new GlowNode({ color: palette.hot, radius: 0.27, halo: 1.3, glow: 1.6 })
    this.moeRouter.position.copy(routerPos)
    g.add(this.moeRouter)
    this.moeEdges.addEdge(tokenPos, routerPos, palette.cyan, 0.7)

    this.experts = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cx + (c - (cols - 1) / 2) * gx
        const y = ((rows - 1) / 2 - r) * gy
        const node = new GlowNode({ color: 0x2b3a5c, radius: 0.2, halo: 0.7, glow: 1.3 })
        node.position.set(x, y, 0)
        node.setLevel(0.08)
        g.add(node)
        const idx = this.moeEdges.addEdge(routerPos, node.position, palette.hot, 0)
        this.experts.push({ node, idx, level: 0.08, target: 0.08, base: 0x2b3a5c })
      }
    }
    this.moeEdges.build()
    g.add(this.moeEdges)
    this._moeColor = palette.cyan

    this._blabel('router', new THREE.Vector3(routerPos.x, -0.95, 0), 1, 0.85)
    this._blabel('20 experts · 1–2 active', new THREE.Vector3(cx, 2.2, 0), 1, 0.85)
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

    this._blabel('tokens →', new THREE.Vector3(0, -3.25, 0), 2, 0.82)
    this._blabel('attention · every token × every token', new THREE.Vector3(0, 0.8 + span / 2 + 0.55, 0), 2, 0.85)
    this._blabel('2× tokens → 4× work', new THREE.Vector3(span / 2 + 1.5, 0.8, 0), 2, 0.82)
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

    this._blabel('text', new THREE.Vector3(srcX - 0.8, 2.0, 0), 3, 0.85)
    this._blabel('image', new THREE.Vector3(srcX - 0.8, 0.4, 0), 3, 0.85)
    this._blabel('audio', new THREE.Vector3(srcX - 0.8, -1.8, 0), 3, 0.85)
    this._blabel('one shared space', new THREE.Vector3(cloud.x, cloud.y + 1.8, 0), 3, 0.9)
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
        halo: answer ? 1.7 : 0.7,
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

    this._blabel('problem', new THREE.Vector3(0, 3.25, 0), 4, 0.9)
    this._blabel('dead end ✕', new THREE.Vector3(-2.7, -0.6, 0), 4, 0.78)
    this._blabel('answer', this.answerNode.position.clone().add(new THREE.Vector3(0.65, -0.1, 0)), 4, 0.95)
    this._blabel('thinking budget', new THREE.Vector3(-3.7, -3.5, 0), 4, 0.8)
  }

  // Tools & agents: a compact model → tool → result → model loop.
  _buildAgent() {
    const g = new THREE.Group()
    this.agent = g
    this.add(g)

    const P = {
      model: new THREE.Vector3(-0.6, 1.5, 0),
      tool: new THREE.Vector3(1.9, 0.1, 0),
      result: new THREE.Vector3(-0.6, -1.5, 0),
    }
    this.agentModel = new GlowNode({ color: palette.cyan, radius: 0.3, halo: 1.2, glow: 1.5 })
    this.agentModel.position.copy(P.model)
    this.agentTool = new GlowNode({ color: palette.amber, radius: 0.26, halo: 1.0, glow: 1.4 })
    this.agentTool.position.copy(P.tool)
    this.agentResult = new GlowNode({ color: palette.lime, radius: 0.26, halo: 1.0, glow: 1.4 })
    this.agentResult.position.copy(P.result)
    g.add(this.agentModel, this.agentTool, this.agentResult)

    this.agentEdges = new EdgeField({ flow: true, flowPerEdge: 4, flowSpeed: 0.85, baseOpacity: 0.6, flowSize: 0.16 })
    this.agentEdges.addEdge(P.model, P.tool, palette.cyan, 1)
    this.agentEdges.addEdge(P.tool, P.result, palette.amber, 1)
    this.agentEdges.addEdge(P.result, P.model, palette.lime, 1)

    // tool satellites
    this.agentTools = []
    const sats = [
      { name: 'search', color: palette.amber, p: new THREE.Vector3(2.8, 0.95, 0) },
      { name: 'run code', color: palette.rose, p: new THREE.Vector3(3.2, 0.05, 0) },
      { name: 'edit files', color: palette.blue, p: new THREE.Vector3(2.8, -0.85, 0) },
    ]
    for (const s of sats) {
      const node = new GlowNode({ color: s.color, radius: 0.12, halo: 0.6, glow: 1.2 })
      node.position.copy(s.p)
      node.setLevel(0.4)
      g.add(node)
      this.agentTools.push(node)
      this.agentEdges.addEdge(P.tool, s.p, s.color, 0.6)
      this._blabel(s.name, s.p.clone().add(new THREE.Vector3(0.7, 0, 0)), 5, 0.78)
    }
    this.agentEdges.build()
    g.add(this.agentEdges)

    this._blabel('model', P.model.clone().add(new THREE.Vector3(0, 0.55, 0)), 5)
    this._blabel('tool', P.tool.clone().add(new THREE.Vector3(0, -0.55, 0)), 5)
    this._blabel('result', P.result.clone().add(new THREE.Vector3(0, -0.55, 0)), 5)
  }

  // The whole journey: a luminous path of the recap stages, frontier brightest.
  _buildJourney() {
    const g = new THREE.Group()
    this.journey = g
    this.add(g)

    const stages = ['neuron', 'attention', 'transformer', 'training', 'inference', 'frontier']
    const n = stages.length
    const pts = []
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1)
      pts.push(new THREE.Vector3(lerp(-6, 6, u), Math.sin(u * Math.PI) * 0.8 - 0.2, 0))
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
        radius: last ? 0.34 : 0.2,
        halo: last ? 1.4 : 0.9,
        glow: last ? 1.6 : 1.2,
      })
      node.position.copy(pts[i])
      node.setLevel(0.5)
      g.add(node)
      this.journeyNodes.push({ node, last, i })
      this._blabel(s, pts[i].clone().add(new THREE.Vector3(0, 0.72, 0)), 6, 0.9)
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

    // core presence: hero on beat 0, backdrop on upgrade beats, mid on recap
    if (i === 0) this._coreTo(0, 0, 0, 1, 1)
    else if (i === 6) this._coreTo(0, 0.2, -3, 0.8, 0.7)
    else this._coreTo(0, 0, -6.5, 0.55, 0.32)

    switch (i) {
      case 0:
        this._cam(0, 0, 13, 0, 0, 0)
        break
      case 1:
        this._cam(0.6, 0.4, 10.5, 0.5, 0, 0)
        this._moeCycle = -1
        break
      case 2:
        this._cam(0, 0.7, 11.5, 0, 0.7, 0)
        this._ctxK = 1
        this._ctxLastK = -1
        break
      case 3:
        this._cam(0, 0.2, 11.5, 0, 0.1, 0)
        this._modalAssemble = 0
        break
      case 4:
        this._cam(0, 0, 11.8, 0, 0, 0)
        this._treeT = 0
        break
      case 5:
        this._cam(0.3, 0.2, 9.5, 0.6, 0, 0)
        break
      case 6:
        this._cam(0, 0.5, 15.5, 0, 0, 0)
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
    for (let i = 0; i < this.coreNodes.length; i++) {
      this.coreNodes[i].setLevel(0.35 + cl * 0.6 + Math.sin(t * 1.5 + i * 0.5) * 0.06)
    }
    for (const r of this.coreRings) {
      r.mat.opacity = r.base * (0.3 + cl * 0.9)
      if (!this.reduced) r.pivot.rotation.y += dt * r.speed
    }
    for (const h of this.coreHalo) {
      h.material.opacity = h.userData.base * (0.25 + cl * 0.7)
      if (!this.reduced) h.rotation.z += dt * h.userData.sp
    }
    this.coreEdges.setLineOpacity(0.2 + cl * 0.5)
    this.coreEdges.setFlowOpacity(0.3 + cl * 0.6)
    this.coreEdges.update(dt)
    if (!this.reduced) this.coreSpin.rotation.y += dt * 0.12 * (0.4 + cl)
  }

  _updateMoE(dt, t) {
    const cyc = Math.floor(t / 1.5)
    if (cyc !== this._moeCycle) {
      this._moeCycle = cyc
      for (const e of this.experts) e.target = 0.08
      const k = this.experts.length
      const col = seriesColor(cyc)
      this._moeColor = col
      const a = this._hash(cyc) % k
      this.experts[a].target = 1
      this.experts[a].node.setColor(col)
      this.moeEdges.setColor(this.experts[a].idx, col)
      if (this._hash(cyc * 977 + 5) % 3 !== 0) {
        const b = this._hash(cyc * 131 + 7) % k
        if (b !== a) {
          this.experts[b].target = 1
          this.experts[b].node.setColor(col)
          this.moeEdges.setColor(this.experts[b].idx, col)
        }
      }
    }
    for (const e of this.experts) {
      e.level = damp(e.level, e.target, 7, dt)
      e.node.setLevel(e.level)
      this.moeEdges.setWeight(e.idx, Math.max(0, e.level - 0.18) * 1.7)
    }
    this.moeRouter.setLevel(0.8 + 0.2 * Math.sin(t * 4))
    this.moeToken.setLevel(0.6 + 0.2 * Math.sin(t * 3 + 1))
    this.moeEdges.update(dt)
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

  _updateAgent(dt, t) {
    const seg = Math.floor(((t * 0.4) % 1) * 3)
    const nodes = [this.agentModel, this.agentTool, this.agentResult]
    nodes.forEach((n, i) => n.setLevel(i === seg ? 1 : 0.45))
    this.agentTools.forEach((n, i) => n.setLevel(0.4 + 0.3 * Math.sin(t * 3 + i)))
    this.agentEdges.update(dt)
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
        this._updateMoE(dt, t)
        break
      case 2:
        this._updateContext(dt, t)
        break
      case 3:
        this._updateModal(dt, t)
        break
      case 4:
        this._updateSpiral(dt, t)
        break
      case 5:
        this._updateAgent(dt, t)
        break
      case 6:
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
