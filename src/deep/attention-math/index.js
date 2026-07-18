import * as THREE from 'three'
import katex from 'katex'
import { Chapter } from '../../core/Chapter.js'
import { BarField } from '../../lib/BarField.js'
import { GlowNode } from '../../lib/nodes.js'
import { palette } from '../../theme/palette.js'

const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

const SCORES = [1.2, 2.1, 0.6, 4.8, 1.6, 0.9, 2.4, 0.7] // raw Q·K scores
const softmax = (a, T = 1) => {
  const m = Math.max(...a)
  const e = a.map((x) => Math.exp((x - m) / T))
  const s = e.reduce((p, c) => p + c, 0)
  return e.map((x) => x / s)
}

export const beats = [
  {
    html: `<span class="eyebrow">Deep dive · attention</span>
      <h2>The Attention Equation</h2>
      <p class="lead">Attention is how each token gathers context from every other token in the sequence. The whole mechanism reduces to one formula:</p>
      ${tex('\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V', true)}
      <p>Every symbol has a specific job. Let's walk through them in order.</p>`,
  },
  {
    html: `<h3>Q, K, V are projections</h3>
      <p>Each token embedding <em>x</em> is projected through three separate learned weight matrices to form a <strong>Query</strong>, a <strong>Key</strong>, and a <strong>Value</strong>:</p>
      ${tex('Q = XW_Q,\\quad K = XW_K,\\quad V = XW_V', true)}
      <p class="aside">Think of it as a soft database lookup. Q is the search query a token sends out. K is the index label each token exposes to others. V is the content it hands back when its key is matched. Keeping all three separate lets the model learn each role independently: what to ask for, what to advertise, and what to share can all be specialised from the same raw embedding.</p>`,
  },
  {
    html: `<h3>Scores, scaled, then softmax</h3>
      <p>The matrix product <strong>QKᵀ</strong> gives a score for every query-key pair. A dot product is large when two vectors point in the same direction, making it a natural alignment measure. The divisor <strong>√dₖ</strong> corrects a variance problem: when q and k each have dₖ independent components, their dot product has variance proportional to dₖ, so raw scores in a large model are far larger than in a small one. Dividing by √dₖ restores unit variance and lets <strong>softmax</strong> produce a meaningful spread of weights rather than a near-zero-or-one spike.</p>
      ${tex('\\alpha_{ij}=\\frac{\\exp(q_i\\cdot k_j/\\sqrt{d_k})}{\\sum_{j\'}\\exp(q_i\\cdot k_{j\'}/\\sqrt{d_k})}', true)}
      <p>Watch the raw scores (left) collapse into a sharp distribution.</p>`,
  },
  {
    html: `<h3>Weighted sum of Values</h3>
      <p>The attention weights tell each position how much to borrow from every other. The output at position <em>i</em> is a weighted average over all Value vectors:</p>
      ${tex('z_i=\\sum_j \\alpha_{ij}\\,v_j', true)}
      <p>Without the √dₖ divisor, oversize scores drive softmax toward a near-one-hot output: one token claims almost all the weight and the gradient through every other Value nearly vanishes. Keeping scores near unit variance ensures the attention distribution stays broad enough for meaningful gradients to flow back through all contributing positions during training.</p>
      <div class="postcard">Attention is one matrix of scores, softmaxed into weights, used to average the Values.</div>`,
  },
]

export default class AttentionMath extends Chapter {
  init() {
    this.setBloom(0.8, 0.4, 0.82)
    this.addAmbientField(220, 60)
    this.addLights()
    this.camera.position.set(2.6, 0.4, 9)
    this.camera.lookAt(2.6, 0, 0)

    this.bars = new BarField({ count: SCORES.length, width: 0.34, gap: 0.18, maxHeight: 3.2, color: palette.cyan })
    this.bars.position.set(2.6, -1.6, 0)
    this.add(this.bars)
    this.bars.setValues(SCORES)

    // floating Q / K / V tags
    this.qkv = []
    ;['Q', 'K', 'V'].forEach((t, i) => {
      const n = new GlowNode({ color: [palette.cyan, palette.magenta, palette.amber][i], radius: 0.22, halo: 1.0, glow: 1.2 })
      n.position.set(0.6 + i * 2.0, 2.4, -1)
      this.add(n)
      this.label(t, { pill: true, position: n.position.clone().add(new THREE.Vector3(0, 0.5, 0)) })
      this.qkv.push(n)
    })

    this.mode = 'raw'
  }

  onStep(i) {
    if (i <= 1) {
      this.bars.setTargets(SCORES)
      this.mode = 'raw'
    } else {
      const w = softmax(SCORES)
      const peak = w.indexOf(Math.max(...w))
      this.bars.setTargets(w.map((x) => x * 6), { highlight: i >= 3 ? peak : -1 })
      this.mode = 'soft'
    }
  }

  update(dt, t) {
    this.bars.lerp(dt, { color: this.mode === 'soft' ? palette.cyan : palette.violet, hot: palette.hot })
    this.qkv.forEach((n, i) => n.setLevel(0.6 + 0.4 * Math.sin(t * 1.5 + i)))
  }
}
