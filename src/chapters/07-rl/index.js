import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additiveLine, glowBasic } from '../../lib/materials.js'
import { palette } from '../../theme/palette.js'
import { damp, lerp, clamp01 } from '../../theme/motion.js'
import { isLight } from '../../theme/theme.js'

// Chapter 07 — Reinforcement Learning. The policy (the model) answers a prompt
// several ways; each answer becomes a REWARD BAR (height = score). A "group
// average" line runs across them, and each answer's ADVANTAGE — how far above/
// below that average — reinforces (▲, lime) or suppresses (▼, rose) it. Beats add
// the reward model (judge), PPO's reference leash, RLVR's verifier (✓/✗), GRPO's
// group baseline, and the long reasoning chains reward unlocks.

const N = 6 // answers sampled per group
const POLICY = new THREE.Vector3(-4.1, -0.1, 0)
const BASE_Y = -2.15 // foot of the reward bars
const MAXH = 3.7 // full-reward bar height
const BAR_X0 = -0.7 // x of the first bar
const BAR_DX = 0.95 // spacing between bars
const ROUND_DUR = 2.8

const barX = (i) => BAR_X0 + i * BAR_DX
const rewardY = (r) => BASE_Y + clamp01(r) * MAXH

export const beats = [
  {
    side: 'left',
    html: `<span class="eyebrow">Chapter 07 · learning from reward</span>
      <h2>Reinforcement Learning</h2>
      <p class="lead">Pretraining and fine-tuning learn by <em>copying</em> fixed answers. But how do you teach a model to do something with <strong>no single right answer</strong> — to be genuinely helpful, or crack a problem it has never seen? You let it <strong>try</strong>, score the attempt, and push it toward whatever scored well. That is <strong>reinforcement learning</strong>.</p>
      <p>The model is the <strong>policy</strong>: given a situation it produces an action — here, a whole answer. Each attempt earns a <strong>reward</strong>: one number for how good it was. No labels — just a score.</p>`,
  },
  {
    side: 'right',
    html: `<h3>The loop: try, score, nudge</h3>
      <p>RL is a loop. The policy generates a batch of attempts, each is scored, and the weights are nudged to make the <em>high-scoring</em> behaviour more likely next time. Repeat, and the whole batch drifts upward — watch the average reward climb round after round.</p>
      <p>The model is never shown the right answer. It's told only <em>how good</em> its own answers were — so it has to <strong>explore</strong>, stumble onto what works, and do more of that.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Policy gradients — push up what works</h3>
      <p>How do you turn a reward into a weight update? The core trick is the <strong>policy gradient</strong>: make every choice an attempt made <em>more</em> likely when its reward was good, and <em>less</em> likely when it was bad — scaled by the score. Reinforce the winners (<span style="color:var(--lime)">▲</span>), discourage the losers (<span style="color:var(--rose)">▼</span>).</p>
      <p>Do that across thousands of attempts and the policy steadily shifts its odds toward actions that pay off.</p>
      <p class="aside">The key to making it stable is a <strong>baseline</strong> — a typical score to compare against. Reward <em>above</em> the baseline pushes up; <em>below</em> pushes down. Hold onto that idea: it's the whole of GRPO.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Where the reward comes from</h3>
      <p>For a crisp goal you can score directly. But "is this answer <em>helpful</em>?" has no formula. So — exactly as in the ChatGPT recipe — people compare pairs of answers, and those preferences train a separate <strong>reward model</strong>: a learned <strong>judge</strong> that scores any answer the way people tended to.</p>
      <p>The policy then practises against that judge. This is <strong>RLHF</strong> — reinforcement learning from human feedback — and it's what first turned a raw next-token predictor into a cooperative assistant.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/rlhf">how RLHF works</a></div>`,
  },
  {
    side: 'left',
    html: `<h3>PPO — don't move too fast</h3>
      <p>Chase reward too greedily and the model breaks: it warps toward whatever games the score and forgets how to write. The long-time workhorse, <strong>PPO</strong> (Proximal Policy Optimization), guards against that. It <strong>clips</strong> each update so the policy can't lurch too far in one step, and adds a <strong>KL leash</strong> tying it to the frozen <strong>reference model</strong> it started from.</p>
      <p>Stay close to what you were, improve a little, repeat. Stable — but heavy: PPO also trains a second "value" network just to estimate that baseline.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Verifiable rewards — let the world judge</h3>
      <p>For math, code, and logic there's something better than a learned judge: <strong>check the answer</strong>. Run the code against tests; verify the proof; compare to the known result. The reward is simply <strong>right or wrong</strong> — nothing to train, nothing to fool.</p>
      <p>This is <strong>RLVR</strong> (RL from verifiable rewards), and it's the engine behind today's <strong>reasoning models</strong>: an honest, cheap, ungameable signal you can run at enormous scale.</p>`,
  },
  {
    side: 'left',
    html: `<h3>GRPO — grade on the curve</h3>
      <p>If the reward is just "right or wrong," do you really need a whole value network to estimate the baseline? <strong>GRPO</strong> (Group Relative Policy Optimization) says no. For each question it samples a <strong>group</strong> of answers, scores them all, and uses the group's own <strong>average</strong> as the baseline.</p>
      <p>Each answer's <strong>advantage</strong> is just how far it lands <em>above or below the group mean</em> — beat the average and you're reinforced, fall short and you're suppressed. Grading on the curve. Dropping PPO's value network makes it far <strong>leaner</strong>, and it's the method behind recent open reasoning models.</p>
      <p class="aside">It's the same policy-gradient idea — but the baseline is free: it's simply your peers on the very same question.</p>`,
  },
  {
    side: 'right',
    html: `<h3>What reward unlocks</h3>
      <p>Trained this way, models learn things imitation never taught them. To earn more reward on hard problems they begin to <strong>think longer</strong> — writing out long chains of reasoning, trying an approach, catching their own mistakes, backtracking, and trying again.</p>
      <p>No one demonstrated those habits; the model <em>discovered</em> them because they win reward. That is the leap from a model that merely answers to one that genuinely <strong>reasons</strong>.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The whole idea</h3>
      <div class="postcard">Reinforcement learning trains by reward, not by copying: the policy tries, each attempt is scored — by a learned judge (RLHF) or a verifier (RLVR) — and policy gradients push it toward what works. GRPO scores a whole group and grades each answer against the group's average: simple, scalable, and behind today's reasoning models.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF deep dive</a>
        <a class="deepdive" data-route="/inference">next: Inference →</a>
      </div>`,
  },
]

// camera per beat: [y, z, lookY]
const CAM = [
  [0, 8.8, -0.2], [0, 9.7, 0], [0, 9.2, 0], [0.5, 9.5, 0.3], [-0.4, 9.2, -0.1],
  [0.2, 9.2, 0], [0.2, 9.0, 0.1], [0, 9.8, 0], [0, 10.5, 0],
]

export default class RL extends Chapter {
  init() {
    this.reduced = this.ctx.reduced
    this.setBloom(0.92, 0.5, 0.78)
    this.addAmbientField(360, 75)
    this.addLights({ key: 0x66ddff, rim: 0x84cc16, amb: 0x14241a })
    this.camera.position.set(0, 0, 9.7)
    this.lookTarget = new THREE.Vector3(0, 0, 0)

    this.beat = 0
    this._roundT = 0
    this._round = 0
    this.mean = 0.4
    this.meanTarget = 0.4

    this._buildPolicy()
    this._buildBars()
    this._buildBaseline()
    this._buildJudge()
    this._buildLabels()
    this._newRound(true)
  }

  _buildPolicy() {
    // the prompt the policy must answer
    this.prompt = new GlowNode({ color: palette.blue, radius: 0.2, halo: 0.7, glow: 1.1 })
    this.prompt.position.set(POLICY.x, 1.55, 0)
    this.add(this.prompt)
    this.inEF = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.5, baseOpacity: 0.4, flowSize: 0.12 })
    this.inEF.addEdge(this.prompt.position.clone(), POLICY, palette.blue, 0.8)
    this.inEF.build()
    this.add(this.inEF)

    // frozen reference model (PPO leash target) + trust-region ring
    this.refCore = new GlowNode({ color: palette.muted, radius: 0.3, halo: 0.6, glow: 0.9 })
    this.refCore.position.set(POLICY.x, POLICY.y - 1.75, 0)
    this.refCore.setLevel(0.4)
    this.refCore.visible = false
    this.add(this.refCore)
    this.tether = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.3, baseOpacity: 0, flowSize: 0.11 })
    this.tether.addEdge(this.refCore.position.clone(), POLICY, palette.muted, 1)
    this.tether.build()
    this.add(this.tether)
    this.trustMat = glowBasic(palette.muted, 0)
    this.trust = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 8, 56), this.trustMat)
    this.trust.position.copy(POLICY)
    this.add(this.trust)

    // the policy: the model being trained. Smaller halo + lower emissive so it
    // doesn't bloom to bright yellow in dark; a larger, solid ball in light.
    this.policy = new GlowNode({ color: palette.lime, radius: 0.56, halo: 0.8, glow: 1.2 })
    this.policy.position.copy(POLICY)
    this.policy.setLevel(0.8)
    this.add(this.policy)
  }

  _buildBars() {
    // each answer = a reward bar (height) + a node on top + score label + advantage
    // arrow + verify mark + reasoning-chain waypoints, fed by a trajectory from the policy
    this.attempts = []
    this.trajEF = new EdgeField({ flow: true, flowPerEdge: 2, flowSpeed: 0.55, baseOpacity: 0.3, flowSize: 0.12 })
    this._barGeo = new THREE.BoxGeometry(0.5, 1, 0.5)
    this._coneGeo = new THREE.ConeGeometry(0.13, 0.32, 12)
    this._markGeo = new THREE.SphereGeometry(0.1, 10, 10)
    for (let i = 0; i < N; i++) {
      const x = barX(i)
      const mat = glowBasic(palette.cyan, 0.9)
      const bar = new THREE.Mesh(this._barGeo, mat)
      bar.position.set(x, BASE_Y, 0)
      bar.scale.y = 0.02
      this.add(bar)
      const ans = new GlowNode({ color: palette.cyan, radius: 0.16, halo: 0.7, glow: 1.2 })
      ans.position.set(x, BASE_Y, 0)
      this.add(ans)
      const scoreLab = this.label('', { className: 'tiny', position: new THREE.Vector3(x, BASE_Y, 0), opacity: 0 })
      const arrowMat = glowBasic(palette.lime, 0.95)
      const arrow = new THREE.Mesh(this._coneGeo, arrowMat)
      arrow.visible = false
      this.add(arrow)
      const markMat = glowBasic(palette.lime, 0.95)
      const mark = new THREE.Mesh(this._markGeo, markMat)
      mark.visible = false
      this.add(mark)
      const chain = []
      for (let c = 0; c < 3; c++) {
        const n = new GlowNode({ color: palette.lime, radius: 0.06, halo: 0.4, glow: 1.0 })
        n.visible = false
        this.add(n)
        chain.push(n)
      }
      const idx = this.trajEF.addEdge(POLICY, new THREE.Vector3(x, BASE_Y + 0.1, 0), palette.cyan, 0.55)
      this.attempts.push({ bar, mat, ans, scoreLab, arrow, arrowMat, mark, markMat, chain, idx, reward: 0.4, target: 0.4, _s: '' })
    }
    this.trajEF.build()
    this.add(this.trajEF)
  }

  _buildBaseline() {
    this.avgMat = additiveLine(palette.amber, 0)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([barX(0) - 0.55, 0, 0, barX(N - 1) + 0.55, 0, 0]), 3))
    this.avgLine = new THREE.LineSegments(g, this.avgMat)
    this.add(this.avgLine)
    this._avgGeo = g
    // faint reward axis on the far left of the bars
    this.axisMat = additiveLine(palette.muted, 0.25)
    const ax = barX(0) - 0.6
    const ag = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, BASE_Y, 0), new THREE.Vector3(ax, BASE_Y + MAXH + 0.2, 0)])
    this.add(new THREE.LineSegments(ag, this.axisMat))
    this._axisX = ax
  }

  _buildJudge() {
    this.judge = new GlowNode({ color: palette.amber, radius: 0.3, halo: 1.0, glow: 1.4 })
    this.judge.position.set((barX(0) + barX(N - 1)) / 2, BASE_Y + MAXH + 0.9, 0)
    this.judge.visible = false
    this.add(this.judge)
    this.judgeEF = new EdgeField({ flow: true, flowPerEdge: 1, flowSpeed: 0.7, baseOpacity: 0, flowSize: 0.1 })
    this._judgeIdx = []
    for (let i = 0; i < N; i++) this._judgeIdx.push(this.judgeEF.addEdge(this.judge.position, new THREE.Vector3(barX(i), BASE_Y, 0), palette.amber, 0.6))
    this.judgeEF.build()
    this.add(this.judgeEF)
  }

  _buildLabels() {
    this.lblPolicy = this.label('policy · the model', { pill: true, position: POLICY.clone().add(new THREE.Vector3(0, -0.95, 0)), opacity: 0 })
    this.lblPrompt = this.label('prompt', { pill: true, position: this.prompt.position.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 })
    this.lblReward = this.label('reward', { className: 'tiny muted', position: new THREE.Vector3(this._axisX, BASE_Y + MAXH + 0.5, 0), opacity: 0 })
    this.lblAvg = this.label('group average', { className: 'tiny', position: new THREE.Vector3(barX(N - 1) + 0.6, 0, 0), opacity: 0 })
    this.lblRef = this.label('reference model', { className: 'tiny muted', position: this.refCore.position.clone().add(new THREE.Vector3(0, -0.55, 0)), opacity: 0 })
    this.lblJudge = this.label('reward model · judge', { pill: true, position: this.judge.position.clone().add(new THREE.Vector3(0, 0.6, 0)), opacity: 0 })
    this.lblVerify = this.label('verify ✓ / ✗', { pill: true, position: new THREE.Vector3((barX(0) + barX(N - 1)) / 2, BASE_Y + MAXH + 0.9, 0), opacity: 0 })
    this.lblAdv = this.label('advantage = reward − average', { className: 'tiny', position: new THREE.Vector3((barX(0) + barX(N - 1)) / 2, BASE_Y + MAXH + 0.6, 0), opacity: 0 })
  }

  _newRound(initial) {
    this._round = initial ? 0 : this._round + 1
    const ramp = clamp01(0.32 + this._round * 0.12)
    const verifiable = this.beat >= 5 // RLVR/GRPO: bimodal (right vs wrong)
    let sum = 0
    for (const a of this.attempts) {
      let r
      if (verifiable) r = Math.random() < ramp ? 0.72 + Math.random() * 0.26 : 0.06 + Math.random() * 0.2
      else r = clamp01(ramp + (Math.random() - 0.5) * 0.6)
      a.target = r
      sum += r
    }
    this.meanTarget = sum / N
    if (this._round >= 5) this._round = -1 // loop the improvement so it reads
  }

  enter() {
    if (this.reduced) return
    gsap.from(this.policy.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.8, ease: 'back.out(1.7)' })
  }

  _cam(i) {
    const [y, z, ly] = CAM[i] || CAM[0]
    const d = this.reduced ? 0 : 1.4
    gsap.to(this.camera.position, { x: 0, y, z, duration: d, ease: 'power3.inOut', overwrite: true })
    gsap.to(this.lookTarget, { x: 0, y: ly, z: 0, duration: d, ease: 'power3.inOut', overwrite: true })
  }

  onStep(i) {
    this.beat = i
    this._cam(i)
    if (i === 1 || i === 5) { this._round = 0; this._newRound(true) }
    this.refCore.visible = i === 4
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    const rd = this.reduced
    const i = this.beat

    if (i >= 1 && !rd) {
      this._roundT += dt
      if (this._roundT >= ROUND_DUR) { this._roundT = 0; this._newRound(false) }
    }
    const activeN = i === 0 ? 1 : N
    this.mean = rd ? this.meanTarget : damp(this.mean, this.meanTarget, 3, dt)
    const meanY = rewardY(this.mean)
    const advBeat = i === 2 || i === 6

    this.attempts.forEach((a, k) => {
      const on = k < activeN
      a.reward = rd ? a.target : damp(a.reward, a.target, 4, dt)
      const top = rewardY(a.reward)
      const h = Math.max(0.02, top - BASE_Y)
      const adv = a.reward - this.mean
      const good = adv >= 0
      let col = palette.cyan
      if (advBeat) col = good ? palette.lime : palette.rose
      else if (i === 5) col = a.reward > 0.5 ? palette.lime : palette.rose

      a.bar.visible = on
      a.bar.scale.y = h
      a.bar.position.set(barX(k), BASE_Y + h / 2, 0)
      a.mat.color.set(col)
      a.mat.opacity = on ? 0.88 : 0
      a.ans.position.set(barX(k), top, 0)
      a.ans.visible = on
      a.ans.setColor(col)
      a.ans.setLevel(on ? 0.55 + clamp01(Math.abs(adv) * 1.4) * 0.45 : 0)
      this.trajEF.edges[a.idx].b.set(barX(k), BASE_Y + 0.1, 0)
      this.trajEF.setWeight(a.idx, on ? 0.55 : 0)

      // score number
      const showScore = on && i >= 1 && i !== 7
      a.scoreLab.position.set(barX(k), top + 0.32, 0)
      a.scoreLab.setOpacity(showScore ? 0.85 : 0)
      if (showScore) { const s = a.reward.toFixed(2); if (s !== a._s) { a._s = s; a.scoreLab.setText(s) } }

      // advantage arrow (▲ reinforce / ▼ suppress)
      const showArrow = advBeat && on
      a.arrow.visible = showArrow
      if (showArrow) {
        a.arrow.position.set(barX(k), top + (good ? 0.62 : -0.2), 0)
        a.arrow.rotation.z = good ? 0 : Math.PI
        a.arrowMat.color.set(good ? palette.lime : palette.rose)
        a.arrowMat.opacity = 0.95
      }

      // verify mark (RLVR)
      const showMark = i === 5 && on
      a.mark.visible = showMark
      if (showMark) { a.mark.position.set(barX(k), top + 0.3, 0); a.markMat.color.set(a.reward > 0.5 ? palette.lime : palette.rose) }

      // reasoning chain (beat 7): policy → waypoints → answer
      const showChain = i === 7 && on
      a.chain.forEach((n, c) => {
        n.visible = showChain
        if (showChain) {
          const tt = (c + 1) / 4
          n.position.set(lerp(POLICY.x, barX(k), tt), lerp(POLICY.y, top, tt) + (rd ? 0 : Math.sin(t * 2 + k + c) * 0.1), 0)
          n.setLevel(0.55 + (rd ? 0 : Math.sin(t * 3 + c + k) * 0.2))
        }
      })
    })
    this.trajEF.update(dt)
    this.inEF.update(dt)

    // group-average line
    const mp = this._avgGeo.attributes.position.array
    mp[1] = meanY; mp[4] = meanY
    this._avgGeo.attributes.position.needsUpdate = true
    const avgOn = i >= 2 ? (i === 6 ? 1 : 0.5) : 0
    this.avgMat.opacity = (i === 6 ? 0.9 : 0.45) * avgOn
    this.lblAvg.position.set(barX(N - 1) + 0.6, meanY, 0)
    this.lblAvg.setOpacity(avgOn)

    // policy + prompt. In light, drive a higher level (bigger, solid, visible ball);
    // in dark, keep it dim so it doesn't bloom to bright yellow.
    const pol = isLight() ? 1.15 : 0.5 + clamp01(this.mean) * 0.18
    this.policy.setLevel(pol + (rd ? 0 : Math.sin(t * 2) * 0.08))
    this.prompt.setLevel(0.55 + (rd ? 0 : Math.sin(t * 2.5) * 0.1))

    // PPO reference + tether + trust ring (beat 4)
    const refOn = i === 4 ? 1 : 0
    this.refCore.setLevel(0.4 * refOn)
    this.tether.setLineOpacity(0.5 * refOn)
    this.tether.setFlowOpacity(0.85 * refOn)
    if (refOn) this.tether.update(dt)
    this.trustMat.opacity = 0.5 * refOn
    if (!rd) this.trust.rotation.z += dt * 0.3 * refOn
    this.lblRef.setOpacity(refOn * 0.9)

    // reward-model judge (beat 3)
    const judgeOn = i === 3 ? 1 : 0
    this.judge.visible = judgeOn > 0
    if (judgeOn) {
      this.judge.setLevel(0.7 + Math.sin(t * 4) * 0.15)
      for (let k = 0; k < N; k++) {
        this.judgeEF.edges[this._judgeIdx[k]].b.set(barX(k), this.attempts[k].ans.position.y, 0)
        this.judgeEF.setWeight(this._judgeIdx[k], 0.7)
      }
      this.judgeEF.update(dt)
    }
    this.judgeEF.setLineOpacity(0.5 * judgeOn)
    this.judgeEF.setFlowOpacity(0.9 * judgeOn)

    // labels
    this.lblPolicy.setOpacity(i <= 1 || i === 4 ? 0.9 : 0.4)
    this.lblPrompt.setOpacity(i <= 1 ? 0.85 : 0.3)
    this.lblReward.setOpacity(i >= 1 ? 0.7 : 0)
    this.lblJudge.setOpacity(judgeOn * 0.9)
    this.lblVerify.setOpacity(i === 5 ? 0.9 : 0)
    this.lblAdv.setOpacity(i === 6 ? 0.9 : 0)
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    super.dispose()
  }
}
