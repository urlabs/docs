import * as THREE from 'three'
import katex from 'katex'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { palette } from '../../theme/palette.js'
import { damp } from '../../theme/motion.js'

const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export const beats = [
  {
    html: `<span class="eyebrow">Deep dive · pretraining</span>
      <h2>RLHF</h2>
      <p class="lead">A pretrained model learns to predict the next token across the web — brilliant at continuing text, but equally willing to complete a harmful sentence as a helpful one. <strong>Reinforcement Learning from Human Feedback (RLHF)</strong> is the three-stage recipe that turns a raw predictor into a model that is genuinely useful and responsive to intent.</p>`,
  },
  {
    html: `<h3>1 · Supervised fine-tuning (SFT)</h3>
      <p>Before any RL, the model needs to learn the <em>register</em> of being helpful. Human contractors write ideal prompt-and-response pairs — a question alongside a clear, well-structured answer — and the base model is fine-tuned on them with ordinary cross-entropy loss. <strong>SFT</strong> teaches the model to follow instructions, stay on topic, and respond rather than simply continue. Think of it as apprenticeship before autonomy.</p>`,
  },
  {
    html: `<h3>2 · Train a reward model</h3>
      <p>A human cannot score every gradient step, so we train a stand-in. Given a prompt, the SFT model generates several candidate answers; human raters <strong>rank</strong> them rather than score them — ranking is faster and more consistent than assigning raw numbers. A separate <strong>reward model</strong> (typically the SFT model with a scalar output head) is then trained to reproduce those rankings via a comparison loss: whenever raters prefer A over B, the reward model must assign A a higher score than B.</p>
      <p class="aside">Here, answer A is preferred over B; the reward model learns to assign A a higher score.</p>`,
  },
  {
    html: `<h3>3 · Optimize with RL</h3>
      <p>The SFT model — now called the <strong>policy</strong> — is fine-tuned to maximize the reward model's score on new prompts. Left unconstrained, it would quickly learn to fool the reward model: producing fluent-sounding text that scores well while saying very little (<em>reward hacking</em>). A <strong>KL penalty</strong> prevents this by penalizing the policy for drifting too far from the original SFT model, keeping it on a short leash:</p>
      ${tex('\\max_{\\pi}\\; \\mathbb{E}\\big[\\,r(x,y)\\,\\big]\\;-\\;\\beta\\,\\mathrm{KL}\\!\\left(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\right)', true)}
      <p><strong>PPO</strong> (Proximal Policy Optimization) optimizes this objective by sampling fresh responses from the policy and applying clipped gradient updates. <strong>DPO</strong> (Direct Preference Optimization) is a simpler offline alternative that skips the explicit reward model entirely, deriving a training signal straight from the human ranking data.</p>
      <div class="postcard">RLHF: imitate good answers, learn human preference, then optimize toward it on a short leash.</div>`,
  },
]

export default class RLHF extends Chapter {
  init() {
    this.setBloom(0.82, 0.42, 0.82)
    this.addAmbientField(200, 60)
    this.addLights()
    this.camera.position.set(0.5, 0.3, 9.5)
    this.camera.lookAt(0.5, 0, 0)

    const P = (x, y) => new THREE.Vector3(x, y, 0)
    this.posBase = P(-3.4, 0)
    this.posPolicy = P(-0.4, 0)
    this.posA = P(2.6, 1.3)
    this.posB = P(2.6, -1.3)
    this.posReward = P(4.8, 0)

    this.base = new GlowNode({ color: palette.muted, radius: 0.34, halo: 0.9, glow: 0.9 })
    this.base.position.copy(this.posBase)
    this.policy = new GlowNode({ color: palette.magenta, radius: 0.42, halo: 1.2, glow: 1.3 })
    this.policy.position.copy(this.posPolicy)
    this.A = new GlowNode({ color: palette.cyan, radius: 0.3, halo: 1.0, glow: 1.1 })
    this.A.position.copy(this.posA)
    this.B = new GlowNode({ color: palette.cyan, radius: 0.3, halo: 1.0, glow: 1.1 })
    this.B.position.copy(this.posB)
    this.reward = new GlowNode({ color: palette.amber, radius: 0.34, halo: 1.1, glow: 1.2 })
    this.reward.position.copy(this.posReward)
    ;[this.base, this.policy, this.A, this.B, this.reward].forEach((n) => this.add(n))

    this.label('base model', { position: this.posBase.clone().add(P(0, -0.7, 0)), className: 'tiny muted' })
    this.label('policy', { position: this.posPolicy.clone().add(P(0, -0.8, 0)), className: 'tiny' })
    this.lblA = this.label('answer A', { position: this.posA.clone().add(P(0, 0.6, 0)), className: 'tiny' })
    this.lblB = this.label('answer B', { position: this.posB.clone().add(P(0, -0.6, 0)), className: 'tiny' })
    this.lblR = this.label('reward model', { position: this.posReward.clone().add(P(0, 0.7, 0)), className: 'tiny', opacity: 0 })

    // demonstrations (SFT)
    this.demos = []
    for (let i = 0; i < 4; i++) {
      const d = new GlowNode({ color: palette.lime, radius: 0.14, halo: 0.7, glow: 1.0 })
      d.position.set(-0.4 + (Math.random() - 0.5) * 0.6, 2.4 + i * 0.4, 0)
      d.visible = false
      this.add(d)
      this.demos.push(d)
    }

    this.edges = new EdgeField({ flow: true, flowPerEdge: 3, flowSpeed: 0.5, baseOpacity: 0.6, flowSize: 0.16 })
    this.eDemo = this.demos.map((d) => this.edges.addEdge(d.position, this.posPolicy, palette.lime, 0))
    this.ePA = this.edges.addEdge(this.posPolicy, this.posA, palette.cyan, 0)
    this.ePB = this.edges.addEdge(this.posPolicy, this.posB, palette.cyan, 0)
    this.eAR = this.edges.addEdge(this.posA, this.posReward, palette.amber, 0)
    this.eBR = this.edges.addEdge(this.posB, this.posReward, palette.amber, 0)
    this.eLeash = this.edges.addEdge(this.posPolicy, this.posBase, palette.violet, 0)
    this.eImprove = this.edges.addEdge(this.posPolicy, this.posA, palette.magenta, 0)
    this.edges.build()
    this.add(this.edges)

    this.step = 0
    this.policyTarget = this.posPolicy.clone()
  }

  _set(idx, w) {
    this.edges.setWeight(idx, w)
  }

  onStep(i) {
    this.step = i
    const off = [this.eDemo, [this.ePA], [this.ePB], [this.eAR], [this.eBR], [this.eLeash], [this.eImprove]]
    off.flat().forEach((e) => this._set(e, 0))
    this.demos.forEach((d) => (d.visible = false))
    this.lblR.setOpacity(0)
    this.policyTarget.copy(this.posPolicy)
    this.A.setLevel(0.8)
    this.B.setLevel(0.8)

    if (i === 1) {
      this.demos.forEach((d) => (d.visible = true))
      this.eDemo.forEach((e) => this._set(e, 1))
    } else if (i === 2) {
      this._set(this.ePA, 1)
      this._set(this.ePB, 0.7)
      this._set(this.eAR, 1)
      this._set(this.eBR, 0.5)
      this.lblR.setOpacity(1)
      this.A.setLevel(1) // A preferred
      this.B.setLevel(0.45)
    } else if (i === 3) {
      this._set(this.ePA, 1)
      this._set(this.eImprove, 1.4)
      this._set(this.eLeash, 0.7)
      this.A.setLevel(1)
      this.B.setLevel(0.4)
      // nudge the policy toward the preferred answer A
      this.policyTarget.copy(this.posPolicy).lerp(this.posA, 0.32)
    }
  }

  update(dt, t) {
    this.edges.update(dt)
    this.policy.position.x = damp(this.policy.position.x, this.policyTarget.x, 3, dt)
    this.policy.position.y = damp(this.policy.position.y, this.policyTarget.y, 3, dt)
    this.policy.setLevel(0.8 + 0.2 * Math.sin(t * 2))
    this.reward.setLevel(this.step >= 2 ? 0.9 : 0.3)
    this.base.setLevel(0.45)
  }
}
