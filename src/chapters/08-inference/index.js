import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { BarField } from '../../lib/BarField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { glowBasic } from '../../lib/materials.js'
import { TOKENS } from '../../lib/example.js'
import { palette } from '../../theme/palette.js'
import { damp, clamp01, remap } from '../../theme/motion.js'

// Chapter 07 — Inference. The reply is written one token at a time by a loop.
//   Beats 0–3 hold a fixed prompt and study one distribution (prefill, logits→
//   softmax, temperature). Beats 4–6 run the autoregressive loop live: sample →
//   append → the token's K/V is cached → repeat. The KV cache (a column of cells
//   above each token) is the star: prefill flares every column at once; decode
//   adds exactly one new column and freezes the rest — and a cost meter contrasts
//   O(n) per step (with cache) vs O(n²) (recompute).
const PROMPT_LEN = 5 // "The cat sat on the"
const EXTRA = ['and', 'dozed', 'by', 'the', 'fire', 'for', 'hours']
const WORDS_FULL = [...TOKENS, ...EXTRA] // 17 tokens; index 5 ("mat") is the first prediction

// --- the next-token distribution shown in beats 1–3 -----------------------------
const BAR_COUNT = 12
const BAR_WIDTH = 0.3
const BAR_GAP = 0.16
const BAR_MAXH = 3.0
const BAR_BASE_Y = 1.5

// candidate words under a few bars; index 4 ("mat") is the clear peak
const CANDIDATES = ['floor', 'rug', 'sofa', 'bed', 'mat', 'lap', 'chair', 'sill', 'step', 'box', 'roof', 'grass']
const LABELLED = [1, 2, 4, 5, 8]
const BEAT1_PEAK = 4
const BEAT1 = [0.12, 0.3, 0.55, 0.4, 1.0, 0.62, 0.22, 0.1, 0.18, 0.08, 0.06, 0.14]

const CORE_Y = 0
const RIBBON_Y = -3.25
const KV_K_Y = -2.62 // key cell, just above the token tile
const KV_V_Y = -2.4 // value cell, stacked above the key
const KV_STORED = 0.42 // resting brightness of a cached (frozen) cell
const MAX_CELLS = 22

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 08 · how it answers you</span>
      <h2>Inference</h2>
      <p class="lead">Training is over and the weights are frozen for good. <strong>Inference</strong> is the finished model put to work — what runs every time you hit send. Underneath, it is nothing but a loop that writes the reply <strong>one token at a time</strong>.</p>
      <p>At the bottom sits your <span class="tok">prompt</span>, chopped into tokens. It flows up into the model core, whose only job is to score which token should come next.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Prefill — read it all at once</h3>
      <p>Before writing a word, the model processes your <em>entire</em> prompt in a single parallel pass — every token at the same time. This is <strong>prefill</strong>, and as it runs, each token leaves behind a little bundle of computed numbers parked just above it: its <strong>K</strong> and <strong>V</strong> — the keys and values from the attention chapter.</p>
      <p>That is why a long prompt makes you wait a beat before the reply starts: prefill simply has more to read. The pause you feel is the <span class="tok">time to first token</span>.</p>
      <p class="aside">Prefill is compute-bound — one big, matrix-heavy pass over the whole prompt at once.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Logits → softmax</h3>
      <p>The core does not pick a word. It emits one raw score — a <strong>logit</strong> — for every token in its vocabulary, tens of thousands of them. <strong>Softmax</strong> then squashes those scores into clean probabilities that add up to 1: a full <strong>distribution</strong> over what comes next.</p>
      <p>After <span class="tok">…&nbsp;sat on the</span>, one bar towers over the rest — <span class="tok">mat</span> — yet almost every other word still keeps a sliver of a chance.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Temperature &amp; sampling</h3>
      <p>Now <strong>sample</strong> one token from those odds. A single dial, the <strong>temperature</strong>, reshapes them first: every logit is divided by T before softmax. <span style="color:var(--lime)">Low T</span> sharpens the peak — at T→0 it becomes <em>greedy</em>, always taking the top token. <span style="color:var(--amber)">High T</span> flattens the curve, giving rarer words a real shot. Watch the bars breathe as T turns.</p>
      <p class="aside">Temperature reshapes the whole curve; <span class="tok">top-k</span> and <span class="tok">top-p</span> instead lop off the unlikely tail before drawing. Different knobs, often combined.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Append, then feed back</h3>
      <p>The sampled token drops down and joins the sequence — and at once becomes part of the input for the next prediction. Watch the loop close: <em>score → sample → append → score…</em> a sentence writing itself.</p>
      <p>Each new token does only a sliver of fresh work: it computes its own K and V, then attends over everything already cached. The loop runs until the model draws a special <strong>stop</strong> token — its way of saying "I'm done."</p>`,
  },
  {
    side: 'right',
    html: `<h3>The KV cache — why it stays fast</h3>
      <p>Here is the trick that makes this practical. Once a token's K and V are computed they never change — so the model <strong>keeps them</strong> instead of recomputing. That stored pile is the <strong>KV cache</strong>, and the cells stacked above each token <em>are</em> that cache.</p>
      <p>Without it, every new token would re-process the whole passage from scratch, work piling up as the square of the length — <span class="tok">O(n²)</span>. With it, each step adds just one column and reads the rest — roughly flat, <span class="tok">O(n) per token</span>. The meter on the left shows the gap widening.</p>
      <p class="aside">The cache is also why long chats cost more memory: it grows with every token, and the model reads all of it on every step.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The loop</h3>
      <div class="postcard">Inference is a loop: prefill the prompt, score every token (logits → softmax), sample one, append it, repeat — with the KV cache holding past work so every step stays cheap.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/sampling">sampling</a>
        <a class="deepdive" data-route="/frontier">next: Frontier →</a>
      </div>`,
  },
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
    this._costGrow = 0
    this._costGrowT = 0
    this._costVis = 0
    this._costVisT = 0

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

    // --- labels --------------------------------------------------------------
    this.distCaption = this.label('p( next token )', { position: new THREE.Vector3(0, BAR_BASE_Y + BAR_MAXH + 0.55, 0), opacity: 1 })
    this.tempLabel = this.label('temperature', { position: new THREE.Vector3(2.95, BAR_BASE_Y + 2.9, 0), opacity: 0 })
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

  // two bars contrasting cost per step: recompute (grows ~n) vs cache (flat)
  _buildCostMeter() {
    this.costGroup = new THREE.Group()
    this.costGroup.position.set(-4.35, -0.4, 0)
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
    this.lblCostR = this.label('recompute O(n²)', { className: 'tiny', position: new THREE.Vector3(-4.67, 0.5, 0), offset: [0, -8], opacity: 0 })
    this.lblCostC = this.label('cached O(n)', { className: 'tiny', position: new THREE.Vector3(-4.03, -0.7, 0), offset: [0, 12], opacity: 0 })
  }

  // the "sampled token" travelling from the winning bar down into the cache
  _buildMote() {
    this.mote = new GlowNode({ color: palette.hot, radius: 0.16, halo: 1.1, glow: 1.7 })
    this.mote.visible = false
    this.add(this.mote)
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
    this._costVisT = i >= 5 ? 1 : 0
    switch (i) {
      case 0: // intro — overview, KV not computed yet
        this._stopGen()
        this._showCandidates(false)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 1)
        this._fade(this.kvLabel, 0)
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(0, false)
        this.barField.setTargets(BEAT1, { highlight: -1 })
        this._setEmitWeights(BEAT1)
        break
      case 1: // prefill — every prompt column flares at once (parallel pass)
        this._stopGen()
        this._showCandidates(false)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 1)
        this._fade(this.kvLabel, 1)
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
        this._showCandidates(true)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 1)
        this._fade(this.kvLabel, 0.55)
        this.ribbonName.setText(this.L('prompt'))
        this.filled = PROMPT_LEN
        this.ribbon.setFilled(PROMPT_LEN, { rainbow: true })
        this._setKV(PROMPT_LEN, false)
        this.barField.setTargets(BEAT1, { highlight: -1 })
        this._setEmitWeights(BEAT1)
        break
      case 3: // temperature
        this._stopGen()
        this._showCandidates(true)
        this._fade(this.tempLabel, 1)
        this._fade(this.distCaption, 1)
        this._fade(this.kvLabel, 0)
        this._setKV(PROMPT_LEN, false)
        this.barField.setTargets(BEAT1, { highlight: BEAT1_PEAK }) // temperature animates in update()
        break
      case 4: // append & feed back — start the live loop
        this._showCandidates(false)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 0)
        this._fade(this.kvLabel, 0)
        this.ribbonName.setText(this.L('generating…'))
        this._startGen()
        break
      case 5: // KV cache — cost meter
        this._showCandidates(false)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 0)
        this._fade(this.kvLabel, 1)
        this.ribbonName.setText(this.L('KV cache grows by one each step'))
        this._ensureGen()
        break
      case 6: // the loop
        this._showCandidates(false)
        this._fade(this.tempLabel, 0)
        this._fade(this.distCaption, 0)
        this._fade(this.kvLabel, 0.4)
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

  // --- per-beat helpers --------------------------------------------------------
  _settleCamera(i) {
    const views = [
      { y: 0.3, z: 13.5, ly: -0.2 }, // 0 overview
      { y: -1.0, z: 12.6, ly: -2.0 }, // 1 prefill — tilt to prompt + KV
      { y: 1.0, z: 11.8, ly: 1.3 }, // 2 logits — lean into bars
      { y: 1.0, z: 11.6, ly: 1.3 }, // 3 temperature
      { y: -0.2, z: 13.8, ly: -0.6 }, // 4 append — whole loop
      { y: -0.7, z: 13.0, ly: -1.5 }, // 5 KV cache — tilt to columns + meter
      { y: 0.2, z: 14.4, ly: -0.3 }, // 6 the loop
    ]
    const v = views[i] || views[0]
    const d = this.ctx.reduced ? 0 : 1.4
    gsap.to(this.camera.position, { x: 0, y: v.y, z: v.z, duration: d, ease: 'power3.inOut' })
    gsap.to(this.lookTarget, { x: 0, y: v.ly, z: 0, duration: d, ease: 'power3.inOut' })
  }

  _showCandidates(on) {
    for (const l of this.candidateLabels) this._fade(l, on ? 1 : 0)
  }

  _fade(label, to) {
    gsap.to(label, { _opacity: to, duration: this.ctx.reduced ? 0 : 0.4, ease: 'power2.out' })
  }

  _reducedSnapshot(i) {
    // a calm, static frame per beat — no loop, no temperature breathing
    if (i < 4) {
      this._setKV(i >= 1 ? PROMPT_LEN : 0, false)
      if (i === 3) {
        const sh = BEAT1.map((v) => Math.pow(v, 1 / 0.7))
        this.barField.setTargets(sh, { highlight: BEAT1_PEAK })
        this._setEmitWeights(sh)
      }
      return
    }
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
    this.barField.lerp(dt, { hot: palette.amber })
    if (!rd) this.flux.update(dt)
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

    // beat 3: breathe the temperature, reshaping the tail of the distribution
    if (this.step === 3 && !rd) {
      const T = remap(Math.sin(t * 0.8), -1, 1, 0.45, 2.4)
      const inv = 1 / T
      const shaped = BEAT1.map((v) => Math.pow(v, inv))
      this.barField.setTargets(shaped, { highlight: BEAT1_PEAK })
      this._setEmitWeights(shaped)
      const tag = this.L(T < 0.85 ? 'sharp' : T > 1.6 ? 'flat' : 'mid')
      const s = `T ${T.toFixed(1)} · ${tag}`
      if (s !== this._tempStr) {
        this._tempStr = s
        this.tempLabel.setText(s)
      }
    }

    // beats 4+: the autoregressive loop, one token per interval
    if (this._genMode && !rd) {
      this._genTimer += dt
      if (this._genTimer >= this._genInterval) {
        this._genTimer -= this._genInterval
        this._tick()
      }
    }

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
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this.mote.position)
    for (const l of this._labels) gsap.killTweensOf(l)
    super.dispose()
  }
}
