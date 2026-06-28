import * as THREE from 'three'
import katex from 'katex'
import { Chapter } from '../../core/Chapter.js'
import { BarField } from '../../lib/BarField.js'
import { palette } from '../../theme/palette.js'
import { clamp01 } from '../../theme/motion.js'

const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

const LOGITS = [3.4, 1.1, 2.8, 0.6, 2.1, 1.7, 0.9, 0.4, 1.3, 0.7]
const WORDS = ['mat', 'rug', 'floor', 'sofa', 'chair', 'bed', 'grass', 'roof', 'step', 'lap']
const softmaxT = (a, T) => {
  const m = Math.max(...a)
  const e = a.map((x) => Math.exp((x - m) / Math.max(0.05, T)))
  const s = e.reduce((p, c) => p + c, 0)
  return e.map((x) => x / s)
}

export const beats = [
  {
    html: `<span class="eyebrow">Deep dive · inference</span>
      <h2>Sampling Strategies</h2>
      <p class="lead">After the forward pass the model outputs a probability for every token in its vocabulary. <strong>Sampling</strong> is the final step: deciding which token to actually emit.</p>`,
  },
  {
    html: `<h3>Greedy vs. sampling</h3>
      <p><strong>Greedy</strong> decoding always picks the single highest-probability token. It is deterministic and coherent — the same prompt always yields the same output — but that predictability has a cost: the model can get stuck in repetitive loops and rarely ventures beyond the obvious. <strong>Sampling</strong> draws from the whole distribution at random, weighted by probability. Lower-ranked tokens still get a chance, which is where variety and creativity enter.</p>`,
  },
  {
    html: `<h3>Temperature</h3>
      <p>Temperature T controls how concentrated the probability mass is before you sample. Dividing every logit by T before softmax sharpens the distribution when T is small and flattens it when T is large:</p>
      ${tex('p_i=\\frac{\\exp(z_i/T)}{\\sum_j \\exp(z_j/T)}', true)}
      <p>T = 1 gives the model's raw distribution. T &lt; 1 makes it more decisive — good for factual Q&amp;A and code. T &gt; 1 spreads mass to lower-ranked tokens — useful for brainstorming and creative writing. Watch the bars breathe as T sweeps.</p>`,
  },
  {
    html: `<h3>Top-k &amp; Top-p (nucleus)</h3>
      <p>Even with careful temperature tuning, a 50,000-token vocabulary can place non-trivial probability on wildly wrong words. Tail-trimming cuts those away before the draw. <strong>Top-k</strong> keeps only the k highest-ranked tokens — simple, but brittle when the distribution shape shifts across contexts. <strong>Top-p</strong> (nucleus sampling) keeps the smallest set of tokens whose probabilities sum to at least p, so the nucleus automatically narrows when the model is confident and widens when it is unsure. Top-p around 0.9 is the more principled default.</p>
      <div class="postcard">Pipeline: rescale with temperature &rarr; trim the tail with top-k or top-p &rarr; draw one token from what remains.</div>`,
  },
]

export default class Sampling extends Chapter {
  init() {
    this.setBloom(0.8, 0.42, 0.82)
    this.addAmbientField(220, 60)
    this.addLights()
    this.camera.position.set(0, 0.6, 9.5)
    this.camera.lookAt(0, 0.2, 0)

    this.bars = new BarField({ count: LOGITS.length, width: 0.34, gap: 0.16, maxHeight: 3.4, color: palette.lime })
    this.bars.position.set(0, -1.7, 0)
    this.add(this.bars)
    WORDS.forEach((w, i) => {
      this.label(w, { className: 'tiny muted', position: new THREE.Vector3(this.bars.bars[i].position.x, -2.0, 0) })
    })

    this.step = 0
    this.T = 1
    this.bars.setValues(softmaxT(LOGITS, 1), { highlight: 0 })
  }

  onStep(i) {
    this.step = i
  }

  update(dt, t) {
    let probs
    let hi = -1
    if (this.step <= 1) {
      probs = softmaxT(LOGITS, 1)
      hi = this.step === 1 ? probs.indexOf(Math.max(...probs)) : -1
    } else if (this.step === 2) {
      // sweep temperature 0.4 .. 1.8
      this.T = 1.1 + Math.sin(t * 0.8) * 0.7
      probs = softmaxT(LOGITS, this.T)
    } else {
      // top-p nucleus: zero out the tail beyond cumulative 0.9
      probs = softmaxT(LOGITS, 0.9)
      const order = [...probs.keys()].sort((a, b) => probs[b] - probs[a])
      let cum = 0
      const keep = new Set()
      for (const idx of order) {
        keep.add(idx)
        cum += probs[idx]
        if (cum >= 0.9) break
      }
      probs = probs.map((p, idx) => (keep.has(idx) ? p : p * 0.04))
      hi = order[0]
    }
    this.bars.setTargets(probs, { highlight: hi })
    this.bars.lerp(dt, { color: palette.lime, hot: palette.hot })
  }
}
