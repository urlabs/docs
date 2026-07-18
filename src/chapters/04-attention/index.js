import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { BarField } from '../../lib/BarField.js'
import { additiveLine } from '../../lib/materials.js'
import { TOKENS } from '../../lib/example.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { isLight } from '../../theme/theme.js'
import { damp } from '../../theme/motion.js'

const N = TOKENS.length
const IT = 7 // "it"
const CAT = 1
const MAT = 5
const WAS = 8
const D_K = 64 // key/query width in this toy setup
const SCALE = 1 / Math.sqrt(D_K) // the "scaled" in scaled dot-product attention

const _ndc = new THREE.Vector2()
const _ray = new THREE.Raycaster()
const _c1 = new THREE.Color()
const _c2 = new THREE.Color()
const _c3 = new THREE.Color()
const _m4 = new THREE.Matrix4()

// --- honest math on authored scores -----------------------------------------
// We author plausible RAW q·k dot products (a model would compute them from
// learned projections), then everything downstream is REAL: softmax((q·k)/√d)
// row-wise, causal masking as softmax over k ≤ q only, etc.
function softmaxRow(row, scale, allowed = null) {
  let mx = -Infinity
  for (let k = 0; k < row.length; k++) if (!allowed || allowed(k)) mx = Math.max(mx, row[k] * scale)
  let sum = 0
  const e = row.map((v, k) => {
    if (allowed && !allowed(k)) return 0
    const x = Math.exp(v * scale - mx)
    sum += x
    return x
  })
  return e.map((v) => v / sum)
}

// bumps: query-index -> { key-index: extra dot product }. base = unrelated pair,
// selfBonus = tokens mildly match themselves.
function buildRaw(bumps, base = 1.5, selfBonus = 4) {
  const M = []
  for (let q = 0; q < N; q++) {
    const row = new Array(N).fill(base)
    row[q] = base + selfBonus
    const b = bumps[q] || {}
    for (const k in b) row[+k] = base + b[k]
    M.push(row)
  }
  return M
}

// 0 The · 1 cat · 2 sat · 3 on · 4 the · 5 mat · 6 because · 7 it · 8 was · 9 tired
const RAW_SYNTAX = buildRaw({
  0: { 1: 14 },
  1: { 2: 16, 0: 6 },
  2: { 1: 18, 3: 8 },
  3: { 5: 16, 2: 8 },
  4: { 5: 14 },
  5: { 3: 12, 2: 6 },
  6: { 2: 10, 9: 9 },
  7: { 8: 10, 9: 6 },
  8: { 9: 14, 7: 10 },
  9: { 8: 12, 7: 10 },
})
const RAW_COREF = buildRaw({
  0: { 1: 8 },
  1: { 7: 5 },
  2: { 1: 8 },
  3: { 5: 6 },
  4: { 5: 8 },
  5: { 7: 4 },
  6: { 9: 8, 7: 6 },
  7: { 1: 22, 5: 7 }, // it → cat (the star), it → mat (the decoy)
  8: { 9: 8, 7: 5 },
  9: { 7: 14, 1: 10 },
})
const _adjB = {}
for (let q = 0; q < N; q++) {
  _adjB[q] = {}
  if (q > 0) _adjB[q][q - 1] = 12.5
  if (q < N - 1) _adjB[q][q + 1] = 9.5
}
const RAW_ADJ = buildRaw(_adjB)

const HEADS = [
  { name: 'syntax', raw: RAW_SYNTAX },
  { name: 'coreference', raw: RAW_COREF },
  { name: 'adjacency', raw: RAW_ADJ },
].map((h) => ({ ...h, W: h.raw.map((r) => softmaxRow(r, SCALE)) }))
const COREF = 1
const W = HEADS[COREF].W // the story head's weight matrix (rows really sum to 1)
const W_CAUSAL = RAW_COREF.map((r, q) => softmaxRow(r, SCALE, (k) => k <= q))
const UNSCALED_IT = softmaxRow(RAW_COREF[IT], 1) // same scores, no ÷√d → one-hot

const fmtPct = (w) => (w > 0.9999 ? '≈100%' : `${(w * 100).toFixed(0)}%`)

export const beats = [
  {
    html: `<span class="eyebrow">Chapter 04 · the breakthrough</span>
      <h2>Attention</h2>
      <p class="lead">"The animal didn't cross the street because <strong>it</strong> was too tired." What does "it" point to? You resolved that without thinking: the animal. Now swap <em>tired</em> for <em>wide</em> and "it" snaps to the street. A model can't feel that — it has to <strong>compute</strong> it.</p>
      <p>Our running sentence hides the same trap: <span class="tok">it</span> could be the cat or the mat. Here are its <strong>ten tokens</strong> in a ring, each one an embedding vector from the last chapter. The mechanism that lets a token reach across the sentence, weigh every other word, and pull in exactly the meaning it needs is called <strong>attention</strong> — and it's the idea this whole era of AI is built on.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Queries &amp; Keys</h3>
      <p>Each token holds up two cards at once: a <strong>Query</strong> — "what am I looking for?" — and a <strong>Key</strong> — "what do I offer?". <span class="tok">it</span>'s query says <em>seeking: something this pronoun could stand for</em>; <span class="tok">cat</span>'s key says <em>on offer: an animal, recently mentioned</em>.</p>
      <p>Neither card is written by hand, and neither is stored anywhere. Both are <strong>learned linear projections of the same embedding</strong> — the token's vector multiplied by a trained matrix: <span class="tok">q = Wq·x</span> and <span class="tok">k = Wk·x</span>. Same vector, asked two different questions.</p>
      <p class="aside">Wq and Wk are ordinary weight matrices — knobs, exactly like chapter 2's. Training nudges them until the right queries line up with the right keys.</p>`,
  },
  {
    html: `<h3>Scores: every query meets every key</h3>
      <p>Relevance is geometry — the same geometry as last chapter. Each score is a <strong>dot product</strong>, <span class="tok">q·k</span>: multiply the two vectors entry by entry and add everything up. Vectors pointing the same way → large score; unrelated directions → small or negative.</p>
      <p>Watch <span class="tok">it</span> sweep the ring: its one query is compared against all ten keys in a single pass. <span class="tok">cat</span>'s key lands at 23.5, <span class="tok">mat</span>'s at 8.5, <span class="tok">on</span> barely registers. And every other token is running its own sweep at the same time — all pairs, all at once.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Softmax: scores become a budget</h3>
      <p>Raw scores live on an open scale. <strong>Softmax</strong> converts each token's row of scores into <strong>attention weights</strong> — all positive, summing exactly to 1. Think of it as a fixed budget of focus: <span class="tok">it</span> spends 59% of its attention on <span class="tok">cat</span>, 9% on <span class="tok">mat</span>, and small change on everything else.</p>
      <p>Softmax plays favorites by design: every score is exponentiated before it's divided by the total, so gaps get stretched — a solid lead in score becomes a landslide in weight, and weak matches fade toward zero.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/attention-math">the full equation, step by step</a></div>`,
  },
  {
    html: `<h3>The ÷√d safety valve</h3>
      <p>One detail hides in the name "<em>scaled</em> dot-product attention". Dot products grow with vector length: with <span class="tok">d = 64</span> numbers per key, each score is a sum of 64 products, so raw scores come out large — and softmax exponentiates them.</p>
      <p>These two charts share the <strong>same ten scores</strong> — <span class="tok">it</span>'s actual row. Fed in raw (top), softmax saturates: <span class="tok">cat</span> takes essentially 100% and every other bar vanishes — a one-hot spike. Divide by <span class="tok">√d = 8</span> first (bottom) and the mix stays soft: a clear favorite, with the runners-up alive.</p>
      <p class="aside">The spike isn't just ugly — it's untrainable. A saturated softmax has near-zero gradients, so chapter 2's error signal can no longer reach the very weights that caused the spike. That little √d keeps attention learnable.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Gather the Values</h3>
      <p>Weights decide <em>where</em> to look. A third card decides <em>what gets taken</em>: each token also carries a <strong>Value</strong> — the content it hands over once attended to. Same trick a third time, a learned projection of the same embedding: <span class="tok">v = Wv·x</span>.</p>
      <p>Now the payoff of the whole routine: each token's new vector is the <strong>weighted sum of everyone's Values</strong> — here, 0.59 × <span class="tok">cat</span>'s value + 0.09 × <span class="tok">mat</span>'s + slivers of the rest. Meaning literally flows in along the bright beams, and <span class="tok">it</span> comes out rewritten as mostly-cat.</p>`,
  },
  {
    html: `<h3>Learned, not programmed</h3>
      <p>Look at what just happened: <span class="tok">it</span> locked onto <span class="tok">cat</span>. The model resolved a pronoun — <em>coreference</em>, a problem that defeated decades of hand-written grammar rules.</p>
      <p>And nobody wrote a rule here either. There is no line of code that says "it → cat". There are only Wq, Wk, Wv — millions of knobs set by chapter 2's loop, nudged one gradient step at a time, because heads that resolve pronouns predict the next word better.</p>
      <p class="aside">Change the ending to "…because it was <em>flat</em>" and the very same matrices swing the beam to <span class="tok">mat</span>. The weights don't store the answer — they store how to compute it from context.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The attention matrix</h3>
      <p>Run every token's sweep at once and you get the picture researchers actually stare at: an <strong>n × n grid</strong> — one <strong>row per query</strong>, one <strong>column per key</strong>, each cell's brightness an attention weight. Every row is a softmax output, so every row sums to 1.</p>
      <p>Read it like a book of gazes: pick a row and you see where that token looked. The <span class="tok">it</span> row burns brightest at the <span class="tok">cat</span> column — the exact beams you've been watching, folded into one row of pixels. The faint stripe down the diagonal is tokens keeping an eye on themselves.</p>
      <p class="aside">Interpretability research starts from grids like this: they are the model's only directly visible opinion about which words matter to which.</p>`,
  },
  {
    html: `<h3>The causal mask</h3>
      <p>Now one triangle goes dark. A language model is trained to predict the <em>next</em> word, so a token may only attend to positions at or before its own — <strong>never ahead</strong>. Everything above-right of the diagonal is every query's view of its own future, and it is forced to zero.</p>
      <p>Mechanically it's blunt: those scores are set to −∞ before softmax, their weights come out exactly 0, and each row's budget renormalizes over the past. <span class="tok">The</span>, in the first row, is left staring at itself.</p>
      <p class="aside">Hold onto this staircase shape — it returns in the next chapter as the "masked" in <em>masked multi-head attention</em>, and it's what lets a model train on every position of a sentence in parallel without cheating.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Many heads, many kinds of relevant</h3>
      <p>One set of Wq, Wk, Wv defines <em>one</em> notion of relevance. Real models run <strong>many heads in parallel</strong> — each with its own three learned matrices, each reading the same sentence through a different lens. Here are three: <span style="color:var(--cyan)">syntax</span>, <span style="color:var(--magenta)">coreference</span>, <span style="color:var(--amber)">adjacency</span>. A real layer runs dozens.</p>
      <p>Each head produces its own blended vector; the outputs are <strong>concatenated</strong> and passed through one final learned projection back to standard width, so the next layer sees a single answer built from many viewpoints.</p>
      <p class="aside">Nobody assigns the jobs — heads specialize on their own. Interpretability teams keep finding real ones: <em>induction heads</em> that spot a repeated pattern and attend to what followed it last time, heads for quotes, for names, for verb endings.</p>
      <p class="aside">Hover any token to explore where it attends.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The price of everything-looks-at-everything</h3>
      <p>That's the routine: <strong>project, score, scale, softmax, blend</strong> — every token, every layer, in parallel. And notice the fine print: each of our 10 tokens scored all 10 keys — 100 pairs. Attention is <strong>n²</strong>. Double the text, quadruple the work; at 100,000 tokens of context, ten billion pairs. That bill comes due in the Inference and Frontier chapters.</p>
      <p>It was worth it. One trainable operation moves information between any two positions in a single hop, no matter how far apart they sit — that's what made context cheap to learn, and it's the engine the next chapter builds into a machine.</p>
      <div class="postcard">Attention lets every token ask every other token what it means: queries meet keys, softmax sets a budget, values flow. All of it learned end to end — that's the trick under every modern language model.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">attention math</a>
        <a class="deepdive" data-route="/transformer">next: the transformer →</a>
      </div>`,
  },
]

// camera per beat: [x, y, z, lookX, lookY] — x nudges keep the ring clear of the
// prose card (card left → look left so content sits right, and vice versa).
const CAM = [
  [-0.75, 0, 10.6, -0.75, 0], // 0 ring, ambiguity
  [1.1, 0, 10.0, 1.1, 0], // 1 queries & keys (chips)
  [-0.8, 0.1, 10.2, -0.8, 0.05], // 2 scores
  [0.9, 0, 10.4, 0.9, 0], // 3 softmax weights
  [0, 12.5, 8.8, 0, 12.45], // 4 ÷√d demo stage
  [1.0, 0, 10.2, 1.0, 0], // 5 gather values
  [-0.5, 0.7, 7.3, -0.73, 1.0], // 6 closeup on it → cat
  [0.4, -13.5, 10.6, 0.4, -13.55], // 7 attention matrix
  [0, -12.75, 8.5, -0.35, -13.05], // 8 causal mask (upper triangle)
  [0.5, 0, 11.4, 0.5, 0], // 9 multi-head
  [0, 0, 12.7, 0, 0], // 10 n² web + close
]

const MAT_POS = new THREE.Vector3(0.4, -13.5, 0)
const DEMO_POS = new THREE.Vector3(0, 12.5, 0)

export default class Attention extends Chapter {
  init() {
    this.setBloom(0.85, 0.42, 0.82)
    this.addAmbientField(360, 70)
    this.camera.position.set(0, 0, 10.5)
    this.lookTarget = new THREE.Vector3(0, 0, 0)
    this.headColors = [seriesColor(0), seriesColor(1), seriesColor(2)]

    // ring layout in the XY plane
    this.R = 4.0
    this.pos = []
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 - (i / N) * Math.PI * 2
      this.pos.push(new THREE.Vector3(Math.cos(a) * this.R, Math.sin(a) * this.R, 0))
    }

    this._buildRing()
    this._buildChips()
    this._buildScoreLabels()
    this._buildDemo()
    this._buildMatrix()
    this._buildHeads()

    this.scripted = { focus: IT, head: COREF, mode: 'ambig' }
    this.active = this.scripted
    this.hoverFocus = -1
    this.levels = new Array(N).fill(0.5)
    this._chipT = { q: 0, k: 0, v: 0 }
    this._chipO = { q: 0, k: 0, v: 0 }
    this._headsMix = 0
    this._legendO = 0
    this._mSweep = 0
    this._maskT = 0
    this._mLastSweep = -1
    this._mLastMask = -1
    this._rectO = 0
    this._lastStep = -1
    this._applyState()

    this._onMove = (e) => this._move(e)
    window.addEventListener('pointermove', this._onMove)
  }

  // --- ring of tokens + all-pairs beam field ---------------------------------
  _buildRing() {
    this.tokenNodes = []
    this.nodeMeshes = []
    this.tokenLabs = []
    TOKENS.forEach((tok, i) => {
      const node = new GlowNode({ color: palette.cyan, radius: 0.28, halo: 0.9, glow: 1.0 })
      node.position.copy(this.pos[i])
      node.setLevel(0.5)
      node.core.userData.tokenIndex = i
      this.scene.add(node)
      this.tokenNodes.push(node)
      this.nodeMeshes.push(node.core)
      this.tokenLabs.push(this.label(tok, { pill: true, position: this.pos[i].clone().multiplyScalar(1.2), opacity: 0.9 }))
    })

    // all ordered pairs (q != k); edge a=key, b=query so motes flow key -> query
    this.attn = new EdgeField({ flow: true, flowPerEdge: 4, flowSpeed: 0.5, baseOpacity: isLight() ? 0.85 : 0.6, flowSize: 0.17 })
    this.edgeIndex = Array.from({ length: N }, () => new Array(N).fill(-1))
    for (let q = 0; q < N; q++) {
      for (let k = 0; k < N; k++) {
        if (q === k) continue
        this.edgeIndex[q][k] = this.attn.addEdge(this.pos[k], this.pos[q], palette.magenta, 0)
      }
    }
    this.attn.build()
    this.add(this.attn)

    this.labAmbig = this.label('it → cat? or mat?', {
      pill: true,
      position: new THREE.Vector3(1.35, -0.4, 0),
      opacity: 0,
    })
    this.labWeb = this.label('10 tokens → 100 pairs', {
      pill: true,
      position: new THREE.Vector3(0, -5.5, 0),
      opacity: 0,
    })
  }

  // --- q / k / v chips: three learned read-outs of the same embedding --------
  _buildChips() {
    const qGeo = new THREE.TorusGeometry(0.1, 0.03, 10, 24) // a little search lens
    const kGeo = new THREE.BoxGeometry(0.17, 0.17, 0.03) // a little name tag
    const vGeo = new THREE.SphereGeometry(0.08, 14, 14) // a little payload
    const mkMat = (c) =>
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0, toneMapped: false })
    this.chipMats = { q: mkMat(palette.cyan), k: mkMat(palette.amber), v: mkMat(palette.violet) }
    this.chips = { q: [], k: [], v: [] }
    this.chipGroup = new THREE.Group()
    this.add(this.chipGroup)
    const _t = new THREE.Vector3()
    for (let i = 0; i < N; i++) {
      const p = this.pos[i]
      _t.set(-p.y, p.x, 0).normalize() // tangent
      const qp = p.clone().multiplyScalar(0.84).addScaledVector(_t, -0.18)
      const vp = p.clone().multiplyScalar(0.86).addScaledVector(_t, 0.3)
      const kp = p.clone().multiplyScalar(1.1)
      const qm = new THREE.Mesh(qGeo, this.chipMats.q)
      qm.position.copy(qp)
      const km = new THREE.Mesh(kGeo, this.chipMats.k)
      km.position.copy(kp)
      const vm = new THREE.Mesh(vGeo, this.chipMats.v)
      vm.position.copy(vp)
      this.chipGroup.add(qm, km, vm)
      this.chips.q.push(qm)
      this.chips.k.push(km)
      this.chips.v.push(vm)
    }
    this.labQ = this.label('query', { className: 'tiny', position: this.chips.q[IT].position.clone(), offset: [0, 22], opacity: 0 })
    this.labK = this.label('key', { className: 'tiny', position: this.chips.k[IT].position.clone(), offset: [0, 22], opacity: 0 })
    this.labV = this.label('value', { className: 'tiny', position: this.chips.v[IT].position.clone(), offset: [0, 24], opacity: 0 })
  }

  // --- dynamic score / weight readouts on it's strongest beams ----------------
  _buildScoreLabels() {
    const mid = (a, b) => this.pos[a].clone().add(this.pos[b]).multiplyScalar(0.5)
    this.scoreLabs = [
      { k: CAT, lab: this.label('·', { className: 'tiny', position: mid(IT, CAT), offset: [-6, -16], opacity: 0 }) },
      { k: MAT, lab: this.label('·', { className: 'tiny', position: mid(IT, MAT), offset: [26, -6], opacity: 0 }) },
      { k: WAS, lab: this.label('·', { className: 'tiny', position: mid(IT, WAS), offset: [32, 0], opacity: 0 }) },
    ]
  }

  _setScoreTexts(step) {
    for (const s of this.scoreLabs) {
      if (step === 2) s.lab.setText(RAW_COREF[IT][s.k].toFixed(1))
      else s.lab.setText(fmtPct(W[IT][s.k]))
    }
  }

  // --- ÷√d stage: same scores, two softmaxes ----------------------------------
  _buildDemo() {
    this.demo = new THREE.Group()
    this.demo.position.copy(DEMO_POS)
    this.add(this.demo)
    const count = N
    const width = 0.3
    const gap = 0.13
    this.demoTop = new BarField({ count, width, gap, maxHeight: 1.5, color: palette.magenta })
    this.demoTop.position.set(0, 0.8, 0)
    this.demoBot = new BarField({ count, width, gap, maxHeight: 1.5, color: palette.cyan })
    this.demoBot.position.set(0, -2.05, 0)
    this.demo.add(this.demoTop, this.demoBot)
    const span = this.demoTop.span
    // baselines so a row still reads as a row when its bars vanish
    const blGeo = new THREE.BufferGeometry()
    blGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-span / 2 - 0.2, 0.8, 0, span / 2 + 0.2, 0.8, 0, -span / 2 - 0.2, -2.05, 0, span / 2 + 0.2, -2.05, 0]),
        3,
      ),
    )
    this.demo.add(new THREE.LineSegments(blGeo, additiveLine(palette.muted, 0.5)))
    const wp = (x, y) => new THREE.Vector3(x, y, 0).add(DEMO_POS)
    this.label('no scaling', { className: 'tiny', position: wp(-span / 2 - 0.8, 1.55), opacity: 0.95 })
    this.label('÷ √d', { className: 'tiny', position: wp(-span / 2 - 0.8, -1.3), opacity: 0.95 })
    for (let i = 0; i < N; i++) {
      this.label(TOKENS[i], {
        className: 'tiny muted',
        position: wp(this.demoTop.bars[i].position.x, -2.42),
        opacity: i === CAT ? 0.95 : 0.6,
      })
    }
    this.label(fmtPct(UNSCALED_IT[CAT]), { className: 'tiny', position: wp(this.demoTop.bars[CAT].position.x, 2.6), opacity: 0.95 })
    this.label(fmtPct(W[IT][CAT]), { className: 'tiny', position: wp(this.demoBot.bars[CAT].position.x, -0.22), opacity: 0.95 })
  }

  // --- the attention matrix: n×n heatmap of the real softmax weights ----------
  _buildMatrix() {
    const light = isLight()
    // heatmap ramp interpolated in sRGB (perceptual) space — a linear-space lerp
    // washes the light theme out (dark accents barely register against paper)
    const sRGB = (hex) => new THREE.Color(hex).convertLinearToSRGB()
    this._sLo = sRGB(light ? '#E7ECF4' : '#0C1526')
    this._sHi = sRGB(light ? '#0E7D93' : palette.cyan)
    this._sHot = sRGB(palette.hot)
    this._cellSkel = new THREE.Color(light ? '#DFE5EF' : '#0A101D')
    this._cellMasked = new THREE.Color(light ? '#C7CFDC' : '#05070E')

    this.matGroup = new THREE.Group()
    this.matGroup.position.copy(MAT_POS)
    this.add(this.matGroup)

    const cell = 0.42
    const gapC = 0.055
    const pitch = cell + gapC
    const G = N * pitch - gapC
    this._mG = G
    this._mPitch = pitch
    this._cellX = (k) => -G / 2 + cell / 2 + k * pitch
    this._cellY = (q) => G / 2 - cell / 2 - q * pitch

    const geo = new THREE.PlaneGeometry(cell, cell)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    this.cells = new THREE.InstancedMesh(geo, mat, N * N)
    for (let q = 0; q < N; q++) {
      for (let k = 0; k < N; k++) {
        _m4.makeTranslation(this._cellX(k), this._cellY(q), 0)
        this.cells.setMatrixAt(q * N + k, _m4)
        this.cells.setColorAt(q * N + k, this._cellSkel)
      }
    }
    this.cells.instanceMatrix.needsUpdate = true
    this.matGroup.add(this.cells)
    this.track({ dispose: () => this.cells.dispose() })

    // frame
    const fw = G / 2 + 0.12
    const framePts = [
      new THREE.Vector3(-fw, -fw, 0),
      new THREE.Vector3(fw, -fw, 0),
      new THREE.Vector3(fw, fw, 0),
      new THREE.Vector3(-fw, fw, 0),
    ]
    this.matGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(framePts), additiveLine(palette.muted, 0.5)))

    // moving row highlight
    const rw = G / 2 + 0.2
    const rh = cell / 2 + 0.07
    const rectPts = [
      new THREE.Vector3(-rw, -rh, 0.02),
      new THREE.Vector3(rw, -rh, 0.02),
      new THREE.Vector3(rw, rh, 0.02),
      new THREE.Vector3(-rw, rh, 0.02),
    ]
    this.rowRectMat = additiveLine(palette.amber, 0)
    this.rowRect = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(rectPts), this.rowRectMat)
    this.rowRect.position.y = this._cellY(0)
    this.matGroup.add(this.rowRect)

    // causal staircase boundary (right edge of the last allowed cell per row)
    const stair = []
    const xe = (k) => this._cellX(k) + pitch / 2
    const yt = (q) => this._cellY(q) + pitch / 2
    const yb = (q) => this._cellY(q) - pitch / 2
    stair.push(new THREE.Vector3(xe(0), yt(0), 0.03))
    for (let q = 0; q < N - 1; q++) {
      stair.push(new THREE.Vector3(xe(q), yb(q), 0.03))
      stair.push(new THREE.Vector3(xe(q + 1), yb(q), 0.03))
    }
    stair.push(new THREE.Vector3(xe(N - 1), yb(N - 1), 0.03))
    this.stairMat = additiveLine(palette.amber, 0)
    this.matGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(stair), this.stairMat))

    // axis + token labels (world positions)
    const wp = (x, y) => new THREE.Vector3(x, y, 0).add(MAT_POS)
    const rot = (t, deg) => `<span style="display:inline-block;transform:rotate(${deg}deg)">${t}</span>`
    this.label('keys', { className: 'tiny', position: wp(0, G / 2 + 1.06), opacity: 0.85 })
    const labQ = this.label('queries', { className: 'tiny', position: wp(-G / 2 - 1.25, 0), opacity: 0.85 })
    labQ.setText(rot(labQ.text, -90))
    for (let q = 0; q < N; q++) {
      this.label(TOKENS[q], { className: 'tiny muted', position: wp(-G / 2 - 0.52, this._cellY(q)), opacity: q === IT ? 0.95 : 0.62 })
    }
    for (let k = 0; k < N; k++) {
      const l = this.label(TOKENS[k], { className: 'tiny muted', position: wp(this._cellX(k) + 0.08, G / 2 + 0.46), opacity: k === CAT ? 0.95 : 0.62 })
      l.setText(rot(l.text, -52))
    }
    this.labMasked = this.label('masked', { pill: true, position: wp(G * 0.26, G * 0.28), opacity: 0 })
    this.labRowSum = this.label('each row sums to 1', { className: 'tiny muted', position: wp(0, -G / 2 - 0.5), opacity: 0.75 })
  }

  _rampInto(w, out, boost = 0) {
    const t = Math.min(1, Math.pow(Math.max(0, w), 0.7))
    const lo = this._sLo
    const hi = this._sHi
    let r = lo.r + (hi.r - lo.r) * t
    let g = lo.g + (hi.g - lo.g) * t
    let b = lo.b + (hi.b - lo.b) * t
    if (t > 0.72) {
      const u = ((t - 0.72) / 0.28) * 0.8
      const hot = this._sHot
      r += (hot.r - r) * u
      g += (hot.g - g) * u
      b += (hot.b - b) * u
    }
    if (boost > 0) {
      r += (hi.r - r) * boost
      g += (hi.g - g) * boost
      b += (hi.b - b) * boost
    }
    out.setRGB(r, g, b, THREE.SRGBColorSpace)
    return out
  }

  _refreshMatrix() {
    const s = this._mSweep
    const m = this._maskT
    const hiRow = s < N ? Math.max(0, Math.min(N - 1, Math.floor(s))) : IT
    for (let q = 0; q < N; q++) {
      const cols = s <= q ? 0 : s >= q + 1 ? N : Math.floor((s - q) * N)
      for (let k = 0; k < N; k++) {
        if (k >= cols) {
          this.cells.setColorAt(q * N + k, this._cellSkel)
          continue
        }
        if (k > q && m > 0) {
          this._rampInto(W[q][k], _c1).lerp(this._cellMasked, m)
        } else {
          const w = k <= q ? W[q][k] + (W_CAUSAL[q][k] - W[q][k]) * m : W[q][k]
          this._rampInto(w, _c1, q === hiRow && this._rectO > 0.05 ? 0.14 : 0)
        }
        this.cells.setColorAt(q * N + k, _c1)
      }
    }
    this.cells.instanceColor.needsUpdate = true
    this.rowRect.position.y = this._cellY(hiRow)
  }

  // --- three heads: separate wiring overlays + merge visual -------------------
  _buildHeads() {
    this.headFields = HEADS.map((h, hi) => {
      const f = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.55, baseOpacity: 0.55, flowSize: 0.13 })
      const z = (hi - 1) * 0.35
      for (let q = 0; q < N; q++) {
        let bk = -1
        let bw = -1
        for (let k = 0; k < N; k++) {
          if (k === q) continue
          if (h.W[q][k] > bw) {
            bw = h.W[q][k]
            bk = k
          }
        }
        const a = this.pos[bk].clone().setZ(z)
        const b = this.pos[q].clone().setZ(z)
        f.addEdge(a, b, this.headColors[hi], Math.max(0.75, Math.min(2.1, bw * 3)))
      }
      f.build()
      f.setLineOpacity(0)
      f.setFlowOpacity(0)
      this.add(f)
      return f
    })

    // legend (top-left, clear of the ring)
    this.legendOrbs = []
    this.legendLabs = []
    HEADS.forEach((h, hi) => {
      const y = 4.25 - hi * 0.62
      const orb = new GlowNode({ color: this.headColors[hi], radius: 0.09, halo: 0.6, glow: 1.2 })
      orb.position.set(-5.9, y, 0)
      orb.setLevel(0)
      this.add(orb)
      this.legendOrbs.push(orb)
      const lab = this.label(h.name, { className: 'tiny', position: new THREE.Vector3(-4.75, y, 0), opacity: 0 })
      lab.el.style.color = this.headColors[hi]
      this.legendLabs.push(lab)
    })

    // per-head outputs converge on "it" → one vector
    this.mergeOrbs = []
    const offs = [new THREE.Vector3(0, 0.85, 0.4), new THREE.Vector3(-0.74, -0.43, 0.4), new THREE.Vector3(0.74, -0.43, 0.4)]
    this._mergeStarts = offs.map((o) => this.pos[IT].clone().add(o))
    for (let i = 0; i < 3; i++) {
      const orb = new GlowNode({ color: this.headColors[i], radius: 0.1, halo: 0.7, glow: 1.3 })
      orb.position.copy(this._mergeStarts[i])
      orb.visible = false
      this.add(orb)
      this.mergeOrbs.push(orb)
    }
    this.labMerge = this.label('heads merge → one vector', {
      className: 'tiny',
      position: new THREE.Vector3(-4.15, -2.55, 0),
      opacity: 0,
    })
  }

  enter() {
    if (this.ctx.reduced) return
    gsap.from(this.camera.position, { z: 16, duration: 1.4, ease: 'power3.out' })
  }

  _cam(i) {
    const [x, y, z, lx, ly] = CAM[i] || CAM[0]
    const dur = this.ctx.reduced ? 0 : 1.5
    gsap.to(this.camera.position, { x, y, z, duration: dur, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: 0, duration: dur, ease: 'power3.inOut', overwrite: true })
  }

  onStep(i) {
    const states = [
      { focus: IT, head: COREF, mode: 'ambig' },
      { focus: IT, head: COREF, mode: 'qk' },
      { focus: IT, head: COREF, mode: 'scores' },
      { focus: IT, head: COREF, mode: 'weights' },
      { focus: IT, head: COREF, mode: 'off' }, // ÷√d stage
      { focus: IT, head: COREF, mode: 'gather' },
      { focus: IT, head: COREF, mode: 'reveal' },
      { focus: -1, head: COREF, mode: 'off' }, // matrix
      { focus: -1, head: COREF, mode: 'off' }, // mask
      { focus: -1, head: COREF, mode: 'heads' },
      { focus: -1, head: COREF, mode: 'web' },
    ]
    this.scripted = states[i] || states[0]
    this._cam(i)
    const rd = this.ctx.reduced

    // q/k/v chip visibility
    this._chipT.q = i === 1 || i === 2 ? 1 : i === 3 ? 0.4 : i === 5 ? 0.18 : 0
    this._chipT.k = this._chipT.q
    this._chipT.v = i === 5 ? 1 : 0
    if ((i === 1 || i === 5) && this._lastStep !== i && !rd) {
      const set = i === 1 ? [...this.chips.q, ...this.chips.k] : this.chips.v
      set.forEach((m, j) => {
        gsap.killTweensOf(m.scale)
        m.scale.setScalar(0.001)
        gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: 0.5, delay: 0.15 + (j % N) * 0.05, ease: 'back.out(1.8)' })
      })
    }

    // score/percent readouts
    if (i === 2 || i === 3) this._setScoreTexts(i)

    // ÷√d demo
    if (i === 4) {
      const zero = new Array(N).fill(0)
      if (rd) {
        this.demoTop.setValues(UNSCALED_IT, { highlight: CAT })
        this.demoBot.setValues(W[IT], { highlight: CAT })
      } else {
        this.demoTop.setValues(zero)
        this.demoBot.setValues(zero)
        this.demoTop.setTargets(UNSCALED_IT, { highlight: CAT })
        this.demoBot.setTargets(W[IT], { highlight: CAT })
      }
    }

    // attention matrix: row-by-row sweep, then the causal mask
    gsap.killTweensOf(this, '_mSweep,_maskT')
    if (i === 7) {
      if (rd || this._lastStep > 7) {
        this._mSweep = N + 1
      } else {
        this._mSweep = 0
        gsap.to(this, { _mSweep: N + 1, duration: 5.6, ease: 'none', delay: 0.7 })
      }
      if (this._maskT > 0) gsap.to(this, { _maskT: 0, duration: rd ? 0 : 0.8, ease: 'power2.out' })
    } else if (i === 8) {
      this._mSweep = N + 1
      if (rd) this._maskT = 1
      else gsap.to(this, { _maskT: 1, duration: 1.8, ease: 'power2.inOut', delay: 0.5 })
    } else if (this._maskT !== 0 || (i < 7 && this._mSweep !== 0)) {
      this._maskT = 0
      if (i < 7) this._mSweep = 0
    }
    this._mLastSweep = -1 // force refresh

    // multi-head merge animation
    if (this._mergeTl) {
      this._mergeTl.kill()
      this._mergeTl = null
    }
    if (i === 9) {
      this.mergeOrbs.forEach((o, j) => {
        o.visible = true
        o.position.copy(this._mergeStarts[j])
        o.setLevel(0.9)
      })
      if (!rd) {
        this._mergeTl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 0.6 })
        this.mergeOrbs.forEach((o, j) => {
          this._mergeTl.fromTo(
            o.position,
            { x: this._mergeStarts[j].x, y: this._mergeStarts[j].y },
            { x: this.pos[IT].x, y: this.pos[IT].y, duration: 1.15, ease: 'power2.in' },
            j * 0.12,
          )
        })
      }
    } else {
      this.mergeOrbs.forEach((o) => (o.visible = false))
    }

    this._lastStep = i
    if (this.hoverFocus < 0) this._setActive(this.scripted)
  }

  _setActive(s) {
    this.active = s
    this._applyState()
  }

  // Dark theme: weight 0 → additive black → gone. Light theme: normal blending
  // renders color×0 as a dark gray line, so "hidden" edges instead take the
  // background color at full weight (nodes occlude them; background swallows them).
  _hideEdge(idx) {
    if (isLight()) {
      this.attn.setColor(idx, palette.void)
      this.attn.setWeight(idx, 1)
    } else {
      this.attn.setWeight(idx, 0)
    }
  }

  // Dark: weight scales additive brightness (native EdgeField semantics).
  // Light: that inverts (color×w darkens toward black), so weight becomes ink
  // density instead — a mix from the paper background toward the full accent.
  _setBeam(idx, color, w) {
    if (!isLight()) {
      this.attn.setColor(idx, color)
      this.attn.setWeight(idx, w)
      return
    }
    if (w <= 0.001) {
      this._hideEdge(idx)
      return
    }
    const t = Math.min(1, 0.18 + 0.82 * Math.pow(Math.min(1, w / 1.7), 0.75))
    _c2.set(color).convertLinearToSRGB()
    _c3.set(palette.void).convertLinearToSRGB()
    _c3.setRGB(_c3.r + (_c2.r - _c3.r) * t, _c3.g + (_c2.g - _c3.g) * t, _c3.b + (_c2.b - _c3.b) * t, THREE.SRGBColorSpace)
    this.attn.setColor(idx, _c3)
    this.attn.setWeight(idx, 1)
  }

  _applyState() {
    for (let q = 0; q < N; q++) {
      for (let k = 0; k < N; k++) {
        if (q === k) continue
        this._hideEdge(this.edgeIndex[q][k])
      }
    }
    const s = this.active
    this._topKey = -1
    if (!s || s.mode === 'off' || s.mode === 'qk' || s.mode === 'heads') return

    if (s.mode === 'ambig') {
      const c = this.headColors[COREF]
      this._setBeam(this.edgeIndex[IT][CAT], c, 0.85)
      this._setBeam(this.edgeIndex[IT][MAT], c, 0.85)
      return
    }

    if (s.mode === 'web') {
      for (let q = 0; q < N; q++) {
        for (let k = 0; k < N; k++) {
          if (q === k) continue
          this._setBeam(this.edgeIndex[q][k], palette.cyan, 0.17)
        }
      }
      return
    }

    // focused modes: scores | weights | gather | reveal
    const f = s.focus
    const head = HEADS[s.head]
    const row = head.W[f]
    const raw = head.raw[f]
    const color = this.headColors[s.head]
    let maxK = -1
    let maxV = -1
    let rMin = Infinity
    let rMax = -Infinity
    for (let k = 0; k < N; k++) {
      if (k === f) continue
      if (row[k] > maxV) {
        maxV = row[k]
        maxK = k
      }
      rMin = Math.min(rMin, raw[k])
      rMax = Math.max(rMax, raw[k])
    }
    for (let k = 0; k < N; k++) {
      if (k === f) continue
      let w
      if (s.mode === 'scores') w = 0.3 + 0.62 * ((raw[k] - rMin) / Math.max(1e-6, rMax - rMin))
      else if (s.mode === 'weights') w = row[k] * 2.0
      else if (s.mode === 'gather') w = row[k] * 2.4
      else w = k === maxK ? row[k] * 2.6 : row[k] * 0.12 // reveal
      this._setBeam(this.edgeIndex[f][k], color, Math.min(2.4, w))
    }
    this._topKey = maxK
  }

  _move(e) {
    if (e.target.closest('a,button,.beat-card')) return
    _ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    _ray.setFromCamera(_ndc, this.camera)
    const hit = _ray.intersectObjects(this.nodeMeshes, false)[0]
    const j = hit ? hit.object.userData.tokenIndex : -1
    document.body.style.cursor = j >= 0 ? 'pointer' : ''
    if (j !== this.hoverFocus) {
      this.hoverFocus = j
      if (j >= 0) this._setActive({ focus: j, head: this.scripted.head, mode: 'weights' })
      else this._setActive(this.scripted)
    }
  }

  update(dt, t) {
    const rd = this.ctx.reduced
    const step = this.step
    this.attn.update(dt)
    this.camera.lookAt(this.lookTarget)

    // --- token activation per mode ------------------------------------------
    const s = this.active
    const mode = s ? s.mode : 'off'
    for (let i = 0; i < N; i++) {
      let target = 0.42
      if (mode === 'ambig') {
        if (i === s.focus) target = 1
        else if (i === CAT) target = 0.62 + (rd ? 0.15 : Math.sin(t * 2.2) * 0.28)
        else if (i === MAT) target = 0.62 + (rd ? 0.15 : Math.sin(t * 2.2 + Math.PI) * 0.28)
      } else if (mode === 'qk') target = 0.58
      else if (mode === 'scores') target = i === s.focus ? 1 : 0.6
      else if (mode === 'weights' || mode === 'gather') target = i === s.focus ? 1 : i === this._topKey ? 0.85 : 0.45
      else if (mode === 'reveal') target = i === s.focus ? 1 : i === this._topKey ? 0.95 : 0.32
      else if (mode === 'heads') target = 0.62
      else if (mode === 'web') target = 0.55
      else target = 0.3 // off: ring rests while other stages star
      this.levels[i] = rd ? target : damp(this.levels[i], target, 6, dt)
      this.tokenNodes[i].setLevel(this.levels[i] + (rd ? 0 : Math.sin(t * 1.6 + i) * 0.05))
    }

    // --- chips ----------------------------------------------------------------
    for (const key of ['q', 'k', 'v']) {
      this._chipO[key] = rd ? this._chipT[key] : damp(this._chipO[key], this._chipT[key], 6, dt)
      this.chipMats[key].opacity = this._chipO[key] * 0.95
    }
    this.chipGroup.visible = this._chipO.q > 0.02 || this._chipO.v > 0.02
    if (this.chipGroup.visible && !rd) {
      for (let i = 0; i < N; i++) this.chips.q[i].rotation.z = t * 0.8 + i
    }
    this.labQ.setOpacity((step === 1 || step === 2 ? 0.95 : 0) * this._chipO.q)
    this.labK.setOpacity((step === 1 || step === 2 ? 0.95 : 0) * this._chipO.k)
    this.labV.setOpacity(step === 5 ? this._chipO.v * 0.95 : 0)

    // --- beat-scoped labels ----------------------------------------------------
    // closeup beat: only the tokens in the story keep their pills (the rest would
    // float over the prose card at this camera distance)
    for (let i = 0; i < N; i++) {
      const on = step !== 6 || i === IT || i === CAT || i === MAT
      this.tokenLabs[i].setOpacity(on ? 0.9 : 0)
    }
    this.labAmbig.setOpacity(step === 0 ? 0.95 : 0)
    this.labWeb.setOpacity(step === 10 ? 0.9 : 0)
    const labsOn = (step === 2 || step === 3) && (this.hoverFocus < 0 || this.hoverFocus === IT)
    for (const sl of this.scoreLabs) sl.lab.setOpacity(labsOn ? 0.95 : 0)

    // --- ÷√d demo ---------------------------------------------------------------
    this.demoTop.lerp(dt, { color: palette.magenta, hot: palette.hot })
    this.demoBot.lerp(dt, { color: palette.cyan, hot: palette.hot })

    // --- attention matrix -------------------------------------------------------
    const rectTarget = step === 7 ? 0.95 : step === 8 ? 0.3 : 0
    this._rectO = rd ? rectTarget : damp(this._rectO, rectTarget, 6, dt)
    this.rowRectMat.opacity = this._rectO
    this.stairMat.opacity = this._maskT * 0.95
    this.labMasked.setOpacity(this._maskT * 0.95)
    if (this._mSweep !== this._mLastSweep || this._maskT !== this._mLastMask) {
      this._mLastSweep = this._mSweep
      this._mLastMask = this._maskT
      this._refreshMatrix()
    }

    // --- multi-head overlays -----------------------------------------------------
    const headsOn = mode === 'heads' ? 1 : 0
    this._headsMix = rd ? headsOn : damp(this._headsMix, headsOn, 5, dt)
    for (const f of this.headFields) {
      f.setLineOpacity(0.62 * this._headsMix)
      f.setFlowOpacity(0.95 * this._headsMix)
      if (this._headsMix > 0.01) f.update(dt)
    }
    this._legendO = rd ? (step === 9 ? 1 : 0) : damp(this._legendO, step === 9 ? 1 : 0, 6, dt)
    this.legendOrbs.forEach((o) => o.setLevel(this._legendO * 0.9))
    this.legendOrbs.forEach((o) => (o.visible = this._legendO > 0.03))
    this.legendLabs.forEach((l) => l.setOpacity(this._legendO * 0.95))
    this.labMerge.setOpacity(step === 9 ? this._legendO * 0.9 : 0)
  }

  dispose() {
    window.removeEventListener('pointermove', this._onMove)
    document.body.style.cursor = ''
    if (this._mergeTl) this._mergeTl.kill()
    gsap.killTweensOf(this)
    super.dispose()
  }
}
