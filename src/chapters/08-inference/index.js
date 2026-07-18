import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { BarField } from '../../lib/BarField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { glowBasic, additiveLine } from '../../lib/materials.js'
import { TOKENS } from '../../lib/example.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp, clamp01, remap, lerp, smoothstep } from '../../theme/motion.js'

// Chapter 08 — Inference. The reply is written one token at a time by a loop.
//   Beats 0–4 hold a fixed prompt and study one distribution: prefill fills the
//   K/V columns in a burst, logits→softmax builds the bars, temperature reshapes
//   them with the real softmax(z/T) math, and top-p sweeps a cut line up the tail.
//   Beats 5–6 run the autoregressive loop live (sample → append → cache → repeat)
//   with the O(n²)-vs-O(n) cost meter. Beat 7 races a draft model against the
//   verifier (speculative decoding); beat 8 shows serving reality — one GPU, four
//   users' KV stripes sharing a memory box, weights quantizing 16→8→4-bit.
const PROMPT_LEN = 5 // "The cat sat on the"
const EXTRA = ['and', 'dozed', 'by', 'the', 'fire', 'for', 'hours']
const WORDS_FULL = [...TOKENS, ...EXTRA] // 17 tokens; index 5 ("mat") is the first prediction

// --- the next-token distribution shown in beats 1–4 -----------------------------
const BAR_COUNT = 12
const BAR_WIDTH = 0.3
const BAR_GAP = 0.16
const BAR_MAXH = 3.0
const BAR_BASE_Y = 1.5

// candidate words under a few bars; index 4 ("mat") is the clear peak
const CANDIDATES = ['floor', 'rug', 'sofa', 'bed', 'mat', 'lap', 'chair', 'sill', 'step', 'box', 'roof', 'grass']
const LABELLED = [1, 2, 4, 5, 8]
const BEAT1_PEAK = 4
// relative probabilities p_i (softmax output at T = 1). Temperature re-shaping
// uses the exact identity softmax(z/T)_i ∝ p_i^(1/T), so the bars are real math.
const BEAT1 = [0.12, 0.3, 0.55, 0.4, 1.0, 0.62, 0.22, 0.1, 0.18, 0.08, 0.06, 0.14]
const P_SUM = BEAT1.reduce((a, b) => a + b, 0)
const P_ORDER = BEAT1.map((_, i) => i).sort((a, b) => BEAT1[b] - BEAT1[a]) // sorted desc
const T_STOPS = [0.2, 1.0, 1.6] // the three labeled temperature stops

const CORE_Y = 0
const RIBBON_Y = -3.25
const KV_K_Y = -2.62 // key cell, just above the token tile
const KV_V_Y = -2.4 // value cell, stacked above the key
const KV_STORED = 0.42 // resting brightness of a cached (frozen) cell
const MAX_CELLS = 22

// --- speculative decoding sub-scene (own neighborhood, camera flies down) -------
const SPEC_Y = -13 // group world y
const SPEC_LANE_Y = -1.2 // token lane, local
const SPEC_STAMP_Y = -0.58 // ✓/✗ stamps, local
const SPEC_CELLS = 18
const SPEC_F0 = 4 // tokens already accepted when the beat starts
const SPEC_ROUNDS = [
  { k: 4, acc: 3 },
  { k: 5, acc: 5 }, // whole draft accepted
  { k: 4, acc: 1 },
  { k: 5, acc: 2 },
  { k: 4, acc: 4 },
]

// --- serving sub-scene -----------------------------------------------------------
const SERV_Y = -26
const SERV_BOX_X = 2.9 // memory box center
const SERV_BOX_W = 2.2
const SERV_BOX_H = 4.2
const SERV_BOT = -1.95 // inner floor of the memory box
const SERV_CAP = 3.9 // usable height = the RAM budget
const SERV_RATE = [0.105, 0.055, 0.045, 0.085] // per-user KV growth (A is the long chat)
const SERV_H0 = [0.45, 0.28, 0.22, 0]
const SERV_LOOP = 16 // seconds per 16→8→4-bit cycle

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 08 · how it answers you</span>
      <h2>Inference</h2>
      <p class="lead">Training is over and the weights are frozen for good. <strong>Inference</strong> is the finished model put to work — what runs every time you hit send. Underneath, it is nothing but a loop that writes the reply <strong>one token at a time</strong>.</p>
      <p>At the bottom sits your <span class="tok">prompt</span>, chopped into tokens. It flows up into the model core, whose only job is to score which token should come next. Everything in this chapter — every dial, every speed trick, every serving system — exists to run that little loop well.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Prefill — read it all at once</h3>
      <p>Before writing a word, the model processes your <em>entire</em> prompt in a single parallel pass — every token at the same time. This is <strong>prefill</strong>, and as it runs, each token leaves behind a little bundle of computed numbers parked just above it: its <strong>K</strong> and <strong>V</strong> — the keys and values from the attention chapter.</p>
      <p>This is why a model's speed is <em>two</em> different numbers, and you can feel both. The pause before the first word is the <span class="tok">time to first token</span> — the prefill bill, paid up front, longer for longer prompts. The pace of everything after it is <span class="tok">tokens per second</span> — the rhythm of the decode loop, which writes strictly one token at a time.</p>
      <p class="aside">Prefill is compute-bound: one big, matrix-heavy pass over the whole prompt. Decode turns out to be bound by something else entirely — held for the end of the chapter.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Logits → softmax</h3>
      <p>The core does not pick a word. It emits one raw score — a <strong>logit</strong> — for every token in its vocabulary, tens of thousands of them. <strong>Softmax</strong> then squashes those scores into clean probabilities that add up to 1: a full <strong>distribution</strong> over what comes next.</p>
      <p>After <span class="tok">…&nbsp;sat on the</span>, one bar towers over the rest — <span class="tok">mat</span> — yet almost every other word still keeps a sliver of a chance.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Temperature — one dial, three personalities</h3>
      <p>Before drawing a token, the model may reshape those odds. Every logit is divided by the <strong>temperature</strong> T before the softmax — same scores, rescaled. Watch the same twelve candidates morph as the dial sweeps through three stops.</p>
      <p>At <span class="tok">T = 0.2</span> the curve collapses toward a single spike on the top token: deterministic, safe, robotic — <em>always</em> the safe word. At <span class="tok">T = 1</span> it reports the model's honest odds. At <span class="tok">T = 1.6</span> the curve flattens toward uniform: adventurous at first, incoherent past that — anything goes.</p>
      <p class="aside">The math: softmax(z/T). Small T stretches the gaps between logits, so the winner hogs the mass; large T shrinks every gap toward zero and the odds even out. These bars are computed with the real formula, not a cartoon.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Top-p — cut off the nonsense tail</h3>
      <p>Temperature reshapes the whole curve but keeps every token alive — including the thousands of barely-possible ones that, one draw in a few hundred, derail a sentence. <strong>Top-p</strong> (<strong>nucleus sampling</strong>) takes a knife instead: sort the tokens by probability, keep the <em>smallest set</em> whose probabilities sum to p, and delete the rest. The survivors are renormalized to sum to 1 — their ratios untouched.</p>
      <p>Watch the cut line climb as p tightens: the tail dims out, and the draw happens only inside the <strong>nucleus</strong>. With <span class="tok">top-p 0.9</span> you still get variety among plausible words — the nonsense simply isn't on the menu.</p>
      <p class="aside">Real APIs stack both dials, and more: top-k keeps a fixed count, min-p scales the cutoff with the leader's confidence. The sampling deep dive at the end walks the whole menu, beam search included.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Append, then feed back</h3>
      <p>The sampled token drops down and joins the sequence — and at once becomes part of the input for the next prediction. Watch the loop close: <em>score → sample → append → score…</em> a sentence writing itself.</p>
      <p>Each new token does only a sliver of fresh work: it computes its own K and V, then attends over everything already cached. The loop runs until the model draws a special <strong>stop</strong> token — its way of saying "I'm done."</p>`,
  },
  {
    side: 'left',
    html: `<h3>The KV cache — why it stays fast</h3>
      <p>Here is the trick that makes this practical. Once a token's K and V are computed they never change — so the model <strong>keeps them</strong> instead of recomputing. That stored pile is the <strong>KV cache</strong>, and the cells stacked above each token <em>are</em> that cache.</p>
      <p>Without it, every new token would re-process the whole passage from scratch, work piling up as the square of the length — <span class="tok">O(n²)</span>. With it, each step adds just one column and reads the rest — roughly flat, <span class="tok">O(n) per token</span>. The meter on the right shows the gap widening.</p>
      <p class="aside">The cache is also why long chats cost more memory: it grows with every token, and the model reads all of it on every step.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Speculative decoding — sprint, then check</h3>
      <p>Decode has an awkward shape: each new token costs one full pass through the whole model, and tokens can only be written in order. But <em>checking</em> is cheap — handed k proposed tokens, the big model can score all of them in a single parallel pass, exactly like prefill.</p>
      <p>So a small, fast <strong>draft model</strong> sprints ahead, guessing a few tokens; the big model verifies the whole chain at once. Guesses that match what it would have said are accepted instantly — <span class="tok">✓ ✓ ✓</span> — and the first miss <span class="tok">✗</span> is replaced with the big model's own choice before the sprint restarts. Easy stretches ("…sat on the mat") land in bursts; hard words fall back to the heavyweight.</p>
      <p class="aside">With the right accept/reject rule — a form of rejection sampling — the output distribution is <em>provably identical</em> to the big model sampling alone. A 2–3× wall-clock speedup bought with cheap parallel verification: one of inference's rare free lunches.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Serving reality — you share the machine</h3>
      <p>Your request does not get a GPU to itself. The server loads the weights once and <strong>batches</strong> many users' loops together, interleaving one decode step per user per pass — that is what keeps the chip busy and the price per token sane.</p>
      <p>The scarce resource is not compute but <strong>memory</strong>: every conversation's KV cache claims GPU RAM and grows with every token. Long chats crowd the box; when it fills, new requests wait and idle caches get evicted. <strong>Quantization</strong> shrinks the other tenant — weights stored at 8 or 4 bits instead of 16 cost a sliver of quality and free up room for more users.</p>
      <p class="aside">Production servers allocate the cache in fixed-size pages (vLLM-style paged attention) — virtual memory for KV, so fragmentation never strands the box. And decode itself is memory-bandwidth-bound: producing each token means streaming <em>all</em> the weights through the chip once. That, not arithmetic, sets your tokens per second.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The loop</h3>
      <div class="postcard">Inference is a loop: prefill the prompt, score the vocabulary, shape the odds (temperature, top-p), sample, append, repeat — while the KV cache keeps each step cheap, draft models sprint ahead of the heavyweight, and one shared GPU juggles everyone's caches at once. Every reply you have ever received is this loop, running.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/sampling">sampling</a>
        <a class="deepdive" data-route="/retrieval">next: Retrieval →</a>
      </div>`,
  },
]

// camera per beat: [x, y, z, lookX, lookY]
const CAM = [
  [0, 0.3, 13.5, 0, -0.2], // 0 overview
  [0, -0.9, 13.3, 0, -1.9], // 1 prefill — tilt to prompt + KV
  [0, 1.0, 11.8, 0, 1.3], // 2 logits — lean into bars
  [0, 1.1, 11.5, 0, 1.4], // 3 temperature
  [0, 1.1, 11.3, 0, 1.4], // 4 top-p — slightly closer on the cut
  [0, -0.2, 13.8, 0, -0.6], // 5 append — whole loop
  [0, -0.7, 13.0, 0, -1.5], // 6 KV cache — columns + meter
  [0, SPEC_Y + 0.35, 12.6, 0, SPEC_Y + 0.05], // 7 speculative decoding
  [0, SERV_Y + 0.2, 13.4, 0, SERV_Y], // 8 serving
  [0, 0.2, 14.4, 0, -0.3], // 9 the loop
]

export default class Inference extends Chapter {
  init() {
    this.setBloom(0.9, 0.45, 0.8)
    this.addAmbientField(340, 70)
    this.camera.position.set(0, 0.3, 13.5)
    this.lookTarget = new THREE.Vector3(0, -0.2, 0)

    // generation state
    this._genMode = false
    this._genTimer = 0
    this._genInterval = 1.05
    this.filled = PROMPT_LEN
    this._corePulse = 0
    this._tempStr = ''
    this._toppStr = ''
    this._costGrow = 0
    this._costGrowT = 0
    this._costVis = 0
    this._costVisT = 0
    this._cutVis = 0
    this._cutVisT = 0
    this._cutOn = false
    this._cutY = BAR_BASE_Y
    this._shaped = new Array(BAR_COUNT).fill(0)

    // the core — the model, predicting the next token
    this.core = new GlowNode({ color: palette.lime, radius: 0.45, halo: 1.0, glow: 1.3 })
    this.core.position.set(0, CORE_Y, 0)
    this.core.setLevel(0.55)
    this.add(this.core)

    // distribution over the next token, hovering above the core
    this.barField = new BarField({
      count: BAR_COUNT,
      width: BAR_WIDTH,
      gap: BAR_GAP,
      maxHeight: BAR_MAXH,
      color: palette.lime,
    })
    this.barField.position.set(0, BAR_BASE_Y, 0)
    this.add(this.barField)

    // the token sequence — a sideways-growing ribbon at the bottom
    this.ribbon = new ContextRibbon({ maxCells: MAX_CELLS, cell: 0.42, height: 0.5, gap: 0.06, color: palette.violet })
    this.ribbon.position.set(0, RIBBON_Y, 0)
    this.add(this.ribbon)

    this._buildKV()
    this._buildFlux()
    this._buildCostMeter()
    this._buildMote()
    this._buildCutLine()
    this._buildSpec()
    this._buildServe()

    // --- labels --------------------------------------------------------------
    this.distCaption = this.label('p( next token )', { position: new THREE.Vector3(0, BAR_BASE_Y + BAR_MAXH + 0.55, 0), opacity: 1 })
    this.tempLabel = this.label('temperature', { position: new THREE.Vector3(2.95, BAR_BASE_Y + 2.9, 0), opacity: 0 })
    this.toppLabel = this.label('', { position: new THREE.Vector3(2.95, BAR_BASE_Y + 2.9, 0), opacity: 0 })
    this.cutLabel = this.label('cut', { pill: true, position: new THREE.Vector3(3.3, BAR_BASE_Y + 0.5, 0), opacity: 0 })
    this.candidateLabels = LABELLED.map((idx) => {
      const x = this.barField.position.x + this.barField.bars[idx].position.x
      return this.label(CANDIDATES[idx], { pill: true, position: new THREE.Vector3(x, BAR_BASE_Y - 0.32, 0), opacity: 0 })
    })
    this.kvLabel = this.label('KV cache · keys + values', { className: 'tiny', position: new THREE.Vector3(0, KV_V_Y + 0.5, 0), opacity: 0 })
    this.ribbonName = this.label('prompt', { pill: true, position: new THREE.Vector3(0, RIBBON_Y - 0.72, 0), opacity: 1 })
    this.newestLabel = this.label('', { pill: true, position: new THREE.Vector3(0, RIBBON_Y + 0.62, 0), opacity: 0 }).setVisible(false)
    this.chosenLabel = this.label('', { pill: true, position: new THREE.Vector3(0, BAR_BASE_Y + BAR_MAXH + 0.32, 0), opacity: 0 }).setVisible(false)

    // initial frame so the scene reads before the first scroll step fires
    this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
    this.barField.setTargets(BEAT1, { highlight: -1 })
    this._setEmitWeights(BEAT1)
    this._setKV(0, false) // columns hidden until prefill
  }

  // --- KV cache columns: a key cell + value cell stacked above each token ------
  _buildKV() {
    this.kvGroup = new THREE.Group()
    this.add(this.kvGroup)
    this.kv = []
    const kGeo = new THREE.BoxGeometry(0.2, 0.18, 0.12)
    const vGeo = new THREE.BoxGeometry(0.2, 0.18, 0.12)
    for (let i = 0; i < MAX_CELLS; i++) {
      const x = this.ribbon.worldXOf(i)
      const kMat = glowBasic(palette.cyan, 0.9)
      const vMat = glowBasic(palette.violet, 0.9)
      const k = new THREE.Mesh(kGeo, kMat)
      const v = new THREE.Mesh(vGeo, vMat)
      k.position.set(x, KV_K_Y, 0)
      v.position.set(x, KV_V_Y, 0)
      k.visible = v.visible = false
      this.kvGroup.add(k, v)
      this.kv.push({ k, v, kMat, vMat, level: 0, target: 0, shown: false })
    }
    this._kvShown = 0
  }

  _buildFlux() {
    // context/cache feeds up into the core (cyan); the core emits the distribution
    // up to each bar (lime, brighter where probability is higher)
    this.flux = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.55, baseOpacity: 0.3, flowSize: 0.15 })
    this.feedIdx = []
    for (const fx of [-1.4, 0, 1.4]) {
      this.feedIdx.push(
        this.flux.addEdge(new THREE.Vector3(fx, KV_V_Y + 0.2, 0), new THREE.Vector3(0, CORE_Y - 0.55, 0), palette.cyan, 1),
      )
    }
    this.emitIdx = []
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = this.barField.position.x + this.barField.bars[i].position.x
      this.emitIdx.push(
        this.flux.addEdge(new THREE.Vector3(0, CORE_Y + 0.55, 0), new THREE.Vector3(x, BAR_BASE_Y - 0.05, 0), palette.lime, 0.15),
      )
    }
    this.flux.build()
    this.add(this.flux)
  }

  // two bars contrasting cost per step: recompute (grows ~n) vs cache (flat).
  // Lives on the RIGHT so the KV-cache beat's left-side card never covers it.
  _buildCostMeter() {
    this.costGroup = new THREE.Group()
    this.costGroup.position.set(4.35, -0.4, 0)
    this.add(this.costGroup)
    this.costRecompute = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), glowBasic(palette.rose, 0.9))
    this.costCache = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), glowBasic(palette.lime, 0.9))
    this.costRecompute.position.x = -0.32
    this.costCache.position.x = 0.32
    for (const m of [this.costRecompute, this.costCache]) {
      m.scale.y = 0.001
      m.position.y = 0
      this.costGroup.add(m)
    }
    this.costGroup.visible = false
    this.lblCostR = this.label('recompute O(n²)', { className: 'tiny', position: new THREE.Vector3(4.03, 0.5, 0), offset: [0, -8], opacity: 0 })
    this.lblCostC = this.label('cached O(n)', { className: 'tiny', position: new THREE.Vector3(4.67, -0.7, 0), offset: [0, 12], opacity: 0 })
  }

  // the "sampled token" travelling from the winning bar down into the cache
  _buildMote() {
    this.mote = new GlowNode({ color: palette.hot, radius: 0.16, halo: 1.1, glow: 1.7 })
    this.mote.visible = false
    this.add(this.mote)
  }

  // the top-p nucleus threshold: bars poking above the line survive the cut
  _buildCutLine() {
    this.cutLine = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.024, 0.02), glowBasic(palette.rose, 0.85))
    this.cutLine.position.set(0, BAR_BASE_Y + 0.4, 0.16)
    this.cutLine.visible = false
    this.add(this.cutLine)
  }

  // thin rectangular outline (chip frame, memory box)
  _makeFrame(w, h, x, y) {
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]),
        3,
      ),
    )
    const line = new THREE.LineLoop(g, additiveLine(palette.muted, 0.75))
    line.position.set(x, y, 0)
    return line
  }

  // --- speculative decoding: draft sprints, verifier stamps ---------------------
  _buildSpec() {
    this.spec = new THREE.Group()
    this.spec.position.set(0, SPEC_Y, 0)
    this.add(this.spec)

    // the sequence so far — accepted tokens land here as solid tiles
    this.specRibbon = new ContextRibbon({ maxCells: SPEC_CELLS, cell: 0.42, height: 0.5, gap: 0.06, color: palette.violet })
    this.specRibbon.position.set(0, SPEC_LANE_Y, 0)
    this.spec.add(this.specRibbon)
    this.specRibbon.setFilled(SPEC_F0, { rainbow: true })

    // the two models: small fast drafter, big exact verifier
    this.draftNode = new GlowNode({ color: palette.cyan, radius: 0.24, halo: 0.9, glow: 1.3 })
    this.draftNode.position.set(-3.3, 1.35, 0)
    this.spec.add(this.draftNode)
    this.verifyNode = new GlowNode({ color: palette.violet, radius: 0.58, halo: 1.1, glow: 1.3 })
    this.verifyNode.position.set(3.3, 1.35, 0)
    this.spec.add(this.verifyNode)
    this._draftPulse = 0
    this._verifyPulse = 0

    // ghost tiles = the draft's unverified proposals: hollow outline + faint fill,
    // clearly distinct from the solid accepted tiles they hope to become
    this.specGhosts = []
    const gGeo = new THREE.BoxGeometry(0.42, 0.5, 0.12)
    const eGeo = new THREE.EdgesGeometry(gGeo)
    for (let i = 0; i < 6; i++) {
      const grp = new THREE.Group()
      const fillMat = glowBasic(palette.cyan, 0.14)
      const edgeMat = additiveLine(palette.cyan, 0.95)
      grp.add(new THREE.Mesh(gGeo, fillMat))
      grp.add(new THREE.LineSegments(eGeo, edgeMat))
      grp.position.set(0, SPEC_LANE_Y, 0)
      grp.visible = false
      this.spec.add(grp)
      this.specGhosts.push({ grp, fillMat, edgeMat })
    }

    // one flash plane = the single parallel verify pass over all proposals
    this.specFlash = new THREE.Mesh(new THREE.BoxGeometry(1, 0.72, 0.02), glowBasic(palette.violet, 0.45))
    this.specFlash.material.opacity = 0
    this.specFlash.position.set(0, SPEC_LANE_Y, -0.09)
    this.spec.add(this.specFlash)

    // the token in flight from the draft model to the lane
    this.specMote = new GlowNode({ color: palette.hot, radius: 0.11, halo: 1.0, glow: 1.6 })
    this.specMote.visible = false
    this.spec.add(this.specMote)

    // ✓/✗ stamps (world-space labels; spec group sits at x = 0 so x passes through)
    this.specStamps = []
    for (let i = 0; i < 6; i++) {
      const s = this.label('', { position: new THREE.Vector3(0, SPEC_Y + SPEC_STAMP_Y, 0), opacity: 0 }).setVisible(false)
      s.el.style.fontSize = '1.15rem'
      s.el.style.fontWeight = '700'
      this.specStamps.push(s)
    }

    this.specDraftLbl = this.label('draft model · fast + cheap', { className: 'tiny', position: new THREE.Vector3(-3.3, SPEC_Y + 2.25, 0), opacity: 0 })
    this.specVerifyLbl = this.label('verifier · the full model', { className: 'tiny', position: new THREE.Vector3(3.3, SPEC_Y + 2.35, 0), opacity: 0 })
    this.specLaneLbl = this.label('the reply so far', { pill: true, position: new THREE.Vector3(0, SPEC_Y + SPEC_LANE_Y - 0.75, 0), opacity: 0 })
    this.specStatus = this.label('', { pill: true, position: new THREE.Vector3(0, SPEC_Y + 0.55, 0), opacity: 0 })
    this._specLabels = [this.specDraftLbl, this.specVerifyLbl, this.specLaneLbl, this.specStatus]

    this._specPhase = 'gap'
    this._specT = 0
    this._specRound = 0
    this._specFilled = SPEC_F0
    this._ghostN = 0
  }

  // --- serving: one GPU, shared weights, four users' KV stripes in one box ------
  _buildServe() {
    this.serve = new THREE.Group()
    this.serve.position.set(0, SERV_Y, 0)
    this.add(this.serve)

    this.serve.add(this._makeFrame(SERV_BOX_W, SERV_BOX_H, SERV_BOX_X, 0)) // memory box
    this.serve.add(this._makeFrame(1.5, 1.5, -1.3, 0)) // the chip
    this.chipNode = new GlowNode({ color: palette.lime, radius: 0.4, halo: 1.0, glow: 1.3 })
    this.chipNode.position.set(-1.3, 0, 0)
    this.serve.add(this.chipNode)

    this.userNodes = []
    for (let i = 0; i < 4; i++) {
      const n = new GlowNode({ color: seriesColor(i), radius: 0.19, halo: 0.8, glow: 1.2 })
      n.position.set(-4.0, 1.5 - i, 0)
      n.setLevel(0.4)
      this.serve.add(n)
      this.userNodes.push(n)
    }

    // request traffic: each user feeds the chip; the chip reads/writes the memory box
    this.servFlux = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.7, baseOpacity: 0.35, flowSize: 0.13 })
    this.userEdge = []
    for (let i = 0; i < 4; i++) {
      const y = 1.5 - i
      this.userEdge.push(this.servFlux.addEdge(new THREE.Vector3(-3.75, y, 0), new THREE.Vector3(-2.1, y * 0.22, 0), seriesColor(i), 0.35))
    }
    this.servFlux.addEdge(new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(SERV_BOX_X - SERV_BOX_W / 2, 0, 0), palette.violet, 0.8)
    this.servFlux.build()
    this.serve.add(this.servFlux)

    // tenants of the memory box: the weight slab (violet) + one KV stripe per user
    const slabGeo = new THREE.BoxGeometry(1.9, 1, 0.14)
    this.slab = new THREE.Mesh(slabGeo, glowBasic(palette.violet, 0.8))
    this.slab.position.set(SERV_BOX_X, SERV_BOT + 0.95, 0)
    this.serve.add(this.slab)
    this.stripes = []
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(slabGeo, glowBasic(seriesColor(i), 0.85))
      s.position.set(SERV_BOX_X, 0, 0)
      s.visible = false
      this.serve.add(s)
      this.stripes.push(s)
    }

    this.servUsersLbl = this.label('users', { className: 'tiny', position: new THREE.Vector3(-4.0, SERV_Y + 2.1, 0), opacity: 0 })
    this.servChipLbl = this.label('GPU', { pill: true, position: new THREE.Vector3(-1.3, SERV_Y + 1.1, 0), opacity: 0 })
    this.servMemLbl = this.label('GPU memory', { className: 'tiny', position: new THREE.Vector3(SERV_BOX_X, SERV_Y + 2.42, 0), opacity: 0 })
    this.slabLabel = this.label('', { pill: true, position: new THREE.Vector3(SERV_BOX_X, SERV_Y + SERV_BOT + 0.95, 0), opacity: 0 })
    this.usedLabel = this.label('', { className: 'tiny', position: new THREE.Vector3(SERV_BOX_X, SERV_Y - 2.45, 0), opacity: 0 })
    this._servLabels = [this.servUsersLbl, this.servChipLbl, this.servMemLbl, this.slabLabel, this.usedLabel]
    // event labels (opacity driven per-frame while the beat runs)
    this.waitLabel = this.label('waiting…', { pill: true, position: new THREE.Vector3(-3.05, SERV_Y - 1.5, 0), opacity: 0 })
    this.fullLabel = this.label('memory full', { pill: true, position: new THREE.Vector3(SERV_BOX_X, SERV_Y + 1.78, 0), opacity: 0 })
    this.evictLabel = this.label('evicted', { pill: true, position: new THREE.Vector3(SERV_BOX_X, SERV_Y, 0), opacity: 0 })
    this.fullLabel.el.style.color = palette.rose
    this.evictLabel.el.style.color = palette.rose

    this._servT = 0
    this._servBits = 0
    this._slabH = 1.9
    this._kvH = SERV_H0.slice()
    this._servFree = 1
    this._servStr = ''
    this._servBi = -1
    this._evictDone = false
    this._evictT = 0
    this._waitO = 0
    this._fullO = 0
    this._evictO = 0
    this._stripeCY = 0
  }

  enter() {
    if (this.ctx.reduced) return
    this.core.scale.setScalar(0.01)
    this.barField.scale.setScalar(0.01)
    gsap.to(this.core.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.7)' })
    gsap.to(this.barField.scale, { x: 1, y: 1, z: 1, duration: 0.9, delay: 0.15, ease: 'back.out(1.5)' })
  }

  onStep(i) {
    this._settleCamera(i)
    this._costVisT = i === 6 ? 1 : 0
    this._cutVisT = i === 4 ? 1 : 0
    // main-scene label choreography (spec/serve beats dim everything up here)
    this._showCandidates(i >= 2 && i <= 4)
    this._fade(this.tempLabel, i === 3 ? 1 : 0)
    this._fade(this.toppLabel, i === 4 ? 1 : 0)
    this._fade(this.cutLabel, i === 4 ? 1 : 0)
    this._fade(this.distCaption, i <= 4 ? 1 : 0)
    this._fade(this.kvLabel, i === 1 || i === 6 ? 1 : i === 2 ? 0.55 : i === 9 ? 0.4 : 0)
    this._fade(this.ribbonName, i === 7 || i === 8 ? 0 : 1)
    const spec = i === 7
    const serv = i === 8
    for (const l of this._specLabels) this._fade(l, spec ? 1 : 0)
    for (const l of this._servLabels) this._fade(l, serv ? 1 : 0)
    if (!spec) this._specClear()
    if (!serv) {
      this._waitO = this._fullO = this._evictO = 0
      this.waitLabel.setOpacity(0)
      this.fullLabel.setOpacity(0)
      this.evictLabel.setOpacity(0)
    }

    switch (i) {
      case 0: // intro — overview, KV not computed yet
        this._stopGen()
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(0, false)
        this.barField.setTargets(BEAT1, { highlight: -1 })
        this._setEmitWeights(BEAT1)
        break
      case 1: // prefill — every prompt column flares at once (parallel pass)
        this._stopGen()
        this.ribbonName.setText(this.L('prompt · read in one pass'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(PROMPT_LEN, true) // burst-fill all prompt columns
        this.barField.setTargets(BEAT1, { highlight: -1 })
        this._setEmitWeights(BEAT1)
        this._corePulse = 1
        break
      case 2: // logits → softmax — candidate labels appear
        this._stopGen()
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(PROMPT_LEN, false)
        this.barField.setTargets(BEAT1, { highlight: -1 })
        this._setEmitWeights(BEAT1)
        break
      case 3: // temperature — the dial sweeps T through 0.2 / 1.0 / 1.6 in update()
        this._stopGen()
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(PROMPT_LEN, false)
        this.barField.setTargets(BEAT1, { highlight: BEAT1_PEAK })
        break
      case 4: // top-p — the nucleus cut line climbs in update()
        this._stopGen()
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(PROMPT_LEN, false)
        this.barField.setTargets(BEAT1, { highlight: -1 })
        break
      case 5: // append & feed back — start the live loop
        this.ribbonName.setText(this.L('generating…'))
        this._startGen()
        break
      case 6: // KV cache — cost meter
        this.ribbonName.setText(this.L('KV cache grows by one each step'))
        this._ensureGen()
        break
      case 7: // speculative decoding
        this._stopGen()
        this._specReset()
        break
      case 8: // serving reality
        this._stopGen()
        this._servReset()
        break
      case 9: // the loop
        this.ribbonName.setText(this.L('predict → sample → append → repeat'))
        this._ensureGen()
        break
      default:
        break
    }
    if (this.ctx.reduced) this._reducedSnapshot(i)
  }

  // --- KV state ----------------------------------------------------------------
  // show k columns; flare=true bursts all newly-shown columns (prefill), else they
  // settle to the stored level. Columns already shown stay frozen at stored.
  _setKV(k, flare) {
    k = Math.max(0, Math.min(MAX_CELLS, k))
    for (let i = 0; i < MAX_CELLS; i++) {
      const c = this.kv[i]
      const on = i < k
      if (on && !c.shown) {
        c.shown = true
        c.k.visible = c.v.visible = true
        c.level = flare ? 1 : KV_STORED
        c.target = KV_STORED
      } else if (on) {
        c.target = KV_STORED
      } else {
        c.shown = false
        c.target = 0
        c.level = 0
        c.k.visible = c.v.visible = false
      }
    }
    this._kvShown = k
  }

  // flare exactly one column (the newest, during decode)
  _flareKV(i) {
    if (i < 0 || i >= MAX_CELLS) return
    const c = this.kv[i]
    c.shown = true
    c.k.visible = c.v.visible = true
    c.level = 1
    c.target = KV_STORED
    this._kvShown = Math.max(this._kvShown, i + 1)
  }

  // --- generation loop ---------------------------------------------------------
  _startGen() {
    this._genMode = true
    this._genTimer = this._genInterval * 0.55
    this.filled = PROMPT_LEN
    this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
    this._setKV(PROMPT_LEN, false)
    this._costGrowT = 0
    this._costGrow = 0
    this.newestLabel.setVisible(false)
    this.chosenLabel.setVisible(false)
    this.mote.visible = false
    const dist = this._randomDist(BEAT1_PEAK)
    this.barField.setTargets(dist, { highlight: BEAT1_PEAK })
    this._setEmitWeights(dist)
  }

  _ensureGen() {
    if (!this._genMode) this._startGen()
  }

  _stopGen() {
    this._genMode = false
    this.mote.visible = false
    this.newestLabel.setVisible(false)
    this.chosenLabel.setVisible(false)
  }

  _tick() {
    // reached the end → reset to the prompt and start over
    if (this.filled >= WORDS_FULL.length || this.filled >= MAX_CELLS) {
      this.filled = PROMPT_LEN
      this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
      this._setKV(PROMPT_LEN, false)
      this._costGrowT = 0
      this.newestLabel.setVisible(false)
      this.chosenLabel.setVisible(false)
      this.mote.visible = false
      return
    }

    const word = WORDS_FULL[this.filled]
    const newIdx = this.filled // the tile this token lands on
    this.filled += 1

    // the peak bar = the token we "sampled"; keep its label so the example holds
    const peak = BEAT1_PEAK
    const dist = this._randomDist(peak)
    this.barField.setTargets(dist, { highlight: peak })
    this._setEmitWeights(dist)
    this.chosenLabel.position.x = this._barWorldX(peak)
    this.chosenLabel.setText(word).setVisible(true).setOpacity(1)

    // close the loop: a mote travels from the winning bar down to the new tile
    if (!this.ctx.reduced) {
      const fromX = this._barWorldX(peak)
      const toX = this.ribbon.worldXOf(newIdx)
      this.mote.visible = true
      this.mote.setLevel(1)
      this.mote.position.set(fromX, BAR_BASE_Y + 0.2, 0)
      gsap.killTweensOf(this.mote.position)
      gsap.to(this.mote.position, {
        x: toX,
        y: RIBBON_Y + 0.05,
        duration: this._genInterval * 0.62,
        ease: 'power2.in',
        onComplete: () => {
          // token lands: reveal the tile + flare its fresh K/V column
          this.ribbon.setFilled(this.filled, { rainbow: true })
          this._flareKV(newIdx)
          this.mote.visible = false
          this.newestLabel.position.x = toX
          this.newestLabel.setText(word).setVisible(true).setOpacity(1)
          this._corePulse = 1
        },
      })
    } else {
      this.ribbon.setFilled(this.filled, { rainbow: true })
      this._flareKV(newIdx)
    }

    this._costGrowT = clamp01((this.filled - PROMPT_LEN) / (MAX_CELLS - PROMPT_LEN))
  }

  _randomDist(peak) {
    const d = new Array(BAR_COUNT)
    for (let i = 0; i < BAR_COUNT; i++) d[i] = 0.05 + Math.random() * 0.1
    d[peak] = 1.0
    if (Math.random() < 0.7) {
      const s = (peak + 1 + Math.floor(Math.random() * (BAR_COUNT - 1))) % BAR_COUNT
      d[s] = Math.max(d[s], 0.35 + Math.random() * 0.3)
    }
    return d
  }

  _setEmitWeights(dist) {
    const max = Math.max(1e-4, ...dist)
    for (let i = 0; i < BAR_COUNT; i++) this.flux.setWeight(this.emitIdx[i], (dist[i] / max) * 1.15)
  }

  _barWorldX(i) {
    return this.barField.position.x + this.barField.bars[i].position.x
  }

  // --- top-p: keep the smallest set of tokens whose probabilities sum to p ------
  _applyTopP(p) {
    let cum = 0
    let vMinKept = 1
    let vMaxCut = 0
    let nCut = 0
    for (let r = 0; r < BAR_COUNT; r++) {
      const idx = P_ORDER[r]
      if (cum < p) {
        cum += BEAT1[idx] / P_SUM
        this._shaped[idx] = BEAT1[idx]
        vMinKept = BEAT1[idx]
      } else {
        this._shaped[idx] = 0.028 // a ghost sliver — this token is off the menu
        nCut++
        if (BEAT1[idx] > vMaxCut) vMaxCut = BEAT1[idx]
      }
    }
    this.barField.setTargets(this._shaped, { highlight: -1 })
    this._setEmitWeights(this._shaped)
    this._cutOn = nCut > 0
    this._cutY = BAR_BASE_Y + (nCut ? ((vMinKept + vMaxCut) / 2) * BAR_MAXH : 0.06)
    const s = `top-p ${p.toFixed(2)} · ${this.L('keep')} ${BAR_COUNT - nCut} / ${BAR_COUNT}`
    if (s !== this._toppStr) {
      this._toppStr = s
      this.toppLabel.setText(s)
    }
  }

  // --- speculative decoding ------------------------------------------------------
  _specReset() {
    this._specClear()
    this._specRound = 0
    this._specFilled = SPEC_F0
    this.specRibbon.setFilled(SPEC_F0, { rainbow: true })
    this._specPhase = 'gap'
    this._specT = 0.3
    this.specStatus.setText(this.L('draft: quick guesses'))
  }

  _specClear() {
    for (const g of this.specGhosts) {
      gsap.killTweensOf(g.grp.position)
      gsap.killTweensOf(g.grp.scale)
      gsap.killTweensOf(g.fillMat)
      gsap.killTweensOf(g.edgeMat)
      g.grp.visible = false
    }
    for (const s of this.specStamps) s.setVisible(false)
    gsap.killTweensOf(this.specFlash.material)
    this.specFlash.material.opacity = 0
    gsap.killTweensOf(this.specMote.position)
    this.specMote.visible = false
  }

  _spawnGhost(j) {
    const g = this.specGhosts[j]
    const x = this.specRibbon.worldXOf(this._specFilled + j)
    gsap.killTweensOf(g.grp.position)
    gsap.killTweensOf(g.grp.scale)
    gsap.killTweensOf(g.fillMat)
    gsap.killTweensOf(g.edgeMat)
    g.grp.position.set(x, SPEC_LANE_Y, 0)
    g.fillMat.opacity = 0.14
    g.edgeMat.opacity = 0.95
    g.grp.scale.setScalar(1.25)
    g.grp.visible = true
    gsap.to(g.grp.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(1.6)' })
    this._draftPulse = 1
    // the proposal zips over from the little model — a fast tick
    this.specMote.visible = true
    this.specMote.position.set(-3.3, 1.35, 0)
    gsap.killTweensOf(this.specMote.position)
    gsap.to(this.specMote.position, {
      x,
      y: SPEC_LANE_Y + 0.12,
      duration: 0.14,
      ease: 'power2.in',
      onComplete: () => {
        this.specMote.visible = false
      },
    })
  }

  _specStamp(r) {
    const mis = r.acc < r.k
    for (let j = 0; j < r.k; j++) {
      if (j > r.acc || (j === r.acc && !mis)) continue
      const s = this.specStamps[j]
      s.position.x = this.specRibbon.worldXOf(this._specFilled + j)
      if (j < r.acc) {
        s.setText('✓')
        s.el.style.color = palette.lime
      } else {
        s.setText('✗')
        s.el.style.color = palette.rose
      }
      s.setVisible(true).setOpacity(1)
    }
    // the miss and everything drafted after it rolls back
    for (let j = r.acc; j < r.k; j++) {
      const g = this.specGhosts[j]
      gsap.to(g.grp.position, { y: SPEC_LANE_Y - 0.55, duration: 0.55, delay: 0.5, ease: 'power2.in' })
      gsap.to(g.fillMat, { opacity: 0, duration: 0.55, delay: 0.5 })
      gsap.to(g.edgeMat, { opacity: 0, duration: 0.55, delay: 0.5 })
    }
    this.specStatus.setText(
      mis
        ? `${r.acc} ${this.L('accepted')} · 1 ${this.L('corrected')}`
        : `${r.k} ${this.L('accepted')} — ${this.L('draft was right')}`,
    )
  }

  _specResolve(r) {
    const mis = r.acc < r.k
    for (let j = 0; j < r.acc; j++) this.specGhosts[j].grp.visible = false // solid tiles replace them
    this._specFilled = Math.min(SPEC_CELLS, this._specFilled + r.acc + (mis ? 1 : 0))
    this.specRibbon.setFilled(this._specFilled, { rainbow: true })
  }

  _specUpdate(dt) {
    this._specT += dt
    const r = SPEC_ROUNDS[this._specRound % SPEC_ROUNDS.length]
    switch (this._specPhase) {
      case 'gap':
        if (this._specT < 0.55) break
        if (this._specFilled + r.k + 1 > SPEC_CELLS) {
          this._specFilled = SPEC_F0
          this.specRibbon.setFilled(SPEC_F0, { rainbow: true })
        }
        this._specPhase = 'draft'
        this._specT = 0
        this._ghostN = 0
        this.specStatus.setText(this.L('draft: quick guesses'))
        break
      case 'draft':
        while (this._ghostN < r.k && this._specT > 0.18 * (this._ghostN + 1)) this._spawnGhost(this._ghostN++)
        if (this._ghostN >= r.k && this._specT > 0.18 * r.k + 0.35) {
          this._specPhase = 'verify'
          this._specT = 0
          this._verifyPulse = 1
          this.specStatus.setText(this.L('verify: one heavy pass'))
          const x0 = this.specRibbon.worldXOf(this._specFilled)
          const x1 = this.specRibbon.worldXOf(this._specFilled + r.k - 1)
          this.specFlash.position.set((x0 + x1) / 2, SPEC_LANE_Y, -0.09)
          this.specFlash.scale.x = x1 - x0 + 0.7
          gsap.killTweensOf(this.specFlash.material)
          gsap.fromTo(this.specFlash.material, { opacity: 0 }, { opacity: 0.4, duration: 0.26, yoyo: true, repeat: 1, ease: 'power2.out' })
        }
        break
      case 'verify':
        if (this._specT > 0.55) {
          this._specStamp(r)
          this._specPhase = 'stamped'
          this._specT = 0
        }
        break
      case 'stamped':
        if (this._specT > 1.5) {
          this._specResolve(r)
          this._specPhase = 'resolve'
          this._specT = 0
        }
        break
      case 'resolve':
        if (this._specT > 0.35) for (const s of this.specStamps) s.setVisible(false)
        if (this._specT > 0.6) {
          this._specPhase = 'gap'
          this._specT = 0
          this._specRound++
        }
        break
      default:
        break
    }
  }

  // --- serving --------------------------------------------------------------------
  _servReset() {
    this._servT = 0
    this._servBits = 0 // forces the slab label to refresh on the next frame
    this._slabH = 1.9
    this._kvH = SERV_H0.slice()
    this._servFree = 1
    this._evictDone = false
    this._evictT = 0
    this._servBi = -1
  }

  // lay out the memory box tenants bottom-up; returns total height used
  _servLayout() {
    const sl = Math.max(0.02, this._slabH)
    this.slab.scale.y = sl
    this.slab.position.y = SERV_BOT + sl / 2
    this.slabLabel.position.y = SERV_Y + SERV_BOT + sl / 2
    let cy = SERV_BOT + sl + 0.09
    for (let i = 0; i < 4; i++) {
      const h = this._kvH[i]
      const st = this.stripes[i]
      if (h > 0.04) {
        st.visible = true
        st.scale.y = h
        st.position.y = cy + h / 2
        if (i === 2) this._stripeCY = cy + h / 2
        cy += h + 0.07
      } else {
        st.visible = false
        if (i === 2) this._stripeCY = cy
      }
    }
    return cy - SERV_BOT
  }

  _servUpdate(dt, t) {
    this._servT += dt
    if (this._servT >= SERV_LOOP) {
      this._servT -= SERV_LOOP
      this._kvH[0] = SERV_H0[0]
      this._kvH[1] = SERV_H0[1]
      this._kvH[2] = SERV_H0[2]
      this._kvH[3] = SERV_H0[3]
      this._evictDone = false
      this._evictT = 0
    }
    const tt = this._servT
    const bits = tt < 5.5 ? 16 : tt < 11 ? 8 : 4
    if (bits !== this._servBits) {
      this._servBits = bits
      this.slabLabel.setText(`${this.L('weights')} · ${bits}-bit`)
    }
    this._slabH = damp(this._slabH, bits === 16 ? 1.9 : bits === 8 ? 0.95 : 0.5, 2.2, dt)
    const dActive = tt > 6.4 // user D is admitted once quantization frees room

    // KV stripes grow while there is room; the squeeze stalls them near the top
    const squeeze = clamp01(this._servFree / 0.3)
    for (let i = 0; i < 4; i++) {
      if (i === 3 && !dActive) continue
      this._kvH[i] = Math.min(1.6, this._kvH[i] + SERV_RATE[i] * dt * squeeze)
    }
    // pressure event: box jams at 16-bit → user C's idle cache gets evicted
    if (!this._evictDone && bits === 16 && tt > 4.4 && this._servFree < 0.12) {
      this._evictDone = true
      this._evictT = 1.5
    }
    if (this._evictT > 0) {
      this._evictT -= dt
      this._kvH[2] = damp(this._kvH[2], 0.14, 5, dt)
    }

    const used = this._servLayout()
    this._servFree = SERV_CAP - used
    const pct = Math.round(clamp01(used / SERV_CAP) * 100)
    const s = `${this.L('memory')} ${pct}%`
    if (s !== this._servStr) {
      this._servStr = s
      this.usedLabel.setText(s)
    }

    // event labels ease in/out
    this._waitO = damp(this._waitO, dActive ? 0 : 1, 4, dt)
    this._fullO = damp(this._fullO, this._servFree < 0.1 ? 1 : 0, 4, dt)
    this._evictO = damp(this._evictO, this._evictT > 0.25 ? 1 : 0, 5, dt)
    this.waitLabel.setOpacity(this._waitO)
    this.fullLabel.setOpacity(this._fullO)
    this.evictLabel.setOpacity(this._evictO)
    this.evictLabel.position.y = SERV_Y + this._stripeCY

    // batching: the chip serves one user per slot, round-robin
    const bi = Math.floor(t * 2.4) % 4
    if (bi !== this._servBi) {
      this._servBi = bi
      for (let i = 0; i < 4; i++) {
        const active = i !== 3 || dActive
        this.servFlux.setWeight(this.userEdge[i], i === bi && active ? 1.3 : active ? 0.3 : 0.06)
      }
    }
    for (let i = 0; i < 4; i++) {
      const active = i !== 3 || dActive
      this.userNodes[i].setLevel(i === bi && active ? 0.8 : active ? 0.35 : 0.12)
    }
    const ph = (t * 2.4) % 1
    this.chipNode.setLevel(0.35 + 0.25 * (1 - ph))
  }

  // --- per-beat helpers --------------------------------------------------------
  _settleCamera(i) {
    const v = CAM[i] || CAM[0]
    const d = this.ctx.reduced ? 0 : 1.5
    gsap.to(this.camera.position, { x: v[0], y: v[1], z: v[2], duration: d, ease: 'power3.inOut' })
    gsap.to(this.lookTarget, { x: v[3], y: v[4], z: 0, duration: d, ease: 'power3.inOut' })
  }

  _showCandidates(on) {
    for (const l of this.candidateLabels) this._fade(l, on ? 1 : 0)
  }

  _fade(label, to) {
    gsap.to(label, { _opacity: to, duration: this.ctx.reduced ? 0 : 0.4, ease: 'power2.out' })
  }

  _reducedSnapshot(i) {
    // a calm, static frame per beat — no loops, no breathing dials
    if (i <= 2) {
      this._setKV(i >= 1 ? PROMPT_LEN : 0, false)
      return
    }
    if (i === 3) {
      const inv = 1 / T_STOPS[0]
      for (let b = 0; b < BAR_COUNT; b++) this._shaped[b] = Math.pow(BEAT1[b], inv)
      this.barField.setTargets(this._shaped, { highlight: BEAT1_PEAK })
      this._setEmitWeights(this._shaped)
      this.tempLabel.setText(`T = ${T_STOPS[0].toFixed(1)} · ${this.L('robotic')}`)
      return
    }
    if (i === 4) {
      this._applyTopP(0.9)
      this._cutVis = 1
      this.cutLine.position.y = this._cutY
      this.cutLabel.position.y = this._cutY
      return
    }
    if (i === 7) {
      // frozen mid-round: 4 proposals stamped ✓✓✓✗ over the accepted prefix
      this._specPhase = 'idle'
      this._specFilled = 8
      this.specRibbon.setFilled(8, { rainbow: true })
      for (let j = 0; j < 4; j++) {
        const g = this.specGhosts[j]
        g.grp.position.set(this.specRibbon.worldXOf(8 + j), SPEC_LANE_Y, 0)
        g.grp.scale.setScalar(1)
        g.fillMat.opacity = 0.14
        g.edgeMat.opacity = 0.95
        g.grp.visible = true
        const st = this.specStamps[j]
        st.position.x = g.grp.position.x
        st.setText(j < 3 ? '✓' : '✗')
        st.el.style.color = j < 3 ? palette.lime : palette.rose
        st.setVisible(true).setOpacity(1)
      }
      this.specStatus.setText(`3 ${this.L('accepted')} · 1 ${this.L('corrected')}`)
      return
    }
    if (i === 8) {
      this._slabH = 0.95
      this._servBits = 8
      this.slabLabel.setText(`${this.L('weights')} · 8-bit`)
      this._kvH = [0.95, 0.55, 0.4, 0.3]
      const used = this._servLayout()
      this._servFree = SERV_CAP - used
      this.usedLabel.setText(`${this.L('memory')} ${Math.round(clamp01(used / SERV_CAP) * 100)}%`)
      for (const n of this.userNodes) n.setLevel(0.5)
      this.chipNode.setLevel(0.6)
      return
    }
    // 5, 6, 9 — mid-generation freeze
    this._genMode = false
    const f = Math.min(WORDS_FULL.length, MAX_CELLS, PROMPT_LEN + 6)
    this.filled = f
    this.ribbon.setFilled(f, { rainbow: true })
    this._setKV(f, false)
    this._costGrow = this._costGrowT = clamp01((f - PROMPT_LEN) / (MAX_CELLS - PROMPT_LEN))
    this._costVis = this._costVisT
    const peak = BEAT1_PEAK
    const dist = this._randomDist(peak)
    this.barField.setTargets(dist, { highlight: peak })
    this._setEmitWeights(dist)
    const word = WORDS_FULL[f - 1]
    this.newestLabel.position.x = this.ribbon.worldXOf(f - 1)
    this.newestLabel.setText(word).setVisible(true).setOpacity(1)
  }

  update(dt, t) {
    const rd = this.ctx.reduced
    // libs that animate every frame
    this.ribbon.update(dt)
    this.specRibbon.update(dt)
    this.barField.lerp(dt, { hot: palette.amber })
    if (!rd) this.flux.update(dt)
    if (!rd && this.step === 8) this.servFlux.update(dt)
    this.camera.lookAt(this.lookTarget)

    // KV cells ease toward their target; flared cells decay to the stored level
    for (let i = 0; i < MAX_CELLS; i++) {
      const c = this.kv[i]
      if (!c.shown && c.level < 1e-3) continue
      c.level = rd ? c.target : damp(c.level, c.target, 5, dt)
      const lv = c.level
      c.kMat.opacity = 0.18 + 0.8 * lv
      c.vMat.opacity = 0.18 + 0.8 * lv
      const s = 0.85 + 0.45 * lv
      c.k.scale.set(1, s, 1)
      c.v.scale.set(1, s, 1)
    }

    // beat 3: the temperature dial steps through T = 0.2 → 1.0 → 1.6, morphing
    // between stops with the true softmax(z/T) identity: p_i^(1/T)
    if (this.step === 3 && !rd) {
      const seg = (t / 2.6) % 3
      const idx = Math.floor(seg)
      const f = seg - idx
      const hold = 0.7
      let T = T_STOPS[idx]
      if (f > hold) T = lerp(T_STOPS[idx], T_STOPS[(idx + 1) % 3], smoothstep(0, 1, (f - hold) / (1 - hold)))
      const inv = 1 / T
      for (let i = 0; i < BAR_COUNT; i++) this._shaped[i] = Math.pow(BEAT1[i], inv)
      this.barField.setTargets(this._shaped, { highlight: BEAT1_PEAK })
      this._setEmitWeights(this._shaped)
      const tag = this.L(T < 0.55 ? 'robotic' : T < 1.25 ? 'honest' : 'wild')
      const s = `T = ${T.toFixed(1)} · ${tag}`
      if (s !== this._tempStr) {
        this._tempStr = s
        this.tempLabel.setText(s)
      }
    }

    // beat 4: top-p sweeps, the cut line climbs, the tail dims out
    if (this.step === 4 && !rd) this._applyTopP(remap(Math.sin(t * 0.45), -1, 1, 0.44, 0.97))
    this._cutVis = rd ? this._cutVisT : damp(this._cutVis, this._cutVisT, 5, dt)
    this.cutLine.visible = this._cutVis > 0.02 && this._cutOn
    if (this.cutLine.visible) {
      this.cutLine.material.opacity = 0.85 * this._cutVis
      this.cutLine.position.y = rd ? this._cutY : damp(this.cutLine.position.y, this._cutY, 6, dt)
      this.cutLabel.position.y = this.cutLine.position.y
    }

    // beats 5/6/9: the autoregressive loop, one token per interval
    if (this._genMode && !rd) {
      this._genTimer += dt
      if (this._genTimer >= this._genInterval) {
        this._genTimer -= this._genInterval
        this._tick()
      }
    }

    // beat 7: speculative decoding rounds
    if (this.step === 7 && !rd) this._specUpdate(dt)
    this._draftPulse = damp(this._draftPulse, 0, 7, dt)
    this._verifyPulse = damp(this._verifyPulse, 0, 2.2, dt)
    this.draftNode.setLevel(0.4 + 0.55 * this._draftPulse)
    this.verifyNode.setLevel(0.5 + 0.6 * this._verifyPulse)

    // beat 8: the shared GPU
    if (this.step === 8 && !rd) this._servUpdate(dt, t)

    // cost meter: recompute grows ~ with length, cache stays flat
    this._costVis = rd ? this._costVisT : damp(this._costVis, this._costVisT, 5, dt)
    this._costGrow = rd ? this._costGrowT : damp(this._costGrow, this._costGrowT, 2.5, dt)
    this.costGroup.visible = this._costVis > 0.02
    if (this.costGroup.visible) {
      const rec = 0.25 + this._costGrow * 3.3
      const cache = 0.42
      this.costRecompute.scale.y = rec
      this.costRecompute.position.y = rec / 2
      this.costRecompute.material.opacity = 0.9 * this._costVis
      this.costCache.scale.y = cache
      this.costCache.position.y = cache / 2
      this.costCache.material.opacity = 0.9 * this._costVis
    }
    this.lblCostR.setOpacity(this._costVis)
    this.lblCostC.setOpacity(this._costVis)

    // the core flashes as it emits each token
    this._corePulse = damp(this._corePulse, 0, 3.5, dt)
    const idle = rd ? 0.6 : 0.5 + 0.12 * Math.sin(t * 1.6)
    this.core.setLevel(idle + 0.5 * this._corePulse)
    if (this.mote.visible) this.mote.setLevel(0.8 + 0.2 * Math.sin(t * 8))
    if (this.specMote.visible) this.specMote.setLevel(0.85 + 0.15 * Math.sin(t * 9))
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this.mote.position)
    gsap.killTweensOf(this.specMote.position)
    gsap.killTweensOf(this.specFlash.material)
    for (const g of this.specGhosts) {
      gsap.killTweensOf(g.grp.position)
      gsap.killTweensOf(g.grp.scale)
      gsap.killTweensOf(g.fillMat)
      gsap.killTweensOf(g.edgeMat)
    }
    for (const m of [this.core.scale, this.barField.scale]) gsap.killTweensOf(m)
    for (const l of this._labels) gsap.killTweensOf(l)
    super.dispose()
  }
}
