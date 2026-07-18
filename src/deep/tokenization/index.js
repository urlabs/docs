import * as THREE from 'three'
import { Chapter } from '../../core/Chapter.js'
import { glowBasic } from '../../lib/materials.js'
import { palette } from '../../theme/palette.js'

// Illustrative BPE progression for the word "tokenization".
const STAGES = [
  ['t', 'o', 'k', 'e', 'n', 'i', 'z', 'a', 't', 'i', 'o', 'n'],
  ['to', 'ke', 'n', 'i', 'za', 't', 'i', 'on'],
  ['token', 'iza', 'tion'],
  ['token', 'ization'],
]

export const beats = [
  {
    html: `<span class="eyebrow">Deep dive · embeddings</span>
      <h2>Tokenization</h2>
      <p class="lead">Models don't read words or letters — they read <strong>tokens</strong>: subword chunks. A word-level vocabulary would need millions of entries and still break on typos, rare words, and new proper nouns. Character-by-character sequences avoid that trap, but grow so long they strain the model's context window — the fixed-length input it can hold at once. Subword tokens split the difference.</p>
      <p>Start with the raw characters of a word — every letter its own independent symbol.</p>`,
  },
  {
    html: `<h3>Merge the most frequent pair</h3>
      <p><strong>Byte-Pair Encoding (BPE)</strong> scans the entire training corpus — billions of words of text — counts every adjacent pair of symbols, and fuses the most common pair into a single new token. That token enters the vocabulary and the scan repeats from scratch.</p>
      <p class="aside">High-frequency pairs like <span class="tok">to</span>, <span class="tok">ke</span>, and <span class="tok">on</span> merge first: they appear across thousands of English words, so each merge shaves the most sequence length in one step.</p>`,
  },
  {
    html: `<h3>Keep merging</h3>
      <p>Repeat thousands of times. Common strings collapse into single tokens; rare or novel strings stay split into smaller pieces. That is the key insight: the model can handle <em>any</em> word, even ones never seen in training, by composing familiar subword pieces.</p>
      <p class="aside">GPT-2 ran roughly 50,000 merges; modern large models run 100,000 or more, arriving at vocabularies of that size.</p>`,
  },
  {
    html: `<h3>Tokens & the vocabulary</h3>
      <p>After all merges you have a fixed <strong>vocabulary</strong> — a lookup table that maps each piece to an integer ID. The model never sees raw text; it sees a list of IDs. "tokenization" ends up as just two: <span class="tok">token</span> + <span class="tok">ization</span>.</p>
      <p>A common word like <em>the</em> earns a single ID; a rare word like <em>antidisestablishmentarianism</em> gets split into many. Morphologically related words often share token prefixes, giving the model a head start on learning their meaning.</p>
      <div class="postcard">Tokenization turns raw text into a sequence of integer IDs — the actual atoms a model reads, predicts, and generates, one at a time.</div>`,
  },
]

export default class Tokenization extends Chapter {
  init() {
    this.setBloom(0.78, 0.4, 0.84)
    this.addAmbientField(200, 60)
    this.camera.position.set(0, 0, 9)
    this.camera.lookAt(0, 0, 0)

    this.stageGroups = []
    this.stageLabels = []
    STAGES.forEach((tokens) => {
      const group = new THREE.Group()
      const labels = []
      const widths = tokens.map((s) => 0.55 + s.length * 0.32)
      const gap = 0.22
      const total = widths.reduce((a, b) => a + b, 0) + gap * (tokens.length - 1)
      let x = -total / 2
      tokens.forEach((s, i) => {
        const w = widths[i]
        const cx = x + w / 2
        const geo = new THREE.BoxGeometry(w, 0.8, 0.22)
        const mesh = new THREE.Mesh(geo, glowBasic(palette.amber, 0.18))
        mesh.position.set(cx, 0, 0)
        group.add(mesh)
        const lab = this.label(s, { pill: true, position: new THREE.Vector3(cx, 0, 0.2), opacity: 0 })
        labels.push(lab)
        x += w + gap
      })
      group.visible = false
      this.add(group)
      this.stageGroups.push(group)
      this.stageLabels.push(labels)
    })
    this.active = -1
  }

  onStep(i) {
    this.active = Math.max(0, Math.min(STAGES.length - 1, i))
    this.stageGroups.forEach((g, s) => (g.visible = s === this.active))
    this.stageLabels.forEach((labs, s) => labs.forEach((l) => l.setVisible(s === this.active).setOpacity(s === this.active ? 1 : 0)))
  }

  update(dt, t) {
    const g = this.stageGroups[this.active]
    if (g) g.position.y = Math.sin(t * 0.8) * 0.06
  }
}
