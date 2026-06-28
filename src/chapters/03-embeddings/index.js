import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additivePoints, glowBasic } from '../../lib/materials.js'
import { TOKENS, SENTENCE } from '../../lib/example.js'
import { palette, C } from '../../theme/palette.js'
import { damp } from '../../theme/motion.js'
import { isLight } from '../../theme/theme.js'

const N = TOKENS.length
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 03 · words into numbers</span>
      <h2>How words get in</h2>
      <p class="lead">Underneath, a neural network is just arithmetic — additions and multiplications, run billions of times. It can't read a letter; it can only crunch <strong>numbers</strong>. So the very first job is to turn language into numbers it can work with.</p>
      <p>The text is chopped into <span class="tok">tokens</span> — word-chunks, each a whole word or a piece of one. Every token has an <strong>ID</strong>: its row number in a giant lookup table the model built during training. Read off that row and you get a list of numbers — the token's <strong>vector</strong>, also called its <strong>embedding</strong>. Those vectors are what flow into the first layer of the network.</p>
      <p>That table isn't typed in by hand. It's a slab of <strong>weights</strong> — one row per token in the vocabulary — learned during training like every other number in the model. And picking a row is itself just arithmetic: the same as multiplying the whole table by a vector that's all zeros except a single <strong>1</strong>. A lookup is a multiply in disguise.</p>
      <p class="aside">text → tokens → IDs → vectors → into the first layer.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Pictures too</h3>
      <p>The same trick works for images. A picture is sliced into a grid of small <strong>patches</strong> — little square tiles — and each patch is flattened into its own list of numbers, a vector exactly like a token's.</p>
      <p>The flattening hides one step: those raw pixel numbers pass through a learned <strong>projection</strong> — a small matrix — that resizes each patch to the model's vector length. Only then does a tile of pixels match a word vector dimension for dimension.</p>
      <p>So whether it began as a word or a square of pixels, everything reaches the network as the same kind of thing: <em>a vector of numbers</em>. That's how a single model can read text <em>and</em> see images — by the time they arrive, they speak one language.</p>`,
  },
  {
    side: 'center',
    html: `<h3>Meaning as Geometry</h3>
      <p class="lead">Here's the beautiful part. A vector is just a <strong>point in space</strong> — and training arranges that space by <em>meaning</em>.</p>
      <p>Each number in the vector is one coordinate. Two numbers pin a point on a map; three place it inside a room. A real embedding carries far more — commonly <strong>768</strong> numbers, and several <strong>thousand</strong> (4096 and up) in the largest models. That's hundreds of <strong>dimensions</strong>, more than any mind can picture — so we squash it down to the three we can draw.</p>
      <p>Every word in the vocabulary becomes a point, and the whole vocabulary becomes a galaxy. Where a point sits <em>is</em> what the model takes that word to mean.</p>
      <p class="aside">The galaxy here is a <em>shadow</em> — a 3D projection of a space with hundreds of axes. The real distances and angles live up there; the drawing only hints at them.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Similar things sit together</h3>
      <p>Words that turn up in similar company end up in similar places. So <span class="tok">cat</span>, <span class="tok">dog</span> and <span class="tok">lion</span> settle into one neighborhood — while <span class="tok">paris</span>, <span class="tok">tokyo</span> and <span class="tok">cairo</span> gather off in another.</p>
      <p>How? In training, the model reads vast amounts of text and keeps guessing a word from its neighbors. Each wrong guess sends a correction backward — the same <strong>backprop</strong> from the last chapter — nudging the rows of the embedding table a hair's width. Words used the same way get tugged toward the same spot, again and again, until related words pile up together. Nobody places them; the positions arrange themselves.</p>
      <p>How near is near? It's made precise by <strong>cosine similarity</strong> — the cosine of the angle between two vectors, which cares only about direction, not length. Point the same way and it reads about <strong>1</strong>; sit at right angles and it falls to <strong>0</strong>. <span class="tok">cat</span> and <span class="tok">dog</span> score high; <span class="tok">cat</span> and <span class="tok">tokyo</span> sink toward zero.</p>
      <p class="aside">Nobody labeled these groups "animals" or "cities." The closeness <em>is</em> the meaning the model worked out on its own.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Directions carry meaning</h3>
      <p>It's not only <em>where</em> a point sits — the <em>direction</em> from one point to another carries meaning too. The famous example:</p>
      <p class="lead"><strong>king − man + woman ≈ queen</strong></p>
      <p>The step from <span class="tok">man</span> to <span class="tok">woman</span> is the same step as from <span class="tok">king</span> to <span class="tok">queen</span> — the space has lined up a steady "switch the gender" direction. Follow that arrow out from <em>king</em> and you land right where <em>queen</em> lives. You can do <em>arithmetic on meaning</em>.</p>
      <p>And it isn't only gender. A "plural" direction, a "capital-of" direction, a "past-tense" direction — each is a roughly constant offset you can add to one word to reach another. Meaning, it turns out, has a partly <strong>linear</strong> shape, and nobody designed it that way.</p>
      <p class="aside">In honesty the sum rarely lands exactly on <em>queen</em> — you take the nearest point to where you arrive, and the tidiest examples are a little cherry-picked. But the directions are real: relationships do live as repeatable offsets.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Our sentence, embedded</h3>
      <p>Back to our running line — <em>"${SENTENCE}"</em>. Each token leaves the origin and flies out to its own point: this is the sentence being <strong>embedded</strong>.</p>
      <p>These vectors are where every later chapter begins — but they're still raw and <strong>context-free</strong>. Each token gets one fixed point, the same every time it appears, no matter what sits beside it: the <span class="tok">bank</span> of a river and the <span class="tok">bank</span> that holds your cash share a single vector. Before a model can <em>think</em> about words, it has to <strong>place</strong> them — and that's all that has happened so far.</p>
      <p class="aside">These raw embeddings are <em>static</em> — one vector per token, fixed before any context. The next chapter's <strong>attention</strong> makes them <em>contextual</em>: a word's representation becomes a function of the words around it, so river-<span class="tok">bank</span> and money-<span class="tok">bank</span> finally pull apart.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Geometry of meaning</h3>
      <div class="postcard">Words and images both become vectors — points in a learned space where nearness (the angle between them) means similar, and direction means relationship. The model arranged that space itself, from raw text. It's the ground every later chapter stands on — though each word still sits there alone, context-free, until attention lets them mix.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/tokenization">how tokenizing works</a>
        <a class="deepdive" data-route="/attention">next: Attention →</a>
      </div>`,
  },
]

const VIS0 = { galaxy: 0, clusters: 0, para: 0, sentence: 0, text: 0, image: 0 }

export default class Embeddings extends Chapter {
  init() {
    this.reduced = !!this.ctx.reduced
    this.setBloom(0.9, 0.5, 0.82)
    this.addAmbientField(this.reduced ? 240 : 420, 80)
    this.addLights({ key: palette.amber, rim: palette.violet })
    // stronger fog in light so distant galaxy points recede into the background
    // (atmospheric depth) the way they recede into black in dark mode
    this._lite = isLight()
    this._galaxyMax = this._lite ? 0.95 : 0.8
    this.scene.fog.density = this._lite ? 0.024 : 0.016

    this.camHome = new THREE.Vector3(1.4, 0, 12.5)
    this.lookTarget = new THREE.Vector3(1.4, 0, 0)
    this.camera.position.copy(this.camHome)

    this.vis = { ...VIS0 }
    this.target = { ...VIS0 }
    this._markerTween = null

    this._buildPipeline()
    this._buildGalaxy()
    this._buildClusters()
    this._buildParallelogram()
    this._buildSentence()
  }

  // === Input pipeline: text/image → tokens/patches → vectors → network =========
  _buildPipeline() {
    this.pipe = this.add(new THREE.Group())
    this._pipeLabels = [] // { el, kind: 'text'|'image'|'both' }
    const COL_TOK = -3.4
    const COL_VEC = 1.4
    const COL_LAYER = 6.0
    const rowsY = [1.7, 0, -1.7]

    const stageLabel = (text, x, y, kind) => {
      const l = this.label(text, { className: 'tiny muted', position: new THREE.Vector3(x, y, 0), opacity: 0 })
      this._pipeLabels.push({ l, kind })
      return l
    }
    const pill = (text, x, y, kind) => {
      const l = this.label(text, { pill: true, position: new THREE.Vector3(x, y, 0.12), opacity: 0 })
      this._pipeLabels.push({ l, kind })
      return l
    }

    // --- TEXT branch ---
    this.textStage = new THREE.Group()
    this.pipe.add(this.textStage)
    const toks = ['The', 'cat', 'sat']
    const ids = ['464', '2368', '3332']
    this.textVecs = []
    const tEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.13 })
    toks.forEach((w, r) => {
      const y = rowsY[r]
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.66, 0.1), glowBasic(palette.cyan, 0.18))
      box.position.set(COL_TOK, y, 0)
      this.textStage.add(box)
      pill(w, COL_TOK, y, 'text')
      stageLabel('id ' + ids[r], COL_TOK, y - 0.52, 'text')
      const strip = this._vecStrip(COL_VEC, y, palette.amber)
      this.textStage.add(strip)
      this.textVecs.push(strip)
      tEdges.addEdge(new THREE.Vector3(COL_TOK + 0.7, y, 0), new THREE.Vector3(COL_VEC - 0.7, y, 0), palette.cyan, 1)
    })
    this.textEdges = tEdges

    // --- IMAGE branch ---
    this.imageStage = new THREE.Group()
    this.pipe.add(this.imageStage)
    // a tiny 3x3 "picture"
    const img = new THREE.Group()
    img.position.set(COL_TOK, 0, 0)
    const palImg = [palette.amber, palette.rose, palette.amber, palette.rose, palette.cyan, palette.violet, palette.amber, palette.violet, palette.rose]
    for (let k = 0; k < 9; k++) {
      const cx = (k % 3) - 1
      const cy = 1 - Math.floor(k / 3)
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.08), glowBasic(palImg[k], 0.9))
      cell.position.set(cx * 0.5, cy * 0.5, 0)
      img.add(cell)
    }
    this.imageStage.add(img)
    this.imageVecs = []
    const iEdges = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.13 })
    rowsY.forEach((y, r) => {
      const strip = this._vecStrip(COL_VEC, y, palette.violet)
      this.imageStage.add(strip)
      this.imageVecs.push(strip)
      iEdges.addEdge(new THREE.Vector3(COL_TOK + 0.85, 0, 0), new THREE.Vector3(COL_VEC - 0.7, y, 0), palette.violet, 1)
    })
    this.imageEdges = iEdges

    // --- shared: the first network layer + edges from vectors into it ---
    this.layerGroup = new THREE.Group()
    this.pipe.add(this.layerGroup)
    this.layerNodes = []
    const layY = [2.2, 1.1, 0, -1.1, -2.2]
    const lEdges = new EdgeField({ flow: true, flowPerEdge: 1, flowSpeed: 0.55, baseOpacity: 0, flowSize: 0.12 })
    layY.forEach((y) => {
      const node = new GlowNode({ color: palette.cyan, radius: 0.2, halo: 0.8, glow: 1.1 })
      node.position.set(COL_LAYER, y, 0)
      this.layerGroup.add(node)
      this.layerNodes.push(node)
      rowsY.forEach((vy) => lEdges.addEdge(new THREE.Vector3(COL_VEC + 0.7, vy, 0), new THREE.Vector3(COL_LAYER, y, 0), palette.cyan, 0.5))
    })
    this.layerEdges = lEdges
    this.textEdges.build()
    this.imageEdges.build()
    this.layerEdges.build()
    this.pipe.add(this.textEdges, this.imageEdges, this.layerEdges)

    // stage captions
    stageLabel('tokens', COL_TOK, 2.7, 'text')
    stageLabel('image · patches', COL_TOK, 2.7, 'image')
    stageLabel('vectors', COL_VEC, 2.7, 'both')
    stageLabel('the network →', COL_LAYER, 3.0, 'both')
  }

  _vecStrip(x, y, color, cells = 7) {
    const g = new THREE.Group()
    g.position.set(x, y, 0)
    const w = 0.17
    const gap = 0.05
    for (let i = 0; i < cells; i++) {
      const m = glowBasic(color, 1)
      const v = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + x * 1.3 + y))
      m.color.multiplyScalar(0.35 + 0.65 * v)
      const cell = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, 0.08), m)
      cell.position.x = (i - (cells - 1) / 2) * (w + gap)
      g.add(cell)
    }
    return g
  }

  // === existing "meaning" scene ==============================================
  _buildGalaxy() {
    const count = this.reduced ? 340 : this._lite ? 820 : 560
    const R = 13
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const rad = R * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[3 * i] = rad * Math.sin(phi) * Math.cos(theta)
      pos[3 * i + 1] = rad * Math.sin(phi) * Math.sin(theta) * 0.7
      pos[3 * i + 2] = rad * Math.cos(phi)
      const r = Math.random()
      if (r < 0.5) c.copy(C.cyan).lerp(C.violet, Math.random())
      else if (r < 0.82) c.copy(C.violet).lerp(C.amber, Math.random() * 0.5)
      else c.copy(C.amber).lerp(C.hot, Math.random() * 0.4)
      const b = (0.35 + Math.random() * 0.65) * (this._lite ? 0.6 : 1)
      col[3 * i] = c.r * b
      col[3 * i + 1] = c.g * b
      col[3 * i + 2] = c.b * b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    this.galaxy = new THREE.Points(geo, additivePoints(null, this.reduced ? 0.16 : this._lite ? 0.19 : 0.14, 0.8, true))
    this.galaxy.rotation.x = 0.4
    this.add(this.galaxy)
  }

  _buildClusters() {
    this.clusterGroup = this.add(new THREE.Group())
    this.clusterNodes = []
    this.clusterLabels = []
    const groups = [
      { color: palette.cyan, members: [['cat', new THREE.Vector3(-4.3, 1.65, 0.8)], ['dog', new THREE.Vector3(-2.55, 0.75, -0.05)], ['lion', new THREE.Vector3(-3.35, 2.0, 0.9)]] },
      { color: palette.violet, members: [['paris', new THREE.Vector3(2.6, -0.4, -0.5)], ['tokyo', new THREE.Vector3(4.3, -0.85, -1.15)], ['cairo', new THREE.Vector3(3.35, -1.75, -0.35)]] },
    ]
    this.clusterEdges = new EdgeField({ flow: false, baseOpacity: 0 })
    for (const g of groups) {
      const ps = g.members.map(([word, p]) => {
        const node = new GlowNode({ color: g.color, radius: 0.3, halo: 1.0, glow: 1.2 })
        node.position.copy(p)
        node.scale.setScalar(0.001)
        this.clusterGroup.add(node)
        this.clusterNodes.push(node)
        this.clusterLabels.push(this.label(word, { pill: true, position: p.clone().add(new THREE.Vector3(0, 0.62, 0)), opacity: 0 }))
        return p
      })
      for (let a = 0; a < ps.length; a++) this.clusterEdges.addEdge(ps[a], ps[(a + 1) % ps.length], g.color, 0.7)
    }
    this.clusterEdges.build()
    this.add(this.clusterEdges)
  }

  _buildParallelogram() {
    this.paraGroup = this.add(new THREE.Group())
    this.para = { man: new THREE.Vector3(-2.2, -1.3, 0), woman: new THREE.Vector3(1.0, -1.3, 0), king: new THREE.Vector3(-1.6, 1.3, 0), queen: new THREE.Vector3(1.6, 1.3, 0) }
    const spec = [['king', this.para.king, palette.amber], ['man', this.para.man, palette.cyan], ['woman', this.para.woman, palette.cyan], ['queen', this.para.queen, palette.amber]]
    this.paraNodes = []
    this.paraLabels = []
    for (const [word, p, color] of spec) {
      const node = new GlowNode({ color, radius: 0.3, halo: 1.0, glow: 1.3 })
      node.position.copy(p)
      node.scale.setScalar(0.001)
      this.paraGroup.add(node)
      this.paraNodes.push(node)
      this.paraLabels.push(this.label(word, { pill: true, position: p.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 }))
    }
    this.paraEdges = new EdgeField({ flow: true, flowPerEdge: 6, flowSpeed: 0.45, baseOpacity: 0, flowSize: 0.16 })
    this.paraEdges.addEdge(this.para.man, this.para.woman, palette.violet, 1.0)
    this.paraEdges.addEdge(this.para.king, this.para.queen, palette.violet, 1.0)
    this.paraEdges.build()
    this.add(this.paraEdges)
    this.marker = new GlowNode({ color: palette.hot, radius: 0.16, halo: 1.3, glow: 1.5 })
    this.marker.position.copy(this.para.king)
    this.marker.scale.setScalar(0.001)
    this.paraGroup.add(this.marker)
  }

  _buildSentence() {
    this.sentGroup = this.add(new THREE.Group())
    this.sentNodes = []
    this.sentLabels = []
    this.sentTargets = []
    const R = 4.8
    for (let i = 0; i < N; i++) {
      const y = 1 - ((i + 0.5) / N) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = GOLDEN * i
      const tgt = new THREE.Vector3(Math.cos(theta) * r * R + Math.sin(i * 12.9) * 0.4, y * R + Math.cos(i * 7.7) * 0.4, Math.sin(theta) * r * R + Math.sin(i * 4.3) * 0.4)
      this.sentTargets.push(tgt)
      const node = new GlowNode({ color: palette.amber, radius: 0.17, halo: 0.9, glow: 1.3 })
      node.scale.setScalar(0.001)
      this.sentGroup.add(node)
      this.sentNodes.push(node)
      this.sentLabels.push(this.label(TOKENS[i], { pill: true, position: tgt.clone(), opacity: 0 }))
    }
  }

  // === lifecycle =============================================================
  onStep(i) {
    this.target.text = i === 0 ? 1 : 0
    this.target.image = i === 1 ? 1 : 0
    this.target.galaxy = [0, 0, 1, 0.32, 0.28, 0.34, 1][i] ?? 1
    this.target.clusters = i === 3 ? 1 : 0
    this.target.para = i === 4 ? 1 : 0
    this.target.sentence = i === 5 ? 1 : 0

    if (i === 3) this._show(this.clusterNodes, 0.08)
    else this._hide(this.clusterNodes)
    if (i === 4) {
      this._show(this.paraNodes, 0.08)
      this._startMarker()
    } else {
      this._hide(this.paraNodes)
      this._stopMarker()
    }
    if (i === 5) this._flySentence()
    else this._hide(this.sentNodes)

    if (i <= 1) this._setCam(1.4, 0, 12.5, 1.4, 0, 0)
    else if (i === 2) this._setCam(0, 0, 18, 0, 0, 0)
    else if (i === 3) this._setCam(0, 0.3, 11, 0, 0.1, -0.2)
    else if (i === 4) this._setCam(-0.3, 0, 8, -0.3, 0, 0)
    else if (i === 5) this._setCam(0, 0, 13, 0, 0, 0)
    else this._setCam(0, 1.2, 22, 0, 0, 0)
  }

  update(dt, t) {
    for (const k in this.vis) this.vis[k] = damp(this.vis[k], this.target[k], 4, dt)

    // --- pipeline ---
    const pv = Math.max(this.vis.text, this.vis.image)
    this.pipe.visible = pv > 0.01
    if (this.pipe.visible) {
      this.textStage.visible = this.vis.text > 0.01
      this.imageStage.visible = this.vis.image > 0.01
      this._setGroupOpacity(this.textStage, this.vis.text)
      this._setGroupOpacity(this.imageStage, this.vis.image)
      this.layerNodes.forEach((n, i) => n.setLevel(this._lvl(0.85, pv, t, i)))
      if (!this.reduced) {
        this.textEdges.update(dt)
        this.imageEdges.update(dt)
        this.layerEdges.update(dt)
      }
      this.textEdges.setLineOpacity(0.6 * this.vis.text)
      this.textEdges.setFlowOpacity(0.9 * this.vis.text)
      this.imageEdges.setLineOpacity(0.6 * this.vis.image)
      this.imageEdges.setFlowOpacity(0.9 * this.vis.image)
      this.layerEdges.setLineOpacity(0.4 * pv)
      this.layerEdges.setFlowOpacity(0.8 * pv)
      for (const { l, kind } of this._pipeLabels) {
        l.setOpacity(kind === 'image' ? this.vis.image : kind === 'text' ? this.vis.text : pv)
      }
    } else {
      for (const { l } of this._pipeLabels) l.setOpacity(0)
    }

    // --- meaning scene ---
    this.galaxy.material.opacity = this._galaxyMax * this.vis.galaxy
    this.galaxy.visible = this.vis.galaxy > 0.01
    if (!this.reduced) this.galaxy.rotation.y += dt * 0.03

    this.clusterEdges.setLineOpacity(0.7 * this.vis.clusters)
    this.clusterNodes.forEach((n, i) => n.setLevel(this._lvl(0.8, this.vis.clusters, t, i)))
    this.clusterLabels.forEach((l) => l.setOpacity(this.vis.clusters))

    if (!this.reduced) this.paraEdges.update(dt)
    this.paraEdges.setLineOpacity(0.9 * this.vis.para)
    this.paraEdges.setFlowOpacity(0.95 * this.vis.para)
    this.paraNodes.forEach((n, i) => n.setLevel(this._lvl(0.85, this.vis.para, t, i)))
    this.paraLabels.forEach((l) => l.setOpacity(this.vis.para))
    this.marker.setLevel(this.vis.para * (0.8 + 0.2 * Math.sin(t * 5)))

    this.sentNodes.forEach((n, i) => {
      n.setLevel(this._lvl(0.9, this.vis.sentence, t, i))
      const l = this.sentLabels[i]
      l.position.copy(n.position).multiplyScalar(1.14)
      l.setOpacity(this.vis.sentence)
    })

    if (this.reduced) {
      this.camera.position.copy(this.camHome)
    } else {
      this.camera.position.set(
        this.camHome.x + Math.sin(t * 0.18) * 0.4,
        this.camHome.y + Math.cos(t * 0.21) * 0.28,
        this.camHome.z + Math.sin(t * 0.13) * 0.35,
      )
    }
    this.camera.lookAt(this.lookTarget)
  }

  // --- helpers ---------------------------------------------------------------
  _setGroupOpacity(group, o) {
    group.traverse((m) => {
      if (m.material && m.material.transparent !== undefined && m.userData.baseOpacity !== undefined) {
        m.material.opacity = m.userData.baseOpacity * o
      }
    })
  }

  _dur(x) {
    return this.reduced ? 0 : x
  }
  _lvl(base, vis, t, i) {
    return Math.max(0, base * vis + Math.sin(t * 1.5 + i) * 0.06 * vis)
  }
  _setCam(hx, hy, hz, lx, ly, lz) {
    gsap.to(this.camHome, { x: hx, y: hy, z: hz, duration: this._dur(1.4), ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: lz, duration: this._dur(1.4), ease: 'power3.inOut', overwrite: true })
  }
  _show(nodes, stagger) {
    nodes.forEach((n, i) => {
      gsap.killTweensOf(n.scale)
      n.scale.setScalar(0.001)
      gsap.to(n.scale, { x: 1, y: 1, z: 1, duration: this._dur(0.7), delay: this._dur(i * stagger), ease: 'back.out(1.7)' })
    })
  }
  _hide(nodes) {
    nodes.forEach((n) => {
      gsap.killTweensOf(n.scale)
      gsap.to(n.scale, { x: 0.001, y: 0.001, z: 0.001, duration: this._dur(0.4), ease: 'power2.in' })
    })
  }
  _flySentence() {
    this.sentNodes.forEach((n, i) => {
      gsap.killTweensOf(n.scale)
      gsap.killTweensOf(n.position)
      n.position.set(0, 0, 0)
      n.scale.setScalar(0.001)
      const tgt = this.sentTargets[i]
      const delay = this._dur(i * 0.05)
      gsap.to(n.scale, { x: 1, y: 1, z: 1, duration: this._dur(0.8), delay, ease: 'back.out(1.6)' })
      gsap.to(n.position, { x: tgt.x, y: tgt.y, z: tgt.z, duration: this._dur(1.1), delay, ease: 'power3.out' })
    })
  }
  _startMarker() {
    const { king, queen } = this.para
    gsap.killTweensOf(this.marker.scale)
    this.marker.scale.setScalar(0.001)
    gsap.to(this.marker.scale, { x: 1, y: 1, z: 1, duration: this._dur(0.6), delay: this._dur(0.4), ease: 'back.out(1.7)' })
    this._markerTween?.kill()
    if (this.reduced) {
      this.marker.position.copy(queen)
      return
    }
    this.marker.position.copy(king)
    this._markerTween = gsap.fromTo(this.marker.position, { x: king.x, y: king.y, z: king.z }, { x: queen.x, y: queen.y, z: queen.z, duration: 1.8, ease: 'power2.inOut', repeat: -1, repeatDelay: 0.7, delay: 0.5 })
  }
  _stopMarker() {
    this._markerTween?.kill()
    this._markerTween = null
    gsap.killTweensOf(this.marker.scale)
    gsap.to(this.marker.scale, { x: 0.001, y: 0.001, z: 0.001, duration: this._dur(0.4), ease: 'power2.in' })
  }

  dispose() {
    this._markerTween?.kill()
    gsap.killTweensOf(this.camHome)
    gsap.killTweensOf(this.lookTarget)
    super.dispose()
  }
}
