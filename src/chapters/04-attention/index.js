import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { TOKENS } from '../../lib/example.js'
import { palette } from '../../theme/palette.js'
import { damp } from '../../theme/motion.js'

const N = TOKENS.length
const _ndc = new THREE.Vector2()
const _ray = new THREE.Raycaster()

// --- authored attention heads (linguistically plausible, not learned) ----------
// Each spec maps query-token -> { key-token: rawWeight }. Rows are softmax-ish
// normalized in buildMatrix(). Three heads capture three kinds of relationship.
function buildMatrix(spec, base = 0.05) {
  const M = []
  for (let q = 0; q < N; q++) {
    const row = new Array(N).fill(base)
    const s = spec[q] || {}
    for (const k in s) row[+k] += s[k]
    const sum = row.reduce((a, b) => a + b, 0)
    M.push(row.map((v) => v / sum))
  }
  return M
}

// 0 The · 1 cat · 2 sat · 3 on · 4 the · 5 mat · 6 because · 7 it · 8 was · 9 tired
const HEAD_SYNTAX = buildMatrix({
  0: { 1: 3 },
  1: { 2: 2.2, 0: 0.6 },
  2: { 1: 3, 3: 1.2 },
  3: { 5: 2.4, 2: 0.8 },
  4: { 5: 3 },
  5: { 3: 2, 2: 0.8 },
  6: { 2: 1.6, 9: 1.4 },
  7: { 1: 1.4, 5: 1.0 },
  8: { 9: 2.4, 7: 1.0 },
  9: { 8: 1.6, 7: 1.4 },
})
const HEAD_COREF = buildMatrix({
  0: { 1: 1.2 },
  2: { 1: 1.2 },
  3: { 5: 1.0 },
  4: { 5: 1.2 },
  6: { 9: 1.2, 7: 1.0 },
  7: { 1: 4.6, 5: 0.8 }, // it -> cat (the star)
  8: { 9: 1.2 },
  9: { 7: 2.4, 1: 1.6 },
})
const adj = {}
for (let q = 0; q < N; q++) {
  adj[q] = {}
  if (q > 0) adj[q][q - 1] = 1.6
  if (q < N - 1) adj[q][q + 1] = 1.6
}
const HEAD_POS = buildMatrix(adj)

const HEADS = [
  { name: 'Syntax', color: palette.cyan, M: HEAD_SYNTAX },
  { name: 'Coreference', color: palette.magenta, M: HEAD_COREF },
  { name: 'Adjacency', color: palette.amber, M: HEAD_POS },
]
const COREF = 1

export const beats = [
  {
    html: `<span class="eyebrow">Chapter 04 · the breakthrough</span>
      <h2>Attention</h2>
      <p class="lead">Here's our sentence as <strong>ten tokens</strong> — one per word — arranged in a ring. Each token is a list of numbers — a <em>vector</em> — that captures what its word means. But meaning isn't fixed: a word shifts with the company it keeps.</p>
      <p>Take the word <span class="tok">it</span> — alone, it means almost nothing. So how does a token find the others that matter? It pays <em>attention</em>: it reaches across the sentence, weighs every other word, and folds their meaning into its own.</p>`,
  },
  {
    html: `<h3>Queries & Keys</h3>
      <p>From its own numbers, each token produces two small signals: a <strong>Query</strong> ("what am I looking for?") and a <strong>Key</strong> ("what do I offer?").</p>
      <p>Picture everyone in a crowded room holding up two cards at once — a search request (the Query) and a name tag (the Key). The model checks every request against every name tag, all in a single sweep.</p>
      <p>Neither card is hand-written. Each token builds its Query and Key by multiplying its own vector by a pair of <strong>learned matrices</strong> — Wq for the Query, Wk for the Key. Training tunes those matrices until the right requests find the right tags.</p>`,
  },
  {
    html: `<h3>Scores: compare everything</h3>
      <p>Every token's Query is matched against <em>every</em> other token's Key, and each pairing earns a raw <strong>score</strong> — high when a request and a name tag line up, low when they don't. That match is a <strong>dot product</strong>: multiply the two vectors entry by entry, sum the results, and out comes a single number for how strongly they align. Watch <span class="tok">it</span> size up the whole sentence at once.</p>
      <p class="aside">Ten tokens means 100 comparisons. Double the words and you quadruple the work — which is why very long texts get costly to process.</p>
      <p class="aside">One catch for real text generation: each token may only score the words that come <em>earlier</em> than itself. The model is busy predicting the next word, so the future stays masked — it can't peek at the answer. Here we let <span class="tok">it</span> roam the whole ring, but in a working LLM the forward beams would stay dark.</p>`,
  },
  {
    html: `<h3>Softmax: sharpen into weights</h3>
      <p>First the raw scores get scaled — divided by <strong>√dₖ</strong>, the square root of how many numbers sit in each Key — which stops them from growing so large that the next step turns unstable. Then they run through <strong>softmax</strong>, which turns them into percentages that add up to 100% — the attention <strong>weights</strong>.</p>
      <p>And softmax plays favorites by design: it exponentiates each score before sharing out the total, so the strongest match takes the biggest slice by far while weak ones fade toward nothing. Now <span class="tok">it</span>'s scattered scores collapse into a single clear focus.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/attention-math">the attention equation</a></div>`,
  },
  {
    html: `<h3>Gather the Values</h3>
      <p>Each token carries one more signal: a <strong>Value</strong> — the content it actually offers up. If the Key is the name tag, the Value is what that token <em>tells you</em> once you choose to listen. Like the Query and Key, it comes from a learned matrix — Wv — applied to the token's vector.</p>
      <p>Now each token pulls in a <strong>weighted blend of everyone's Values</strong> — a lot from the words it scored highly, almost nothing from the rest. That blend is literally a sum: every Value multiplied by its attention weight, then all added together. Information flows <em>in</em> along the bright beams, and the token's meaning is rewritten as a mixture of everything it found relevant.</p>`,
  },
  {
    html: `<h3>"it" → "cat"</h3>
      <p>This is the whole magic in one picture. The word <span class="tok">it</span> sweeps the sentence and locks onto <span class="tok">cat</span> — the model has <strong>worked out what "it" refers to</strong>, all on its own.</p>
      <p>Linguists call this <em>coreference</em>, and it's notoriously hard. No rule wrote that. It fell out of attention — gradient descent simply shaped the Query and Key matrices until the Query from <span class="tok">it</span> lined up with the Key from <span class="tok">cat</span>, because that alignment made the next word easier to predict.</p>`,
  },
  {
    html: `<h3>Many heads at once</h3>
      <p>So far we've followed a single comparison. Real models run <strong>many attention heads</strong> side by side, each with its own Queries, Keys, and Values — so each can hunt for a different kind of relationship.</p>
      <p>Here, three: <span style="color:var(--cyan)">syntax</span> (grammatical links), <span style="color:var(--magenta)">coreference</span> (what refers to what), <span style="color:var(--amber)">adjacency</span> (neighboring words). A real layer runs dozens.</p>
      <p>The heads don't take turns — they run <strong>in parallel</strong>, each working on its own slice of the vector. Their outputs are <strong>concatenated</strong> back into one and passed through a final learned projection, so the next layer sees a single blended answer.</p>
      <p class="aside">Hover any token to explore where it attends.</p>`,
  },
  {
    html: `<h3>That's the trick</h3>
      <p>Every token runs this one routine at the same time — <strong>Query, Key, Value; score, weight, blend</strong> — and each comes out rewritten in the light of all the others.</p>
      <p>This is the one place where tokens actually share information — everywhere else, the network handles each token on its own. Stack that operation layer upon layer — attention mixing, then per-token refining — and you get a transformer: the engine inside every modern language model.</p>
      <div class="postcard">Attention lets every token look at every other token and take what it needs. That's the whole trick.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">attention math</a>
        <a class="deepdive" data-route="/transformer">next: the transformer →</a>
      </div>`,
  },
]

export default class Attention extends Chapter {
  init() {
    this.N = N
    // refresh head colors from the live (theme-aware) palette
    HEADS[0].color = palette.cyan
    HEADS[1].color = palette.magenta
    HEADS[2].color = palette.amber
    this.setBloom(0.85, 0.42, 0.82)
    this.addAmbientField(360, 70)
    this.camera.position.set(0, 0, 10.5)
    this.lookTarget = new THREE.Vector3(0, 0, 0)

    // ring layout in the XY plane
    this.R = 4.0
    this.pos = []
    for (let i = 0; i < N; i++) {
      const a = (Math.PI / 2) - (i / N) * Math.PI * 2
      this.pos.push(new THREE.Vector3(Math.cos(a) * this.R, Math.sin(a) * this.R, 0))
    }

    // token nodes + labels
    this.tokenNodes = []
    this.nodeMeshes = []
    TOKENS.forEach((tok, i) => {
      const node = new GlowNode({ color: palette.cyan, radius: 0.28, halo: 0.9, glow: 1.0 })
      node.position.copy(this.pos[i])
      node.setLevel(0.5)
      node.core.userData.tokenIndex = i
      this.scene.add(node)
      this.tokenNodes.push(node)
      this.nodeMeshes.push(node.core)
      this.label(tok, {
        pill: true,
        position: this.pos[i].clone().multiplyScalar(1.2),
        opacity: 0.9,
      })
    })

    // all ordered pairs (q != k); edge a=key, b=query so motes flow key -> query
    this.attn = new EdgeField({ flow: true, flowPerEdge: 4, flowSpeed: 0.5, baseOpacity: 0.6, flowSize: 0.17 })
    this.edgeIndex = Array.from({ length: N }, () => new Array(N).fill(-1))
    for (let q = 0; q < N; q++) {
      for (let k = 0; k < N; k++) {
        if (q === k) continue
        const idx = this.attn.addEdge(this.pos[k], this.pos[q], palette.cyan, 0)
        this.edgeIndex[q][k] = idx
      }
    }
    this.attn.build()
    this.add(this.attn)

    // precompute the combined "strongest relationship per token" for multi-head
    this.combined = []
    for (let q = 0; q < N; q++) {
      let best = { k: 0, w: -1, color: palette.cyan }
      for (let h = 0; h < HEADS.length; h++) {
        for (let k = 0; k < N; k++) {
          if (k === q) continue
          if (HEADS[h].M[q][k] > best.w) best = { k, w: HEADS[h].M[q][k], color: HEADS[h].color }
        }
      }
      this.combined.push(best)
    }

    this.scripted = { focus: T_it(), head: COREF, mode: 'off' }
    this.active = this.scripted
    this.hoverFocus = -1
    this.levels = new Array(N).fill(0.5)
    this._applyState()

    this._onMove = (e) => this._move(e)
    window.addEventListener('pointermove', this._onMove)
  }

  onStep(i) {
    const setCam = (x, y, z, lx, ly) => {
      gsap.to(this.camera.position, { x, y, z, duration: 1.4, ease: 'power3.inOut' })
      gsap.to(this.lookTarget, { x: lx ?? 0, y: ly ?? 0, z: 0, duration: 1.4, ease: 'power3.inOut' })
    }
    const states = [
      { focus: T_it(), head: COREF, mode: 'off' },
      { focus: T_it(), head: COREF, mode: 'off' },
      { focus: T_it(), head: COREF, mode: 'scores' },
      { focus: T_it(), head: COREF, mode: 'single' },
      { focus: T_it(), head: COREF, mode: 'gather' },
      { focus: T_it(), head: COREF, mode: 'reveal' },
      { focus: -1, head: COREF, mode: 'combined' },
      { focus: T_it(), head: COREF, mode: 'single' },
    ]
    this.scripted = states[i] || states[0]
    if (i === 5) {
      // closeup on the it -> cat chord
      const mid = this.pos[T_it()].clone().add(this.pos[1]).multiplyScalar(0.5)
      setCam(mid.x * 0.7, mid.y * 0.7, 7.4, mid.x, mid.y)
    } else if (i === 6) {
      setCam(0, 0, 11.5, 0, 0)
    } else {
      setCam(0, 0, 10.5, 0, 0)
    }
    if (this.hoverFocus < 0) this._setActive(this.scripted)
  }

  _setActive(s) {
    this.active = s
    this._applyState()
  }

  _applyState() {
    // zero everything
    for (let q = 0; q < N; q++) {
      for (let k = 0; k < N; k++) {
        if (q === k) continue
        this.attn.setWeight(this.edgeIndex[q][k], 0)
      }
    }
    const s = this.active
    if (!s || s.mode === 'off') return

    if (s.mode === 'combined') {
      for (let q = 0; q < N; q++) {
        const c = this.combined[q]
        const idx = this.edgeIndex[q][c.k]
        this.attn.setColor(idx, c.color)
        this.attn.setWeight(idx, 0.3 + c.w * 1.7)
      }
      return
    }

    const f = s.focus
    const head = HEADS[s.head]
    const row = head.M[f]
    let maxK = -1
    let maxV = -1
    for (let k = 0; k < N; k++) {
      if (k === f) continue
      if (row[k] > maxV) {
        maxV = row[k]
        maxK = k
      }
    }
    for (let k = 0; k < N; k++) {
      if (k === f) continue
      const idx = this.edgeIndex[f][k]
      this.attn.setColor(idx, head.color)
      let w = row[k]
      if (s.mode === 'scores') w = 0.32 + row[k] * 0.5 // flatter, "pre-softmax"
      else if (s.mode === 'reveal') w = k === maxK ? row[k] * 1.4 : row[k] * 0.06
      const gain = s.mode === 'gather' ? 2.1 : 1.7
      this.attn.setWeight(idx, Math.min(2.4, w * gain))
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
      if (j >= 0) this._setActive({ focus: j, head: this.scripted.head, mode: this.scripted.mode === 'combined' ? 'single' : this.scripted.mode === 'off' ? 'single' : this.scripted.mode })
      else this._setActive(this.scripted)
    }
  }

  update(dt, t) {
    this.attn.update(dt)
    this.camera.lookAt(this.lookTarget)

    // node activation: focus brightest, attended-to tokens medium
    const s = this.active
    for (let i = 0; i < N; i++) {
      let target = 0.42
      if (s && s.mode !== 'off') {
        if (s.mode === 'combined') target = 0.6
        else if (i === s.focus) target = 1
        else if (i === this._topKey && (s.mode === 'reveal' || s.mode === 'single' || s.mode === 'gather')) target = 0.85
      }
      this.levels[i] = damp(this.levels[i], target, 6, dt)
      this.tokenNodes[i].setLevel(this.levels[i] + Math.sin(t * 1.6 + i) * 0.05)
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._onMove)
    document.body.style.cursor = ''
    super.dispose()
  }
}

// "it" index in the running example
function T_it() {
  return 7
}
