import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { BarField } from '../../lib/BarField.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additivePoints, additiveLine, glowBasic } from '../../lib/materials.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp, clamp01, lerp, smoothstep } from '../../theme/motion.js'
import { blend } from '../../theme/theme.js'

// Chapter 06 — Pretraining → ChatGPT, rebuilt around two visible ideas:
//   (a) the GAME: predict the next token — watch a guess vs the revealed truth,
//       the loss, and (at scale) one sentence multiply into an ocean of text.
//   (b) the TRANSFORM: a base model that only continues text becomes a helpful
//       assistant through SFT → a reward model (judge) → RL.
// A persistent magenta "core" (the model) anchors the scene; four sub-systems
// (predict / scale / laws / align) fade in and out across seven beats.

const _tmp = new THREE.Vector3()
const _tmpC = new THREE.Color()

const PROMPT = ['The', 'cat', 'sat', 'on', 'the']
const CANDS = ['mat', 'rug', 'dog', 'floor', 'box', 'sky', 'car', 'sea'] // index 0 = truth
const TRUTH = 0
// guess (untrained, flat-ish, wrong peak) vs trained (sharp on "mat")
const GUESS = [0.34, 0.3, 0.4, 0.22, 0.16, 0.12, 0.1, 0.08]
const TRAINED = [1.0, 0.22, 0.14, 0.18, 0.1, 0.08, 0.07, 0.06]

const CORE_Y = 0
const BAR_Y = 1.55
const STRIP_Y = -2.7

const VIS_KEYS = ['predict', 'scale', 'laws', 'align']

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 06 · from text to ChatGPT</span>
      <h2>Pretraining</h2>
      <p class="lead">Before a model can chat, it reads an enormous slice of the internet and plays one game, over and over: <strong>predict the next token</strong>. (A <em>token</em> is a chunk of text — roughly a word or word-piece — the unit a model reads and writes.)</p>
      <p>Show it <span class="tok">The cat sat on the&nbsp;▢</span> and it must fill the blank — not with one guess, but by spreading a <strong>probability</strong> across every token it knows.</p>
      <p>Untrained, that bet is barely better than a shrug: a sliver on <span class="tok">mat</span>, slivers on a hundred wrong words.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Guess, check, nudge — a trillion times</h3>
      <p>Now the blank is revealed: the true next token was <span class="tok">mat</span>. The gap between the model's bet and the truth is the <strong>loss</strong> — one number scoring how wrong it was. Confident and right scores low; confident and wrong scores high.</p>
      <p>That score nudges the model's billions of <em>weights</em> a hair toward being less wrong next time. Then slide the window one token along and repeat — every position in every document is a free example.</p>
      <p class="aside">Nobody labelled any of this: the next word is its own answer key. That is <strong>self-supervised learning</strong> — and the loss it drives down is <strong>cross-entropy</strong>, which rewards putting probability on the token that actually came next.</p>`,
  },
  {
    side: 'left',
    html: `<h3>One sentence becomes the internet</h3>
      <p>A single example teaches almost nothing. The magic is the <strong>scale</strong>. That one sentence becomes books, web pages, code, and conversations — a torrent of text pouring through the very same predict-the-next-token loop.</p>
      <p>Frontier models train on <strong>trillions</strong> of tokens, the readable internet many times over. To fill every blank well across all of it — grammar, facts, reasoning, code — the model is forced to build a working picture of the world the text describes. Knowledge arrives as a <em>side effect</em> of getting good at the game.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Scaling laws</h3>
      <p>Three levers decide how good it gets: more <strong>data</strong>, more <strong>compute</strong> (raw calculation, in GPU-hours), and more <strong>parameters</strong> (the weights, counted in the billions). Turn all three up together and the loss keeps falling.</p>
      <p>The startling part is how <em>predictably</em> it falls — a smooth power law, a near-straight line on a log-log plot. So researchers train small, cheap models and forecast a giant one's loss before spending a cent on it.</p>
      <p class="aside">That predictability is what justified fortunes on ever-bigger runs — the curve all but promises the payoff in advance. (A rule of thumb from the Chinchilla work: grow data and parameters together, very roughly 20 tokens per parameter.)</p>`,
  },
  {
    side: 'left',
    html: `<h3>Brilliant, but not yet helpful</h3>
      <p>What emerges is a <strong>base model</strong>. It has absorbed staggering knowledge — yet its only instinct is to <em>continue</em> text in the style of the internet, not to help you.</p>
      <p>Ask it "What's the capital of France?" and it may fire back five more quiz questions — because online, a question is often followed by more questions. It has no urge to answer, stay on task, or refuse a harmful request. It was trained to predict the next token, not to assist.</p>
      <p>All the knowledge is in there. It just has to be taught how to <em>behave</em>.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Teaching it to behave</h3>
      <p>A second phase — <strong>post-training</strong>, or <em>alignment</em> — lines the model's behaviour up with what people actually want. The best-known recipe is <strong>RLHF</strong>, and it begins with plain imitation.</p>
      <p><strong>Supervised fine-tuning (SFT):</strong> skilled people write thousands of <em>ideal</em> answers, and the model trains on them with the same next-token machinery — now copying the shape of a good reply: direct, on-task, helpful. Almost overnight it stops rambling and starts answering.</p>
      <p><strong>Reward model:</strong> demonstrations can't cover everything, so people are shown <em>pairs</em> of answers and pick the better one. Thousands of those choices train a separate <strong>judge</strong> that can then score any answer the way people tended to.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Practice toward what people prefer</h3>
      <p><strong>RL fine-tuning:</strong> now the model practises on its own. It writes an answer, the judge grades it, and the model is steered toward whatever scores higher — many attempts, each one reinforced in proportion to its reward. (<em>RL</em>, reinforcement learning, just means learning from that reward signal instead of fixed examples.)</p>
      <p>It is the same network all the way through: pretraining poured in the knowledge, post-training drew out the helpfulness. Neither half works alone — a base model knows but won't cooperate; alignment with nothing underneath has nothing to say.</p>
      <div class="postcard">Pretraining makes it <strong>know</strong>. Alignment makes it <strong>helpful</strong>. Together, that's ChatGPT.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF</a>
        <a class="deepdive" data-route="/inference">next: Inference →</a>
      </div>`,
  },
]

// per-beat stage direction
const CFG = [
  { cam: [0, 0.2, 9.5, 0, 0.1, 0], vis: { predict: 1, scale: 0, laws: 0, align: 0 }, truth: 0, dials: 0, align: 0 }, // 0 guess
  { cam: [0, 0.2, 9.0, 0, 0.1, 0], vis: { predict: 1, scale: 0, laws: 0, align: 0 }, truth: 1, dials: 0, align: 0 }, // 1 truth + loss
  { cam: [0, 0.4, 14.5, 0, 0, -2], vis: { predict: 0, scale: 1, laws: 0, align: 0 }, truth: 1, dials: 0, align: 0 }, // 2 scale
  { cam: [0.4, 0.2, 9.6, 0.4, -0.2, 0], vis: { predict: 0, scale: 0.18, laws: 1, align: 0 }, truth: 1, dials: 1, align: 0 }, // 3 laws
  { cam: [-0.6, 0.3, 9.2, -0.4, 0.1, 0], vis: { predict: 0, scale: 0, laws: 0, align: 1 }, truth: 1, dials: 0, align: 0 }, // 4 base
  { cam: [0.5, 0.4, 9.0, 0.6, 0.1, 0], vis: { predict: 0, scale: 0, laws: 0, align: 1 }, truth: 1, dials: 0, align: 0.55 }, // 5 SFT+RM
  { cam: [0.7, 0.5, 9.4, 0.8, 0.2, 0], vis: { predict: 0, scale: 0, laws: 0, align: 1 }, truth: 1, dials: 0, align: 1 }, // 6 RL
]

const BLOOM = [
  [0.95, 0.5, 0.78], [1.05, 0.55, 0.72], [1.2, 0.6, 0.66], [0.95, 0.5, 0.78],
  [0.95, 0.5, 0.78], [1.0, 0.55, 0.74], [1.15, 0.6, 0.66],
]

export default class Pretraining extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(...BLOOM[0])
    this.addAmbientField(300, 70)
    this.addLights({ rim: 0xec4899 })
    this.camera.position.set(0, 0.2, 9.5)
    this.lookTarget = new THREE.Vector3(0, 0.1, 0)
    this.alignDir = new THREE.Vector3(1, 0.35, 0.05).normalize()
    this.alignColor = new THREE.Color(palette.cyan)

    this._buildCore()
    this._buildPredict()
    this._buildScale()
    this._buildLaws()
    this._buildAlign()

    // damped scalars
    this.vis = { ...CFG[0].vis }
    this.visT = CFG[0].vis
    this.truth = 0
    this.truthT = 0
    this.dials = 0
    this.dialsT = 0
    this.align = 0
    this.alignT = 0
    this._coreLevel = 0.9
    this._lossShown = -1
    this._counter = 1
    this._counterT = 1
    this._counterStr = ''
  }

  // --- core: the model — a bright core wrapped in a slim tower of layer rings ---
  _buildCore() {
    this.core = new GlowNode({ color: palette.magenta, radius: 0.5, halo: 1.3, glow: 1.5 })
    this.core.position.set(0, CORE_Y, 0)
    this.add(this.core)
    this.tower = new THREE.Group()
    this.tower.position.y = CORE_Y
    this._towerMats = []
    const RINGS = 6
    for (let i = 0; i < RINGS; i++) {
      const p = i / (RINGS - 1)
      const geo = new THREE.TorusGeometry(lerp(1.05, 0.55, p), 0.03, 8, 52)
      const mat = glowBasic(i % 2 ? palette.magenta : palette.violet, 0.45)
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.x = Math.PI / 2
      ring.position.y = lerp(-1.1, 1.1, p)
      this.tower.add(ring)
      this._towerMats.push(mat)
    }
    this.add(this.tower)
  }

  // --- predict: prompt strip + blank + distribution + loss readout (beats 0,1) --
  _buildPredict() {
    this.predict = new THREE.Group()
    this.add(this.predict)

    // prompt token tiles
    this.stripTiles = []
    const n = PROMPT.length
    const span = (n) * 1.0
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + i * 1.0
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.12), glowBasic(seriesColor(i), 0.85))
      m.position.set(x, STRIP_Y, 0)
      this.predict.add(m)
      this.stripTiles.push(m)
      this.label(PROMPT[i], { pill: true, position: new THREE.Vector3(x, STRIP_Y, 0), opacity: 0 })._predict = true
    }
    // the blank (then truth)
    this.blankX = -span / 2 + n * 1.0
    this.blank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.12), glowBasic(palette.amber, 0.9))
    this.blank.position.set(this.blankX, STRIP_Y, 0)
    this.predict.add(this.blank)
    this.blankLabel = this.label('▢', { pill: true, position: new THREE.Vector3(this.blankX, STRIP_Y, 0), opacity: 0 })
    this.blankLabel._predict = true

    // feed edges strip → core
    this.feed = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0.4, flowSize: 0.14 })
    for (const t of this.stripTiles) this.feed.addEdge(t.position, new THREE.Vector3(0, CORE_Y - 0.5, 0), palette.cyan, 0.8)
    this.feed.build()
    this.predict.add(this.feed)

    // next-token distribution
    this.bars = new BarField({ count: CANDS.length, width: 0.34, gap: 0.16, maxHeight: 2.4, color: palette.magenta })
    this.bars.position.set(0, BAR_Y, 0)
    this.predict.add(this.bars)
    this.bars.setValues(GUESS, { highlight: -1 })
    this.candLabels = CANDS.map((w, i) =>
      this.label(w, { pill: true, position: new THREE.Vector3(this.bars.position.x + this.bars.bars[i].position.x, BAR_Y - 0.3, 0), opacity: 0 }),
    )
    this.candLabels.forEach((l) => (l._predict = true))
    this.lblPredCap = this.label('p( next token )', { className: 'tiny', position: new THREE.Vector3(0, BAR_Y + 2.7, 0), opacity: 0 })
    this.lblLoss = this.label('loss high', { className: 'tiny', position: new THREE.Vector3(2.7, BAR_Y + 2.2, 0), opacity: 0 })
  }

  // --- scale: an ocean of text (instanced lines) + inflow + a token counter -----
  _buildScale() {
    this.scaleG = new THREE.Group()
    this.add(this.scaleG)

    // a vast receding field of short "text lines"
    const COUNT = this.reduced ? 240 : 760
    const geo = new THREE.BoxGeometry(0.5, 0.035, 0.035)
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.cyan), transparent: true, opacity: 0.5, blending: blend(), toneMapped: false, depthWrite: false })
    this.ocean = new THREE.InstancedMesh(geo, mat, COUNT)
    this.ocean.frustumCulled = false
    const m4 = new THREE.Matrix4()
    const col = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      const row = i % 22
      const band = Math.floor(i / 22)
      const x = -7 + (band % 6) * 2.4 + (Math.random() - 0.5) * 0.5
      const y = 4.2 - row * 0.42 + (Math.random() - 0.5) * 0.2
      const z = -3 - Math.floor(band / 6) * 3.2 - Math.random() * 1.5
      m4.makeTranslation(x, y, z)
      this.ocean.setMatrixAt(i, m4)
      col.set(Math.random() < 0.5 ? palette.cyan : palette.violet)
      this.ocean.setColorAt(i, col)
    }
    this.ocean.instanceMatrix.needsUpdate = true
    this.scaleG.add(this.ocean)

    // inflow streamers toward the core
    const SC = this.reduced ? 200 : 560
    this.streamN = SC
    this._sDir = []
    this._sLen = new Float32Array(SC)
    this._sSpd = new Float32Array(SC)
    const pos = new Float32Array(SC * 3)
    const sc = new Float32Array(SC * 3)
    for (let i = 0; i < SC; i++) {
      const d = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 2 - 0.4).normalize()
      this._sDir.push(d)
      const l = 1 + Math.random() * 11
      this._sLen[i] = l
      this._sSpd[i] = 3 + Math.random() * 3
      pos.set([d.x * l, d.y * l, d.z * l], i * 3)
      _tmpC.set(Math.random() < 0.5 ? palette.cyan : palette.amber)
      sc.set([_tmpC.r, _tmpC.g, _tmpC.b], i * 3)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3))
    this.streams = new THREE.Points(sg, additivePoints(null, 0.14, 0.9, true))
    this.streams.frustumCulled = false
    this.scaleG.add(this.streams)
    this._sPos = pos
    this._sGeo = sg

    this.lblCounter = this.label('tokens seen', { position: new THREE.Vector3(0, 3.4, 0), opacity: 0 })
  }

  // --- laws: a falling loss curve driven by three dials (data/compute/params) ---
  _buildLaws() {
    this.lawsG = new THREE.Group()
    this.lawsG.position.set(0, 0.2, 0)
    this.add(this.lawsG)
    const X0 = -3.4, X1 = 1.2, HI = 2.0, LO = -1.3
    this._lawX0 = X0; this._lawX1 = X1; this._lawHI = HI; this._lawLO = LO
    const M = 120
    this.lawM = M
    const lp = new Float32Array(M * 3)
    for (let i = 0; i < M; i++) {
      const p = i / (M - 1)
      lp.set([lerp(X0, X1, p), this._lossY(p, 1), 0], i * 3)
    }
    this.lawGeo = new THREE.BufferGeometry()
    this.lawGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    this.lawGeo.setDrawRange(0, 2)
    this.lawMat = additiveLine(palette.magenta, 0.95)
    this.lawsG.add(new THREE.Line(this.lawGeo, this.lawMat))
    this._lawLp = lp

    this.lawHead = new GlowNode({ color: palette.amber, radius: 0.12, halo: 1.0, glow: 1.6 })
    this.lawsG.add(this.lawHead)

    this.lawAxisMat = additiveLine(palette.muted, 0.3)
    const ag = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(X0, HI + 0.2, 0), new THREE.Vector3(X0, LO - 0.2, 0),
      new THREE.Vector3(X0, LO - 0.2, 0), new THREE.Vector3(X1 + 1.6, LO - 0.2, 0),
    ])
    this.lawsG.add(new THREE.LineSegments(ag, this.lawAxisMat))

    const defs = [{ c: palette.cyan, n: 'data' }, { c: palette.amber, n: 'compute' }, { c: palette.violet, n: 'params' }]
    this.dialBars = []
    this._dialMats = []
    defs.forEach((d, i) => {
      const x = 2.1 + i * 0.8
      const mat = glowBasic(d.c, 0.88)
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1, 0.46), mat)
      m.position.set(x, LO - 0.2, 0)
      m.scale.y = 0.001
      this.lawsG.add(m)
      this.dialBars.push({ mesh: m, h: 1.1 + i * 0.7, baseY: LO - 0.2 })
      this._dialMats.push(mat)
      this.label(d.n, { className: 'tiny', position: new THREE.Vector3(x, LO - 0.2, 0).add(this.lawsG.position), offset: [0, 16], opacity: 0 })._laws = true
    })
    this.lblLossAxis = this.label('loss', { className: 'tiny muted', position: new THREE.Vector3(X0 - 0.1, HI, 0).add(this.lawsG.position), offset: [-6, 0], opacity: 0 })
    this.lblCompAxis = this.label('data · compute · params →', { className: 'tiny muted', position: new THREE.Vector3(-0.6, LO - 0.2, 0).add(this.lawsG.position), offset: [0, 20], opacity: 0 })
  }

  _lossY(p, reach) {
    // exponential decay; "reach" (0..1, from dials) pulls the tail further down
    const HI = this._lawHI, LO = this._lawLO
    const floor = lerp(HI - (HI - LO) * 0.45, LO, reach)
    return floor + (HI - floor) * Math.exp(-3.2 * p)
  }

  // --- align: base model rambles → SFT/RM → RL converges to "preferred" --------
  _buildAlign() {
    this.alignG = new THREE.Group()
    this.add(this.alignG)

    // target zone: "helpful answers"
    this.target = new GlowNode({ color: palette.cyan, radius: 0.34, halo: 1.4, glow: 1.6 })
    this.target.position.copy(this.alignDir.clone().multiplyScalar(4.2))
    this.alignG.add(this.target)
    this.lblTarget = this.label('helpful answers', { className: 'tiny', position: this.target.position.clone().add(new THREE.Vector3(0, 0.6, 0)), opacity: 0 })
    this.lblTarget._align = true

    // candidate outputs: nodes that interpolate scatter(base) → aligned(target)
    this.cands = []
    const N = this.reduced ? 9 : 15
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2
      const v = Math.acos(2 * Math.random() - 1)
      const r = 1.5 + Math.random() * 1.5
      const sb = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v) * 0.7, Math.sin(v) * Math.sin(u)).multiplyScalar(r)
      const at = this.alignDir.clone().multiplyScalar(lerp(1.2, 4.0, i / (N - 1))).add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.5, 0))
      const node = new GlowNode({ color: seriesColor(i), radius: 0.12, halo: 0.8, glow: 1.3 })
      node.visible = false
      this.alignG.add(node)
      this.cands.push({ node, sb, at, sc: new THREE.Color(seriesColor(i)), phase: Math.random() * 6.28, sp: 0.8 + Math.random() })
    }

    // gold demonstration arrows (SFT): a few straight lines core→target zone
    this.gold = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.7, baseOpacity: 0, flowSize: 0.13 })
    this.goldIdx = []
    for (let i = 0; i < 3; i++) {
      const end = this.alignDir.clone().multiplyScalar(3.6).add(new THREE.Vector3(0, (i - 1) * 0.7, 0))
      this.goldIdx.push(this.gold.addEdge(new THREE.Vector3(0, 0, 0), end, palette.lime, 0))
    }
    this.gold.build()
    this.alignG.add(this.gold)

    // the judge / reward model (RM): a second core that scores
    this.judge = new GlowNode({ color: palette.amber, radius: 0.26, halo: 1.1, glow: 1.5 })
    this.judge.position.set(this.alignDir.x * 2.4 + 0.4, -2.0, 0)
    this.judge.visible = false
    this.alignG.add(this.judge)
    this.lblJudge = this.label('reward model · the judge', { className: 'tiny', position: this.judge.position.clone().add(new THREE.Vector3(0, -0.55, 0)), opacity: 0 })
    this.lblJudge._align = true

    // preferred-direction arrow (RL)
    this.arrow = new THREE.Group()
    const tip = this.alignDir.clone().multiplyScalar(4.0)
    this.arrowMat = additiveLine(palette.magenta, 0.9)
    this.arrow.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), tip]), this.arrowMat))
    this.arrowHeadMat = glowBasic(palette.magenta, 0.95)
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 16), this.arrowHeadMat)
    head.position.copy(tip)
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.alignDir)
    this.arrow.add(head)
    this.arrow.visible = false
    this.alignG.add(this.arrow)

    this.lblBase = this.label('base model · continues, won\'t answer', { className: 'tiny', position: new THREE.Vector3(0, 1.9, 0), opacity: 0 })
    this.lblBase._align = true
    this.lblPref = this.label('preferred behaviour', { className: 'tiny', position: tip.clone().add(new THREE.Vector3(0.2, 0.5, 0)), opacity: 0 })
    this.lblPref._align = true
  }

  // --- beats -----------------------------------------------------------------
  onStep(i) {
    const c = CFG[i] || CFG[0]
    this.setBloom(...(BLOOM[i] || BLOOM[0]))
    const [px, py, pz, lx, ly, lz] = c.cam
    const dur = this.reduced ? 0 : 1.5
    gsap.to(this.camera.position, { x: px, y: py, z: pz, duration: dur, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: lz, duration: dur, ease: 'power3.inOut', overwrite: true })
    this.visT = c.vis
    this.truthT = c.truth
    this.dialsT = c.dials
    this.alignT = c.align

    // distribution: guess (beat 0) vs trained (beat 1+)
    if (i === 0) this.bars.setTargets(GUESS, { highlight: -1 })
    else this.bars.setTargets(TRAINED, { highlight: TRUTH })

    // token counter target for the scale beat
    this._counterT = i >= 2 ? 1e12 : 1
    if (i === 2 && !this.reduced) {
      this._counter = 1
      gsap.killTweensOf(this)
      gsap.to(this, { _counter: 1e12, duration: 3.2, ease: 'power2.out' })
    } else if (this.reduced) {
      this._counter = this._counterT
    }
  }

  // --- per-frame -------------------------------------------------------------
  update(dt, t) {
    const rd = this.reduced
    const k = (cur, tgt, l) => (rd ? tgt : damp(cur, tgt, l, dt))
    for (const key of VIS_KEYS) this.vis[key] = k(this.vis[key], this.visT[key], 4)
    this.truth = k(this.truth, this.truthT, 4)
    this.dials = k(this.dials, this.dialsT, 3.5)
    this.align = k(this.align, this.alignT, 2.6)

    this.camera.lookAt(this.lookTarget)
    if (!rd) this.tower.rotation.y += dt * 0.16

    this._updateCore(dt, t, rd)
    this._updatePredict(dt, t)
    this._updateScale(dt, t)
    this._updateLaws()
    this._updateAlign(dt, t, rd)
    this._updateLabels()
  }

  _updateCore(dt, t, rd) {
    const unstable = this.step === 4 ? 1 : 0 // base model = a touch jittery
    this._coreLevel = rd ? 0.9 : damp(this._coreLevel, 0.92 - 0.25 * unstable, 3, dt)
    const extra = rd ? 0 : Math.sin(t * 1.5) * 0.06 + unstable * (Math.sin(t * 17) * 0.5 + 0.5) * 0.2
    this.core.setLevel(clamp01(this._coreLevel + extra))
    const o = 0.45 * clamp01(this.vis.predict + this.vis.laws * 0.4 + this.vis.align + this.vis.scale * 0.4)
    for (const m of this._towerMats) m.opacity = Math.max(0.12, o)
  }

  _updatePredict(dt, t) {
    const v = this.vis.predict
    this.predict.visible = v > 0.02
    if (v <= 0.02) return
    for (const m of this.stripTiles) m.material.opacity = 0.85 * v
    this.bars.lerp(dt, { hot: palette.amber })
    for (const b of this.bars.bars) b.material.opacity *= clamp01(v)
    this.feed.setLineOpacity(0.4 * v)
    this.feed.setFlowOpacity(0.6 * v)
    this.feed.update(dt)
    // blank → truth reveal
    const reveal = this.truth
    this.blank.material.color.set(reveal > 0.5 ? palette.lime : palette.amber)
    this.blank.material.opacity = (0.5 + 0.5 * Math.abs(Math.sin(t * 3))) * v
    this.blankLabel.setText(reveal > 0.5 ? 'mat' : '▢')
    this.lblLoss.setText(this.L(reveal > 0.5 ? 'loss ↓ getting it right' : 'loss high · just guessing'))
  }

  _updateScale(dt, t) {
    const v = this.vis.scale
    this.scaleG.visible = v > 0.02
    if (v <= 0.02) return
    this.ocean.material.opacity = 0.5 * v
    if (this.ocean.instanceColor) this.ocean.instanceColor.needsUpdate = false
    // inflow
    if (!this.reduced) {
      const pos = this._sPos
      for (let i = 0; i < this.streamN; i++) {
        let l = this._sLen[i] - this._sSpd[i] * dt
        if (l <= 0.6) l = 6 + Math.random() * 6
        this._sLen[i] = l
        const d = this._sDir[i]
        pos[i * 3] = d.x * l
        pos[i * 3 + 1] = d.y * l
        pos[i * 3 + 2] = d.z * l
      }
      this._sGeo.attributes.position.needsUpdate = true
    }
    this.streams.material.opacity = 0.9 * v
    // counter
    const c = this._counter
    const pre = this.L('tokens seen') + ': '
    let s
    if (c >= 1e12) s = pre + '~1 ' + this.L('trillion')
    else if (c >= 1e9) s = pre + (c / 1e9).toFixed(1).replace(/\.0$/, '') + ' ' + this.L('billion')
    else if (c >= 1e6) s = pre + (c / 1e6).toFixed(1).replace(/\.0$/, '') + ' ' + this.L('million')
    else if (c >= 1e3) s = pre + Math.round(c / 1e3) + ',000'
    else s = pre + Math.round(c)
    if (s !== this._counterStr) { this._counterStr = s; this.lblCounter.setText(s) }
  }

  _updateLaws() {
    const v = this.vis.laws
    this.lawsG.visible = v > 0.02
    if (v <= 0.02) return
    const reach = clamp01(this.dials)
    // redraw curve with current reach
    const M = this.lawM
    for (let i = 0; i < M; i++) this._lawLp[i * 3 + 1] = this._lossY(i / (M - 1), reach)
    this.lawGeo.attributes.position.needsUpdate = true
    const count = Math.max(2, Math.floor(reach * (M - 1)) + 1)
    this.lawGeo.setDrawRange(0, count)
    const hi = count - 1
    this.lawHead.position.set(this._lawLp[hi * 3], this._lawLp[hi * 3 + 1], 0)
    this.lawHead.setLevel(0.85 * v)
    this.lawMat.opacity = 0.95 * v
    this.lawAxisMat.opacity = 0.3 * v
    for (let i = 0; i < this.dialBars.length; i++) {
      const b = this.dialBars[i]
      const h = Math.max(0.001, b.h * reach)
      b.mesh.scale.y = h
      b.mesh.position.y = b.baseY + h / 2
      this._dialMats[i].opacity = 0.88 * v
    }
  }

  _updateAlign(dt, t, rd) {
    const v = this.vis.align
    this.alignG.visible = v > 0.02
    if (v <= 0.02) return
    const a = clamp01(this.align)
    this.target.setLevel((0.5 + 0.5 * a) * v)
    this.target.visible = v > 0.02

    for (const cd of this.cands) {
      const amp = 0.3 * (1 - a)
      if (!rd && amp > 0.001) {
        _tmp.set(
          cd.sb.x + Math.sin(t * cd.sp + cd.phase) * amp,
          cd.sb.y + Math.cos(t * cd.sp * 1.3 + cd.phase) * amp,
          cd.sb.z + Math.sin(t * cd.sp * 0.7 + cd.phase) * amp,
        )
      } else _tmp.copy(cd.sb)
      _tmp.lerp(cd.at, a)
      cd.node.position.copy(_tmp)
      _tmpC.copy(cd.sc).lerp(this.alignColor, a)
      cd.node.setColor(_tmpC)
      cd.node.setLevel(clamp01((a > 0.5 ? 0.7 : 0.4) + Math.sin(t * cd.sp + cd.phase) * 0.18) * v)
      cd.node.visible = true
    }

    // gold demos appear with SFT (align ~0.3..0.8)
    const goldW = clamp01((a - 0.2) / 0.4) * (1 - clamp01((a - 0.85) / 0.15) * 0.4)
    for (const idx of this.goldIdx) this.gold.setWeight(idx, goldW)
    this.gold.update(dt)

    // judge (RM) appears mid (align >= ~0.45)
    const jv = clamp01((a - 0.4) / 0.2) * v
    this.judge.visible = jv > 0.02
    this.judge.setLevel((0.55 + 0.25 * Math.sin(t * 4)) * jv)

    // arrow (RL) at full align
    const arw = clamp01((a - 0.7) / 0.3)
    this.arrow.visible = arw > 0.02
    this.arrowMat.opacity = 0.9 * arw * v
    this.arrowHeadMat.opacity = 0.95 * arw * v
  }

  _updateLabels() {
    const a = clamp01(this.align)
    // flag-driven groups (prompt words, blank, candidates; dial names)
    for (const l of this._labels) {
      if (l._predict) l.setOpacity(this.vis.predict)
      else if (l._laws) l.setOpacity(this.vis.laws)
    }
    // predict extras
    this.lblPredCap.setOpacity(this.vis.predict)
    this.lblLoss.setOpacity(this.vis.predict * this.truth)
    // scale + laws axes
    this.lblCounter.setOpacity(this.vis.scale)
    this.lblLossAxis.setOpacity(0.7 * this.vis.laws)
    this.lblCompAxis.setOpacity(0.7 * this.vis.laws)
    // align (state-dependent): base fades as outputs align; target/judge/arrow rise
    this.lblBase.setOpacity(this.vis.align * (1 - a))
    this.lblTarget.setOpacity(this.vis.align * a)
    this.lblPref.setOpacity(this.vis.align * clamp01((a - 0.7) / 0.3))
    this.lblJudge.setOpacity(this.vis.align * clamp01((a - 0.4) / 0.2))
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this)
    super.dispose()
  }
}
