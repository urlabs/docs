import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { ContextRibbon } from '../../lib/ContextRibbon.js'
import { additivePoints, additiveLine, glowBasic } from '../../lib/materials.js'
import { palette, seriesColor } from '../../theme/palette.js'
import { damp } from '../../theme/motion.js'

// Chapter 09 — Knowledge & Retrieval (RAG). A frozen model looks things up at
// answer time: documents become VECTORS (a galaxy, callback to Embeddings), the
// QUESTION embeds into the same space, an ANN sweep returns a geometric SHORTLIST,
// a cross-encoder RERANKER re-reads and reorders it, and the winners land in the
// CONTEXT window (callback to Inference) for a grounded, cited answer. Then the
// modern move — the model issues its own queries, hopping the index — and the
// honest coda: how retrieval fails (bad splits, stale vectors, lost-in-the-middle).

const GAL_C = new THREE.Vector3(1.7, 0.5, 0) // galaxy centre
const CORE = new THREE.Vector3(-4.2, -0.5, 0)
const QSTART = new THREE.Vector3(-4.2, 1.5, 0)
const RIBBON_Y = -3.05

const NC = 8 // shortlist candidates shown (stands in for the ANN's ~top-50)
const K = 4 // reranked chunks that reach the context
const COL_X = -1.65 // shortlist column
const COL_TOP = 2.05
const COL_STEP = 0.5
const PLATE_W = 0.95
const PLATE_H = 0.3
const RER = new THREE.Vector3(-0.35, 1.5, 0) // reranker node
const QDOCK = new THREE.Vector3(-0.35, 2.2, 0) // query docks beside the reranker

// candidate j = geometric rank j. Cluster of origin (1 = the query's topic
// cluster; 0 and 2 are neighbouring topics that sneak into the shortlist).
const CAND_CLUSTER = [1, 1, 1, 0, 1, 1, 2, 0]
const GEO_SCORE = [0.96, 0.9, 0.86, 0.82, 0.77, 0.73, 0.68, 0.63]
// after the reranker READS each pair: cand3 climbs to #1, the geometric #1 drops
const NEWROW = [4, 1, 2, 0, 5, 3, 6, 7] // cand j → new row
const RR_SCORE = [0.34, 0.84, 0.75, 0.96, 0.3, 0.66, 0.24, 0.18]
const TOP = [3, 1, 2, 5] // final row order 0..3 → cand index (fly to context)
const DROP = 0 // geometric #1 — right words, wrong meaning
const STAR = 3 // mid-list chunk that actually answers
const BOW = [0.5, -0.18, 0.18, -0.55, 0.18, -0.18, 0.15, -0.15]

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
    html: `<h3>Stage one — a fast sweep of the galaxy</h3>
      <p>The database finds the chunks <strong>nearest</strong> the question — the same cosine-closeness from the embeddings chapter. This is <strong>semantic search</strong>: it matches <em>meaning</em>, so "my car won't start" can surface a chunk about "dead battery" that shares not a single word with it.</p>
      <p>At production scale nobody compares the question to every vector. An <strong>approximate nearest-neighbour</strong> (ANN) index sweeps billions of points in milliseconds — and returns not one winner but a generous <strong>shortlist</strong>, say the top 50. This is stage one of a funnel: cheap, fast, and only as smart as raw geometry.</p>
      <p class="aside">Indexes like <strong>HNSW</strong> pull this off by hopping through a pre-built graph of neighbours instead of scanning — trading a sliver of recall for orders-of-magnitude speed.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Stage two — a reranker reads the shortlist</h3>
      <p>Geometric closeness is a proxy: it loves chunks that <em>sound</em> like the question, not necessarily ones that answer it. So real search adds a second pass — a <strong>reranker</strong>, a <strong>cross-encoder</strong> that reads the question and one candidate <em>together, as a pair</em>, and re-scores each shortlisted chunk on actual relevance.</p>
      <p>Watch the list reshuffle: the geometric #1 slides down — right words, wrong meaning — while a mid-list chunk that truly answers the question climbs to the top. Reading pairs is expensive, but on 50 candidates it's pocket change; on a billion documents it would be impossible. That asymmetry <em>is</em> the funnel.</p>
      <p class="aside">The embedding model is a <strong>bi-encoder</strong> — question and document encoded separately, so documents can be indexed ahead of time. Production stacks also run <strong>keyword search</strong> (BM25) alongside vectors, because embeddings blur exact part numbers, names, and error codes.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Drop them into the context</h3>
      <p>The funnel's winners — the reranked <strong>top-k</strong> — are pasted into the model's <strong>context window</strong>, the working memory from the Inference chapter, right beside your question, usually wrapped in an instruction like "answer using these sources."</p>
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
    html: `<h3>The model takes the wheel</h3>
      <p>Classic RAG retrieves once, before the model even starts. Modern assistants flip that: the model itself decides <strong>when</strong> to search and writes its own queries, issuing them mid-thought as <strong>tool calls</strong>. Retrieval becomes something the model <em>does</em>, not something done to it.</p>
      <p>Hard questions take <strong>hops</strong>. "Who advised the person who founded the lab?" — no single chunk holds that. So: search the founder, read, notice what's missing, then fire a second, sharper query at a different corner of the space. Watch hop 1 come back thin — and the model re-aim.</p>
      <p class="aside">A web search is just retrieval whose index is the whole internet. And this loop — act, observe, refine, act again — is the seed of the <strong>agents</strong> waiting in the Frontier chapter.</p>`,
  },
  {
    side: 'left',
    html: `<h3>When retrieval fails</h3>
      <p>Grounding is only as good as what lands in the ribbon: <strong>garbage in, grounded garbage out</strong>. A chunk split mid-thought embeds as mush and retrieves as noise — good chunkers cut on sentence and section boundaries and <strong>overlap</strong> the windows so no idea is orphaned.</p>
      <p>Vectors don't age, either. An index built last month happily serves last month's prices with full confidence — a <strong>stale index</strong> turns retrieval into confident time travel. Production systems re-embed on a refresh schedule.</p>
      <p>And even perfect chunks can get lost: models weight the <strong>start and end</strong> of a long context more than its middle — the "<strong>lost in the middle</strong>" effect. Order matters when you stuff the ribbon: put the best evidence first or last, never buried in the middle of twenty.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Why retrieval changed everything</h3>
      <div class="postcard">Retrieval hands a frozen model fresh, private, verifiable knowledge: chunk and embed your documents, sweep the vector galaxy for a shortlist, let a reranker read the finalists, and paste the winners into the context for a cited, grounded answer. And the modern move hands the model the steering wheel — it searches when it needs to, as many hops as the question takes.</div>
      <p class="aside">The same loop powers a model's long-term <strong>memory</strong> and its <strong>tools</strong> — the difference is just what sits in the index. That thread continues in the Frontier chapter.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/embeddings">revisit embeddings</a>
        <a class="deepdive" data-route="/frontier">next: Frontier →</a>
      </div>`,
  },
]

// camera per beat: [x, y, z, lookX, lookY]
const CAM = [
  [-1.2, -0.2, 11.0, -1.2, -0.4], // 0 core + frozen ring
  [0.6, 0.5, 11.6, 0.6, 0.5], // 1 galaxy + documents streaming in
  [0.6, 0.4, 11.0, 0.6, 0.4], // 2 question drifts in
  [0.1, 0.5, 10.8, 0.1, 0.5], // 3 ANN sweep + shortlist assembles
  [-1.25, 0.9, 8.2, -1.25, 0.6], // 4 reranker reorders the column
  [-0.7, -1.0, 11.2, -0.7, -1.1], // 5 winners fly to the ribbon
  [-1.5, -1.3, 10.6, -1.5, -0.9], // 6 grounded answer at the core
  [-1.0, -0.4, 13.6, -1.0, -0.55], // 7 multi-hop loop, whole stage
  [0.9, -1.9, 8.6, 0.9, -2.1], // 8 failure vignettes at the ribbon
  [0, -0.1, 13.4, 0, -0.25], // 9 finale
]

// rebuild an EdgeField's line-segment positions after mutating edge endpoints
function syncLines(f) {
  const attr = f.lineGeo?.attributes?.position
  if (!attr) return
  for (let i = 0; i < f.edges.length; i++) {
    const e = f.edges[i]
    attr.setXYZ(i * 2, e.a.x, e.a.y, e.a.z)
    attr.setXYZ(i * 2 + 1, e.b.x, e.b.y, e.b.z)
  }
  attr.needsUpdate = true
}

export default class Retrieval extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(0.92, 0.5, 0.78)
    this.addAmbientField(420, 85)
    this.scene.fog.density = 0.014
    this.addLights({ key: 0x66ddff, rim: 0xa855f7, amb: 0x141d33 })
    this.camera.position.set(0, 0, 11.6)
    this.lookTarget = new THREE.Vector3(0, -0.4, 0)

    this.beat = 0
    this._ans = 0
    this._scanP = 0
    this._rrSwap = 0
    this._rrDone = 0
    this._hopL1 = 0
    this._hopL2 = 0
    this._notE = 0
    this._dim1 = 0
    this._hopAns = 0
    this._hw = [0, 0, 0, 0]

    this._buildGalaxy()
    this._computeCandidatePoints()
    this._buildDocs()
    this._buildQuery()
    this._buildCandidates()
    this._buildRerank()
    this._buildModel()
    this._buildContext()
    this._buildHops()
    this._buildVignettes()
    this._buildLabels()
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
  }

  // where the query lands, and the 8 shortlist chunks around it (hand-placed so
  // the geometric ranking — and the rerank story — is deterministic)
  _computeCandidatePoints() {
    const c0 = this._clusterCenters[0]
    const c1 = this._clusterCenters[1]
    const c2 = this._clusterCenters[2]
    const q = (this._qSearch = c1.clone().add(new THREE.Vector3(0.2, 0.1, 0.3)))
    const toC0 = c0.clone().sub(q).normalize()
    const toC2 = c2.clone().sub(q).normalize()
    const toC0b = toC0.clone().add(new THREE.Vector3(0, -0.35, 0.3)).normalize()
    const dirs = [
      new THREE.Vector3(0.5, -0.3, 0.2).normalize(),
      new THREE.Vector3(-0.55, 0.25, -0.3).normalize(),
      new THREE.Vector3(0.2, 0.55, 0.45).normalize(),
      toC0,
      new THREE.Vector3(-0.4, -0.5, 0.35).normalize(),
      new THREE.Vector3(0.6, 0.3, -0.5).normalize(),
      toC2,
      toC0b,
    ]
    const rads = [0.32, 0.55, 0.72, 0.95, 1.1, 1.22, 1.45, 1.6]
    this._candHome = dirs.map((d, j) => q.clone().add(d.clone().multiplyScalar(rads[j])))
  }

  // beat 1: document plates shedding chunk-motes into every cluster
  _buildDocs() {
    this.docsG = new THREE.Group()
    this.docsG.position.set(-1.7, 2.4, 0)
    this.docMat = glowBasic(palette.violet, 0)
    const geo = new THREE.BoxGeometry(0.55, 0.7, 0.05)
    const offs = [
      [-0.12, 0.13, -0.08, 0.1],
      [0, 0, 0, 0],
      [0.12, -0.13, 0.08, -0.08],
    ]
    for (const [x, y, z, rz] of offs) {
      const m = new THREE.Mesh(geo, this.docMat)
      m.position.set(x, y, z)
      m.rotation.z = rz
      this.docsG.add(m)
    }
    this.add(this.docsG)
    this.docFlow = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.35, baseOpacity: 0, flowSize: 0.17 })
    for (let c = 0; c < this._clusterCenters.length; c++) {
      this.docFlow.addEdge(new THREE.Vector3(-1.55, 2.3, 0), this._clusterCenters[c], seriesColor(c), 0.9)
    }
    this.docFlow.build()
    this.add(this.docFlow)
  }

  _buildQuery() {
    this.query = new GlowNode({ color: palette.hot, radius: 0.22, halo: 1.0, glow: 1.5 })
    this.query.position.copy(QSTART)
    this.query.visible = false
    this.add(this.query)
    // ANN search links: query → the shortlisted points in the galaxy
    this.links = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.6, baseOpacity: 0, flowSize: 0.12 })
    for (let j = 0; j < NC; j++) this.links.addEdge(QSTART, this._candHome[j], palette.cyan, 0)
    this.links.build()
    this.add(this.links)
  }

  // the shortlist: 8 chunk plates (with score bars) + their markers in the galaxy
  _buildCandidates() {
    this.cands = []
    const plateGeo = new THREE.BoxGeometry(PLATE_W, PLATE_H, 0.07)
    const barGeo = new THREE.BoxGeometry(1, 0.055, 0.05)
    barGeo.translate(0.5, 0, 0) // anchor left so scale.x = bar length
    for (let j = 0; j < NC; j++) {
      const col = seriesColor(CAND_CLUSTER[j])
      const grp = new THREE.Group()
      const plateMat = glowBasic(col, 0.9)
      plateMat.transparent = true
      const plate = new THREE.Mesh(plateGeo, plateMat)
      grp.add(plate)
      const barMat = glowBasic(palette.violet, 0.95)
      barMat.transparent = true
      const bar = new THREE.Mesh(barGeo, barMat)
      bar.position.set(-PLATE_W / 2 + 0.045, -0.09, 0.05)
      bar.scale.x = GEO_SCORE[j] * 0.86
      grp.add(bar)
      grp.position.copy(this._candHome[j])
      grp.visible = false
      this.add(grp)
      const marker = new GlowNode({ color: col, radius: 0.09, halo: 0.7, glow: 1.3 })
      marker.position.copy(this._candHome[j])
      marker.visible = false
      this.add(marker)
      this.cands.push({ grp, plate, plateMat, bar, barMat, marker, home: this._candHome[j] })
    }
  }

  _colSlot(row) {
    return new THREE.Vector3(COL_X, COL_TOP - row * COL_STEP, 0)
  }

  _buildRerank() {
    this.rer = new GlowNode({ color: palette.amber, radius: 0.24, halo: 1.0, glow: 1.5 })
    this.rer.position.copy(RER)
    this.rer.visible = false
    this.add(this.rer)
    // edge 0: scan beam sweeping the column; edge 1: the query feeding the reranker
    this.scanF = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 1.3, baseOpacity: 0, flowSize: 0.11 })
    this.scanF.addEdge(RER, this._colSlot(0), palette.amber, 0)
    this.scanF.addEdge(QDOCK, RER, palette.hot, 0)
    this.scanF.build()
    this.add(this.scanF)
  }

  _buildModel() {
    this.core = new GlowNode({ color: palette.lime, radius: 0.5, halo: 1.2, glow: 1.5 })
    this.core.position.copy(CORE)
    this.core.setLevel(0.7)
    this.add(this.core)
    // "frozen" ring around the core (intro + finale echo)
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
    this._readIdx = this.flux.addEdge(new THREE.Vector3(-1.6, RIBBON_Y + 0.3, 0), CORE.clone().add(new THREE.Vector3(0.3, -0.35, 0)), palette.violet, 1)
    this._ansA = CORE.clone().add(new THREE.Vector3(0, 0.5, 0))
    this._ansB = this.answer.position.clone()
    this._ansIdx = this.flux.addEdge(this._ansA, this._ansB, palette.cyan, 1)
    this.flux.build()
    this.add(this.flux)
  }

  _buildContext() {
    this.ribbon = new ContextRibbon({ maxCells: 7, cell: 0.5, height: 0.55, gap: 0.1, color: palette.violet })
    this.ribbon.position.set(0.3, RIBBON_Y, 0)
    this.add(this.ribbon)
    this._ctxCols = [palette.hot, seriesColor(CAND_CLUSTER[TOP[0]]), seriesColor(CAND_CLUSTER[TOP[1]]), seriesColor(CAND_CLUSTER[TOP[2]]), seriesColor(CAND_CLUSTER[TOP[3]])]
    this._hopCols = [palette.hot, seriesColor(3), seriesColor(5)]
  }

  _slotRibbon(i) {
    return new THREE.Vector3(this.ribbon.worldXOf(i), RIBBON_Y, 0)
  }

  _fillCtx(k, cols) {
    this.ribbon.setFilled(k)
    for (let t = 0; t < k; t++) if (cols[t]) this.ribbon.tiles[t].material.color.set(cols[t])
  }

  // beat 7: the model issues its own queries — two hops into different clusters
  _buildHops() {
    this._hopA = this._clusterCenters[3].clone().add(new THREE.Vector3(0.15, 0.25, 0))
    this._hopB = this._clusterCenters[5].clone().add(new THREE.Vector3(-0.1, 0.2, 0))
    this._emit = CORE.clone().add(new THREE.Vector3(0.35, 0.4, 0))
    this.hops = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0, flowSize: 0.13 })
    this.hops.addEdge(this._emit, this._hopA, palette.hot, 0)
    this.hops.addEdge(this._hopA, this._slotRibbon(1), seriesColor(3), 0)
    this.hops.addEdge(this._emit, this._hopB, palette.hot, 0)
    this.hops.addEdge(this._hopB, this._slotRibbon(2), seriesColor(5), 0)
    this._hopEnds = [
      [this._emit, this._hopA],
      [this._hopA, this._slotRibbon(1)],
      [this._emit, this._hopB],
      [this._hopB, this._slotRibbon(2)],
    ]
    this.hops.build()
    this.add(this.hops)
    this.moteQ = new GlowNode({ color: palette.hot, radius: 0.13, halo: 0.9, glow: 1.5 })
    this.moteQ.visible = false
    this.add(this.moteQ)
    this.chunkA = new GlowNode({ color: seriesColor(3), radius: 0.14, halo: 0.8, glow: 1.4 })
    this.chunkA.visible = false
    this.add(this.chunkA)
    this.chunkB = new GlowNode({ color: seriesColor(5), radius: 0.14, halo: 0.8, glow: 1.4 })
    this.chunkB.visible = false
    this.add(this.chunkB)
  }

  // beat 8: failure vignettes — a torn chunk, a stale chunk, lost-in-the-middle
  _buildVignettes() {
    // torn: a chunk split mid-thought, two tilted halves + a jagged crack
    this.tornG = new THREE.Group()
    this.tornG.position.set(0.5, -1.35, 0)
    const halfGeo = new THREE.BoxGeometry(0.42, 0.36, 0.06)
    this.tornMat = glowBasic(seriesColor(1), 0.85)
    this.tornL = new THREE.Mesh(halfGeo, this.tornMat)
    this.tornL.position.set(-0.27, 0.03, 0)
    this.tornL.rotation.z = 0.14
    this.tornG.add(this.tornL)
    this.tornR = new THREE.Mesh(halfGeo, this.tornMat)
    this.tornR.position.set(0.27, -0.04, 0)
    this.tornR.rotation.z = -0.12
    this.tornG.add(this.tornR)
    const crackGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.02, 0.24, 0.05),
      new THREE.Vector3(0.06, 0.08, 0.05),
      new THREE.Vector3(-0.05, -0.06, 0.05),
      new THREE.Vector3(0.04, -0.24, 0.05),
    ])
    this.tornG.add(new THREE.Line(crackGeo, additiveLine(palette.rose, 0.95)))
    this.tornG.visible = false
    this.add(this.tornG)

    // stale: a chunk wearing a clock — confidently serving yesterday's facts
    this.staleG = new THREE.Group()
    this.staleG.position.set(2.7, -1.35, 0)
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.44, 0.06), glowBasic(palette.blue, 0.55))
    this.staleG.add(plate)
    const barGeo2 = new THREE.BoxGeometry(0.4, 0.035, 0.02)
    const txtMat = glowBasic(palette.violet, 0.8)
    const t1 = new THREE.Mesh(barGeo2, txtMat)
    t1.position.set(-0.2, 0.08, 0.05)
    this.staleG.add(t1)
    const t2 = new THREE.Mesh(barGeo2, txtMat)
    t2.position.set(-0.2, -0.06, 0.05)
    this.staleG.add(t2)
    const clockMat = glowBasic(palette.amber, 0.95)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 36), clockMat)
    ring.position.set(0.25, 0, 0.06)
    this.staleG.add(ring)
    const minGeo = new THREE.BoxGeometry(0.022, 0.13, 0.02)
    minGeo.translate(0, 0.065, 0)
    this.staleMin = new THREE.Mesh(minGeo, clockMat)
    this.staleMin.position.set(0.25, 0, 0.08)
    this.staleG.add(this.staleMin)
    const hrGeo = new THREE.BoxGeometry(0.022, 0.09, 0.02)
    hrGeo.translate(0, 0.045, 0)
    const hr = new THREE.Mesh(hrGeo, clockMat)
    hr.position.set(0.25, 0, 0.08)
    hr.rotation.z = 2.1
    this.staleG.add(hr)
    this.staleG.visible = false
    this.add(this.staleG)
  }

  _buildLabels() {
    this.lblModel = this.label('the model', { pill: true, position: CORE.clone().add(new THREE.Vector3(0, -0.95, 0)), opacity: 0 })
    this.lblFrozen = this.label('frozen weights', { className: 'tiny muted', position: CORE.clone().add(new THREE.Vector3(0, 1.15, 0)), opacity: 0 })
    this.lblGal = this.label('vector database', { pill: true, position: GAL_C.clone().add(new THREE.Vector3(0, 2.6, 0)), opacity: 0 })
    this.lblDocs = this.label('documents', { className: 'tiny', position: new THREE.Vector3(-1.7, 3.1, 0), opacity: 0 })
    this.lblQuery = this.label('your question', { pill: true, position: QSTART.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 })
    this.lblNear = this.label('nearest in meaning', { className: 'tiny', position: GAL_C.clone().add(new THREE.Vector3(0.4, -2.3, 0)), opacity: 0 })
    // shortlist column + reranker
    this.lblShort = this.label('shortlist', { pill: true, position: new THREE.Vector3(COL_X, COL_TOP + 0.85, 0), opacity: 0 })
    this.lblGeoRank = this.label('ranked by geometry', { className: 'tiny', position: new THREE.Vector3(COL_X, COL_TOP + 0.45, 0), opacity: 0 })
    this.lblRRRank = this.label('re-scored by reading', { className: 'tiny', position: new THREE.Vector3(COL_X, COL_TOP + 0.45, 0), opacity: 0 })
    this.lblRer = this.label('reranker', { pill: true, position: new THREE.Vector3(0.5, RER.y, 0), opacity: 0 })
    this.lblPair = this.label('reads the pair together', { className: 'tiny', position: new THREE.Vector3(0.5, RER.y - 0.4, 0), opacity: 0 })
    this.lblWrong = this.label('right words, wrong meaning', { className: 'tiny', position: new THREE.Vector3(0, 0, 0), opacity: 0 })
    this.lblStar = this.label('actually answers it', { className: 'tiny', position: new THREE.Vector3(0, 0, 0), opacity: 0 })
    this.rankLbls = []
    for (let r = 0; r < NC; r++) {
      this.rankLbls.push(this.label(String(r + 1), { className: 'tiny muted', position: new THREE.Vector3(COL_X - 0.78, COL_TOP - r * COL_STEP, 0), opacity: 0 }))
    }
    // context + answer
    this.lblRetr = this.label('retrieved', { className: 'tiny', position: new THREE.Vector3(-0.3, RIBBON_Y + 0.7, 0), opacity: 0 })
    this.lblCtx = this.label('context window', { pill: true, position: new THREE.Vector3(-0.3, RIBBON_Y - 0.7, 0), opacity: 0 })
    this.lblAns = this.label('grounded answer', { className: 'tiny', position: this.answer.position.clone().add(new THREE.Vector3(0, 0.45, 0)), opacity: 0 })
    this.lblHall = this.label('hallucination?', { className: 'tiny muted', position: this.halluc.position.clone().add(new THREE.Vector3(0.1, 0.4, 0)), opacity: 0 })
    // hops
    this.lblHop1 = this.label('hop 1', { pill: true, position: this._hopA.clone().add(new THREE.Vector3(0, 0.55, 0)), opacity: 0 })
    this.lblHop2 = this.label('hop 2', { pill: true, position: this._hopB.clone().add(new THREE.Vector3(0, 0.55, 0)), opacity: 0 })
    this.lblNotE = this.label('not enough — ask again', { className: 'tiny', position: new THREE.Vector3(-0.9, RIBBON_Y + 0.62, 0), opacity: 0 })
    // failure vignettes
    this.lblTorn = this.label('split mid-thought', { className: 'tiny', position: new THREE.Vector3(0.5, -0.72, 0), opacity: 0 })
    this.lblStale = this.label("stale — yesterday's facts", { className: 'tiny', position: new THREE.Vector3(2.7, -0.72, 0), opacity: 0 })
    this.lblLim = this.label('lost in the middle', { className: 'tiny', position: new THREE.Vector3(0.3, RIBBON_Y + 0.72, 0), opacity: 0 })
    this.lblStart = this.label('start', { className: 'tiny muted', position: new THREE.Vector3(this.ribbon.worldXOf(0), RIBBON_Y - 0.55, 0), opacity: 0 })
    this.lblEnd = this.label('end', { className: 'tiny muted', position: new THREE.Vector3(this.ribbon.worldXOf(6), RIBBON_Y - 0.55, 0), opacity: 0 })
  }

  enter() {
    if (this.reduced) return
    gsap.from(this.core.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, ease: 'back.out(1.7)' })
  }

  _cam(i) {
    const [x, y, z, lx, ly] = CAM[i] || CAM[0]
    const d = this.reduced ? 0 : 1.5
    gsap.to(this.camera.position, { x, y, z, duration: d, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: lx, y: ly, z: 0, duration: d, ease: 'power3.inOut', overwrite: true })
  }

  _killAnims() {
    if (this._rrTl) {
      this._rrTl.kill()
      this._rrTl = null
    }
    if (this._hopTl) {
      this._hopTl.kill()
      this._hopTl = null
    }
    gsap.killTweensOf(this.query.position)
    gsap.killTweensOf(this.moteQ.position)
    gsap.killTweensOf(this.chunkA.position)
    gsap.killTweensOf(this.chunkB.position)
    gsap.killTweensOf(this.rer.scale)
    gsap.killTweensOf(this.tornG.scale)
    gsap.killTweensOf(this.staleG.scale)
    gsap.killTweensOf(this, '_ans')
    for (const c of this.cands) {
      gsap.killTweensOf(c.grp.position)
      gsap.killTweensOf(c.grp.scale)
      gsap.killTweensOf(c.bar.scale)
      gsap.killTweensOf(c.plateMat)
      gsap.killTweensOf(c.barMat)
    }
  }

  // restore all candidate plates to a clean, fully-visible state
  _candReset() {
    for (const c of this.cands) {
      c.grp.visible = true
      c.grp.scale.setScalar(1)
      c.plateMat.opacity = 0.9
      c.barMat.opacity = 0.95
    }
  }

  // order: 'geo' (row = cand index) or 'rr' (row = NEWROW[cand])
  _placeCands(order, instant) {
    for (let j = 0; j < NC; j++) {
      const row = order === 'geo' ? j : NEWROW[j]
      const p = this._colSlot(row)
      const c = this.cands[j]
      if (instant || this.reduced) {
        c.grp.position.copy(p)
      } else {
        gsap.to(c.grp.position, { y: p.y, duration: 1.1, ease: 'power2.inOut' })
        gsap.to(c.grp.position, { x: COL_X + BOW[j] * 0.75, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 1 })
      }
    }
  }

  _setBars(mode, instant) {
    for (let j = 0; j < NC; j++) {
      const s = (mode === 'geo' ? GEO_SCORE[j] : RR_SCORE[j]) * 0.86
      const c = this.cands[j]
      c.barMat.color.set(mode === 'geo' ? palette.violet : palette.amber)
      if (instant || this.reduced) c.bar.scale.x = s
      else gsap.to(c.bar.scale, { x: s, duration: 0.9, ease: 'power2.inOut' })
    }
  }

  _runRerank() {
    const rd = this.reduced
    this._rrSwap = 0
    this._rrDone = 0
    this._scanP = 0
    this._candReset()
    this._placeCands('geo', true)
    this._setBars('geo', true)
    this.rer.visible = true
    if (rd) {
      this._placeCands('rr', true)
      this._setBars('rr', true)
      this._rrSwap = 1
      this._rrDone = 1
      this.cands[DROP].plateMat.opacity = 0.45
      this.rer.scale.setScalar(1)
      return
    }
    this.rer.scale.setScalar(0.001)
    const tl = gsap.timeline()
    this._rrTl = tl
    tl.to(this.rer.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.7)' }, 0)
    tl.to(this, { _scanP: 1, duration: 1.9, ease: 'none' }, 0.55)
    tl.call(() => {
      this._rrSwap = 1
      for (const c of this.cands) c.grp.scale.setScalar(1)
      this._setBars('rr', false)
      this._placeCands('rr', false)
    }, null, 2.55)
    tl.call(() => {
      this._rrDone = 1
    }, null, 3.75)
    tl.to(this.cands[DROP].plateMat, { opacity: 0.45, duration: 0.5 }, 3.75)
    tl.to(this.cands[STAR].grp.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.4, ease: 'back.out(2)' }, 3.75)
  }

  _hopReset() {
    this._fillCtx(1, this._hopCols)
    this._hopL1 = 0
    this._hopL2 = 0
    this._notE = 0
    this._dim1 = 0
    this._hopAns = 0
    this._hw = [0, 0, 0, 0]
    this.moteQ.visible = false
    this.chunkA.visible = false
    this.chunkB.visible = false
  }

  _runHops() {
    this._hopReset()
    if (this.reduced) {
      this._fillCtx(3, this._hopCols)
      this._hopL1 = 1
      this._hopL2 = 1
      this._hopAns = 1
      this._hw = [0.7, 0.3, 0.7, 0.3]
      return
    }
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.2, onRepeat: () => this._hopReset() })
    this._hopTl = tl
    const A = this._hopA
    const B = this._hopB
    tl.call(() => {
      this.moteQ.visible = true
      this.moteQ.position.copy(this._emit)
      this._hw[0] = 1
    }, null, 0.15)
    tl.to(this.moteQ.position, { x: A.x, y: A.y, z: A.z, duration: 1.15, ease: 'power2.inOut' }, 0.2)
    tl.call(() => {
      this._hopL1 = 1
      this.moteQ.visible = false
      this.chunkA.visible = true
      this.chunkA.position.copy(A)
      this._hw[1] = 1
    }, null, 1.4)
    tl.to(this.chunkA.position, { x: this.ribbon.worldXOf(1), y: RIBBON_Y, z: 0, duration: 0.85, ease: 'power2.inOut' }, 1.75)
    tl.call(() => {
      this.chunkA.visible = false
      this._fillCtx(2, this._hopCols)
      this._dim1 = 1
      this._hw[1] = 0.15
    }, null, 2.62)
    tl.call(() => {
      this._notE = 1
    }, null, 2.95)
    tl.call(() => {
      this.moteQ.visible = true
      this.moteQ.position.copy(this._emit)
      this._hw[2] = 1
      this._hw[0] = 0.2
    }, null, 3.95)
    tl.to(this.moteQ.position, { x: B.x, y: B.y, z: B.z, duration: 1.15, ease: 'power2.inOut' }, 4.0)
    tl.call(() => {
      this._hopL2 = 1
      this.moteQ.visible = false
      this.chunkB.visible = true
      this.chunkB.position.copy(B)
      this._hw[3] = 1
    }, null, 5.2)
    tl.to(this.chunkB.position, { x: this.ribbon.worldXOf(2), y: RIBBON_Y, z: 0, duration: 0.85, ease: 'power2.inOut' }, 5.55)
    tl.call(() => {
      this.chunkB.visible = false
      this._fillCtx(3, this._hopCols)
      this._dim1 = 0
      this._notE = 0
      this._hopAns = 1
      this._hw[3] = 0.15
      this._hw[2] = 0.2
    }, null, 6.42)
    tl.call(() => {}, null, 8.4) // hold before the loop repeats
  }

  onStep(i) {
    const prev = this.beat
    this.beat = i
    this._cam(i)
    this._killAnims()
    const rd = this.reduced

    // ---- query node ---------------------------------------------------------
    if (i >= 2 && i !== 8) {
      this.query.visible = true
      let target
      if (i === 2) target = this._qSearch.clone().add(new THREE.Vector3(-1.0, 0.6, 0))
      else if (i === 3) target = this._qSearch
      else if (i === 4) target = QDOCK
      else target = this._slotRibbon(0)
      if (rd) this.query.position.copy(target)
      else gsap.to(this.query.position, { x: target.x, y: target.y, z: target.z, duration: 1.2, ease: 'power2.inOut' })
    } else {
      this.query.visible = false
      this.query.position.copy(QSTART)
    }

    // ---- documents (beat 1) --------------------------------------------------
    this.docsG.visible = i === 1

    // ---- shortlist candidates ------------------------------------------------
    if (i === 3) {
      this._candReset()
      this._setBars('geo', true)
      this._rrSwap = 0
      this._rrDone = 0
      if (prev < 3 && !rd) {
        // assemble: each chunk flies out of the galaxy into its ranked slot
        for (let j = 0; j < NC; j++) {
          const c = this.cands[j]
          c.grp.position.copy(c.home)
          c.grp.scale.setScalar(0.18)
          const p = this._colSlot(j)
          gsap.to(c.grp.position, { x: p.x, y: p.y, z: p.z, duration: 0.95, delay: 0.35 + j * 0.1, ease: 'power2.inOut' })
          gsap.to(c.grp.scale, { x: 1, y: 1, z: 1, duration: 0.95, delay: 0.35 + j * 0.1, ease: 'power2.inOut' })
        }
      } else {
        this._placeCands('geo', true)
      }
    } else if (i === 4) {
      this._runRerank()
    } else if (i === 5) {
      this._candReset()
      this._placeCands('rr', true)
      this._setBars('rr', true)
      this.cands[DROP].plateMat.opacity = 0.45
      if (rd) {
        for (const c of this.cands) c.grp.visible = false
        this._fillCtx(5, this._ctxCols)
      } else {
        this.ribbon.setFilled(0)
        this._fillCtx(1, this._ctxCols)
        // the reranked top-k fly down into the context window, best first
        for (let r = 0; r < K; r++) {
          const c = this.cands[TOP[r]]
          const p = this._slotRibbon(1 + r)
          gsap.to(c.grp.position, {
            x: p.x, y: p.y, z: p.z, duration: 1.0, delay: 0.35 + r * 0.18, ease: 'power2.inOut',
            onComplete: () => {
              c.grp.visible = false
              this._fillCtx(2 + r, this._ctxCols)
            },
          })
          gsap.to(c.grp.scale, { x: 0.5, y: 0.5, z: 0.5, duration: 1.0, delay: 0.35 + r * 0.18, ease: 'power2.inOut' })
        }
        // the rest of the shortlist falls away
        for (let j = 0; j < NC; j++) {
          if (TOP.includes(j)) continue
          const c = this.cands[j]
          gsap.to(c.plateMat, { opacity: 0, duration: 0.7, delay: 0.2 })
          gsap.to(c.barMat, { opacity: 0, duration: 0.7, delay: 0.2 })
          gsap.to(c.grp.position, {
            y: c.grp.position.y - 0.6, duration: 0.7, delay: 0.2, ease: 'power2.in',
            onComplete: () => (c.grp.visible = false),
          })
        }
      }
    } else {
      for (const c of this.cands) c.grp.visible = false
    }
    for (const c of this.cands) c.marker.visible = i === 3

    // ---- reranker ------------------------------------------------------------
    if (i !== 4) {
      this.rer.visible = false
      this._scanP = 0
      this._rrSwap = i > 4 ? 1 : 0
      this._rrDone = 0
    }

    // ---- context ribbon ------------------------------------------------------
    if (i <= 4) this.ribbon.setFilled(0)
    else if (i === 6 || i === 9) this._fillCtx(5, this._ctxCols)
    else if (i === 8) this.ribbon.setFilled(7, { rainbow: true })
    // (5 fills progressively above; 7 is driven by the hop timeline)

    // ---- multi-hop -----------------------------------------------------------
    if (i === 7) {
      this._runHops()
    } else {
      this._hopL1 = 0
      this._hopL2 = 0
      this._notE = 0
      this._dim1 = 0
      this._hopAns = 0
      this._hw = [0, 0, 0, 0]
      this.moteQ.visible = false
      this.chunkA.visible = false
      this.chunkB.visible = false
    }

    // ---- failure vignettes ---------------------------------------------------
    if (i === 8) {
      this.tornG.visible = true
      this.staleG.visible = true
      if (rd) {
        this.tornG.scale.setScalar(1)
        this.staleG.scale.setScalar(1)
      } else {
        this.tornG.scale.setScalar(0.001)
        this.staleG.scale.setScalar(0.001)
        gsap.to(this.tornG.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 0.15, ease: 'back.out(1.6)' })
        gsap.to(this.staleG.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 0.35, ease: 'back.out(1.6)' })
      }
    } else {
      this.tornG.visible = false
      this.staleG.visible = false
    }

    // ---- grounded answer -----------------------------------------------------
    this._ans = 0
    if (i === 6 && !rd) gsap.fromTo(this, { _ans: 0 }, { _ans: 1, duration: 1.0, ease: 'power2.out' })
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    const rd = this.reduced
    const i = this.beat

    // galaxy presence per beat; a gentle oscillation keeps it alive without
    // drifting the clusters away from their markers
    const galT = i === 0 ? 0.12 : i <= 3 ? 1 : i === 7 ? 0.95 : i === 8 ? 0.2 : i === 9 ? 0.75 : 0.3
    this.galaxy.material.opacity = rd ? galT : damp(this.galaxy.material.opacity, galT, 4, dt)
    if (!rd) this.galG.rotation.y = Math.sin(t * 0.13) * 0.04

    // documents shedding chunks (beat 1)
    const docT = i === 1 ? 0.8 : 0
    this.docMat.opacity = rd ? docT : damp(this.docMat.opacity, docT, 5, dt)
    this.docFlow.setFlowOpacity(i === 1 ? 0.85 : 0)
    this.docFlow.update(dt)

    // query
    this.query.setLevel(0.7 + (rd ? 0 : Math.sin(t * 3) * 0.15))

    // ANN search links: query → shortlisted points (beat 3)
    const linkOn = i === 3 ? 1 : 0
    if (linkOn) {
      for (let j = 0; j < NC; j++) {
        this.links.edges[j].a.copy(this.query.position)
        this.links.edges[j].b.copy(this.cands[j].home)
      }
      syncLines(this.links)
    }
    for (let j = 0; j < NC; j++) {
      this.links.setWeight(j, linkOn * 0.8)
      const c = this.cands[j]
      if (c.marker.visible) c.marker.setLevel(0.6 + (rd ? 0 : Math.sin(t * 3 + j) * 0.2))
    }
    this.links.setLineOpacity(0.55 * linkOn)
    this.links.setFlowOpacity(0.9 * linkOn)
    this.links.update(dt)

    // reranker scan beam (beat 4): sweeps the column while it reads each pair
    const scanning = i === 4 && this._scanP > 0 && this._scanP < 1 && !this._rrSwap
    const scanY = COL_TOP - this._scanP * (NC - 1) * COL_STEP
    this.scanF.edges[0].a.copy(RER)
    // dormant edges park inside their node (weight-0 lines would show dark in light theme)
    if (scanning) this.scanF.edges[0].b.set(COL_X + 0.55, scanY, 0)
    else this.scanF.edges[0].b.copy(RER)
    syncLines(this.scanF)
    this.scanF.setWeight(0, scanning ? 1 : 0)
    this.scanF.setWeight(1, i === 4 ? 0.7 : 0)
    this.scanF.setLineOpacity(i === 4 ? 0.8 : 0)
    this.scanF.setFlowOpacity(i === 4 ? 0.95 : 0)
    this.scanF.update(dt)
    if (scanning) {
      for (const c of this.cands) {
        const d = c.grp.position.y - scanY
        c.grp.scale.setScalar(1 + 0.2 * Math.exp(-d * d * 30))
      }
    }
    this.rer.setLevel(i === 4 ? 0.7 + (rd ? 0 : Math.sin(t * 2.4) * 0.15) : 0)

    // context ribbon + per-tile overrides
    this.ribbon.update(dt)
    if (i === 7 && this._dim1 && this.ribbon.filled > 1) this.ribbon.tiles[1].material.opacity = 0.3
    if (i === 8) {
      for (let k = 0; k < 7; k++) this.ribbon.tiles[k].material.opacity = k === 0 || k === 6 ? 1 : 0.14
    }

    // frozen ring (intro; faint echo in the finale)
    const frzT = i === 0 ? 0.6 : i === 9 ? 0.25 : 0
    this.frozenMat.opacity = rd ? frzT : damp(this.frozenMat.opacity, frzT, 5, dt)
    if (!rd) this.frozen.rotation.z += dt * 0.4

    // core: brighter when answering, pulsing when it emits a query
    const busy = i === 7 && this.moteQ.visible ? 0.3 : 0
    this.core.setLevel(0.65 + (rd ? 0 : Math.sin(t * 1.8) * 0.1) + (i === 6 || i === 9 ? 0.2 : 0) + busy)

    // flux: context → core, core → answer
    const readOn = (i >= 5 && i <= 7) || i === 9 ? 1 : 0
    const ansOn = i === 6 ? (rd ? 1 : this._ans || 0) : i === 7 ? this._hopAns : i === 9 ? 1 : 0
    this.flux.setWeight(this._readIdx, readOn)
    this.flux.setWeight(this._ansIdx, ansOn)
    const ae = this.flux.edges[this._ansIdx]
    if (ansOn > 0) {
      ae.a.copy(this._ansA)
      ae.b.copy(this._ansB)
    } else {
      ae.a.copy(CORE)
      ae.b.copy(CORE)
    }
    syncLines(this.flux)
    this.flux.setLineOpacity(0.5 * readOn)
    this.flux.setFlowOpacity(0.9 * readOn)
    this.flux.update(dt)

    // hop arcs + motes (beat 7)
    const hopOn = i === 7 ? 1 : 0
    for (let k = 0; k < 4; k++) {
      this.hops.setWeight(k, hopOn * this._hw[k])
      const e = this.hops.edges[k]
      if (hopOn && this._hw[k] > 0) {
        e.a.copy(this._hopEnds[k][0])
        e.b.copy(this._hopEnds[k][1])
      } else {
        e.a.copy(CORE)
        e.b.copy(CORE)
      }
    }
    syncLines(this.hops)
    this.hops.setLineOpacity(0.55 * hopOn)
    this.hops.setFlowOpacity(0.9 * hopOn)
    this.hops.update(dt)
    if (this.moteQ.visible) this.moteQ.setLevel(0.9 + (rd ? 0 : Math.sin(t * 5) * 0.15))
    if (this.chunkA.visible) this.chunkA.setLevel(0.8)
    if (this.chunkB.visible) this.chunkB.setLevel(0.8)

    // answer vs hallucination
    this.answer.setLevel(ansOn > 0 ? 0.4 + ansOn * 0.9 + (rd ? 0 : Math.sin(t * 4) * 0.08 * ansOn) : 0)
    this.halluc.setLevel(i === 6 ? 0.15 + (1 - (rd ? 1 : this._ans || 0)) * 0.35 : 0)

    // failure vignettes: the torn halves strain apart, the clock keeps running
    if (i === 8 && !rd) {
      const s = Math.sin(t * 1.3) * 0.04
      this.tornL.rotation.z = 0.14 + s
      this.tornR.rotation.z = -0.12 - s
      this.staleMin.rotation.z = -t * 0.7
    }

    // ---- labels ---------------------------------------------------------------
    const ansL = i === 6 ? (rd ? 1 : this._ans || 0) : 0
    this.lblModel.setOpacity(i === 0 || (i >= 5 && i <= 7) || i === 9 ? 0.85 : i === 8 ? 0 : 0.3)
    this.lblFrozen.setOpacity(i === 0 ? 0.9 : 0)
    this.lblGal.setOpacity(i === 1 || i === 3 ? 0.9 : i === 7 ? 0.6 : 0)
    this.lblDocs.setOpacity(i === 1 ? 0.85 : 0)
    this.lblQuery.setOpacity(i === 2 ? 0.9 : 0)
    this.lblQuery.position.set(this.query.position.x, this.query.position.y + 0.5, this.query.position.z)
    this.lblNear.setOpacity(i === 3 ? 0.9 : 0)
    this.lblShort.setOpacity(i === 3 || i === 4 ? 0.9 : 0)
    this.lblGeoRank.setOpacity(i === 3 || (i === 4 && !this._rrSwap) ? 0.85 : 0)
    this.lblRRRank.setOpacity(i === 4 && this._rrSwap ? 0.9 : 0)
    this.lblRer.setOpacity(i === 4 ? 0.9 : 0)
    this.lblPair.setOpacity(i === 4 ? 0.75 : 0)
    const dropP = this.cands[DROP].grp.position
    const starP = this.cands[STAR].grp.position
    this.lblWrong.position.set(dropP.x + 1.45, dropP.y, 0)
    this.lblWrong.setOpacity(i === 4 && this._rrDone ? 0.9 : 0)
    this.lblStar.position.set(starP.x - 1.72, starP.y, 0)
    this.lblStar.setOpacity(i === 4 && this._rrDone ? 0.9 : 0)
    for (const l of this.rankLbls) l.setOpacity(i === 3 || i === 4 ? 0.55 : 0)
    this.lblRetr.setOpacity(i === 5 ? 0.9 : 0)
    this.lblCtx.setOpacity((i >= 5 && i <= 7) || i === 9 ? 0.85 : 0)
    this.lblAns.setOpacity(i === 6 || i === 9 ? 0.9 : i === 7 ? this._hopAns * 0.9 : 0)
    this.lblHall.setOpacity(i === 6 ? 0.3 + (1 - ansL) * 0.5 : 0)
    this.lblHop1.setOpacity(i === 7 ? this._hopL1 * 0.95 : 0)
    this.lblHop2.setOpacity(i === 7 ? this._hopL2 * 0.95 : 0)
    this.lblNotE.setOpacity(i === 7 ? this._notE * 0.9 : 0)
    this.lblTorn.setOpacity(i === 8 ? 0.9 : 0)
    this.lblStale.setOpacity(i === 8 ? 0.9 : 0)
    this.lblLim.setOpacity(i === 8 ? 0.9 : 0)
    this.lblStart.setOpacity(i === 8 ? 0.85 : 0)
    this.lblEnd.setOpacity(i === 8 ? 0.85 : 0)
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    this._killAnims()
    super.dispose()
  }
}
