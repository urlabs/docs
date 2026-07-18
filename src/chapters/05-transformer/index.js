import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { BarField } from '../../lib/BarField.js'
import { additiveLine, glowBasic } from '../../lib/materials.js'
import { palette } from '../../theme/palette.js'
import { damp, smoothstep } from '../../theme/motion.js'

// Chapter 05 — The Transformer, built AROUND the canonical block diagram from
// "Attention Is All You Need" (decoder-only / GPT shape): tokens + positional
// encoding flow up a residual stream through Masked Multi-Head Attention → Add &
// Norm → Feed-Forward → Add & Norm, that block repeats × N, then Linear → Softmax
// reads off the next token. Each beat lights one box and shows what it does.
// Extensions: the original encoder–decoder pair (ghost tower that fades away),
// the residual stream as a read/write workspace, and the parameter budget.

const TOKS = ['The', 'cat', 'sat', 'on', 'the']
const T = TOKS.length
const BW = 3.5 // main box width
const BX = 0 // diagram center x

// vertical layout: { key, label, cy, h, w }
const BOXES = [
  { key: 'embed', label: 'Embedding + Position', cy: -3.4, h: 0.85, w: BW },
  { key: 'attn', label: 'Masked Multi-Head Attention', cy: -1.7, h: 1.3, w: BW },
  { key: 'norm1', label: 'Add & Norm', cy: -0.5, h: 0.5, w: BW },
  { key: 'ffn', label: 'Feed Forward', cy: 0.95, h: 1.3, w: BW },
  { key: 'norm2', label: 'Add & Norm', cy: 2.15, h: 0.5, w: BW },
  { key: 'linear', label: 'Linear', cy: 3.25, h: 0.6, w: 2.5 },
  { key: 'softmax', label: 'Softmax', cy: 4.05, h: 0.55, w: 2.5 },
]
const INPUT_Y = -4.45
const BARS_Y = 5.15

// ghost encoder tower (the half GPT threw away)
const EX = -4.5
const EW = 2.4
const ENC_BOXES = [
  { label: 'Multi-Head Attention (no mask)', cy: -1.7, h: 1.1 },
  { label: 'Add & Norm', cy: -0.5, h: 0.45 },
  { label: 'Feed Forward', cy: 0.95, h: 1.1 },
  { label: 'Add & Norm', cy: 2.15, h: 0.45 },
]

// rough parameter shares per block (attention 4·d² vs FFN 8·d²; embeddings a sliver)
const PSHARE = { ffn: 0.66, attn: 0.33, embed: 0.04 }

// output distribution over the next token
const DIST = [0.3, 0.12, 1.0, 0.22, 0.16, 0.08]
const LOGITS = [0.55, 0.42, 0.78, 0.5, 0.46, 0.38] // pre-softmax: jagged, not yet peaked
const CAND = ['floor', 'rug', 'mat', 'sofa', 'bed', 'lap']
const MAT = 2

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 05 · the machine</span>
      <h2>The Transformer</h2>
      <p class="lead">This is the diagram that started it all — the <strong>transformer block</strong> from the 2017 paper "Attention Is All You Need," the engine inside every modern LLM. It looks dense, so let's switch it on and watch a sentence climb through it, one box at a time.</p>
      <p>Read it bottom to top. Tokens enter at the foot, flow up a central <strong>residual stream</strong> through a handful of boxes, and a next-word prediction falls out of the top. The whole block keeps the row of vectors exactly the same shape it received — which is the secret to stacking it deep.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Two towers — built for translation</h3>
      <p>One honest correction before the climb: the 2017 diagram had <strong>two</strong> towers. The left one — the <strong>encoder</strong> — read the whole source sentence at once. The right one — the <strong>decoder</strong> — wrote the translation word by word, peeking at the encoder's finished reading through a third kind of attention: <strong>cross-attention</strong>. The transformer was born a translation machine.</p>
      <p>GPT's founding move was surgery: throw the encoder away, keep only the decoder, and train it on one job — <em>continue the text</em>. Watch the left tower fade; everything you're about to climb is the half that survived.</p>
      <p class="aside">The family tree of modern models is largely "which half did you keep." BERT kept the encoder (understanding, search, classification), T5 kept both — and GPT's decoder-only branch is the one that learned to talk.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Inputs — embed, then place</h3>
      <p>First each token becomes a <strong>vector</strong> (the embedding from the last chapter). But attention, the next box, is order-blind — shuffle the row and it returns the same vectors; to it <span class="tok">The cat sat</span> and <span class="tok">sat cat The</span> look identical.</p>
      <p>So a <strong>positional encoding</strong> — a vector fixed by the slot alone (1st, 2nd, 3rd…) — is <em>added</em> onto each token before the climb begins. Now "the word" also carries "where the word sits." This happens once, at the very bottom.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Masked Multi-Head Attention</h3>
      <p>The first box is where tokens <strong>talk</strong>. Every token forms a query, looks across the row, and pulls in meaning from the words that matter to it — exactly the mechanism from the Attention chapter, run by several <strong>heads</strong> in parallel, each watching for a different kind of relationship.</p>
      <p>"<strong>Masked</strong>" is the LLM twist: a token may attend only to words <em>behind</em> it, never ahead — watch the links run one way. The model is learning to predict the next word, so letting it peek at the answer would be cheating.</p>
      <p class="aside">This is the only box where information moves <em>between</em> tokens. Everything else in the block treats each position on its own.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Add &amp; Norm — the residual shortcut</h3>
      <p>Notice the arrow that loops <em>around</em> the attention box. The block never replaces a token — it <strong>adds</strong> attention's result back onto the original input. That bypass is the <strong>residual connection</strong>, and it's what lets signal (and, during training, gradients) survive a very deep stack.</p>
      <p>Then <strong>LayerNorm</strong> rescales each token's vector on its own, keeping the numbers healthy instead of exploding or fading as the tower grows. Add, then norm — and you'll see this exact pairing again right after the next box.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Feed-Forward — each token thinks alone</h3>
      <p>Now every token is refined <em>on its own</em>, with no looking sideways. The <strong>feed-forward</strong> box is a small <strong>two-layer neural net</strong> (an MLP) applied to each position: it blows the vector up to about <strong>4× its width</strong>, bends it through a nonlinearity, then projects it back down — watch it fan out and collapse.</p>
      <p>Nothing is looked up; every weight was learned. If attention is where tokens <em>share</em>, the feed-forward is where each token <em>digests</em> what it heard. Its output gets the same <strong>Add &amp; Norm</strong> treatment — residual shortcut, then normalize.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The residual stream — a shared whiteboard</h3>
      <p>Now shift your eye from the boxes to the line they hang on. Interpretability researchers read this diagram inside-out: the vertical line is the <strong>residual stream</strong>, the model's shared workspace — and the boxes are workers standing beside it. Each block <strong>reads</strong> a copy of the stream, computes its comment, and <strong>writes</strong> the result back by addition at the next Add &amp; Norm — watch the two flows join.</p>
      <p>Picture a document passed down a line of editors. Nobody retypes the page; each editor adds margin notes for the editors downstream. Attention and feed-forward blocks never talk to each other directly — they communicate only through what they leave on the stream.</p>
      <p class="aside">This is also why residual connections beat the vanishing gradients that crippled early deep nets: the identity path is an unobstructed highway, so the error signal flows straight from the loss back to layer one. The "Add" in Add &amp; Norm matters every bit as much as the "Norm."</p>`,
  },
  {
    side: 'right',
    html: `<h3>One block — now stack it × N</h3>
      <p>Attention, Add &amp; Norm, feed-forward, Add &amp; Norm: that is <em>one</em> block. A real transformer stacks <strong>dozens</strong> of them (the famous "N×") — identical in shape, each with its <em>own</em> learned weights, so every layer is free to do a different job.</p>
      <p>And they do. Watch the refinement ripple upward: early blocks catch surface structure — grammar, word boundaries, who sits next to whom — while deeper blocks build abstract meaning, intent, and long-range links across the text. Each block nudges the stream a little; stacked deep, the nudges compound into a rich, context-aware reading.</p>
      <p class="aside">Not just a metaphor — probe the stream between layers and the progression appears: lower layers track parts of speech, higher layers carry meaning and reference. GPT-2 stacked this block 48 times; frontier models go well past a hundred.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Where the parameters live</h3>
      <p>The boxes are not equal citizens. Count the weights inside one block: attention's four projection matrices hold about <strong>a third</strong> of them, while the feed-forward network (<strong>FFN</strong>) — its expand-and-project pair is 8d² numbers against attention's 4d² — holds roughly <strong>two thirds</strong>. The tall amber box isn't just wide; it's where most of the machine lives.</p>
      <p>And the embedding table at the very bottom? For all its fame, a <strong>sliver</strong> — under one percent of a large model. When you picture a 70-billion-parameter LLM, picture feed-forward layers, stacked a hundred deep.</p>
      <p class="aside">One live hypothesis reads those FFN layers as the model's <strong>key–value memory</strong>: the expand layer's rows act as pattern detectors, the project layer's columns as stored facts. Model-editing research — surgically changing "the Eiffel Tower is in Paris" to "…in Rome" — pokes exactly these mid-layer FFN weights.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Linear → Softmax → the next token</h3>
      <p>At the top, the model takes the final vector of the <em>last</em> position and runs it through the <strong>Linear</strong> box — a big <strong>output matrix</strong> with one row per word in the vocabulary — turning it into a raw score, a <strong>logit</strong>, for every possible next token.</p>
      <p><strong>Softmax</strong> then squashes that jagged row of scores into clean probabilities that sum to one. For <span class="tok">The cat sat on the…</span>, one bar towers over the rest: <span class="tok">mat</span>.</p>
      <p class="aside">That output matrix is the <strong>unembedding</strong> — a mirror of the embedding table at the bottom. One maps words → vectors; the other maps the final vector → a vote over words.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The whole machine</h3>
      <div class="postcard">Embed and place the tokens, let them share meaning (masked attention), refine each alone (feed-forward), keeping a residual shortcut and a norm after each step — every box just adding its note to one shared residual stream. Stack that block × N, read the top vector, and Linear + Softmax score it across the vocabulary — out falls the next word.</div>
      <p class="aside">That's the entire <strong>decoder-only transformer</strong>, the shape behind GPT-style models. No new ideas wait beyond here — what follows is this same machine, fed far more text and scaled far larger.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">attention math</a>
        <a class="deepdive" data-route="/pretraining">next: Pretraining →</a>
      </div>`,
  },
]

// camera per beat: [x, y, z, lookX, lookY]
const CAM = [
  [0, 0.0, 13.6, 0, 0.0], // 0 whole diagram
  [-1.4, 0.3, 14.6, -1.4, 0.25], // 1 two towers
  [0, -3.4, 6.2, 0, -3.4], // 2 inputs (bottom)
  [0, -1.7, 6.0, 0, -1.7], // 3 attention
  [0, -0.5, 6.2, 0, -0.7], // 4 add & norm 1
  [0, 0.95, 6.0, 0, 0.95], // 5 feed-forward
  [0, 0.25, 9.2, 0, 0.3], // 6 residual stream workspace
  [0, 0.2, 13.0, 0, 0.2], // 7 stack ×N + refinement
  [0.9, 0.2, 12.8, 0.9, 0.2], // 8 parameter budget
  [0, 3.7, 6.6, 0, 3.9], // 9 linear → softmax → bars
  [0, 0.4, 14.2, 0, 0.4], // 10 whole machine
]

// which part of the scene each beat activates
const FOCUS = ['all', 'towers', 'embed', 'attn', 'norm', 'ffn', 'stream', 'stack', 'params', 'head', 'all']

export default class Transformer extends Chapter {
  init() {
    this.setBloom(0.9, 0.5, 0.82)
    this.addAmbientField(420, 80)
    this.addLights({ key: 0x3b82f6, rim: 0xa855f7, amb: 0x141f33 })
    this.camera.position.set(0, 0, 13.6)
    this.lookTarget = new THREE.Vector3(0, 0, 0)

    this.focus = 'all'
    this._wave = 0
    this._normPulse = 0
    this._enc = { a: 0 } // encoder-tower ghost opacity
    this._keep = { v: 0 } // "keep only this half" reveal
    this._wsA = 0 // workspace (residual stream) beat alpha
    this._pA = 0 // parameter-budget beat alpha

    this._buildStream()
    this._buildBoxes()
    this._buildInputs()
    this._buildAttn()
    this._buildFFN()
    this._buildArcs()
    this._buildStack()
    this._buildHead()
    this._buildEncoder()
    this._buildWorkspace()
    this._buildParams()
  }

  _frameBox(w, h, color, edgeOpacity) {
    const g = new THREE.Group()
    const geo = new THREE.BoxGeometry(w, h, 1.1)
    const fill = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.06, depthWrite: false })
    g.add(new THREE.Mesh(geo, fill))
    const edge = additiveLine(color, edgeOpacity, false)
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge))
    return { group: g, fill, edge }
  }

  // the central residual stream: a vertical line with data flowing up it
  _buildStream() {
    this.stream = new EdgeField({ flow: true, flowPerEdge: 5, flowSpeed: 0.5, baseOpacity: 0.5, flowSize: 0.16 })
    this.stream.addEdge(new THREE.Vector3(BX, INPUT_Y + 0.3, -0.35), new THREE.Vector3(BX, BARS_Y - 0.6, -0.35), palette.cyan, 1)
    this.stream.build()
    this.add(this.stream)
  }

  _buildBoxes() {
    this.boxes = {}
    for (const b of BOXES) {
      const accent = b.key === 'attn' ? palette.cyan : b.key === 'ffn' ? palette.amber : b.key.startsWith('norm') ? palette.violet : b.key === 'linear' || b.key === 'softmax' ? palette.blue : palette.lime
      const f = this._frameBox(b.w, b.h, accent, 0.5)
      f.group.position.set(BX, b.cy, 0)
      this.add(f.group)
      const lab = this.label(b.label, { className: 'tiny', position: new THREE.Vector3(BX, b.cy, 0.6), opacity: 0.85 })
      this.boxes[b.key] = { ...b, ...f, accent, lab, lit: 0.6 }
    }
  }

  // input tokens row at the foot, feeding up into the embedding box
  _buildInputs() {
    this.inTokens = []
    this.inLabels = []
    this.inFeed = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0.4, flowSize: 0.14 })
    for (let j = 0; j < T; j++) {
      const x = (j - (T - 1) / 2) * 0.72
      const n = new GlowNode({ color: palette.cyan, radius: 0.15, halo: 0.7, glow: 1.0 })
      n.position.set(x, INPUT_Y, 0)
      n.setLevel(0.5)
      this.add(n)
      this.inTokens.push(n)
      this.inLabels.push(this.label(TOKS[j], { pill: true, position: new THREE.Vector3(x, INPUT_Y - 0.5, 0), opacity: 0 }))
      this.inFeed.addEdge(new THREE.Vector3(x, INPUT_Y, 0), new THREE.Vector3(BX, BOXES[0].cy - BOXES[0].h / 2, 0), palette.cyan, 0.8)
    }
    this.inFeed.build()
    this.add(this.inFeed)
    this.posBadges = []
    for (let j = 0; j < T; j++) {
      const x = (j - (T - 1) / 2) * 0.72
      const b = new GlowNode({ color: palette.amber, radius: 0.07, halo: 0.5, glow: 1.0 })
      b.position.set(x + 0.26, INPUT_Y + 0.04, 0.1)
      b.setLevel(0)
      this.add(b)
      this.posBadges.push(b)
    }
  }

  // inside the attention box: 5 token dots with CAUSAL beams (each looks only back)
  _buildAttn() {
    const cy = this.boxes.attn.cy
    this.aDots = []
    for (let j = 0; j < T; j++) {
      const x = (j - (T - 1) / 2) * 0.62
      const n = new GlowNode({ color: palette.cyan, radius: 0.1, halo: 0.5, glow: 1.1 })
      n.position.set(x, cy, 0.2)
      n.setLevel(0.4)
      this.add(n)
      this.aDots.push(n)
    }
    this.aBeams = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.7, baseOpacity: 0, flowSize: 0.12 })
    this._aBeamIdx = []
    for (let q = 0; q < T; q++) {
      for (let k = 0; k < q; k++) {
        // key (earlier) → query (later): causal, backward-only
        this._aBeamIdx.push(this.aBeams.addEdge(this.aDots[k].position, this.aDots[q].position, palette.cyan, 0.7))
      }
    }
    this.aBeams.build()
    this.add(this.aBeams)
    this.labMask = this.label('only looks back ←', { className: 'tiny muted', position: new THREE.Vector3(0, cy - 0.78, 0.3), opacity: 0 })
  }

  // inside the feed-forward box: input → wide (4x) hidden column → output (per token)
  _buildFFN() {
    const cy = this.boxes.ffn.cy
    this.ffnEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.85, baseOpacity: 0, flowSize: 0.13 })
    const inP = new THREE.Vector3(-1.15, cy, 0.2)
    const outP = new THREE.Vector3(1.15, cy, 0.2)
    this.ffnIn = new GlowNode({ color: palette.amber, radius: 0.11, halo: 0.5, glow: 1.0 })
    this.ffnIn.position.copy(inP)
    this.ffnOut = new GlowNode({ color: palette.amber, radius: 0.11, halo: 0.5, glow: 1.0 })
    this.ffnOut.position.copy(outP)
    this.add(this.ffnIn, this.ffnOut)
    this.ffnWide = []
    const WIDE = 7
    for (let i = 0; i < WIDE; i++) {
      const y = cy + (i - (WIDE - 1) / 2) * 0.16
      const n = new GlowNode({ color: palette.amber, radius: 0.06, halo: 0.4, glow: 1.0 })
      n.position.set(0, y, 0.2)
      n.setLevel(0.3)
      this.add(n)
      this.ffnWide.push(n)
      this.ffnEdges.addEdge(inP, n.position, palette.amber, 0.8)
      this.ffnEdges.addEdge(n.position, outP, palette.amber, 0.8)
    }
    this.ffnEdges.build()
    this.add(this.ffnEdges)
    this.labWide = this.label('expand ×4 → project', { className: 'tiny muted', position: new THREE.Vector3(0, cy + 0.78, 0.3), opacity: 0 })
  }

  // residual bypass arcs: around attention (right), around feed-forward (left)
  _buildArcs() {
    this.arcs = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.55, baseOpacity: 0, flowSize: 0.15 })
    const ax = BW / 2 + 0.55
    // arc 1: input of attention → Add & Norm 1 (bypass attention), on the right
    const a0 = new THREE.Vector3(BX, this.boxes.attn.cy - this.boxes.attn.h / 2 - 0.15, 0.2)
    const a1 = new THREE.Vector3(ax, a0.y, 0.2)
    const a2 = new THREE.Vector3(ax, this.boxes.norm1.cy, 0.2)
    const a3 = new THREE.Vector3(BX, this.boxes.norm1.cy, 0.2)
    this._arc1 = [this.arcs.addEdge(a0, a1, palette.violet, 1), this.arcs.addEdge(a1, a2, palette.violet, 1), this.arcs.addEdge(a2, a3, palette.violet, 1)]
    // arc 2: input of ffn → Add & Norm 2 (bypass ffn), on the left
    const bx = -(BW / 2 + 0.55)
    const b0 = new THREE.Vector3(BX, this.boxes.ffn.cy - this.boxes.ffn.h / 2 - 0.15, 0.2)
    const b1 = new THREE.Vector3(bx, b0.y, 0.2)
    const b2 = new THREE.Vector3(bx, this.boxes.norm2.cy, 0.2)
    const b3 = new THREE.Vector3(BX, this.boxes.norm2.cy, 0.2)
    this._arc2 = [this.arcs.addEdge(b0, b1, palette.violet, 1), this.arcs.addEdge(b1, b2, palette.violet, 1), this.arcs.addEdge(b2, b3, palette.violet, 1)]
    this.arcs.build()
    this.add(this.arcs)
    this.labResidual = this.label('residual: add the input back', { className: 'tiny muted', position: new THREE.Vector3(ax + 0.2, (this.boxes.attn.cy + this.boxes.norm1.cy) / 2, 0.3), opacity: 0 })
  }

  // "× N": ghost copies of the block bracket receding in depth
  _buildStack() {
    this.ghosts = new THREE.Group()
    this.ghosts.visible = false
    this.add(this.ghosts)
    this._ghostMats = []
    const top = this.boxes.norm2.cy + this.boxes.norm2.h / 2 + 0.1
    const bot = this.boxes.attn.cy - this.boxes.attn.h / 2 - 0.1
    const h = top - bot
    const cy = (top + bot) / 2
    for (let i = 1; i <= 5; i++) {
      const geo = new THREE.BoxGeometry(BW + 0.2, h, 0.8)
      const mat = additiveLine(palette.blue, 0, false)
      const m = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat)
      m.position.set(BX, cy, -i * 0.6)
      this.ghosts.add(m)
      this._ghostMats.push({ mat, base: 0.4 * (1 - i / 6) })
    }
    this.labStack = this.label('× N blocks', { pill: true, position: new THREE.Vector3(BW / 2 + 0.9, (this.boxes.attn.cy + this.boxes.norm2.cy) / 2, 0), opacity: 0 })
  }

  // output head: a row of bars (logits → softmax) above the Softmax box
  _buildHead() {
    this.bars = new BarField({ count: DIST.length, width: 0.28, gap: 0.14, maxHeight: 1.7, color: palette.blue })
    this.bars.position.set(0, BARS_Y, 0)
    this.bars.visible = false
    this.add(this.bars)
    this.barLabels = []
    const max = Math.max(...DIST)
    CAND.forEach((w, i) => {
      if (i !== MAT && DIST[i] < 0.25) return
      const x = this.bars.bars[i].position.x
      this.barLabels.push(this.label(w, { pill: i === MAT, className: i === MAT ? '' : 'tiny muted', position: new THREE.Vector3(x, BARS_Y + (DIST[i] / max) * 1.7 + 0.3, 0), opacity: 0 }))
    })
    this.predEdge = new EdgeField({ flow: true, flowPerEdge: 4, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.16 })
    this.predEdge.addEdge(new THREE.Vector3(BX, this.boxes.softmax.cy + 0.3, 0), new THREE.Vector3(0, BARS_Y - 0.7, 0), palette.amber, 1)
    this.predEdge.build()
    this.add(this.predEdge)
    this._barsShown = false
  }

  // the ghost ENCODER tower beside the decoder + cross-attention beams (beat 1)
  _buildEncoder() {
    this.encGroup = new THREE.Group()
    this.encGroup.visible = false
    this.add(this.encGroup)
    this._encMats = []
    this.encLabels = []
    for (const b of ENC_BOXES) {
      const f = this._frameBox(EW, b.h, palette.blue, 0)
      f.fill.opacity = 0
      f.group.position.set(EX, b.cy, 0)
      this.encGroup.add(f.group)
      this._encMats.push(f)
      this.encLabels.push(this.label(b.label, { className: 'tiny', position: new THREE.Vector3(EX, b.cy, 0.6), opacity: 0 }))
    }
    // encoder's own little stream
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(EX, -3.1, -0.2), new THREE.Vector3(EX, 3.0, -0.2)])
    this.encLineMat = additiveLine(palette.blue, 0, false)
    this.encGroup.add(new THREE.Line(lg, this.encLineMat))
    // cross-attention: encoder output (top) feeds the decoder's attention as K,V
    this.xBeams = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.45, baseOpacity: 0, flowSize: 0.13 })
    const src = new THREE.Vector3(EX, 3.0, 0.15)
    for (const dy of [-1.45, -1.7, -1.95]) this.xBeams.addEdge(src, new THREE.Vector3(-BW / 2 - 0.05, dy, 0.15), palette.magenta, 0.9)
    this.xBeams.build()
    this.encGroup.add(this.xBeams)
    this.labEncoder = this.label('encoder', { pill: true, position: new THREE.Vector3(EX, 3.55, 0), opacity: 0 })
    this.labDecoder = this.label('decoder', { pill: true, position: new THREE.Vector3(2.4, 3.55, 0), opacity: 0 })
    this.labCross = this.label('cross-attention', { className: 'tiny muted', position: new THREE.Vector3(-2.45, -0.15, 0.2), opacity: 0 })
    this.labKeep = this.label('keep only this half', { pill: true, position: new THREE.Vector3(2.55, 0.6, 0), opacity: 0 })
  }

  // residual-stream workspace (beat 6): read taps, compute detours, additive merges
  _buildWorkspace() {
    this.wsGroup = new THREE.Group()
    this.wsGroup.visible = false
    this.add(this.wsGroup)
    const attnBot = this.boxes.attn.cy - this.boxes.attn.h / 2 // -2.35
    const ffnBot = this.boxes.ffn.cy - this.boxes.ffn.h / 2 // 0.3
    const readA = new THREE.Vector3(0, attnBot - 0.2, 0.3)
    const readF = new THREE.Vector3(0, ffnBot - 0.26, 0.3)
    // read a copy sideways → process in the box → write the delta back at Add & Norm
    this.wsFlow = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.55, baseOpacity: 0, flowSize: 0.15 })
    this.wsFlow.addEdge(readA, new THREE.Vector3(0.85, this.boxes.attn.cy - 0.25, 0.3), palette.cyan, 0.7)
    this.wsFlow.addEdge(new THREE.Vector3(0.85, this.boxes.attn.cy + 0.25, 0.3), new THREE.Vector3(0, this.boxes.norm1.cy, 0.35), palette.cyan, 1)
    this.wsFlow.addEdge(readF, new THREE.Vector3(-0.85, this.boxes.ffn.cy - 0.25, 0.3), palette.amber, 0.7)
    this.wsFlow.addEdge(new THREE.Vector3(-0.85, this.boxes.ffn.cy + 0.25, 0.3), new THREE.Vector3(0, this.boxes.norm2.cy, 0.35), palette.amber, 1)
    this.wsFlow.build()
    this.wsGroup.add(this.wsFlow)
    // merge nodes: where the block's delta joins the identity path — the "+"
    this.merge1 = new GlowNode({ color: palette.violet, radius: 0.13, halo: 0.6, glow: 1.2 })
    this.merge1.position.set(0, this.boxes.norm1.cy, 0.35)
    this.merge2 = new GlowNode({ color: palette.violet, radius: 0.13, halo: 0.6, glow: 1.2 })
    this.merge2.position.set(0, this.boxes.norm2.cy, 0.35)
    this.read1 = new GlowNode({ color: palette.cyan, radius: 0.08, halo: 0.4, glow: 1.0 })
    this.read1.position.copy(readA)
    this.read2 = new GlowNode({ color: palette.amber, radius: 0.08, halo: 0.4, glow: 1.0 })
    this.read2.position.copy(readF)
    this.wsGroup.add(this.merge1, this.merge2, this.read1, this.read2)
    this.wsLabels = [
      this.label('read', { className: 'tiny muted', position: new THREE.Vector3(0.95, attnBot - 0.38, 0.3), opacity: 0 }),
      this.label('read', { className: 'tiny muted', position: new THREE.Vector3(-0.95, ffnBot - 0.44, 0.3), opacity: 0 }),
      this.label('write (+)', { className: 'tiny muted', position: new THREE.Vector3(1.0, this.boxes.norm1.cy + 0.32, 0.3), opacity: 0 }),
      this.label('write (+)', { className: 'tiny muted', position: new THREE.Vector3(-1.0, this.boxes.norm2.cy + 0.32, 0.3), opacity: 0 }),
      this.label('residual stream', { pill: true, position: new THREE.Vector3(1.45, 2.68, 0), opacity: 0 }),
    ]
  }

  // parameter budget (beat 8): stacked bar beside the tower, tie-lines to boxes
  _buildParams() {
    this.paramsGroup = new THREE.Group()
    this.paramsGroup.visible = false
    this.add(this.paramsGroup)
    const PX = 3.15
    const geo = new THREE.BoxGeometry(0.55, 1, 0.4)
    geo.translate(0, 0.5, 0) // anchor at bottom so scale.y grows upward
    // bottom-up: embeddings (sliver) → attention (~1/3) → FFN (~2/3), mirroring the tower
    const segs = [
      { key: 'embed', color: palette.lime, h: 0.14, boxY: this.boxes.embed.cy },
      { key: 'attn', color: palette.cyan, h: 0.99, boxY: this.boxes.attn.cy },
      { key: 'ffn', color: palette.amber, h: 1.98, boxY: this.boxes.ffn.cy },
    ]
    this.pSegs = []
    this.pTies = new EdgeField({ flow: false, baseOpacity: 0 })
    let y = -1.45
    for (const s of segs) {
      const mat = glowBasic(s.color, 0.92)
      const m = new THREE.Mesh(geo, mat)
      m.position.set(PX, y, 0)
      m.scale.y = 0.001
      m.userData.h = s.h
      this.paramsGroup.add(m)
      this.pSegs.push(m)
      this.pTies.addEdge(new THREE.Vector3(PX - 0.3, y + s.h / 2, 0.1), new THREE.Vector3(BW / 2 + 0.05, s.boxY, 0.1), s.color, 0.9)
      s.midY = y + s.h / 2
      y += s.h + 0.07
    }
    this.pTies.build()
    this.paramsGroup.add(this.pTies)
    this.pLabels = [
      this.label('parameter budget', { pill: true, position: new THREE.Vector3(PX, y + 0.35, 0), opacity: 0 }),
      this.label('~⅔ FFN', { className: 'tiny', position: new THREE.Vector3(PX + 1.15, segs[2].midY, 0), opacity: 0 }),
      this.label('~⅓ attention', { className: 'tiny', position: new THREE.Vector3(PX + 1.3, segs[1].midY, 0), opacity: 0 }),
      this.label('embeddings <1%', { className: 'tiny muted', position: new THREE.Vector3(PX + 1.4, segs[0].midY, 0), opacity: 0 }),
    ]
  }

  enter() {
    if (this.ctx.reduced) return
    gsap.from(this.camera.position, { z: 22, duration: 1.4, ease: 'power3.out' })
  }

  _cam(i) {
    const [x, y, z, lx, ly] = CAM[i] || CAM[0]
    const dur = this.ctx.reduced ? 0 : 1.4
    gsap.to(this.camera.position, { x, y, z, duration: dur, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: 0, duration: dur, ease: 'power3.inOut', overwrite: true })
  }

  onStep(i) {
    this.focus = FOCUS[i] || 'all'
    this._cam(i)
    const rd = this.ctx.reduced

    // two towers: encoder fades in, cross-attention flows, then the encoder dissolves
    if (i === 1) {
      this._encTl?.kill()
      gsap.killTweensOf(this._enc)
      if (rd) {
        this._enc.a = 0.32
        this._keep.v = 1
      } else {
        this._enc.a = 0
        this._keep.v = 0
        this._encTl = gsap
          .timeline()
          .to(this._enc, { a: 1, duration: 1.0, ease: 'power2.out' }, 0.15)
          .to(this._enc, { a: 0.06, duration: 1.7, ease: 'power2.inOut' }, 3.9)
          .to(this._keep, { v: 1, duration: 0.7, ease: 'power2.out' }, 4.4)
      }
    } else {
      this._encTl?.kill()
      gsap.killTweensOf(this._enc)
      this._keep.v = 0
      if (rd) this._enc.a = 0
      else gsap.to(this._enc, { a: 0, duration: 0.5, overwrite: true })
    }

    if (i === 2 && !rd) {
      this.posBadges.forEach((b, j) => {
        gsap.killTweensOf(b.scale)
        b.scale.setScalar(0.001)
        gsap.to(b.scale, { x: 1, y: 1, z: 1, duration: 0.5, delay: 0.2 + j * 0.08, ease: 'back.out(1.7)' })
      })
    }
    if (i === 4 && !rd) gsap.fromTo(this, { _normPulse: 1 }, { _normPulse: 0, duration: 1.1, ease: 'sine.out' })
    if (i === 7) this.ghosts.visible = true
    if (i < 7) this.ghosts.visible = false

    // parameter budget: bars grow bottom-up, staggered
    if (i === 8) {
      if (rd) this.pSegs.forEach((m) => (m.scale.y = m.userData.h))
      else
        this.pSegs.forEach((m, j) => {
          gsap.killTweensOf(m.scale)
          m.scale.y = 0.001
          gsap.to(m.scale, { y: m.userData.h, duration: 0.9, delay: 0.2 + j * 0.18, ease: 'power3.out' })
        })
    }

    if (i === 9) this._predict()
    if (i < 9) {
      this._barsShown = false
      this.bars.visible = false
    }
  }

  _predict() {
    if (this._barsShown) return
    this._barsShown = true
    this.bars.visible = true
    // first show jagged logits, then softmax sharpens onto "mat"
    this.bars.setTargets(LOGITS, { highlight: -1 })
    if (this.ctx.reduced) {
      this.bars.setTargets(DIST, { highlight: MAT })
    } else {
      gsap.delayedCall(0.7, () => this.bars.setTargets(DIST, { highlight: MAT }))
    }
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    const rd = this.ctx.reduced
    const f = this.focus

    // box highlight: focused box bright, others dim; 'all' = medium everywhere
    for (const key in this.boxes) {
      const b = this.boxes[key]
      let target = 0.55
      if (f === 'all') target = 0.7
      else if (f === 'towers') target = 0.5 + 0.5 * this._keep.v
      else if (f === 'stack') target = 0.4
      else if (f === 'norm') target = key === 'norm1' || key === 'norm2' ? 1 : 0.28
      else if (f === 'stream') target = key === 'norm1' || key === 'norm2' ? 0.9 : key === 'attn' || key === 'ffn' ? 0.7 : 0.3
      else if (f === 'params') target = key === 'ffn' ? 1 : key === 'attn' ? 0.8 : key === 'embed' ? 0.65 : 0.2
      else if (f === 'head') target = key === 'linear' || key === 'softmax' ? 1 : 0.25
      else target = key === f ? 1 : 0.28
      b.lit = rd ? target : damp(b.lit, target, 6, dt)
      b.edge.opacity = 0.25 + b.lit * 0.85
      b.fill.opacity = 0.04 + b.lit * 0.07 + (f === 'params' ? (PSHARE[key] || 0) * 0.32 * this._pA : 0)
      b.lab.setOpacity(0.35 + b.lit * 0.6)
    }

    // stream + input feed always flow; stream brightens on the workspace beat
    this.stream.setLineOpacity(0.5 + 0.35 * this._wsA)
    this.stream.update(dt)
    this.inFeed.update(dt)
    this.inTokens.forEach((n, j) => n.setLevel(0.45 + (rd ? 0 : Math.sin(t * 2 + j) * 0.12)))
    this.inLabels.forEach((l) => l.setOpacity(f === 'embed' || f === 'all' ? 0.9 : 0.0))
    const posOn = f === 'embed' ? 1 : 0
    this.posBadges.forEach((b) => b.setLevel(0.9 * posOn))

    // attention: beams + dots active when focused
    const attnOn = f === 'attn' ? 1 : 0
    for (const idx of this._aBeamIdx) this.aBeams.setWeight(idx, attnOn * 0.9)
    this.aBeams.setLineOpacity(0.6 * attnOn)
    this.aBeams.setFlowOpacity(0.95 * attnOn)
    this.aBeams.update(dt)
    this.aDots.forEach((n, j) => n.setLevel((0.3 + (rd ? 0.3 : Math.max(0, Math.sin(t * 2.4 - j * 0.6)) * 0.6)) * (0.3 + 0.7 * attnOn)))
    this.labMask.setOpacity(attnOn * 0.9)

    // feed-forward: expand→project when focused
    const ffnOn = f === 'ffn' ? 1 : 0
    this.ffnEdges.setLineOpacity(0.55 * ffnOn)
    this.ffnEdges.setFlowOpacity(0.95 * ffnOn)
    this.ffnEdges.update(dt)
    const wide = rd ? 0.7 : 0.4 + Math.abs(Math.sin(t * 2)) * 0.6
    this.ffnWide.forEach((n) => n.setLevel((0.25 + wide * 0.6) * (0.3 + 0.7 * ffnOn)))
    this.ffnIn.setLevel(0.4 + 0.4 * ffnOn)
    this.ffnOut.setLevel(0.4 + 0.4 * ffnOn)
    this.labWide.setOpacity(ffnOn * 0.9)

    // residual arcs: bright on the Add&Norm + workspace beats, faint otherwise
    const arcOn = f === 'norm' ? 1 : f === 'stream' ? 0.85 : f === 'all' ? 0.25 : 0.12
    this.arcs.setLineOpacity((0.3 + this._normPulse * 0.6) * arcOn + 0.05 * arcOn)
    this.arcs.setFlowOpacity(0.95 * arcOn)
    this.arcs.update(dt)
    this.labResidual.setOpacity(f === 'norm' ? 0.9 : 0)

    // encoder ghost tower (two-towers beat)
    const encA = this._enc.a
    this.encGroup.visible = encA > 0.004
    if (this.encGroup.visible) {
      for (const m of this._encMats) {
        m.edge.opacity = 0.85 * encA
        m.fill.opacity = 0.05 * encA
      }
      this.encLineMat.opacity = 0.5 * encA
      this.xBeams.setLineOpacity(0.5 * encA)
      this.xBeams.setFlowOpacity(0.9 * encA)
      this.xBeams.update(dt)
    }
    for (const l of this.encLabels) l.setOpacity(encA * 0.8)
    this.labEncoder.setOpacity(encA * 0.95)
    this.labCross.setOpacity(encA * 0.9)
    this.labDecoder.setOpacity(f === 'towers' ? 0.95 : 0)
    this.labKeep.setOpacity(f === 'towers' ? this._keep.v : 0)

    // residual-stream workspace: read taps, deltas merging back in, "+" pulses
    const wsOn = f === 'stream' ? 1 : 0
    this._wsA = rd ? wsOn : damp(this._wsA, wsOn, 6, dt)
    const wsA = this._wsA
    this.wsGroup.visible = wsA > 0.02
    if (this.wsGroup.visible) {
      this.wsFlow.setLineOpacity(0.55 * wsA)
      this.wsFlow.setFlowOpacity(0.95 * wsA)
      this.wsFlow.update(dt)
      const pulse = rd ? 0.6 : Math.max(0, Math.sin(t * 2.1))
      const pulse2 = rd ? 0.6 : Math.max(0, Math.sin(t * 2.1 + Math.PI))
      this.merge1.setLevel((0.25 + 0.75 * pulse) * wsA)
      this.merge2.setLevel((0.25 + 0.75 * pulse2) * wsA)
      this.read1.setLevel(0.85 * wsA)
      this.read2.setLevel(0.85 * wsA)
    }
    for (const l of this.wsLabels) l.setOpacity(wsA * 0.9)

    // stack ghosts: fade in on the ×N beat, with a refinement ripple climbing depth
    const stackOn = f === 'stack' ? 1 : 0
    if (f === 'stack' && !rd) this._wave = (this._wave + dt * 0.5) % 1.3
    this._ghostMats.forEach((g, i) => {
      const near = rd ? 0 : smoothstep(0.5, 0, Math.abs(i / 5 - this._wave))
      const tgt = g.base * stackOn * (0.75 + near * 0.7)
      g.mat.opacity = rd ? g.base * stackOn : damp(g.mat.opacity, tgt, 5, dt)
    })
    this.labStack.setOpacity(stackOn * 0.9)

    // parameter budget bar + tie-lines
    const pOn = f === 'params' ? 1 : 0
    this._pA = rd ? pOn : damp(this._pA, pOn, 6, dt)
    this.paramsGroup.visible = this._pA > 0.01
    if (this.paramsGroup.visible) {
      for (const m of this.pSegs) m.material.opacity = 0.92 * this._pA
      this.pTies.setLineOpacity(0.65 * this._pA)
    }
    for (const l of this.pLabels) l.setOpacity(this._pA * 0.95)

    // output head
    this.bars.lerp(dt, { color: palette.blue, hot: palette.hot })
    const headOn = f === 'head' ? 1 : 0
    this.predEdge.setLineOpacity(0.8 * headOn)
    this.predEdge.setFlowOpacity(0.95 * headOn)
    this.predEdge.update(dt)
    for (const l of this.barLabels) l.setOpacity(this._barsShown ? headOn : 0)
  }
}
