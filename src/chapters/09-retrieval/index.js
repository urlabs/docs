import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { additivePoints, glowBasic } from '../../lib/materials.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp, lerp, clamp01 } from '../../theme/motion.js'

// Chapter 09 — Knowledge & Retrieval (RAG). A frozen model looks things up at
// answer time: documents become VECTORS (a galaxy, callback to Embeddings), the
// QUESTION embeds into the same space, the NEAREST chunks are retrieved and
// dropped into the CONTEXT window (callback to Inference), and the model answers
// GROUNDED in them instead of hallucinating.

const GAL_C = new THREE.Vector3(1.7, 0.5, 0) // galaxy centre
const K = 4 // retrieved chunks (top-k)
const CORE = new THREE.Vector3(-4.2, -0.5, 0)
const QSTART = new THREE.Vector3(-4.2, 1.5, 0)
const RIBBON_Y = -3.05

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 09 · knowledge it never learned</span>
      <h2>Knowledge &amp; Retrieval</h2>
      <p class="lead">Once training ends, a model's weights are <strong>frozen</strong>. Everything it "knows" was baked in before its cutoff — so it can't have read today's news, your company's wiki, or the file you uploaded a second ago.</p>
      <p>Yet a good assistant happily answers about your PDF. The trick isn't more training — it's letting the model <strong>look things up</strong> at answer time and read them before it replies. That pattern is <strong>retrieval</strong>, and paired with generation it's called <strong>RAG</strong>.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Turn documents into a map of meaning</h3>
      <p>First, the knowledge you want on tap — manuals, web pages, a whole codebase — is sliced into bite-sized <strong>chunks</strong>, and each chunk is run through the embedding model from <span class="tok">Meaning as Geometry</span>. Every chunk becomes a <strong>vector</strong>: a point in that same high-dimensional meaning-space.</p>
      <p>Store all those points and you have a <strong>vector database</strong> — a galaxy where nearness means "about the same thing," ready to be searched by meaning instead of by keyword.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Embed the question too</h3>
      <p>When you ask something, your question is pushed through the <em>same</em> embedding model, landing it as a point in the very same space — drifting in right next to the chunks that talk about it.</p>
      <p>Now "find the relevant documents" becomes a geometry problem: <strong>which points sit closest to the question?</strong></p>`,
  },
  {
    side: 'right',
    html: `<h3>Search by meaning, not words</h3>
      <p>The database finds the chunks <strong>nearest</strong> the question — by the same cosine-closeness from the embeddings chapter. This is <strong>semantic search</strong>: it matches <em>meaning</em>, so a question about "my car won't start" can surface a chunk on "dead battery" that shares not one word with it.</p>
      <p class="aside">At scale this isn't a brute-force scan — an <strong>approximate nearest-neighbour</strong> index keeps it near-instant across billions of vectors.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Pull the top matches</h3>
      <p>Keep the closest handful — the <strong>top-k</strong> chunks. These are the snippets most likely to hold the answer, plucked straight from your own sources rather than from the model's memory.</p>
      <p>Quality lives or dies right here: retrieve the wrong chunks and the model answers from the wrong facts. Good chunking, good embeddings, and a sensible cutoff all matter.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Drop them into the context</h3>
      <p>The retrieved chunks are pasted into the model's <strong>context window</strong> — the working memory from the Inference chapter — right beside your question, usually wrapped in an instruction like "answer using these sources."</p>
      <p>The model never learned these facts. It is simply <em>reading</em> them now, exactly the way it reads the rest of the prompt.</p>`,
  },
  {
    side: 'left',
    html: `<h3>A grounded answer</h3>
      <p>Now the model writes its reply <em>from the retrieved text</em> — and because the sources sit right there in context, it can <strong>cite</strong> them. Asked cold, a model may confidently invent a plausible-sounding answer (a <strong>hallucination</strong>); grounded in real chunks, the reply stays tied to something true.</p>
      <p>Same frozen weights, same next-token machine — now anchored to facts it can point at.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Why retrieval changed everything</h3>
      <div class="postcard">Retrieval hands a frozen model fresh, private, verifiable knowledge: embed your documents into a vector database, embed the question, fetch the nearest chunks, and let the model read them before it answers. That's RAG — how assistants stay current, cite sources, and learn your world without retraining.</div>
      <p class="aside">The same move powers a model's long-term <strong>memory</strong> and its <strong>tools</strong>: a web search is just retrieval over the whole internet, dropped into the context.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/embeddings">revisit embeddings</a>
        <a class="deepdive" data-route="/frontier">next: Frontier →</a>
      </div>`,
  },
]

// camera per beat: [y, z, lookY]
const CAM = [
  [-0.2, 11.0, -0.4], [0.5, 11.6, 0.5], [0.3, 11.0, 0.3], [0.5, 9.8, 0.5],
  [0.5, 9.8, 0.5], [-1.1, 11.6, -1.2], [-1.4, 10.8, -0.9], [-0.1, 12.6, -0.2],
]

export default class Retrieval extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(0.92, 0.5, 0.78)
    this.addAmbientField(420, 85)
    this.scene.fog.density = 0.014
    this.addLights({ key: 0x66ddff, rim: 0xa855f7, amb: 0x141d33 })
    this.camera.position.set(0, 0, 11.6)
    this.lookTarget = new THREE.Vector3(0, 0, 0)

    this.beat = 0
    this._buildGalaxy()
    this._buildQuery()
    this._buildModel()
    this._buildContext()
    this._buildLabels()
    this._computeNearest()
  }

  // the vector database: a galaxy of document-chunk points in topical clusters
  _buildGalaxy() {
    this.galG = new THREE.Group()
    this.add(this.galG)
    const CLUSTERS = 6
    const PER = 40
    this.galPos = []
    const cols = []
    this._clusterCenters = []
    for (let c = 0; c < CLUSTERS; c++) {
      const ang = (c / CLUSTERS) * Math.PI * 2
      const cc = GAL_C.clone().add(new THREE.Vector3(Math.cos(ang) * 2.1, Math.sin(ang) * 1.5, Math.sin(ang * 1.7) * 1.2))
      this._clusterCenters.push(cc)
      const col = new THREE.Color(seriesColor(c))
      for (let i = 0; i < PER; i++) {
        const p = cc.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5))
        this.galPos.push(p)
        cols.push(col)
      }
    }
    const n = this.galPos.length
    const pos = new Float32Array(n * 3)
    const colArr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos.set([this.galPos[i].x, this.galPos[i].y, this.galPos[i].z], i * 3)
      colArr.set([cols[i].r, cols[i].g, cols[i].b], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
    this.galaxy = new THREE.Points(geo, additivePoints(null, 0.2, 0.0, true))
    this.galaxy.frustumCulled = false
    this.galG.add(this.galaxy)
    this._galBaseCol = colArr
  }

  _buildQuery() {
    this.query = new GlowNode({ color: palette.hot, radius: 0.22, halo: 1.0, glow: 1.5 })
    this.query.position.copy(QSTART)
    this.query.visible = false
    this.add(this.query)
    // links from the query to the retrieved chunks
    this.links = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.13 })
    this.retr = []
    this._linkIdx = []
    for (let i = 0; i < K; i++) {
      const m = new GlowNode({ color: palette.cyan, radius: 0.16, halo: 0.8, glow: 1.4 })
      m.visible = false
      this.add(m)
      this.retr.push({ node: m, home: new THREE.Vector3(), slot: new THREE.Vector3() })
      this._linkIdx.push(this.links.addEdge(QSTART, GAL_C, palette.cyan, 0))
    }
    this.links.build()
    this.add(this.links)
  }

  _buildModel() {
    this.core = new GlowNode({ color: palette.lime, radius: 0.5, halo: 1.2, glow: 1.5 })
    this.core.position.copy(CORE)
    this.core.setLevel(0.7)
    this.add(this.core)
    // "frozen" ring around the core (intro)
    this.frozenMat = glowBasic(palette.blue, 0)
    this.frozen = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.025, 8, 56), this.frozenMat)
    this.frozen.position.copy(CORE)
    this.add(this.frozen)
    // grounded answer + a dim hallucination ghost for contrast
    this.answer = new GlowNode({ color: palette.cyan, radius: 0.2, halo: 0.9, glow: 1.4 })
    this.answer.position.copy(CORE.clone().add(new THREE.Vector3(0, 1.5, 0)))
    this.answer.setLevel(0)
    this.add(this.answer)
    this.halluc = new GlowNode({ color: palette.rose, radius: 0.18, halo: 0.7, glow: 1.2 })
    this.halluc.position.copy(CORE.clone().add(new THREE.Vector3(1.1, 1.2, 0)))
    this.halluc.setLevel(0)
    this.add(this.halluc)
    // flux: context → core (read), core → answer
    this.flux = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.55, baseOpacity: 0, flowSize: 0.13 })
    this._readIdx = this.flux.addEdge(new THREE.Vector3(CORE.x + 0.6, RIBBON_Y + 0.4, 0), CORE.clone().add(new THREE.Vector3(0, -0.4, 0)), palette.violet, 1)
    this._ansIdx = this.flux.addEdge(CORE.clone().add(new THREE.Vector3(0, 0.5, 0)), this.answer.position.clone(), palette.cyan, 1)
    this.flux.build()
    this.add(this.flux)
  }

  _buildContext() {
    this.ribbon = new ContextRibbon({ maxCells: K + 1, cell: 0.5, height: 0.55, gap: 0.1, color: palette.violet })
    this.ribbon.position.set(0.3, RIBBON_Y, 0)
    this.add(this.ribbon)
  }

  _buildLabels() {
    this.lblModel = this.label('the model', { pill: true, position: CORE.clone().add(new THREE.Vector3(0, -0.95, 0)), opacity: 0 })
    this.lblFrozen = this.label('frozen weights', { className: 'tiny muted', position: CORE.clone().add(new THREE.Vector3(0, 1.15, 0)), opacity: 0 })
    this.lblGal = this.label('vector database', { pill: true, position: GAL_C.clone().add(new THREE.Vector3(0, 2.6, 0)), opacity: 0 })
    this.lblQuery = this.label('your question', { pill: true, position: QSTART.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 })
    this.lblNear = this.label('nearest in meaning', { className: 'tiny', position: GAL_C.clone().add(new THREE.Vector3(0, -2.4, 0)), opacity: 0 })
    this.lblRetr = this.label('retrieved', { className: 'tiny', position: new THREE.Vector3(0.3, RIBBON_Y + 0.7, 0), opacity: 0 })
    this.lblCtx = this.label('context window', { pill: true, position: new THREE.Vector3(0.3, RIBBON_Y - 0.7, 0), opacity: 0 })
    this.lblAns = this.label('grounded answer', { className: 'tiny', position: this.answer.position.clone().add(new THREE.Vector3(0, 0.45, 0)), opacity: 0 })
    this.lblHall = this.label('hallucination?', { className: 'tiny muted', position: this.halluc.position.clone().add(new THREE.Vector3(0.1, 0.4, 0)), opacity: 0 })
  }

  // pick the query's resting point near one cluster, and the K nearest chunks to it
  _computeNearest() {
    this._qSearch = this._clusterCenters[1].clone().add(new THREE.Vector3(0.2, 0.1, 0.3))
    const d = this.galPos.map((p, i) => [i, p.distanceToSquared(this._qSearch)]).sort((a, b) => a[1] - b[1])
    this._nearIdx = d.slice(0, K).map((x) => x[0])
    this.retr.forEach((r, j) => r.home.copy(this.galPos[this._nearIdx[j]]))
    // context slots: query + K chunks laid along the ribbon
    for (let j = 0; j < K; j++) this.retr[j].slot.set(this.ribbon.worldXOf(j + 1), RIBBON_Y, 0)
  }

  enter() {
    if (this.reduced) return
    gsap.from(this.core.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, ease: 'back.out(1.7)' })
  }

  _cam(i) {
    const [y, z, ly] = CAM[i] || CAM[0]
    const d = this.reduced ? 0 : 1.5
    gsap.to(this.camera.position, { x: 0, y, z, duration: d, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: 0, y: ly, z: 0, duration: d, ease: 'power3.inOut', overwrite: true })
  }

  onStep(i) {
    this.beat = i
    this._cam(i)
    // query enters from beat 2 onward; rests in the galaxy for search/retrieve
    if (i >= 2) {
      this.query.visible = true
      let target
      if (i === 2) target = this._qSearch.clone().add(new THREE.Vector3(-1.0, 0.6, 0)) // approaching
      else if (i >= 5) target = new THREE.Vector3(this.ribbon.worldXOf(0), RIBBON_Y, 0) // joins the context
      else target = this._qSearch // 3-4: searching among the chunks
      if (this.reduced) this.query.position.copy(target)
      else { gsap.killTweensOf(this.query.position); gsap.to(this.query.position, { x: target.x, y: target.y, z: target.z, duration: 1.2, ease: 'power2.inOut' }) }
    } else {
      this.query.visible = false
      this.query.position.copy(QSTART)
    }
    // retrieved markers: home (galaxy) during search/retrieve, fly to context at augment+
    if (i === 3 || i === 4) {
      this.retr.forEach((r) => { r.node.visible = true; if (this.reduced) r.node.position.copy(r.home); else { gsap.killTweensOf(r.node.position); gsap.to(r.node.position, { x: r.home.x, y: r.home.y, z: r.home.z, duration: 0.6, ease: 'power2.out' }) } })
    } else if (i >= 5) {
      this.retr.forEach((r, j) => { r.node.visible = true; if (this.reduced) r.node.position.copy(r.slot); else { gsap.killTweensOf(r.node.position); gsap.to(r.node.position, { x: r.slot.x, y: r.slot.y, z: r.slot.z, duration: 1.0, delay: j * 0.12, ease: 'power2.inOut' }) } })
    } else {
      this.retr.forEach((r) => (r.node.visible = false))
    }
    // context ribbon fills at augment
    if (i >= 5) this.ribbon.setFilled(K + 1, { rainbow: true })
    else this.ribbon.setFilled(0)
    // grounded answer / hallucination
    if (i === 6 && !this.reduced) gsap.fromTo(this, { _ans: 0 }, { _ans: 1, duration: 1.0, ease: 'power2.out' })
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    const rd = this.reduced
    const i = this.beat

    // galaxy fades in from beat 1; gently drifts
    const galOn = i >= 1 ? 1 : 0.12
    this.galaxy.material.opacity = rd ? galOn : damp(this.galaxy.material.opacity, galOn, 4, dt)
    if (!rd) this.galG.rotation.y += dt * 0.03

    // query
    this.query.setLevel(0.7 + (rd ? 0 : Math.sin(t * 3) * 0.15))

    // search links query→retrieved (beats 3–4); fade as they move to context
    const linkOn = i === 3 || i === 4 ? 1 : 0
    this.retr.forEach((r, j) => {
      this.links.edges[this._linkIdx[j]].a.copy(this.query.position)
      this.links.edges[this._linkIdx[j]].b.copy(r.node.position)
      this.links.setWeight(this._linkIdx[j], linkOn * 0.8)
      const lit = r.node.visible ? 0.6 + (rd ? 0 : Math.sin(t * 3 + j) * 0.2) : 0
      r.node.setLevel(lit)
    })
    this.links.setLineOpacity(0.6 * linkOn)
    this.links.setFlowOpacity(0.95 * linkOn)
    this.links.update(dt)

    this.ribbon.update(dt)

    // frozen ring (intro), core, flux, answer
    this.frozenMat.opacity = (i === 0 ? 0.6 : 0) * (rd ? 1 : 1)
    if (!rd) this.frozen.rotation.z += dt * 0.4
    this.core.setLevel(0.65 + (rd ? 0 : Math.sin(t * 1.8) * 0.1) + (i >= 6 ? 0.2 : 0))

    const readOn = i >= 5 ? 1 : 0
    this.flux.setWeight(this._readIdx, readOn)
    this.flux.setWeight(this._ansIdx, i >= 6 ? 1 : 0)
    this.flux.setLineOpacity(0.5 * readOn)
    this.flux.setFlowOpacity(0.9 * readOn)
    this.flux.update(dt)

    const ans = rd ? (i >= 6 ? 1 : 0) : (this._ans || 0)
    this.answer.setLevel(i >= 6 ? 0.4 + ans * 0.9 + Math.sin(t * 4) * 0.08 * ans : 0)
    // hallucination ghost: briefly tempting on beat 6, then dimmed by grounding
    this.halluc.setLevel(i === 6 ? (1 - ans) * 0.5 : 0)

    // labels
    this.lblModel.setOpacity(i === 0 || i >= 5 ? 0.85 : 0.3)
    this.lblFrozen.setOpacity(i === 0 ? 0.9 : 0)
    this.lblGal.setOpacity(i >= 1 && i <= 4 ? 0.9 : 0)
    this.lblQuery.setOpacity(i === 2 ? 0.9 : 0)
    this.lblQuery.position.set(this.query.position.x, this.query.position.y + 0.5, this.query.position.z)
    this.lblNear.setOpacity(i === 3 ? 0.9 : 0)
    this.lblRetr.setOpacity(i === 4 ? 0.9 : 0)
    this.lblCtx.setOpacity(i >= 5 ? 0.85 : 0)
    this.lblAns.setOpacity(i >= 6 ? 0.9 : 0)
    this.lblHall.setOpacity(i === 6 ? (1 - ans) * 0.8 : 0)
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    gsap.killTweensOf(this.query.position)
    for (const r of this.retr) gsap.killTweensOf(r.node.position)
    super.dispose()
  }
}
