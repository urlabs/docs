import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additivePoints, additiveLine, glowBasic } from '../../lib/materials.js'
import { TOKENS, SENTENCE } from '../../lib/example.js'
import { palette, C } from '../../theme/palette.js'
import { damp, lerp, smoothstep } from '../../theme/motion.js'
import { isLight } from '../../theme/theme.js'

const N = TOKENS.length
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const DEG = Math.PI / 180
const _UP = new THREE.Vector3(0, 1, 0)
const _av = new THREE.Vector3() // private to _makeArrow.setFromTo
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()

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
    side: 'right',
    html: `<h3>The obvious encoding — and why it fails</h3>
      <p>That "all zeros except a single 1" vector from the lookup has a name: <strong>one-hot</strong>. It's the naive way to make words numeric — give every word its own dimension, put a 1 in its private slot, 0 everywhere else. Simple, honest… and completely blind to meaning.</p>
      <p>Blind, because every one-hot vector sits <em>equally far from every other</em>. Each word points down its own axis, and all those axes meet at perfect right angles — so <span class="tok">cat</span> lands exactly as far from <span class="tok">kitten</span> as from <span class="tok">carburetor</span>. The encoding stores identity and nothing more; no pair of words is any more alike than any other pair.</p>
      <p>The learned rows of the embedding table are the fix: <strong>dense</strong> vectors — a few hundred numbers with <em>every slot in use</em>. Words can now share coordinates, and sharing lets <span class="tok">cat</span> and <span class="tok">kitten</span> settle side by side while <span class="tok">carburetor</span> parks far away. Distance finally <em>means</em> something: relatedness.</p>
      <p class="aside">Scale check: a real vocabulary runs ~100,000 tokens, so one-hot land is a 100,000-dimensional space with all words mutually orthogonal. The embedding table is precisely the learned map from that giant sparse space down to a few hundred dense dimensions.</p>`,
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
      <p>Words that keep the same company end up in the same place: <span class="tok">cat</span>, <span class="tok">dog</span> and <span class="tok">lion</span> condense into one neighborhood, while <span class="tok">paris</span>, <span class="tok">tokyo</span> and <span class="tok">cairo</span> gather off in another.</p>
      <p>Nobody places them — the last chapter's training loop does. The model keeps predicting held-out words from their surroundings, and every miss sends backprop's corrections into the embedding rows too. Words used in interchangeable contexts collect near-identical nudges, so, tug by tiny tug, they drift together. Linguists called it decades before the hardware existed: <em>"you shall know a word by the company it keeps"</em> (J.R. Firth, 1957) — the <strong>distributional hypothesis</strong>. An embedding table is that slogan turned into geometry.</p>
      <p>And the axes themselves? No human names them. Dimension 217 is not "furriness" — whatever directions help prediction simply <em>emerge</em>, usually smeared across many coordinates at once.</p>
      <p class="aside">Stranger still, trained models hold <em>more</em> features than they have dimensions by letting rarely-co-occurring concepts share directions — <strong>superposition</strong>. Untangling those packed features is a live front of interpretability research.</p>`,
  },
  {
    side: 'left',
    html: `<h3>How close is "close"?</h3>
      <p>The galaxy needs a ruler, and the one machines actually use is the <strong>angle</strong>. Two words count as similar when their vectors <em>point the same way</em>: that's <strong>cosine similarity</strong>, <span class="tok">cos θ = a·b / (|a| |b|)</span> — Chapter 1's dot product, divided by the lengths so only direction survives. Near-parallel vectors score ≈ <strong>1</strong>; at right angles the score is <strong>0</strong> — unrelated, exactly where one-hot stranded <em>every</em> pair of words.</p>
      <p>Watch the sweep: as <span class="tok">dog</span> swings toward <span class="tok">cat</span>, cos θ climbs from ~0.1 toward 0.98. And mind the long arrow — <span class="tok">kitten</span> reaches much farther than <span class="tok">cat</span>, yet still scores ≈ 1 against it, because they aim the same way. The length of an arrow isn't the meaning; the <em>direction</em> is.</p>
      <p class="aside">Why angle instead of plain distance? Length soaks up nuisance signal — very frequent words tend to grow long — so raw distance would call twin words "far apart" merely for their lengths. Keep this measure in your pocket: it returns in the Retrieval chapter as the engine of semantic search.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Directions carry meaning</h3>
      <p>Position is only half the geometry. The <em>step</em> from one point to another — an arrow through the space — carries meaning of its own. The famous example: <strong>king − man + woman ≈ queen</strong>.</p>
      <p>Watch it done literally: lift the man→woman arrow, carry it across the space <em>without turning it</em>, and set its tail on <span class="tok">king</span>. The tip comes down beside <span class="tok">queen</span>. One arrow means "switch the gender" wherever you apply it — and it has siblings: a plural direction, a past-tense direction, a capital-of direction that makes Paris − France ≈ Tokyo − Japan, running faint and parallel below.</p>
      <p class="aside">This was the 2013 shock of <strong>word2vec</strong> (Mikolov et al.): a bare prediction task had left analogies lying around as vector arithmetic — meaning had been living in arithmetic all along. In honesty the tip rarely lands <em>exactly</em> on queen — you snap to the nearest word, and the tidiest examples are cherry-picked. Today's contextual models are messier still, but the geometry-of-relations intuition survives, and interpretability keeps finding real linear directions inside them.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Our sentence, embedded</h3>
      <p>Back to our running line — <em>"${SENTENCE}"</em>. Each token leaves the origin and flies to its point in the space: the sentence being <strong>embedded</strong>. This is step one of every model run you will ever trace — before a network can compute anything <em>about</em> words, the words have to become places.</p>
      <p>But look at what these points are: <strong>frozen</strong>. The table hands each token one fixed vector — the same point every time that token appears, deaf to whatever stands beside it. So far the model has <em>placed</em> the words. It hasn't read the sentence.</p>
      <p class="aside">Even <span class="tok">it</span> — a word whose entire job is to point at something else — gets the same stock vector here whether it means the cat or the mat. Hold that thought: it's exactly the itch the next chapter scratches.</p>`,
  },
  {
    side: 'right',
    html: `<h3>One point per word — until it breaks</h3>
      <p>Here's the crack in that frozen picture: <span class="tok">bank</span>. The river kind and the money kind are the same token, so a static table gives them the same point — one spot forced to average two unrelated meanings, sitting awkwardly between the water words and the finance words.</p>
      <p>What you actually want is a vector that <strong>moves with context</strong>: hear "river," and bank's point should slide toward the water neighborhood; hear "loan," and it should slide toward money. Watch the neighbors beam in and pull the point apart — that split is the entire wish-list for the next two chapters. <strong>Attention</strong> is the machinery that lets context words hand meaning to each other, and the <strong>transformer</strong> wires that machinery into a running engine.</p>
      <p class="aside">This is the historical jump from static embeddings (word2vec, GloVe) to the <strong>contextual</strong> representations of ELMo, BERT and everything since: the same word gets a different vector in every sentence it visits.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Everything embeds</h3>
      <p>One last widening of the lens: nothing about this trick is word-shaped. Whole <strong>sentences</strong>, blocks of <strong>code</strong>, <strong>images</strong>, clips of <strong>audio</strong> — anything a network can read can be mapped into a vector space where near still means alike. Train two encoders jointly (the CLIP recipe) and the spaces merge: a <em>photo</em> of a dog lands beside the <em>word</em> "dog." Two media, one geometry.</p>
      <p>That's why embeddings matter twice: they're the front door of every model — and a product in their own right, the index behind semantic search, recommendations, and the retrieval systems that let a model look things up before it answers.</p>
      <div class="postcard">Words, pictures — everything — become points in a learned space where the angle between vectors measures similarity and directions encode relationships. Nobody drew the map; predicting text did. One limit remains: each word owns a single frozen point, blind to context — attention is what finally sets the points in motion.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/tokenization">how tokenizing works</a>
        <a class="deepdive" data-route="/retrieval">embeddings that search</a>
        <a class="deepdive" data-route="/attention">next: Attention →</a>
      </div>`,
  },
]

const VIS0 = { text: 0, image: 0, onehot: 0, galaxy: 0, clusters: 0, cosine: 0, para: 0, sentence: 0, bank: 0, modal: 0 }
const GALAXY_T = [0, 0, 0, 1, 0.32, 0.1, 0.24, 0.34, 0.14, 1]

// camera per beat: [homeX, homeY, homeZ, lookX, lookY, lookZ]
const CAM = [
  [1.4, 0, 12.5, 1.4, 0, 0], // 0 text pipeline
  [1.4, 0, 12.5, 1.4, 0, 0], // 1 image pipeline
  [-0.1, -0.55, 11.8, -0.1, -0.55, 0], // 2 one-hot vs dense
  [0, 0, 18, 0, 0, 0], // 3 galaxy
  [0, 0.3, 11, 0, 0.1, -0.2], // 4 clusters
  [0.6, 0.1, 10.0, 0.6, 0.1, 0], // 5 cosine
  [-1.2, -0.55, 11.0, -1.2, -0.55, 0], // 6 parallelogram
  [0, 0, 13, 0, 0, 0], // 7 sentence
  [0, -0.1, 10.5, 0, -0.1, 0], // 8 bank split
  [0.9, 0.3, 16.5, 0.9, -0.15, 0], // 9 everything embeds
]

// angles (from +x axis) for the cosine beat
const COS_A = 78 * DEG // fixed "cat" arrow
const COS_B0 = -6 * DEG // sweep start (≈ 84° apart → cos ≈ 0.1)
const COS_B1 = 66.5 * DEG // sweep end (≈ 11.5° apart → cos ≈ 0.98)
const ARC_SEG = 36

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
    this._oh = { a: 0, b: 0, c: 0 } // one-hot stages: columns/tripod → strips → map
    this._cosA = { ang: COS_B1 }
    this._lastCosTxt = ''
    this._paraFly = { p: 0 }
    this._queenPulse = 0
    this._cl = { edge: 1 }
    this._bank = { pull: 0, split: 0 }
    this._paraTl = null

    this._buildPipeline()
    this._buildGalaxy()
    this._buildOneHot()
    this._buildClusters()
    this._buildCosine()
    this._buildParallelogram()
    this._buildSentence()
    this._buildBank()
    this._buildModal()
  }

  // === shared: a solid arrow (shaft + cone head), theme-safe ==================
  _makeArrow(color, { shaft = 0.05, headLen = 0.32, headR = 0.13 } = {}) {
    const g = new THREE.Group()
    const mS = glowBasic(color, 1)
    const mH = glowBasic(color, 1)
    mS.transparent = true
    mH.transparent = true
    const sGeo = new THREE.CylinderGeometry(shaft, shaft, 1, 10)
    sGeo.translate(0, 0.5, 0) // spans y 0..1 so scale.y = length
    const body = new THREE.Mesh(sGeo, mS)
    const head = new THREE.Mesh(new THREE.ConeGeometry(headR, headLen, 12), mH)
    g.add(body, head)
    const A = {
      group: g,
      setFromTo(a, b) {
        g.position.copy(a)
        _av.copy(b).sub(a)
        const len = Math.max(0.001, _av.length())
        g.quaternion.setFromUnitVectors(_UP, _av.multiplyScalar(1 / len))
        const s = Math.max(0.001, len - headLen)
        body.scale.set(1, s, 1)
        head.position.y = s + headLen / 2
        return A
      },
      setOpacity(o) {
        mS.opacity = o
        mH.opacity = o
        g.visible = o > 0.01
      },
    }
    return A
  }

  _cellColor(base, v) {
    // intensity of a vector cell, readable in both themes: dark = brightness,
    // light = saturation toward the paper background
    const c = base.clone()
    if (this._lite) c.lerp(C.void, 0.8 * (1 - v))
    else c.multiplyScalar(0.25 + 0.75 * v)
    return c
  }

  // register every mesh material of a group for value-driven fading
  _collectFade(group, list) {
    group.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.transparent = true
        list.push({ mat: o.material, base: o.material.opacity })
      }
    })
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
    // a tiny 3x3 "picture" (nudged right so the left prose card never covers it)
    const COL_IMG = COL_TOK + 0.55
    const img = new THREE.Group()
    img.position.set(COL_IMG, 0, 0)
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
      iEdges.addEdge(new THREE.Vector3(COL_IMG + 0.85, 0, 0), new THREE.Vector3(COL_VEC - 0.7, y, 0), palette.violet, 1)
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
    stageLabel('image · patches', COL_IMG, 2.7, 'image')
    stageLabel('vectors', COL_VEC, 2.7, 'both')
    stageLabel('the network →', COL_LAYER, 3.0, 'both')

    // wire true crossfades (meshes fade with vis instead of popping off)
    this.pipeFadeText = []
    this.pipeFadeImage = []
    this._collectFade(this.textStage, this.pipeFadeText)
    this._collectFade(this.imageStage, this.pipeFadeImage)
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

  // === word galaxy =============================================================
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

  // === one-hot vs dense ========================================================
  _buildOneHot() {
    this.ohGroup = this.add(new THREE.Group())
    this.ohLabels = [] // { l, s: 'a'|'b'|'c', f: opacity factor }
    const lab = (text, x, y, s, opts = {}, f = 1) => {
      const l = this.label(text, { position: new THREE.Vector3(x, y, 0.1), opacity: 0, ...opts })
      this.ohLabels.push({ l, s, f })
      return l
    }

    const WORDS = ['cat', 'kitten', 'carburetor']
    const COLX = [-4.9, -3.5, -2.1]
    const PILL_Y = [2.15, 2.55, 2.15] // staggered so wide pills never collide
    const ROWS = 13
    const LIT = [9, 7, 2]
    const dim = new THREE.Color(palette.muted)
    if (this._lite) dim.lerp(C.void, 0.45)
    else dim.multiplyScalar(0.38)

    // --- sparse columns (one lit cell each), instanced ---
    const cellGeo = new THREE.BoxGeometry(0.5, 0.2, 0.08)
    this.ohColsMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0 })
    this.ohCols = new THREE.InstancedMesh(cellGeo, this.ohColsMat, 3 * ROWS)
    const dummy = new THREE.Object3D()
    let k = 0
    for (let cI = 0; cI < 3; cI++) {
      for (let r = 0; r < ROWS; r++) {
        dummy.position.set(COLX[cI], (r - (ROWS - 1) / 2) * 0.27, 0)
        dummy.updateMatrix()
        this.ohCols.setMatrixAt(k, dummy.matrix)
        this.ohCols.setColorAt(k, r === LIT[cI] ? C.amber : dim)
        k++
      }
      lab(WORDS[cI], COLX[cI], PILL_Y[cI], 'a', { pill: true })
      lab('1', COLX[cI] + 0.52, (LIT[cI] - (ROWS - 1) / 2) * 0.27, 'a', { className: 'tiny' })
    }
    this.ohCols.instanceMatrix.needsUpdate = true
    if (this.ohCols.instanceColor) this.ohCols.instanceColor.needsUpdate = true
    this.ohGroup.add(this.ohCols)
    lab('one-hot', -3.5, -2.25, 'a', { pill: true })
    lab('one dimension per word', -3.5, -2.72, 'a', { className: 'tiny muted' })

    // --- orthogonal unit-spike tripod: every word its own axis, all at 90° ---
    this.ohTripod = new THREE.Group()
    const T_POS = new THREE.Vector3(-0.4, -2.05, 0)
    const T_EUL = new THREE.Euler(0.3, 0.85, 0)
    this.ohTripod.position.copy(T_POS)
    this.ohTripod.rotation.copy(T_EUL)
    this.ohGroup.add(this.ohTripod)
    this.ohAxes = []
    const AXES = [new THREE.Vector3(1.3, 0, 0), new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 0, 1.3)]
    const O0 = new THREE.Vector3(0, 0, 0)
    AXES.forEach((tip) => {
      const a = this._makeArrow(palette.violet, { shaft: 0.035, headLen: 0.24, headR: 0.1 })
      a.setFromTo(O0, tip)
      this.ohTripod.add(a.group)
      this.ohAxes.push(a)
    })
    // right-angle corner marks between each axis pair
    const r0 = 0.34
    const cPts = [
      [r0, 0, 0, r0, r0, 0], [r0, r0, 0, 0, r0, 0], // x-y
      [r0, 0, 0, r0, 0, r0], [r0, 0, r0, 0, 0, r0], // x-z
      [0, r0, 0, 0, r0, r0], [0, r0, r0, 0, 0, r0], // y-z
    ]
    const cGeo = new THREE.BufferGeometry()
    cGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cPts.flat()), 3))
    this.ohCornerMat = additiveLine(palette.violet, 0)
    this.ohTripod.add(new THREE.LineSegments(cGeo, this.ohCornerMat))
    lab('all pairs 90° apart', -0.3, -3.1, 'a', { className: 'tiny muted' })

    // --- dense strips (every slot in use; similar words → similar patterns) ---
    const VALS = [
      [0.9, 0.15, 0.7, 0.35, 0.85, 0.25, 0.6, 0.75, 0.2, 0.5],
      [0.82, 0.22, 0.66, 0.42, 0.9, 0.2, 0.55, 0.7, 0.28, 0.44],
      [0.15, 0.85, 0.3, 0.75, 0.1, 0.8, 0.35, 0.2, 0.7, 0.4],
    ]
    const SCOL = [C.cyan, C.cyan, C.rose]
    const SY = [1.35, 0.45, -0.45]
    const sGeo = new THREE.BoxGeometry(0.2, 0.3, 0.08)
    this.ohStripMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0 })
    this.ohStrips = new THREE.InstancedMesh(sGeo, this.ohStripMat, 30)
    k = 0
    for (let s = 0; s < 3; s++) {
      for (let j = 0; j < 10; j++) {
        dummy.position.set(1.94 + j * 0.24, SY[s], 0)
        dummy.updateMatrix()
        this.ohStrips.setMatrixAt(k, dummy.matrix)
        this.ohStrips.setColorAt(k, this._cellColor(SCOL[s], VALS[s][j]))
        k++
      }
      lab(WORDS[s], 0.95, SY[s], 'b', { pill: true })
    }
    this.ohStrips.instanceMatrix.needsUpdate = true
    if (this.ohStrips.instanceColor) this.ohStrips.instanceColor.needsUpdate = true
    this.ohGroup.add(this.ohStrips)
    lab('dense', 2.98, -1.25, 'b', { pill: true })
    lab('every slot in use', 2.98, -1.72, 'b', { className: 'tiny muted' })

    // --- mini-map: dense vectors become points; distance = relatedness ---
    const MAP = [new THREE.Vector3(2.35, -2.5, 0), new THREE.Vector3(2.95, -2.72, 0), new THREE.Vector3(4.15, -2.3, 0)]
    const MCOL = [palette.cyan, palette.cyan, palette.rose]
    this.ohMapNodes = MAP.map((p, i) => {
      const n = new GlowNode({ color: MCOL[i], radius: 0.13, halo: 0.8, glow: 1.2 })
      n.position.copy(p)
      n.scale.setScalar(0.001)
      this.ohGroup.add(n)
      lab(WORDS[i], p.x, p.y - 0.34, 'c', { className: 'tiny' })
      return n
    })
    this.ohMapEdges = new EdgeField({ flow: false, baseOpacity: 0 })
    this.ohMapEdges.addEdge(MAP[0], MAP[1], palette.cyan, 1)
    this.ohMapEdges.addEdge(MAP[0], MAP[2], palette.muted, 0.35)
    this.ohMapEdges.addEdge(MAP[1], MAP[2], palette.muted, 0.35)
    this.ohMapEdges.build()
    this.ohGroup.add(this.ohMapEdges)
    lab('near = related', 3.25, -3.3, 'c', { className: 'tiny muted' })

    // --- motes flowing between the three stages ---
    this.ohFlow1 = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0, flowSize: 0.11 })
    this.ohFlow2 = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0, flowSize: 0.11 })
    const FCOL = [palette.cyan, palette.cyan, palette.rose]
    for (let i = 0; i < 3; i++) {
      this.ohFlow1.addEdge(new THREE.Vector3(COLX[i] + 0.35, (LIT[i] - 6) * 0.27, 0), new THREE.Vector3(1.7, SY[i], 0), FCOL[i], 0.8)
      this.ohFlow2.addEdge(new THREE.Vector3(4.25, SY[i], 0), MAP[i], FCOL[i], 0.8)
    }
    this.ohFlow1.build()
    this.ohFlow2.build()
    this.ohGroup.add(this.ohFlow1, this.ohFlow2)
  }

  // === clusters ================================================================
  _buildClusters() {
    this.clusterGroup = this.add(new THREE.Group())
    this.clusterNodes = []
    this.clusterLabels = []
    this.clusterHomes = []
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
        this.clusterHomes.push(p.clone())
        this.clusterLabels.push(this.label(word, { pill: true, position: p.clone().add(new THREE.Vector3(0, 0.62, 0)), opacity: 0 }))
        return p
      })
      for (let a = 0; a < ps.length; a++) this.clusterEdges.addEdge(ps[a], ps[(a + 1) % ps.length], g.color, 0.7)
    }
    this.clusterEdges.build()
    this.add(this.clusterEdges)
  }

  // drift in from scattered starts: training tugs related words together
  _flyClusters() {
    const SCAT = [
      [3.2, 1.8, -2.5], [-2.6, 2.8, 2.2], [2.4, -3.0, 1.6],
      [-3.2, 2.4, -2.0], [-3.6, -2.0, 2.6], [2.8, 3.0, -1.8],
    ]
    gsap.killTweensOf(this._cl)
    this._cl.edge = 0
    this.clusterNodes.forEach((n, i) => {
      gsap.killTweensOf(n.scale)
      gsap.killTweensOf(n.position)
      const home = this.clusterHomes[i]
      if (this.reduced) {
        n.position.copy(home)
        n.scale.setScalar(1)
        return
      }
      n.position.copy(home).add(_v1.set(SCAT[i][0], SCAT[i][1], SCAT[i][2]))
      n.scale.setScalar(0.001)
      gsap.to(n.scale, { x: 1, y: 1, z: 1, duration: 0.5, delay: i * 0.06, ease: 'power2.out' })
      gsap.to(n.position, { x: home.x, y: home.y, z: home.z, duration: 1.35, delay: i * 0.06, ease: 'power3.out' })
    })
    if (this.reduced) this._cl.edge = 1
    else gsap.to(this._cl, { edge: 1, duration: 0.7, delay: 1.4 })
  }

  // === cosine similarity =======================================================
  _buildCosine() {
    this.cosGroup = this.add(new THREE.Group())
    const O = (this.cosO = new THREE.Vector3(-1.3, -2.0, 0))

    // faint axes so "vectors from the origin" reads
    const axGeo = new THREE.BufferGeometry()
    axGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      O.x, O.y, 0, O.x + 4.4, O.y, 0,
      O.x, O.y, 0, O.x, O.y + 4.4, 0,
    ]), 3))
    this.cosAxesMat = additiveLine(palette.muted, 0)
    this.cosGroup.add(new THREE.LineSegments(axGeo, this.cosAxesMat))

    this.cosArrA = this._makeArrow(palette.cyan, { shaft: 0.055 })
    this.cosArrA.setFromTo(O, _v1.set(O.x + Math.cos(COS_A) * 3.1, O.y + Math.sin(COS_A) * 3.1, 0))
    this.cosArrC = this._makeArrow(palette.cyan, { shaft: 0.04 })
    const cTip = new THREE.Vector3(O.x + Math.cos(71 * DEG) * 4.7, O.y + Math.sin(71 * DEG) * 4.7, 0)
    this.cosArrC.setFromTo(O, cTip)
    this.cosArrB = this._makeArrow(palette.amber, { shaft: 0.055 })
    this.cosGroup.add(this.cosArrA.group, this.cosArrB.group, this.cosArrC.group)

    // the angle arc between A and B, rebuilt as B sweeps
    this.cosArcPos = new Float32Array(ARC_SEG * 3)
    const arcGeo = new THREE.BufferGeometry()
    arcGeo.setAttribute('position', new THREE.BufferAttribute(this.cosArcPos, 3))
    this.cosArcMat = additiveLine(palette.hot, 0)
    this.cosArc = new THREE.Line(arcGeo, this.cosArcMat)
    this.cosGroup.add(this.cosArc)

    this.cosLabels = []
    const stat = (text, x, y, opts, f = 1) => {
      const l = this.label(text, { position: new THREE.Vector3(x, y, 0.1), opacity: 0, ...opts })
      this.cosLabels.push({ l, f })
      return l
    }
    const aTip = new THREE.Vector3(O.x + Math.cos(COS_A) * 3.1, O.y + Math.sin(COS_A) * 3.1, 0)
    stat('cat', aTip.x - 0.42, aTip.y + 0.3, { pill: true })
    stat('kitten', cTip.x + 0.2, cTip.y + 0.3, { pill: true }, 0.75)
    stat('longer — same direction', O.x + Math.cos(71 * DEG) * 3.5 + 1.5, O.y + Math.sin(71 * DEG) * 3.5 + 0.05, { className: 'tiny muted' }, 0.85)
    stat('90° apart → cos ≈ 0', O.x + 4.0, O.y - 0.38, { className: 'tiny muted' }, 0.85)
    this.cosDogL = this.label('dog', { pill: true, position: new THREE.Vector3(), opacity: 0 })
    this.cosValL = this.label('cos θ = 0.98', { className: 'tiny', position: new THREE.Vector3(), opacity: 0 })
  }

  _updateCosine(dt, t) {
    const v = this.vis.cosine
    this.cosGroup.visible = v > 0.01
    const setL = (o) => {
      for (const { l, f } of this.cosLabels) l.setOpacity(o * f)
      this.cosDogL.setOpacity(o)
      this.cosValL.setOpacity(o)
    }
    if (!this.cosGroup.visible) {
      setL(0)
      return
    }
    const O = this.cosO
    const ang = this._cosA.ang
    // sweeping arrow B
    _v1.set(O.x + Math.cos(ang) * 2.6, O.y + Math.sin(ang) * 2.6, 0)
    this.cosArrB.setFromTo(O, _v1)
    this.cosDogL.position.set(_v1.x + Math.cos(ang) * 0.42, _v1.y + Math.sin(ang) * 0.42, 0)
    // arc between B and A
    for (let k = 0; k < ARC_SEG; k++) {
      const aa = lerp(ang, COS_A, k / (ARC_SEG - 1))
      this.cosArcPos[3 * k] = O.x + Math.cos(aa) * 1.0
      this.cosArcPos[3 * k + 1] = O.y + Math.sin(aa) * 1.0
      this.cosArcPos[3 * k + 2] = 0
    }
    this.cosArc.geometry.attributes.position.needsUpdate = true
    // live cosine readout
    const cosVal = Math.cos(COS_A - ang)
    const txt = 'cos θ = ' + cosVal.toFixed(2)
    if (txt !== this._lastCosTxt) {
      this._lastCosTxt = txt
      this.cosValL.setText(txt)
    }
    const mid = (ang + COS_A) / 2
    this.cosValL.position.set(O.x + Math.cos(mid) * 1.9, O.y + Math.sin(mid) * 1.9, 0)
    // opacities
    this.cosArrA.setOpacity(0.95 * v)
    this.cosArrB.setOpacity(0.95 * v)
    this.cosArrC.setOpacity(0.45 * v)
    this.cosAxesMat.opacity = 0.3 * v
    this.cosArcMat.opacity = 0.9 * v
    setL(v)
  }

  // === directions carry meaning (the real parallelogram) ======================
  _buildParallelogram() {
    this.paraGroup = this.add(new THREE.Group())
    this.para = {
      man: new THREE.Vector3(-2.7, -1.55, 0),
      woman: new THREE.Vector3(0.5, -0.95, 0),
      king: new THREE.Vector3(-1.9, 0.95, 0),
      queen: new THREE.Vector3(1.48, 1.7, 0),
    }
    this.paraDelta = this.para.woman.clone().sub(this.para.man) // (3.2, 0.6, 0)
    this.paraTip = this.para.king.clone().add(this.paraDelta) // lands ≈ queen
    const spec = [['king', this.para.king, palette.amber], ['man', this.para.man, palette.cyan], ['woman', this.para.woman, palette.cyan], ['queen', this.para.queen, palette.amber]]
    this.paraNodes = []
    this.paraLabels = []
    for (const [word, p, color] of spec) {
      const node = new GlowNode({ color, radius: 0.28, halo: 1.0, glow: 1.3 })
      node.position.copy(p)
      node.scale.setScalar(0.001)
      this.paraGroup.add(node)
      this.paraNodes.push(node)
      this.paraLabels.push(this.label(word, { pill: true, position: p.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 }))
    }
    this._queenIdx = 3

    // parallelogram side rails (man→king, woman→tip) — the shape itself
    const sGeo = new THREE.BufferGeometry()
    sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      this.para.man.x, this.para.man.y, 0, this.para.king.x, this.para.king.y, 0,
      this.para.woman.x, this.para.woman.y, 0, this.paraTip.x, this.paraTip.y, 0,
    ]), 3))
    this.paraSideMat = additiveLine(palette.violet, 0)
    this.paraGroup.add(new THREE.LineSegments(sGeo, this.paraSideMat))

    // the base arrow and its flying copy
    this.paraBase = this._makeArrow(palette.violet)
    this.paraBase.setFromTo(this.para.man, this.para.woman)
    this.paraFlyArrow = this._makeArrow(palette.hot)
    this.paraFlyArrow.setFromTo(this.para.king, this.paraTip)
    this.paraGroup.add(this.paraBase.group, this.paraFlyArrow.group)

    // "snap to the nearest word": short tick from the landing tip to queen
    const kGeo = new THREE.BufferGeometry()
    kGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      this.paraTip.x, this.paraTip.y, 0, this.para.queen.x, this.para.queen.y, 0,
    ]), 3))
    this.paraSnapMat = additiveLine(palette.muted, 0)
    this.paraGroup.add(new THREE.LineSegments(kGeo, this.paraSnapMat))

    // ghosted country→capital pairs: one shared direction, reused
    this.paraGhosts = []
    const G = [
      [new THREE.Vector3(-5.15, -2.95, 0), 'france', 'paris'],
      [new THREE.Vector3(-4.1, -3.65, 0), 'japan', 'tokyo'],
    ]
    const gd = new THREE.Vector3(1.45, 0.55, 0)
    this.paraGhostLabels = []
    for (const [a, from, to] of G) {
      const arr = this._makeArrow(palette.amber, { shaft: 0.032, headLen: 0.22, headR: 0.09 })
      const b = a.clone().add(gd)
      arr.setFromTo(a, b)
      this.paraGroup.add(arr.group)
      this.paraGhosts.push(arr)
      this.paraGhostLabels.push(this.label(from, { className: 'tiny muted', position: a.clone().add(new THREE.Vector3(-0.12, -0.26, 0)), opacity: 0 }))
      this.paraGhostLabels.push(this.label(to, { className: 'tiny muted', position: b.clone().add(new THREE.Vector3(0.12, 0.26, 0)), opacity: 0 }))
    }
    this.paraCapL = this.label('capital-of: one shared direction', { className: 'tiny muted', position: new THREE.Vector3(-3.8, -4.3, 0), opacity: 0 })
    this.paraEqL = this.label('king − man + woman ≈ queen', { className: 'tiny', position: new THREE.Vector3(-0.8, 2.6, 0), opacity: 0 })
  }

  _startPara() {
    this._paraTl?.kill()
    gsap.killTweensOf(this._paraFly)
    this._queenPulse = 0
    if (this.reduced) {
      this._paraFly.p = 1
      return
    }
    this._paraFly.p = 0
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.7, delay: 0.7 })
    tl.to(this._paraFly, { p: 1, duration: 1.7, ease: 'power2.inOut' })
    tl.to(this, { _queenPulse: 1, duration: 0.25, ease: 'power1.out' }, '>-0.1')
    tl.to(this, { _queenPulse: 0, duration: 0.9, ease: 'power1.inOut' }, '>+0.7')
    this._paraTl = tl
  }

  _stopPara() {
    this._paraTl?.kill()
    this._paraTl = null
    this._queenPulse = 0
  }

  _updatePara(dt, t) {
    const pv = this.vis.para
    this.paraGroup.visible = pv > 0.01
    const p = this._paraFly.p
    if (this.paraGroup.visible) {
      // flying copy of the man→woman arrow: same direction, tail slides man → king
      _v1.lerpVectors(this.para.man, this.para.king, p)
      _v1.z = Math.sin(p * Math.PI) * 0.9
      _v2.copy(_v1).add(this.paraDelta)
      this.paraFlyArrow.setFromTo(_v1, _v2)
      this.paraFlyArrow.setOpacity(0.95 * pv)
      this.paraBase.setOpacity(0.9 * pv)
      this.paraSideMat.opacity = 0.38 * pv
      this.paraSnapMat.opacity = 0.75 * pv * smoothstep(0.93, 1, p)
      for (const g of this.paraGhosts) g.setOpacity(0.55 * pv)
    } else {
      this.paraFlyArrow.setOpacity(0)
      this.paraBase.setOpacity(0)
      for (const g of this.paraGhosts) g.setOpacity(0)
    }
    this.paraNodes.forEach((n, i) => {
      const pulse = i === this._queenIdx ? this._queenPulse * 0.6 : 0
      n.setLevel(this._lvl(0.85, pv, t, i) + pulse * pv)
    })
    this.paraLabels.forEach((l) => l.setOpacity(pv))
    for (const l of this.paraGhostLabels) l.setOpacity(0.85 * pv)
    this.paraCapL.setOpacity(0.8 * pv)
    this.paraEqL.setOpacity(0.9 * pv)
  }

  // === our sentence flies out ==================================================
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

  // === bank splits: static → contextual ========================================
  _buildBank() {
    this.bankGroup = this.add(new THREE.Group())
    this.bankLabels = { words: [], clones: [] }
    const WATER = [['river', -4.15, 1.45], ['water', -2.75, 1.8], ['boat', -3.65, 0.35]]
    const MONEY = [['money', 3.75, 0.2], ['loan', 2.55, -1.05], ['cash', 3.95, -1.2]]
    this.bankCenter = new THREE.Vector3(0, 0.05, 0)
    this.bankTargets = [new THREE.Vector3(-2.5, 0.85, 0), new THREE.Vector3(2.45, -0.45, 0)]

    this.bankWordNodes = []
    this.bankBeams = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.65, baseOpacity: 0, flowSize: 0.13 })
    const addSide = (list, color) => {
      for (const [w, x, y] of list) {
        const n = new GlowNode({ color, radius: 0.15, halo: 0.8, glow: 1.1 })
        n.position.set(x, y, 0)
        n.scale.setScalar(0.001)
        this.bankGroup.add(n)
        this.bankWordNodes.push(n)
        this.bankLabels.words.push(this.label(w, { pill: true, position: new THREE.Vector3(x, y + 0.45, 0), opacity: 0 }))
        this.bankBeams.addEdge(new THREE.Vector3(x, y, 0), this.bankCenter, color, 0.9)
      }
    }
    addSide(WATER, palette.cyan)
    addSide(MONEY, palette.amber)
    this.bankBeams.build()
    this.bankGroup.add(this.bankBeams)

    this.bankNode = new GlowNode({ color: palette.violet, radius: 0.3, halo: 1.1, glow: 1.4 })
    this.bankNode.position.copy(this.bankCenter)
    this.bankNode.scale.setScalar(0.001)
    this.bankGroup.add(this.bankNode)
    this.bankL = this.label('bank', { pill: true, position: this.bankCenter.clone().add(new THREE.Vector3(0, 0.55, 0)), opacity: 0 })

    this.bankClones = this.bankTargets.map(() => {
      const n = new GlowNode({ color: palette.violet, radius: 0.22, halo: 1.0, glow: 1.4 })
      n.position.copy(this.bankCenter)
      n.scale.setScalar(0.001)
      this.bankGroup.add(n)
      this.bankLabels.clones.push(this.label('bank', { pill: true, position: this.bankCenter.clone(), opacity: 0 }))
      return n
    })

    // ghost trails showing the split even in a still frame
    const tGeo = new THREE.BufferGeometry()
    tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      this.bankCenter.x, this.bankCenter.y, 0, this.bankTargets[0].x, this.bankTargets[0].y, 0,
      this.bankCenter.x, this.bankCenter.y, 0, this.bankTargets[1].x, this.bankTargets[1].y, 0,
    ]), 3))
    this.bankTrailMat = additiveLine(palette.violet, 0)
    this.bankGroup.add(new THREE.LineSegments(tGeo, this.bankTrailMat))
    this.bankCapL = this.label('context pulls it apart', { className: 'tiny muted', position: new THREE.Vector3(0, -2.3, 0), opacity: 0 })
  }

  _updateBank(dt, t) {
    const bv = this.vis.bank
    this.bankGroup.visible = bv > 0.01
    const pull = this._bank.pull
    const split = this._bank.split
    if (this.bankGroup.visible) {
      if (!this.reduced) this.bankBeams.update(dt)
      const inOp = pull * (1 - 0.8 * split)
      this.bankBeams.setLineOpacity(0.45 * bv * inOp)
      this.bankBeams.setFlowOpacity(0.9 * bv * inOp)
      this.bankWordNodes.forEach((n, i) => {
        n.scale.setScalar(Math.max(0.001, bv))
        n.setLevel(this._lvl(0.65, bv, t, i))
      })
      this.bankNode.scale.setScalar(Math.max(0.001, bv * (1 - 0.92 * split)))
      this.bankNode.setLevel(0.9 * bv)
      this.bankClones.forEach((n, ci) => {
        n.position.lerpVectors(this.bankCenter, this.bankTargets[ci], split)
        n.scale.setScalar(Math.max(0.001, bv * Math.min(1, split * 2.5)))
        n.setLevel(this._lvl(0.9, bv * Math.min(1, split * 2), t, ci))
        const l = this.bankLabels.clones[ci]
        l.position.copy(n.position).add(_v1.set(0, 0.5, 0))
        l.setOpacity(bv * smoothstep(0.2, 0.6, split))
      })
      this.bankTrailMat.opacity = 0.45 * bv * split
    }
    const on = this.bankGroup.visible ? 1 : 0
    for (const l of this.bankLabels.words) l.setOpacity(0.9 * bv * on)
    this.bankL.setOpacity(bv * (1 - split) * on)
    this.bankCapL.setOpacity(0.8 * bv * pull * on)
    if (!this.bankGroup.visible) for (const l of this.bankLabels.clones) l.setOpacity(0)
  }

  // === everything embeds: photo / audio / code fly into the galaxy =============
  _buildModal() {
    this.modalGroup = this.add(new THREE.Group())
    this.modalMats = []
    this.modalLabels = []
    const reg = (mat, b) => {
      mat.transparent = true
      mat.opacity = 0
      this.modalMats.push({ mat, b })
      return mat
    }
    const mLab = (text, x, y, z, opts = {}, f = 1) => {
      const l = this.label(text, { position: new THREE.Vector3(x, y, z), opacity: 0, ...opts })
      this.modalLabels.push({ l, f })
      return l
    }
    const line = (pts, color, closed = false) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)))
      const m = reg(additiveLine(color, 0.95), 0.95)
      return closed ? new THREE.LineLoop(g, m) : new THREE.Line(g, m)
    }

    // photo glyph
    const photo = new THREE.Group()
    const photoBody = new THREE.Group()
    photo.add(photoBody)
    photoBody.add(line([[-0.34, -0.26], [0.34, -0.26], [0.34, 0.26], [-0.34, 0.26]], palette.lime, true))
    photoBody.add(line([[-0.26, -0.18], [-0.08, 0.08], [0.02, -0.04], [0.24, 0.16]], palette.lime))
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), reg(glowBasic(palette.lime, 1), 1))
    sun.position.set(0.17, 0.14, 0)
    photoBody.add(sun)

    // audio glyph (waveform bars)
    const audio = new THREE.Group()
    const audioBody = new THREE.Group()
    audio.add(audioBody)
    const hs = [0.2, 0.42, 0.64, 0.38, 0.2]
    hs.forEach((h, i) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.085, h, 0.05), reg(glowBasic(palette.rose, 1), 1))
      bar.position.set((i - 2) * 0.14, 0, 0)
      audioBody.add(bar)
    })

    // code glyph (< / >)
    const code = new THREE.Group()
    const codeBody = new THREE.Group()
    code.add(codeBody)
    codeBody.add(line([[-0.1, 0.22], [-0.3, 0], [-0.1, -0.22]], palette.blue))
    codeBody.add(line([[0.1, 0.22], [0.3, 0], [0.1, -0.22]], palette.blue))
    codeBody.add(line([[-0.05, -0.26], [0.05, 0.26]], palette.blue))

    const TO = [new THREE.Vector3(4.3, 3.0, 0.5), new THREE.Vector3(6.3, -0.4, 0), new THREE.Vector3(3.3, -3.3, 0.3)]
    const FROM = [new THREE.Vector3(14, 7, 5), new THREE.Vector3(16, -4, 3), new THREE.Vector3(13, -8, -1)]
    const WORD = [new THREE.Vector3(2.9, 2.55, 0.5), new THREE.Vector3(4.85, -0.85, 0), new THREE.Vector3(1.95, -3.75, 0.3)]
    const WORDS = ['dog', 'melody', 'sort()']
    const CAPS = ['photo', 'audio', 'code']
    this.modalGlyphs = [photo, audio, code].map((g, i) => {
      g.position.copy(FROM[i])
      g.scale.setScalar(2)
      this.modalGroup.add(g)
      mLab(CAPS[i], TO[i].x, TO[i].y - 0.95, TO[i].z, { className: 'tiny muted' }, 0.85)
      return { g, body: g.children[0], from: FROM[i], to: TO[i] }
    })
    this.modalWordNodes = WORD.map((p, i) => {
      const n = new GlowNode({ color: palette.amber, radius: 0.2, halo: 0.9, glow: 1.2 })
      n.position.copy(p)
      n.scale.setScalar(0.001)
      this.modalGroup.add(n)
      mLab(WORDS[i], p.x, p.y + 0.55, p.z, { pill: true })
      return n
    })
    // short ties: the glyph settles right beside its word-neighbor
    const tie = new Float32Array(18)
    TO.forEach((p, i) => {
      tie.set([p.x, p.y, p.z, WORD[i].x, WORD[i].y, WORD[i].z], i * 6)
    })
    const tieGeo = new THREE.BufferGeometry()
    tieGeo.setAttribute('position', new THREE.BufferAttribute(tie, 3))
    this.modalTieMat = additiveLine(palette.muted, 0)
    this.modalGroup.add(new THREE.LineSegments(tieGeo, this.modalTieMat))
    this.modalCapL = this.label('one space, many media', { className: 'tiny muted', position: new THREE.Vector3(4.6, -5.0, 0), opacity: 0 })
  }

  _flyModal() {
    this.modalGlyphs.forEach(({ g, body, from, to }, i) => {
      gsap.killTweensOf(g.position)
      gsap.killTweensOf(body.rotation)
      if (this.reduced) {
        g.position.copy(to)
        body.rotation.z = 0
        return
      }
      g.position.copy(from)
      body.rotation.z = -1.4
      gsap.to(g.position, { x: to.x, y: to.y, z: to.z, duration: 1.6, delay: 0.3 + i * 0.3, ease: 'power3.out' })
      gsap.to(body.rotation, { z: 0, duration: 1.6, delay: 0.3 + i * 0.3, ease: 'power2.out' })
    })
  }

  _updateModal(dt, t) {
    const mv = this.vis.modal
    this.modalGroup.visible = mv > 0.01
    if (this.modalGroup.visible) {
      for (const { mat, b } of this.modalMats) mat.opacity = b * mv
      this.modalTieMat.opacity = 0.7 * mv
      this.modalWordNodes.forEach((n, i) => {
        n.scale.setScalar(Math.max(0.001, mv))
        n.setLevel(this._lvl(0.75, mv, t, i))
      })
      if (!this.reduced) {
        this.modalGlyphs.forEach(({ body }, i) => {
          body.position.y = Math.sin(t * 1.2 + i * 2.1) * 0.05
        })
      }
    }
    for (const { l, f } of this.modalLabels) l.setOpacity(mv * f)
    this.modalCapL.setOpacity(0.8 * mv)
  }

  // === lifecycle =============================================================
  onStep(i) {
    this.target.text = i === 0 ? 1 : 0
    this.target.image = i === 1 ? 1 : 0
    this.target.onehot = i === 2 ? 1 : 0
    this.target.galaxy = GALAXY_T[i] ?? 1
    this.target.clusters = i === 4 ? 1 : 0
    this.target.cosine = i === 5 ? 1 : 0
    this.target.para = i === 6 ? 1 : 0
    this.target.sentence = i === 7 ? 1 : 0
    this.target.bank = i === 8 ? 1 : 0
    this.target.modal = i === 9 ? 1 : 0

    // one-hot → dense → points, staged
    gsap.killTweensOf(this._oh)
    if (i === 2) {
      if (this.reduced) {
        this._oh.a = this._oh.b = this._oh.c = 1
      } else {
        this._oh.a = this._oh.b = this._oh.c = 0
        gsap.to(this._oh, { a: 1, duration: 0.6, ease: 'power2.out', delay: 0.05 })
        gsap.to(this._oh, { b: 1, duration: 0.6, ease: 'power2.out', delay: 0.7 })
        gsap.to(this._oh, { c: 1, duration: 0.6, ease: 'power2.out', delay: 1.35 })
      }
    }

    if (i === 4) this._flyClusters()
    else this._hide(this.clusterNodes)

    // cosine sweep
    gsap.killTweensOf(this._cosA)
    if (i === 5) {
      if (this.reduced) {
        this._cosA.ang = COS_B1
      } else {
        this._cosA.ang = COS_B0
        gsap.to(this._cosA, { ang: COS_B1, duration: 3.2, ease: 'sine.inOut', delay: 0.5, repeat: -1, yoyo: true, repeatDelay: 1.1 })
      }
    }

    if (i === 6) {
      this._show(this.paraNodes, 0.08)
      this._startPara()
    } else {
      this._hide(this.paraNodes)
      this._stopPara()
    }

    if (i === 7) this._flySentence()
    else this._hide(this.sentNodes)

    // bank split
    gsap.killTweensOf(this._bank)
    if (i === 8) {
      if (this.reduced) {
        this._bank.pull = 1
        this._bank.split = 1
      } else {
        this._bank.pull = 0
        this._bank.split = 0
        gsap.to(this._bank, { pull: 1, duration: 0.6, delay: 0.2, ease: 'power2.out' })
        gsap.to(this._bank, { split: 1, duration: 1.1, delay: 1.6, ease: 'power2.inOut' })
      }
    } else {
      this._bank.pull = 0
      this._bank.split = 0
    }

    if (i === 9) this._flyModal()

    const c = CAM[i] || CAM[0]
    this._setCam(c[0], c[1], c[2], c[3], c[4], c[5])
  }

  update(dt, t) {
    for (const k in this.vis) this.vis[k] = damp(this.vis[k], this.target[k], 4, dt)

    // --- pipeline ---
    const pv = Math.max(this.vis.text, this.vis.image)
    this.pipe.visible = pv > 0.01
    if (this.pipe.visible) {
      this.textStage.visible = this.vis.text > 0.01
      this.imageStage.visible = this.vis.image > 0.01
      for (const { mat, base } of this.pipeFadeText) mat.opacity = base * this.vis.text
      for (const { mat, base } of this.pipeFadeImage) mat.opacity = base * this.vis.image
      this.layerNodes.forEach((n, i) => {
        n.scale.setScalar(Math.max(0.001, pv))
        n.setLevel(this._lvl(0.85, pv, t, i))
      })
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

    // --- one-hot vs dense ---
    const ov = this.vis.onehot
    this.ohGroup.visible = ov > 0.01
    if (this.ohGroup.visible) {
      this.ohColsMat.opacity = ov * this._oh.a
      this.ohStripMat.opacity = ov * this._oh.b
      this.ohCornerMat.opacity = 0.55 * ov * this._oh.a
      for (const a of this.ohAxes) a.setOpacity(0.9 * ov * this._oh.a)
      this.ohMapEdges.setLineOpacity(0.85 * ov * this._oh.c)
      this.ohMapNodes.forEach((n, i) => {
        n.scale.setScalar(Math.max(0.001, ov * this._oh.c))
        n.setLevel(this._lvl(0.8, ov * this._oh.c, t, i))
      })
      if (!this.reduced) {
        this.ohFlow1.update(dt)
        this.ohFlow2.update(dt)
      }
      this.ohFlow1.setLineOpacity(0.12 * ov * this._oh.b)
      this.ohFlow1.setFlowOpacity(0.6 * ov * this._oh.b)
      this.ohFlow2.setLineOpacity(0.12 * ov * this._oh.c)
      this.ohFlow2.setFlowOpacity(0.6 * ov * this._oh.c)
      for (const { l, s, f } of this.ohLabels) l.setOpacity(ov * this._oh[s] * f)
    } else {
      for (const { l } of this.ohLabels) l.setOpacity(0)
    }

    // --- galaxy ---
    this.galaxy.material.opacity = this._galaxyMax * this.vis.galaxy
    this.galaxy.visible = this.vis.galaxy > 0.01
    if (!this.reduced) this.galaxy.rotation.y += dt * 0.03

    // --- clusters (labels track the drifting nodes) ---
    this.clusterEdges.setLineOpacity(0.7 * this.vis.clusters * this._cl.edge)
    this.clusterNodes.forEach((n, i) => {
      n.setLevel(this._lvl(0.8, this.vis.clusters, t, i))
      const l = this.clusterLabels[i]
      l.position.copy(n.position).add(_v1.set(0, 0.62, 0))
      l.setOpacity(this.vis.clusters)
    })

    this._updateCosine(dt, t)
    this._updatePara(dt, t)

    // --- sentence ---
    this.sentNodes.forEach((n, i) => {
      n.setLevel(this._lvl(0.9, this.vis.sentence, t, i))
      const l = this.sentLabels[i]
      l.position.copy(n.position).multiplyScalar(1.14)
      l.setOpacity(this.vis.sentence)
    })

    this._updateBank(dt, t)
    this._updateModal(dt, t)

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

  dispose() {
    this._paraTl?.kill()
    gsap.killTweensOf(this._cosA)
    gsap.killTweensOf(this._oh)
    gsap.killTweensOf(this._bank)
    gsap.killTweensOf(this._cl)
    gsap.killTweensOf(this._paraFly)
    gsap.killTweensOf(this.camHome)
    gsap.killTweensOf(this.lookTarget)
    super.dispose()
  }
}
