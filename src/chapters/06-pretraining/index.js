import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { BarField } from '../../lib/BarField.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additivePoints, additiveLine, glowBasic } from '../../lib/materials.js'
import { palette, C, seriesColor } from '../../theme/palette.js'
import { damp, clamp01, lerp, smoothstep } from '../../theme/motion.js'
import { blend } from '../../theme/theme.js'

// Chapter 06 — Pretraining → ChatGPT, in ten beats around one magenta core:
//   0-1  the GAME: predict the next token — a guess vs the revealed truth, the loss
//   2    the DIET: the raw web falls through filter/dedup/scrub gates → ~15T tokens
//   3    the SCALE: a token ocean pouring through the very same loop
//   4    the WHY: four blanks (code/facts/grammar/logic) — all lower the same loss
//   5    the LAWS: three dials drive a predictable falling curve (Chinchilla)
//   6    the RUN: a real loss-vs-tokens curve with capability milestones, ending
//        in the artifact — a checkpoint slab of pure numbers
//   7-8  the GAP: completer vs helper strips; SFT gold demos light the second one,
//        a reward-model judge learns from A/B picks
//   9    the BRIDGE: write → score → nudge loop, handing off to the RL chapter

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

const VIS_KEYS = ['predict', 'funnel', 'scale', 'exam', 'laws', 'run', 'duo', 'loop']
const V = (o = {}) => {
  const r = {}
  for (const k of VIS_KEYS) r[k] = o[k] || 0
  return r
}

// --- data funnel (beat 2): the raw web falls through three shrinking gates ----
const F_TOP = 3.7
const F_BOT = -3.1
const F_GATES = [
  { y: 1.7, hx: 2.5, hz: 0.75, name: 'filter', c: 'cyan' },
  { y: 0.3, hx: 1.6, hz: 0.55, name: 'dedup', c: 'violet' },
  { y: -1.1, hx: 0.85, hz: 0.38, name: 'scrub', c: 'amber' },
]
const F_GY = [1.7, 0.3, -1.1]
// half-width of the falling sheet as a function of height (funnels into each gate)
const F_KNOTS = [
  [F_TOP, 3.3],
  [1.7, 2.25],
  [0.3, 1.4],
  [-1.1, 0.72],
  [F_BOT, 0.42],
]

// --- exam wall (beat 4): four domains, four blanks, one loss -------------------
const EXAMS = [
  { cat: 'code', text: 'def add(a, b): return a +', ans: 'b', bx: -3.45, w: 2.7, blank: -1.6, y: 2.15, c: 'cyan' },
  { cat: 'facts', text: 'The Eiffel Tower is in', ans: 'Paris', bx: 2.75, w: 2.45, blank: 4.45, y: 2.15, c: 'amber' },
  { cat: 'grammar', text: 'The keys to the car', ans: 'are', bx: -3.3, w: 2.2, blank: -1.7, y: -1.85, c: 'violet' },
  { cat: 'logic', text: '2, 4, 8, 16,', ans: '32', bx: 2.9, w: 1.7, blank: 4.2, y: -1.85, c: 'lime' },
]

// --- the run (beat 6): loss vs tokens-seen (log feel), milestones, checkpoint --
const RX0 = -3.9
const RX1 = 3.2
const R_TOP = 2.1
const R_FLOOR = -0.78 // asymptote of the curve
const R_ENT = -1.15 // irreducible-entropy line
const R_AXY = -1.7 // x-axis height
const MILES = [
  { u: 0.1, n: 'grammar', c: 'cyan', lift: 0.55 },
  { u: 0.34, n: 'facts', c: 'amber', lift: 0.8 },
  { u: 0.58, n: 'code', c: 'violet', lift: 0.55 },
  { u: 0.86, n: 'reasoning', c: 'lime', lift: 0.45 },
]

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
      <p>That score nudges the model's billions of <em>weights</em> a hair toward being less wrong next time. It is the exact loop from the Learning chapter — forward, loss, backward, nudge — just scaled beyond recognition. Then slide the window one token along and repeat: every position in every document is a free example.</p>
      <p class="aside">Nobody labelled any of this: the next word is its own answer key. That is <strong>self-supervised learning</strong> — and the loss it drives down is <strong>cross-entropy</strong>, which rewards putting probability on the token that actually came next.</p>`,
  },
  {
    side: 'left',
    html: `<h3>First, the diet: the internet, strained</h3>
      <p>Before any training run starts, someone has to assemble what the model will read. It begins as a <strong>crawl</strong> of the open web — billions of pages, most of them junk: boilerplate menus, SEO spam, the same article mirrored ten thousand times.</p>
      <p>So the raw crawl falls through a pipeline. <strong>Quality filters</strong> drop the machine-generated sludge, <strong>deduplication</strong> collapses the mirrors to one copy, and scrubbers strip toxic content and personal data. Most of what goes in never comes out.</p>
      <p>What survives is the <strong>training diet</strong>: on the order of <strong>15&nbsp;trillion tokens</strong> — tens of millions of books' worth, more text than a person could read in thousands of lifetimes. And every single token will serve as one tiny exam question.</p>
      <p class="aside">Curation moves the needle about as much as model size does — a mid-sized model on a clean, well-balanced mix routinely beats a bigger one trained on raw crawl. The exact recipes — how much code, how much math, what gets upweighted — are among the best-kept secrets of every frontier lab.</p>`,
  },
  {
    side: 'right',
    html: `<h3>One sentence becomes an ocean</h3>
      <p>A single example teaches almost nothing — one faint nudge spread across billions of weights. The magic is what happens when the whole diet pours through: books, papers, forums, code, conversations, all playing the very same guess-check-nudge game.</p>
      <p><em>Every position in every document</em> is a free exam, graded automatically at millions of tokens per second — no human ever writes an answer key, because the next word <em>is</em> the answer key.</p>
      <p>To keep filling blanks well — across grammar, gossip, case law, and C++ — the model can't help but get organized. Watch the counter.</p>`,
  },
  {
    side: 'left',
    html: `<h3>You can't memorize your way out</h3>
      <p>Why does fill-in-the-blank produce something that feels like understanding? Because at this scale <strong>memorization is hopeless</strong>: the diet holds dozens of tokens for every weight, and almost every blank the model meets is one it has never seen.</p>
      <p>The only strategy that keeps lowering the loss is to learn the <em>machinery that generated the text</em>: the grammar that makes the next word <span class="tok">are</span> and not <span class="tok">is</span>, the fact that pins <span class="tok">Paris</span> to the Eiffel Tower, the syntax that closes a Python function, the pattern that continues <span class="tok">2, 4, 8, 16</span>. Grammar, facts, style, code, step-by-step logic — each lives in the weights because it shaved a little more off the prediction error.</p>
      <p class="aside">The sharp way to say it: next-token prediction is <strong>compression</strong>. A model that puts higher probability on the real next token is literally a shorter code for the training data — each token costs about its cross-entropy in bits — and the only way to compress deeply is to capture the regularities that produced the data. "Just predicting the next word" quietly demands a model of the world that wrote the words.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Scaling laws</h3>
      <p>Three levers decide how good it gets: more <strong>data</strong>, more <strong>compute</strong> (raw calculation, in GPU-hours), and more <strong>parameters</strong> (the weights, counted in the billions). Turn all three up together and the loss keeps falling.</p>
      <p>The startling part is how <em>predictably</em> it falls — a smooth power law, a near-straight line on a log-log plot. So researchers train small, cheap models and forecast a giant one's loss before spending a cent on it.</p>
      <p class="aside">That predictability justified fortunes on ever-bigger runs — the curve all but promises the payoff in advance. The 2022 <strong>Chinchilla</strong> result added a correction: for a fixed compute budget, loss is minimized by growing data and parameters <em>together</em> — roughly 20 tokens per parameter — and by that yardstick many early giants had been badly undertrained on data for their size.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Months, megawatts, one number</h3>
      <p>An actual frontier run is an industrial event: <strong>tens of thousands of GPUs</strong> locked into one synchronized job, drawing megawatts for <strong>months</strong> of wall-clock time, hardware failing daily while engineers babysit the restarts.</p>
      <p>And the whole effort is steered by a single number — the loss, inching down a curve like this one: a fast plunge in the first days, then a long stubborn tail where every hundredth is bought with weeks of compute. Along the way, abilities simply <em>switch on</em>: clean grammar almost immediately, then facts, then working code, and multi-step reasoning late. Nobody flips those switches; they emerge as the loss falls.</p>
      <p>The artifact at the end is almost anticlimactic: a <strong>checkpoint</strong> — a file of pure numbers. Two hundred billion floating-point values, a few hundred gigabytes. Paris, Python, the shape of an apology: everything the model knows lives in those numbers.</p>
      <p class="aside">The wiggles are real. Runs suffer <em>loss spikes</em> — a bad data batch, a numerical hiccup — and the standard fix is to rewind to the last good checkpoint, skip the offending batch, and carry on. Checkpoints aren't bookkeeping; they're the run's lifeline.</p>`,
  },
  {
    side: 'right',
    html: `<h3>A completer, not a helper</h3>
      <p>All of that buys you a <strong>base model</strong>, and it does exactly one thing: continue text. Often that looks like knowledge on tap — hand it <span class="tok">The capital of France is</span> and there is only one plausible continuation: <span class="tok">Paris</span>.</p>
      <p>Now hand it <span class="tok">help me write an email to my landlord</span>. A helpful reply? Often not — it is just as likely to continue with <em>more requests</em>: "…and a complaint letter. …and a refund request." On the internet, a line like that usually lives in a <em>list</em> of writing prompts, and the most probable next token simply continues the list.</p>
      <p>Nothing is broken. The model is doing precisely what it was trained to do — it was just never trained to be <em>for</em> anyone. That gap — <strong>completer versus helper</strong> — is exactly what the final stage exists to close.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Teaching it to behave</h3>
      <p>The fix is a second phase — <strong>post-training</strong>, or <em>alignment</em> — and it starts with plain imitation. In <strong>supervised fine-tuning (SFT)</strong>, skilled people write thousands of <strong>golden demonstrations</strong> — ideal answers to real requests — and the model trains on them with the same next-token machinery. A tiny dataset by pretraining standards, but it re-cuts the default move. Watch the second strip light up: same knowledge, new reflex — answer the person.</p>
      <p>Demonstrations can't cover everything, so the next tool is judgment: people are shown <strong>pairs</strong> of model answers and pick the better one. Thousands of those picks train a separate <strong>reward model</strong> — a judge that can score any answer roughly the way people would.</p>
      <p class="aside">Why train a judge instead of writing more answers? Leverage. A human comparison takes seconds, and once distilled into a reward model it can grade <em>millions</em> of practice answers — no team of humans could keep up with the model's appetite for feedback.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Practice, and the hand-off</h3>
      <p>The last ingredient is practice. The model writes an answer, the judge scores it, and the weights nudge toward whatever scores higher — around and around, millions of times. That loop — write, score, nudge — is <strong>reinforcement learning</strong>, and it gets the next chapter to itself.</p>
      <p>It is the same network all the way through: pretraining poured in the knowledge; post-training draws out the helpfulness. Neither works alone — a base model knows but won't cooperate, and alignment with nothing underneath has nothing to say.</p>
      <div class="postcard">Pretraining makes it <strong>know</strong>. Alignment makes it <strong>helpful</strong>. Together, that's ChatGPT.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF</a>
        <a class="deepdive" data-route="/rl">next: Reinforcement Learning →</a>
      </div>`,
  },
]

// per-beat stage direction: camera, which sub-scene is lit, scalar states
const CFG = [
  { cam: [0, 0.2, 9.5, 0, 0.1, 0], vis: V({ predict: 1 }), truth: 0, dials: 0, align: 0, core: 1 }, // 0 guess
  { cam: [0, 0.2, 9.0, 0, 0.1, 0], vis: V({ predict: 1 }), truth: 1, dials: 0, align: 0, core: 1 }, // 1 truth + loss
  { cam: [-1.15, 2.7, 13.2, -1.15, 0.05, 0], vis: V({ funnel: 1 }), truth: 1, dials: 0, align: 0, core: 0 }, // 2 diet
  { cam: [0, 0.4, 14.5, 0, 0, -2], vis: V({ scale: 1 }), truth: 1, dials: 0, align: 0, core: 1 }, // 3 ocean
  { cam: [-1.2, 0.15, 11.6, -1.2, 0.15, 0], vis: V({ exam: 1 }), truth: 1, dials: 0, align: 0, core: 1 }, // 4 forced skills
  { cam: [0.4, 0.2, 9.6, 0.4, -0.2, 0], vis: V({ laws: 1 }), truth: 1, dials: 1, align: 0, core: 0.18 }, // 5 laws
  { cam: [-1.1, 0.35, 12.8, -1.1, 0.35, 0], vis: V({ run: 1 }), truth: 1, dials: 0, align: 0, core: 0 }, // 6 the run
  { cam: [1.3, 0.85, 12.0, 1.3, 0.8, 0], vis: V({ duo: 1 }), truth: 1, dials: 0, align: 0, core: 0 }, // 7 completer
  { cam: [-1.0, -0.2, 13.0, -1.0, -0.25, 0], vis: V({ duo: 1 }), truth: 1, dials: 0, align: 1, core: 0 }, // 8 SFT + RM
  { cam: [0, 0.1, 11.6, 0, 0.05, 0], vis: V({ loop: 1 }), truth: 1, dials: 0, align: 1, core: 1 }, // 9 RL bridge
]

const BLOOM = [
  [0.95, 0.5, 0.78], [1.05, 0.55, 0.72], [1.1, 0.55, 0.7], [1.2, 0.6, 0.66], [1.0, 0.55, 0.74],
  [0.95, 0.5, 0.78], [1.0, 0.55, 0.72], [0.9, 0.5, 0.78], [1.0, 0.55, 0.74], [1.1, 0.55, 0.7],
]

export default class Pretraining extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(...BLOOM[0])
    this.addAmbientField(300, 70)
    this.addLights({ rim: 0xec4899 })
    this.camera.position.set(0, 0.2, 9.5)
    this.lookTarget = new THREE.Vector3(0, 0.1, 0)

    this._buildCore()
    this._buildPredict()
    this._buildFunnel()
    this._buildScale()
    this._buildExam()
    this._buildLaws()
    this._buildRun()
    this._buildDuo()
    this._buildLoop()

    // damped scalars
    this.vis = { ...CFG[0].vis }
    this.visT = CFG[0].vis
    this.truth = 0
    this.truthT = 0
    this.dials = 0
    this.dialsT = 0
    this.align = 0
    this.alignT = 0
    this.coreV = 1
    this.coreT = 1
    this._coreLevel = 0.9
    this._counter = 1
    this._counterStr = ''
    this._examT = 0
    this._runP = 0
    this._slabA = 0
    this._asstW = -1
    this._goldW = -1
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
    const span = n * 1.0
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

  // --- funnel: the raw web rains through filter/dedup/scrub gates (beat 2) -----
  _buildFunnel() {
    this.funnelG = new THREE.Group()
    this.add(this.funnelG)

    this._gateMats = []
    for (const g of F_GATES) {
      const mat = glowBasic(palette[g.c], 0.75)
      const grp = new THREE.Group()
      const th = 0.055
      const mk = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
        m.position.set(x, y, z)
        grp.add(m)
      }
      mk(g.hx * 2 + th, th, th, 0, 0, -g.hz)
      mk(g.hx * 2 + th, th, th, 0, 0, +g.hz)
      mk(th, th, g.hz * 2 + th, -g.hx, 0, 0)
      mk(th, th, g.hz * 2 + th, +g.hx, 0, 0)
      grp.position.y = g.y
      this.funnelG.add(grp)
      this._gateMats.push(mat)
      this.label(g.name, { pill: true, position: new THREE.Vector3(g.hx + 0.8, g.y, 0), opacity: 0 })._funnel = true
    }
    this.label('the raw web', { className: 'tiny', position: new THREE.Vector3(-3.6, 3.95, 0), opacity: 0 })._funnel = true
    this.label('~15 trillion tokens', { pill: true, position: new THREE.Vector3(1.8, -2.65, 0), opacity: 0 })._funnel = true
    this.label('most of the web never makes it', { className: 'tiny muted', position: new THREE.Vector3(-2.8, -2.55, 0), opacity: 0 })._funnel = true

    // exit glow where the clean stream lands
    this.funnelExit = new GlowNode({ color: palette.cyan, radius: 0.18, halo: 1.2, glow: 1.5 })
    this.funnelExit.position.set(0, F_BOT + 0.15, 0)
    this.funnelG.add(this.funnelExit)

    // particles
    const N = this.reduced ? 220 : 950
    this._fN = N
    this._fY = new Float32Array(N)
    this._fX = new Float32Array(N)
    this._fZ = new Float32Array(N)
    this._fUX = new Float32Array(N)
    this._fUZ = new Float32Array(N)
    this._fSpd = new Float32Array(N)
    this._fVX = new Float32Array(N)
    this._fVZ = new Float32Array(N)
    this._fA = new Float32Array(N)
    this._fDie = new Int8Array(N)
    this._fMode = new Uint8Array(N)
    this._fVar = new Uint8Array(N)
    this._fPos = new Float32Array(N * 3)
    this._fCol = new Float32Array(N * 3)

    this._voidC = new THREE.Color(palette.void)
    this._fBright = new THREE.Color(palette.cyan).lerp(C.hot, 0.25)
    this._fBase = [
      new THREE.Color(palette.muted).lerp(this._voidC, 0.3),
      new THREE.Color(palette.violet).lerp(this._voidC, 0.38),
      new THREE.Color(palette.cyan).lerp(this._voidC, 0.45),
    ]

    for (let i = 0; i < N; i++) this._fPlace(i)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this._fPos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this._fCol, 3))
    this.funnelPts = new THREE.Points(geo, additivePoints(null, 0.16, 0.95, true))
    this.funnelPts.frustumCulled = false
    this.funnelG.add(this.funnelPts)
    this._fGeo = geo
    this._fStep(0) // write initial positions/colors (also the reduced-motion still)
  }

  _spreadHW(y) {
    const K = F_KNOTS
    if (y >= K[0][0]) return K[0][1]
    for (let i = 1; i < K.length; i++) {
      if (y >= K[i][0]) {
        const t = (y - K[i][0]) / (K[i - 1][0] - K[i][0])
        return lerp(K[i][1], K[i - 1][1], t)
      }
    }
    return K[K.length - 1][1]
  }

  _fRoll(i) {
    this._fUX[i] = Math.random() * 2 - 1
    this._fUZ[i] = Math.random() * 2 - 1
    this._fSpd[i] = 1.5 + Math.random() * 1.3
    this._fVar[i] = (Math.random() * 3) | 0
    const r = Math.random()
    this._fDie[i] = r < 0.45 ? 0 : r < 0.659 ? 1 : r < 0.761 ? 2 : -1
    this._fVX[i] = (this._fUX[i] >= 0 ? 1 : -1) * (1.0 + Math.random() * 0.8)
    this._fVZ[i] = (this._fUZ[i] >= 0 ? 1 : -1) * (0.3 + Math.random() * 0.4)
    this._fA[i] = 1
    this._fMode[i] = 0
  }

  // place a particle anywhere along the funnel (initial fill + reduced still)
  _fPlace(i) {
    this._fRoll(i)
    let y = F_BOT + Math.random() * (F_TOP + 1.2 - F_BOT)
    const die = this._fDie[i]
    if (die >= 0 && y < F_GY[die]) {
      const d = F_GY[die] - y
      if (d < 1.15) {
        // frozen mid-deflection: debris fanning out beside the gate
        this._fMode[i] = 1
        this._fY[i] = F_GY[die] - d * 0.3
        this._fX[i] = this._fUX[i] * this._spreadHW(F_GY[die]) + this._fVX[i] * d * 0.9
        this._fZ[i] = this._fUZ[i] * this._spreadHW(F_GY[die]) * 0.3 + this._fVZ[i] * d * 0.9
        this._fA[i] = Math.max(0.05, 1 - d / 1.15)
        return
      }
      y = F_GY[die] + Math.random() * (F_TOP - F_GY[die])
    }
    this._fY[i] = y
    const hw = this._spreadHW(y)
    this._fX[i] = this._fUX[i] * hw
    this._fZ[i] = this._fUZ[i] * hw * 0.3
  }

  _fRespawn(i) {
    this._fRoll(i)
    const y = F_TOP + Math.random() * 1.6
    this._fY[i] = y
    const hw = this._spreadHW(y)
    this._fX[i] = this._fUX[i] * hw
    this._fZ[i] = this._fUZ[i] * hw * 0.3
  }

  _fStep(dt) {
    const N = this._fN
    for (let i = 0; i < N; i++) {
      if (this._fMode[i] === 0) {
        let y = this._fY[i] - this._fSpd[i] * dt
        const die = this._fDie[i]
        if (die >= 0 && y <= F_GY[die]) {
          this._fMode[i] = 1
          this._fA[i] = 1
          y = F_GY[die]
        } else if (y <= F_BOT) {
          this._fRespawn(i)
          continue
        }
        this._fY[i] = y
        const hw = this._spreadHW(y)
        this._fX[i] = this._fUX[i] * hw
        this._fZ[i] = this._fUZ[i] * hw * 0.3
      } else {
        this._fY[i] -= this._fSpd[i] * 0.22 * dt
        this._fX[i] += this._fVX[i] * dt
        this._fZ[i] += this._fVZ[i] * dt
        this._fA[i] -= 1.5 * dt
        if (this._fA[i] <= 0) {
          this._fRespawn(i)
        }
      }
    }
    // write attributes
    for (let i = 0; i < N; i++) {
      const y = this._fY[i]
      this._fPos[i * 3] = this._fX[i]
      this._fPos[i * 3 + 1] = y
      this._fPos[i * 3 + 2] = this._fZ[i]
      const st = y > F_GY[0] ? 0 : y > F_GY[1] ? 1 : y > F_GY[2] ? 2 : 3
      _tmpC.copy(this._fBase[this._fVar[i]]).lerp(this._fBright, st / 3)
      if (this._fMode[i] === 1) _tmpC.lerp(this._voidC, clamp01(1 - this._fA[i]))
      this._fCol[i * 3] = _tmpC.r
      this._fCol[i * 3 + 1] = _tmpC.g
      this._fCol[i * 3 + 2] = _tmpC.b
    }
    if (this._fGeo) {
      this._fGeo.attributes.position.needsUpdate = true
      this._fGeo.attributes.color.needsUpdate = true
    }
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

  // --- exam: four domains, four blanks — filling all of them needs real skills --
  _buildExam() {
    this.examG = new THREE.Group()
    this.add(this.examG)
    this.exams = []
    this._examBoxMats = []
    this.examFeed = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0.35, flowSize: 0.13 })
    EXAMS.forEach((e, i) => {
      const boxMat = glowBasic(palette[e.c], 0.55)
      const box = new THREE.Mesh(new THREE.BoxGeometry(e.w, 0.46, 0.12), boxMat)
      box.position.set(e.bx, e.y, 0)
      this.examG.add(box)
      this._examBoxMats.push(boxMat)
      this.label(e.text, { pill: true, position: new THREE.Vector3(e.bx, e.y, 0), opacity: 0 })._exam = true
      this.label(e.cat, { className: 'tiny', position: new THREE.Vector3(e.bx, e.y + 0.62, 0), opacity: 0 })._exam = true
      const blank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.46, 0.12), glowBasic(palette.amber, 0.85))
      blank.position.set(e.blank, e.y, 0)
      this.examG.add(blank)
      const bl = this.label('▢', { pill: true, position: new THREE.Vector3(e.blank, e.y, 0), opacity: 0 })
      bl._exam = true
      this.examFeed.addEdge(blank.position, new THREE.Vector3(0, 0.15, 0), palette[e.c], 0.85)
      this.exams.push({ blank, bl, ans: e.ans, revealed: false, delay: 0.6 + i * 0.55 })
    })
    this.examFeed.build()
    this.examG.add(this.examFeed)
    this.label('every skill lowers the same loss', { className: 'tiny muted', position: new THREE.Vector3(-0.3, -3.0, 0), opacity: 0 })._exam = true
  }

  // --- laws: a falling loss curve driven by three dials (data/compute/params) ---
  _buildLaws() {
    this.lawsG = new THREE.Group()
    this.lawsG.position.set(-0.35, 0.2, 0)
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

  // --- the run: an honest loss-vs-tokens curve + milestones + the checkpoint ----
  _runY(u) {
    const base = R_FLOOR + (R_TOP - R_FLOOR) * Math.exp(-4.6 * u)
    const wig = (Math.sin(u * 61.7) + 0.6 * Math.sin(u * 137.0 + 1.3)) * 0.05 * (0.3 + 0.7 * Math.exp(-2.5 * u))
    const s1 = 0.26 * Math.exp(-Math.pow((u - 0.3) * 46, 2)) // loss spike + recovery
    const s2 = 0.16 * Math.exp(-Math.pow((u - 0.62) * 52, 2))
    return base + wig + s1 + s2
  }

  _buildRun() {
    this.runG = new THREE.Group()
    this.add(this.runG)

    // curve (drawn progressively as the tracer advances)
    const M = 180
    this._runM = M
    const rp = new Float32Array(M * 3)
    for (let i = 0; i < M; i++) {
      const u = i / (M - 1)
      rp.set([lerp(RX0, RX1, u), this._runY(u), 0], i * 3)
    }
    this.runGeo = new THREE.BufferGeometry()
    this.runGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3))
    this.runGeo.setDrawRange(0, 2)
    this.runMat = additiveLine(palette.magenta, 0.95)
    this.runG.add(new THREE.Line(this.runGeo, this.runMat))
    this._runPts = rp

    // axes + log ticks
    this.runAxisMat = additiveLine(palette.muted, 0.32)
    const ax = [
      new THREE.Vector3(RX0, R_TOP + 0.3, 0), new THREE.Vector3(RX0, R_AXY, 0),
      new THREE.Vector3(RX0, R_AXY, 0), new THREE.Vector3(4.45, R_AXY, 0),
    ]
    const TICKS = [0.15, 0.5, 0.85]
    const TICK_TXT = ['10⁹', '10¹¹', '10¹³']
    TICKS.forEach((u, i) => {
      const x = lerp(RX0, RX1, u)
      ax.push(new THREE.Vector3(x, R_AXY, 0), new THREE.Vector3(x, R_AXY - 0.14, 0))
      const l = this.label(TICK_TXT[i], { className: 'tiny muted', position: new THREE.Vector3(x, R_AXY, 0), offset: [0, 16], opacity: 0 })
      l._run = true
      l._dim = 0.75
    })
    this.runG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ax), this.runAxisMat))

    // irreducible-entropy floor (dashed)
    const fl = []
    for (let x = RX0 + 0.05; x < 4.2; x += 0.36) fl.push(new THREE.Vector3(x, R_ENT, 0), new THREE.Vector3(Math.min(x + 0.18, 4.2), R_ENT, 0))
    this.runFloorMat = additiveLine(palette.muted, 0.3)
    this.runG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(fl), this.runFloorMat))
    const lf = this.label('irreducible entropy of text', { className: 'tiny muted', position: new THREE.Vector3(-1.6, R_ENT, 0), offset: [0, 14], opacity: 0 })
    lf._run = true
    lf._dim = 0.7

    const la = this.label('loss', { className: 'tiny muted', position: new THREE.Vector3(RX0, R_TOP + 0.25, 0), offset: [-20, 0], opacity: 0 })
    la._run = true
    const lt = this.label('tokens seen →', { className: 'tiny muted', position: new THREE.Vector3(3.7, R_AXY, 0), offset: [0, 34], opacity: 0 })
    lt._run = true
    const lc = this.label('the whole run, steered by one number', { className: 'tiny', position: new THREE.Vector3(0.3, 2.55, 0), opacity: 0 })
    lc._run = true

    // capability milestones along the curve
    this.miles = MILES.map((m) => {
      const x = lerp(RX0, RX1, m.u)
      const y = this._runY(m.u)
      const node = new GlowNode({ color: palette[m.c], radius: 0.1, halo: 0.9, glow: 1.4 })
      node.position.set(x, y, 0)
      this.runG.add(node)
      const label = this.label(m.n, { pill: true, position: new THREE.Vector3(x, y + m.lift, 0), opacity: 0 })
      return { u: m.u, node, label, lit: 0 }
    })

    // tracer riding the curve
    this.runHead = new GlowNode({ color: palette.amber, radius: 0.13, halo: 1.1, glow: 1.6 })
    this.runG.add(this.runHead)

    // the checkpoint: a slab of tiny cells — nothing but numbers
    const CXn = 22, CYn = 13, CZn = 3
    const count = CXn * CYn * CZn
    const cell = 0.075, pitch = 0.105
    this.slabMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false })
    this.slab = new THREE.InstancedMesh(new THREE.BoxGeometry(cell, cell, cell), this.slabMat, count)
    this.slab.frustumCulled = false
    this._slabVar = new Uint8Array(count)
    const vars = [palette.violet, palette.magenta, palette.cyan]
    const m4 = new THREE.Matrix4()
    let k = 0
    for (let ix = 0; ix < CXn; ix++)
      for (let iy = 0; iy < CYn; iy++)
        for (let iz = 0; iz < CZn; iz++) {
          m4.makeTranslation((ix - (CXn - 1) / 2) * pitch, (iy - (CYn - 1) / 2) * pitch, (iz - (CZn - 1) / 2) * pitch)
          this.slab.setMatrixAt(k, m4)
          const v = (Math.random() * 3) | 0
          this._slabVar[k] = v
          _tmpC.set(vars[v]).multiplyScalar(0.3 + 0.7 * Math.random())
          this.slab.setColorAt(k, _tmpC)
          k++
        }
    this.slab.position.set(3.3, 1.15, 0)
    this.slab.rotation.y = -0.4
    this.slab.rotation.x = 0.12
    this.runG.add(this.slab)
    this._slabCols = vars.map((c) => new THREE.Color(c))
    this._slabN = count
    this.lblCkpt = this.label('checkpoint', { pill: true, position: new THREE.Vector3(3.3, 2.35, 0), opacity: 0 })
    this.lblCkptSub = this.label('2 × 10¹¹ floats · a few hundred GB', { className: 'tiny', position: new THREE.Vector3(3.45, 0.32, 0), opacity: 0 })
  }

  // --- duo: one prompt, two continuations — the completer vs the assistant ------
  _buildDuo() {
    this.duoG = new THREE.Group()
    this.add(this.duoG)
    this._duoMats = []

    const tile = (x, y, w, color, text, op = 0.8) => {
      const mat = glowBasic(color, op)
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.48, 0.12), mat)
      m.position.set(x, y, 0)
      this.duoG.add(m)
      const l = this.label(text, { pill: true, position: new THREE.Vector3(x, y, 0), opacity: 0 })
      return { m, mat, l }
    }

    // top mini-demo: completion genuinely works for facts
    const fq = tile(-2.75, 2.55, 2.4, palette.violet, 'The capital of France is')
    const fa = tile(-0.35, 2.55, 0.9, palette.lime, 'Paris')
    fq.l._duo = true
    fa.l._duo = true
    this._duoMats.push(fq.mat, fa.mat)
    this.label('one plausible continuation', { className: 'tiny muted', position: new THREE.Vector3(1.9, 2.55, 0), opacity: 0 })._duo = true

    // the prompt node
    const pr = tile(-3.15, 0.7, 3.1, palette.violet, 'help me write an email to my landlord')
    pr.l._duo = true
    this._duoMats.push(pr.mat)

    // completer strip: continues the list
    const c1 = tile(0.45, 1.65, 2.2, palette.amber, '…and a complaint letter')
    const c2 = tile(3.2, 1.65, 2.0, palette.amber, '…and a refund request')
    c1.l._duo = true
    c2.l._duo = true
    this._duoMats.push(c1.mat, c2.mat)
    this.label('the base model continues the list', { className: 'tiny', position: new THREE.Vector3(1.85, 1.05, 0), opacity: 0 })._duo = true

    // assistant strip: answers — dark until the gold demos land (beat 8)
    const a1 = tile(0.3, -0.45, 1.55, palette.cyan, 'Dear Ms. Ortiz,', 0.16)
    const a2 = tile(3.3, -0.45, 2.75, palette.cyan, 'the heater in 4B needs repair.', 0.16)
    this.asstTiles = [a1, a2]
    this.lblAsst = this.label('the assistant answers the request', { className: 'tiny', position: new THREE.Vector3(1.85, -1.15, 0), opacity: 0 })

    // edges from the prompt into each continuation
    this.duoEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0.45, flowSize: 0.13 })
    this.duoEdges.addEdge(pr.m.position, c1.m.position, palette.amber, 1)
    this.duoEdges.addEdge(c1.m.position, c2.m.position, palette.amber, 1)
    this._eAsst = [
      this.duoEdges.addEdge(pr.m.position, a1.m.position, palette.cyan, 0.12),
      this.duoEdges.addEdge(a1.m.position, a2.m.position, palette.cyan, 0.12),
    ]
    this.duoEdges.build()
    this.duoG.add(this.duoEdges)

    // SFT: golden demonstrations rain up into the assistant strip
    this.goldNodes = []
    const gp = [new THREE.Vector3(0.3, -2.1, 0), new THREE.Vector3(1.85, -2.35, 0), new THREE.Vector3(3.4, -2.1, 0)]
    for (const p of gp) {
      const n = new GlowNode({ color: palette.lime, radius: 0.1, halo: 0.9, glow: 1.4 })
      n.position.copy(p)
      n.visible = false
      this.duoG.add(n)
      this.goldNodes.push(n)
    }
    this.goldE = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.8, baseOpacity: 0, flowSize: 0.12 })
    this._eGold = [
      this.goldE.addEdge(gp[0], a1.m.position, palette.lime, 0),
      this.goldE.addEdge(gp[1], a1.m.position, palette.lime, 0),
      this.goldE.addEdge(gp[1], a2.m.position, palette.lime, 0),
      this.goldE.addEdge(gp[2], a2.m.position, palette.lime, 0),
    ]

    // RM: the judge learns from A/B picks
    this.judge = new GlowNode({ color: palette.amber, radius: 0.24, halo: 1.1, glow: 1.5 })
    this.judge.position.set(-3.1, -1.8, 0)
    this.judge.visible = false
    this.duoG.add(this.judge)
    const abMk = (x, txt) => {
      const mat = glowBasic(palette.cyan, 0.85)
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.48, 0.12), mat)
      m.position.set(x, -2.6, 0)
      this.duoG.add(m)
      const l = this.label(txt, { pill: true, position: m.position.clone(), opacity: 0 })
      return { m, mat, l }
    }
    this.abTiles = [abMk(-3.8, 'A'), abMk(-2.4, 'B')]
    this._eGold.push(this.goldE.addEdge(this.abTiles[0].m.position, this.judge.position, palette.amber, 0))
    this._eGold.push(this.goldE.addEdge(this.abTiles[1].m.position, this.judge.position, palette.amber, 0))
    this.goldE.build()
    this.duoG.add(this.goldE)

    this._sftLabels = [
      this.label('golden demonstrations · written by people', { className: 'tiny', position: new THREE.Vector3(1.85, -2.95, 0), opacity: 0 }),
      this.label('reward model · the judge', { className: 'tiny', position: new THREE.Vector3(-3.1, -1.1, 0), opacity: 0 }),
      this.abTiles[0].l,
      this.abTiles[1].l,
      this.label('preferred', { className: 'tiny', position: new THREE.Vector3(-3.8, -3.05, 0), opacity: 0 }),
    ]
  }

  // --- loop: write → score → nudge (the bridge into the RL chapter) -------------
  _buildLoop() {
    this.loopG = new THREE.Group()
    this.add(this.loopG)
    this.writeN = new GlowNode({ color: palette.cyan, radius: 0.17, halo: 1.0, glow: 1.5 })
    this.writeN.position.set(-2.6, 1.05, 0)
    this.loopG.add(this.writeN)
    this.scoreN = new GlowNode({ color: palette.amber, radius: 0.22, halo: 1.1, glow: 1.5 })
    this.scoreN.position.set(-2.6, -1.35, 0)
    this.loopG.add(this.scoreN)
    this.loopE = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.85, baseOpacity: 0.5, flowSize: 0.14 })
    this.loopE.addEdge(new THREE.Vector3(-0.5, 0.4, 0), this.writeN.position, palette.cyan, 1)
    this.loopE.addEdge(this.writeN.position, this.scoreN.position, palette.amber, 1)
    this.loopE.addEdge(this.scoreN.position, new THREE.Vector3(-0.5, -0.5, 0), palette.magenta, 1)
    this.loopE.build()
    this.loopG.add(this.loopE)
    this.label('it writes an answer', { className: 'tiny', position: new THREE.Vector3(-2.6, 1.72, 0), opacity: 0 })._loop = true
    this.label('the judge scores it', { className: 'tiny', position: new THREE.Vector3(-2.6, -2.02, 0), opacity: 0 })._loop = true
    this.label('write → score → nudge → repeat', { pill: true, position: new THREE.Vector3(-1.3, 2.5, 0), opacity: 0 })._loop = true
    this.label('the same network', { className: 'tiny muted', position: new THREE.Vector3(0, -1.6, 0), opacity: 0 })._loop = true
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
    this.coreT = c.core

    // distribution: guess (beat 0) vs trained (beat 1+)
    if (i === 0) this.bars.setTargets(GUESS, { highlight: -1 })
    else this.bars.setTargets(TRAINED, { highlight: TRUTH })

    // token counter spins up on the ocean beat
    gsap.killTweensOf(this, '_counter')
    if (i === 3) {
      if (this.reduced) this._counter = 15e12
      else {
        this._counter = 1
        gsap.to(this, { _counter: 15e12, duration: 3.6, ease: 'power2.out' })
      }
    } else if (i > 3) this._counter = 15e12

    // exam blanks replay their reveal each visit
    if (i === 4) this._examT = this.reduced ? 99 : 0

    // the run: tracer rides the curve once per visit
    gsap.killTweensOf(this, '_runP')
    if (i === 6) {
      if (this.reduced) this._runP = 1
      else {
        this._runP = 0
        gsap.to(this, { _runP: 1, duration: 6.5, ease: 'power1.inOut', delay: 0.35 })
      }
    } else if (i > 6) this._runP = 1
  }

  // --- per-frame -------------------------------------------------------------
  update(dt, t) {
    const rd = this.reduced
    const k = (cur, tgt, l) => (rd ? tgt : damp(cur, tgt, l, dt))
    for (const key of VIS_KEYS) this.vis[key] = k(this.vis[key], this.visT[key], 4)
    this.truth = k(this.truth, this.truthT, 4)
    this.dials = k(this.dials, this.dialsT, 3.5)
    this.align = k(this.align, this.alignT, 2.8)
    this.coreV = k(this.coreV, this.coreT, 4)

    this.camera.lookAt(this.lookTarget)
    if (!rd) this.tower.rotation.y += dt * 0.16
    if (this.step === 4) this._examT += dt

    this._updateCore(dt, t, rd)
    this._updatePredict(dt, t, rd)
    this._updateFunnel(dt, t, rd)
    this._updateScale(dt, t)
    this._updateExam(dt, t, rd)
    this._updateLaws()
    this._updateRun(dt, t, rd)
    this._updateDuo(dt, t, rd)
    this._updateLoop(dt, t, rd)
    this._updateLabels()
  }

  _updateCore(dt, t, rd) {
    const cv = clamp01(this.coreV)
    const on = cv > 0.03
    this.core.visible = on
    this.tower.visible = on
    if (!on) return
    const extra = rd ? 0 : Math.sin(t * 1.5) * 0.06
    this.core.setLevel(clamp01((0.9 + extra) * cv))
    for (const m of this._towerMats) m.opacity = 0.45 * cv
  }

  _updatePredict(dt, t, rd) {
    const v = this.vis.predict
    this.predict.visible = v > 0.02
    if (v <= 0.02) return
    for (const m of this.stripTiles) m.material.opacity = 0.85 * v
    this.bars.lerp(dt, { hot: palette.amber })
    for (const b of this.bars.bars) b.material.opacity *= clamp01(v)
    this.feed.setLineOpacity(0.4 * v)
    this.feed.setFlowOpacity(0.6 * v)
    this.feed.update(rd ? 0 : dt)
    // blank → truth reveal
    const reveal = this.truth
    this.blank.material.color.set(reveal > 0.5 ? palette.lime : palette.amber)
    this.blank.material.opacity = (rd ? 0.85 : 0.5 + 0.5 * Math.abs(Math.sin(t * 3))) * v
    this.blankLabel.setText(reveal > 0.5 ? 'mat' : '▢')
    this.lblLoss.setText(this.L(reveal > 0.5 ? 'loss ↓ getting it right' : 'loss high · just guessing'))
  }

  _updateFunnel(dt, t, rd) {
    const v = this.vis.funnel
    this.funnelG.visible = v > 0.02
    if (v <= 0.02) return
    for (const m of this._gateMats) m.opacity = 0.75 * v
    this.funnelPts.material.opacity = 0.95 * v
    this.funnelExit.setLevel((0.55 + (rd ? 0 : 0.25 * Math.sin(t * 2.4))) * v)
    if (!rd) this._fStep(dt)
  }

  _updateScale(dt, t) {
    const v = this.vis.scale
    this.scaleG.visible = v > 0.02
    if (v <= 0.02) return
    this.ocean.material.opacity = 0.5 * v
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
    if (c >= 1e12) s = pre + '~' + Math.round(c / 1e12) + ' ' + this.L('trillion')
    else if (c >= 1e9) s = pre + (c / 1e9).toFixed(1).replace(/\.0$/, '') + ' ' + this.L('billion')
    else if (c >= 1e6) s = pre + (c / 1e6).toFixed(1).replace(/\.0$/, '') + ' ' + this.L('million')
    else if (c >= 1e3) s = pre + Math.round(c / 1e3) + ',000'
    else s = pre + Math.round(c)
    if (s !== this._counterStr) { this._counterStr = s; this.lblCounter.setText(s) }
  }

  _updateExam(dt, t, rd) {
    const v = this.vis.exam
    this.examG.visible = v > 0.02
    if (v <= 0.02) return
    for (const m of this._examBoxMats) m.opacity = 0.55 * v
    for (let i = 0; i < this.exams.length; i++) {
      const s = this.exams[i]
      const on = this._examT > s.delay
      if (on !== s.revealed) {
        s.revealed = on
        s.bl.setText(on ? s.ans : '▢')
        s.blank.material.color.set(on ? palette.lime : palette.amber)
      }
      s.blank.material.opacity = (on ? 0.9 : rd ? 0.7 : 0.55 + 0.35 * Math.abs(Math.sin(t * 3 + i))) * v
    }
    this.examFeed.setLineOpacity(0.35 * v)
    this.examFeed.setFlowOpacity(0.6 * v)
    this.examFeed.update(rd ? 0 : dt)
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

  _updateRun(dt, t, rd) {
    const v = this.vis.run
    this.runG.visible = v > 0.02
    if (v <= 0.02) return
    const p = clamp01(this._runP)
    const M = this._runM
    const count = Math.max(2, Math.floor(p * (M - 1)) + 1)
    this.runGeo.setDrawRange(0, count)
    const hi = count - 1
    this.runHead.position.set(this._runPts[hi * 3], this._runPts[hi * 3 + 1], 0)
    this.runHead.setLevel((0.8 + (rd ? 0 : 0.15 * Math.sin(t * 5))) * v)
    this.runMat.opacity = 0.95 * v
    this.runAxisMat.opacity = 0.32 * v
    this.runFloorMat.opacity = 0.3 * v
    // milestones light as the tracer passes
    for (const m of this.miles) {
      m.lit = smoothstep(m.u - 0.015, m.u + 0.015, p)
      m.node.setLevel((0.12 + 0.83 * m.lit) * v)
    }
    // checkpoint slab materializes at the end of the run
    this._slabA = smoothstep(0.86, 0.99, p)
    this.slabMat.opacity = 0.95 * this._slabA * v
    this.slab.visible = this._slabA > 0.01
    if (!rd && this.slab.visible) {
      // shimmering values: a handful of cells re-roll their brightness each frame
      for (let n = 0; n < 14; n++) {
        const i = (Math.random() * this._slabN) | 0
        _tmpC.copy(this._slabCols[this._slabVar[i]]).multiplyScalar(0.3 + 0.7 * Math.random())
        this.slab.setColorAt(i, _tmpC)
      }
      this.slab.instanceColor.needsUpdate = true
    }
  }

  _updateDuo(dt, t, rd) {
    const v = this.vis.duo
    this.duoG.visible = v > 0.02
    if (v <= 0.02) return
    const a = clamp01(this.align)
    for (const m of this._duoMats) m.opacity = 0.8 * v
    // assistant strip: dark until SFT lands
    const aw = 0.12 + 0.88 * a
    for (const tl of this.asstTiles) tl.mat.opacity = (0.16 + 0.72 * a) * v
    if (Math.abs(aw - this._asstW) > 0.004) {
      this._asstW = aw
      for (const ei of this._eAsst) this.duoEdges.setWeight(ei, aw)
    }
    this.duoEdges.setLineOpacity(0.45 * v)
    this.duoEdges.setFlowOpacity(0.7 * v)
    this.duoEdges.update(rd ? 0 : dt)
    // gold demos + judge (beat 8)
    if (Math.abs(a - this._goldW) > 0.004) {
      this._goldW = a
      for (const ei of this._eGold) this.goldE.setWeight(ei, a)
      // B is the rejected sample: its edge stays dimmer
      this.goldE.setWeight(this._eGold[5], 0.3 * a)
    }
    this.goldE.setLineOpacity(0.55 * a * v)
    this.goldE.setFlowOpacity(0.8 * a * v)
    this.goldE.update(rd ? 0 : dt)
    const gv = a * v
    for (let i = 0; i < this.goldNodes.length; i++) {
      const n = this.goldNodes[i]
      n.visible = gv > 0.03
      n.setLevel((0.55 + (rd ? 0 : 0.25 * Math.sin(t * 2.2 + i * 1.9))) * gv)
    }
    this.judge.visible = gv > 0.03
    this.judge.setLevel((0.6 + (rd ? 0 : 0.2 * Math.sin(t * 3.4))) * gv)
    for (const ab of this.abTiles) ab.mat.opacity = 0.85 * gv
  }

  _updateLoop(dt, t, rd) {
    const v = this.vis.loop
    this.loopG.visible = v > 0.02
    if (v <= 0.02) return
    this.writeN.setLevel((0.6 + (rd ? 0 : 0.25 * Math.sin(t * 2.6))) * v)
    this.scoreN.setLevel((0.6 + (rd ? 0 : 0.25 * Math.sin(t * 2.6 + 2.1))) * v)
    this.loopE.setLineOpacity(0.5 * v)
    this.loopE.setFlowOpacity(0.85 * v)
    this.loopE.update(rd ? 0 : dt)
  }

  _updateLabels() {
    const a = clamp01(this.align)
    for (const l of this._labels) {
      if (l._predict) l.setOpacity(this.vis.predict)
      else if (l._funnel) l.setOpacity(this.vis.funnel)
      else if (l._exam) l.setOpacity(this.vis.exam)
      else if (l._laws) l.setOpacity(this.vis.laws)
      else if (l._run) l.setOpacity(this.vis.run * (l._dim || 1))
      else if (l._duo) l.setOpacity(this.vis.duo)
      else if (l._loop) l.setOpacity(this.vis.loop)
    }
    // predict extras
    this.lblPredCap.setOpacity(this.vis.predict)
    this.lblLoss.setOpacity(this.vis.predict * this.truth)
    // scale + laws axes
    this.lblCounter.setOpacity(this.vis.scale)
    this.lblLossAxis.setOpacity(0.7 * this.vis.laws)
    this.lblCompAxis.setOpacity(0.7 * this.vis.laws)
    // run: milestones light with the tracer; checkpoint labels with the slab
    for (const m of this.miles) m.label.setOpacity(this.vis.run * (0.3 + 0.7 * m.lit))
    this.lblCkpt.setOpacity(this.vis.run * this._slabA)
    this.lblCkptSub.setOpacity(this.vis.run * this._slabA)
    // duo: assistant strip + SFT/RM annotations follow the align scalar
    const dv = this.vis.duo
    for (const tl of this.asstTiles) tl.l.setOpacity(dv * (0.3 + 0.7 * a))
    this.lblAsst.setOpacity(dv * (0.35 + 0.65 * a))
    for (const l of this._sftLabels) l.setOpacity(dv * a)
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this)
    super.dispose()
  }
}
