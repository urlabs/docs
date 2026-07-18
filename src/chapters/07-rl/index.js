import * as THREE from 'three'
import gsap from 'gsap'
import { Chapter } from '../../core/Chapter.js'
import { GlowNode } from '../../lib/nodes.js'
import { EdgeField } from '../../lib/EdgeField.js'
import { additiveLine, glowBasic } from '../../lib/materials.js'
import { palette, C } from '../../theme/palette.js'
import { damp, lerp, clamp01, smoothstep } from '../../theme/motion.js'
import { isLight, blend } from '../../theme/theme.js'

// Chapter 07 — Reinforcement Learning. The policy (the model) answers a prompt
// several ways; each answer becomes a REWARD BAR (height = score). A "group
// average" line runs across them, and each answer's ADVANTAGE — how far above/
// below that average — reinforces (▲, lime) or suppresses (▼, rose) it. Beats:
// the imitation ceiling (dashed teacher line the bars break through under RL),
// the loop, policy gradients, the reward model (judge), PPO's reference leash,
// DPO's judge-free probability transfer (chosen ✓ / rejected ✗ pair), RLVR's
// verifier (✓/✗), GRPO's group baseline, and the long reasoning chains reward
// unlocks — scored per-step (process) vs at the end only (outcome).

const N = 6 // answers sampled per group
const CHAIN = 4 // reasoning waypoints per answer (beat 9)
const POLICY = new THREE.Vector3(-4.1, -0.1, 0)
const BASE_Y = -2.15 // foot of the reward bars
const MAXH = 3.7 // full-reward bar height
const BAR_X0 = -0.7 // x of the first bar
const BAR_DX = 0.95 // spacing between bars
const ROUND_DUR = 2.8
const TEACH = 0.66 // the teacher's score — imitation's ceiling (beat 1)
const DPO_XR = 0.75 // rejected answer x (beat 6)
const DPO_XC = 2.55 // chosen answer x (beat 6)
const CHX0 = -1.0 // beat 9 compresses the bar row so the whole
const CHDX = 0.64 // process-vs-outcome comparison clears the prose card

const barX = (i) => BAR_X0 + i * BAR_DX
const rewardY = (r) => BASE_Y + clamp01(r) * MAXH
const RIGHT_CARD = new Set([1, 3, 5, 7, 9]) // beats whose prose card sits on the right

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
    html: `<h3>The imitation ceiling</h3>
      <p>Why not just fine-tune on more good answers? Because copying has a built-in <strong>ceiling</strong>: a model trained to imitate demonstrations can at best <em>match</em> its teacher. Watch the bars press up against the dashed <span class="tok">teacher</span> line — under pure imitation they never cross it.</p>
      <p>Cloning has a subtler flaw too: the model learns to <em>sound like</em> the demonstrations, not to <em>achieve the goal</em> behind them. RL changes the signal itself — generate, get <strong>scored</strong>, shift toward what scores well. Nothing in that loop is anchored to the teacher, so the bars are free to climb past the line.</p>
      <p class="aside">This is exactly how game-playing systems blew past human play: AlphaGo's descendants trained on <em>self-generated</em> experience, not human game records. Imitation could only approach the best humans; reward could exceed them.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The loop: try, score, nudge</h3>
      <p>RL is a loop. The policy generates a batch of attempts, each is scored, and the weights are nudged to make the <em>high-scoring</em> behaviour more likely next time. Repeat, and the whole batch drifts upward — watch the average reward climb round after round.</p>
      <p>The model is never shown the right answer. It's told only <em>how good</em> its own answers were — so it has to <strong>explore</strong>, stumble onto what works, and do more of that.</p>`,
  },
  {
    side: 'right',
    html: `<h3>Policy gradients — push up what works</h3>
      <p>How do you turn a reward into a weight update? The core trick is the <strong>policy gradient</strong>: make every choice an attempt made <em>more</em> likely when its reward was good, and <em>less</em> likely when it was bad — scaled by the score. Reinforce the winners (<span style="color:var(--lime)">▲</span>), discourage the losers (<span style="color:var(--rose)">▼</span>).</p>
      <p>Do that across thousands of attempts and the policy steadily shifts its odds toward actions that pay off.</p>
      <p class="aside">The key to making it stable is a <strong>baseline</strong> — a typical score to compare against. Reward <em>above</em> the baseline pushes up; <em>below</em> pushes down. Hold onto that idea: it's the whole of GRPO.</p>`,
  },
  {
    side: 'left',
    html: `<h3>Where the reward comes from</h3>
      <p>For a crisp goal you can score directly. But "is this answer <em>helpful</em>?" has no formula. So — exactly as in the ChatGPT recipe — people compare pairs of answers, and those preferences train a separate <strong>reward model</strong>: a learned <strong>judge</strong> that scores any answer the way people tended to.</p>
      <p>The policy then practises against that judge. This is <strong>RLHF</strong> — reinforcement learning from human feedback — and it's what first turned a raw next-token predictor into a cooperative assistant.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/rlhf">how RLHF works</a></div>`,
  },
  {
    side: 'right',
    html: `<h3>PPO — don't move too fast</h3>
      <p>Chase reward too greedily and the model breaks: it warps toward whatever games the score and forgets how to write. The long-time workhorse, <strong>PPO</strong> (Proximal Policy Optimization), guards against that. It <strong>clips</strong> each update so the policy can't lurch too far in one step, and adds a <strong>KL leash</strong> tying it to the frozen <strong>reference model</strong> it started from.</p>
      <p>Stay close to what you were, improve a little, repeat. Stable — but heavy: PPO also trains a second "value" network just to estimate that baseline.</p>`,
  },
  {
    side: 'left',
    html: `<h3>DPO — skip the judge entirely</h3>
      <p>RLHF is a lot of machinery: train a judge, then run a full RL loop against it. <strong>DPO</strong> (Direct Preference Optimization) is the industry's favourite shortcut — same preference pairs, <em>no reward model at all</em>. For each pair it directly nudges the policy's probability <strong>up on the chosen answer</strong> (<span style="color:var(--lime)">✓</span>) and <strong>down on the rejected one</strong> (<span style="color:var(--rose)">✗</span>).</p>
      <p>Watch the probability mass drain from rejected to chosen. The frozen <strong>reference model</strong> still anchors every nudge — the update is measured <em>relative to it</em>, so the policy improves without drifting from sane language.</p>
      <p class="aside">The DPO paper's thesis: <em>"your language model is secretly a reward model"</em> — the RLHF objective can be rearranged into a plain classification loss on the policy's own probabilities. Cheaper and more stable than PPO, at a cost: there's no explicit judge left over to reuse or inspect.</p>`,
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
      <p>Trained on reward, models learn what imitation never taught: to earn more on hard problems they start to <strong>think longer</strong> — writing chains of reasoning, catching their own mistakes, backtracking. No one demonstrated that; the model <em>discovered</em> it because it wins reward.</p>
      <p>But long chains strain the signal. Score only the final answer — an <strong>outcome reward</strong> — and a three-hundred-step solution gets <em>one bit</em> of feedback. Which step earned the credit? Which deserves the blame? That's the <strong>credit assignment</strong> problem.</p>
      <p><strong>Process rewards</strong> answer it by scoring every <em>step</em>: the left chains get one mark at the end; the right chains get a mark per step. Per-step marks even catch a chain that reached the right answer through a <em>wrong step</em> — lucky reasoning an outcome score would happily reinforce.</p>
      <p class="aside">Process labels are expensive — someone (or some model) must judge every step — while outcomes are nearly free to verify for math and code. Production reasoning systems mix both: verifiable outcomes at scale, process signals where chains run long.</p>`,
  },
  {
    side: 'left',
    html: `<h3>The whole idea</h3>
      <div class="postcard">Reinforcement learning trains by reward, not by copying — which is how a model can exceed its teacher. The policy tries; each attempt is scored by a learned judge (RLHF), by preference pairs directly (DPO), or by a verifier (RLVR); and policy gradients push it toward what works. GRPO grades each answer against its group's average, and process rewards score each reasoning step — simple loops, and the engine of today's reasoning models.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF deep dive</a>
        <a class="deepdive" data-route="/inference">next: Inference →</a>
      </div>`,
  },
]

// camera per beat: [y, z, lookY]
const CAM = [
  [0, 8.8, -0.2], [0.1, 9.6, 0.1], [0, 9.7, 0], [0, 9.2, 0], [0.5, 9.5, 0.3],
  [-0.4, 9.2, -0.1], [-0.3, 8.9, -0.2], [0.2, 9.2, 0], [0.2, 9.0, 0.1],
  [0, 9.8, 0], [0, 10.5, 0],
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
    this._lucky = null
    this._phaseTxt = ''

    this._buildPolicy()
    this._buildBars()
    this._buildBaseline()
    this._buildTeacher()
    this._buildJudge()
    this._buildDpo()
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

    // frozen reference model (PPO leash target, DPO anchor) + trust-region ring
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
      for (let c = 0; c < CHAIN; c++) {
        const n = new GlowNode({ color: palette.lime, radius: 0.085, halo: 0.4, glow: 1.0 })
        n.visible = false
        this.add(n)
        chain.push(n)
      }
      const idx = this.trajEF.addEdge(POLICY, new THREE.Vector3(x, BASE_Y + 0.1, 0), palette.cyan, 0.55)
      this.attempts.push({ bar, mat, ans, scoreLab, arrow, arrowMat, mark, markMat, chain, idx, reward: 0.4, target: 0.4, steps: null, _s: '' })
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

  _buildTeacher() {
    // the imitation ceiling: a dashed line at the teacher's score (beat 1)
    const ty = rewardY(TEACH)
    this.teachMat = new THREE.LineDashedMaterial({
      color: new THREE.Color(palette.violet),
      transparent: true,
      opacity: 0,
      dashSize: 0.17,
      gapSize: 0.12,
      blending: blend(),
      depthWrite: false,
      toneMapped: false,
    })
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(barX(0) - 0.55, ty, 0),
      new THREE.Vector3(barX(N - 1) + 0.55, ty, 0),
    ])
    this.teachLine = new THREE.Line(g, this.teachMat)
    this.teachLine.computeLineDistances()
    this.add(this.teachLine)
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

  _buildDpo() {
    // probability mass flowing from the rejected answer to the chosen one (beat 6)
    this.dpoEF = new EdgeField({ flow: true, flowPerEdge: 7, flowSpeed: 0.4, baseOpacity: 0, flowSize: 0.13 })
    this.dpoEF.addEdge(new THREE.Vector3(DPO_XR, 0, 0), new THREE.Vector3(DPO_XC, 0.5, 0), palette.lime, 1)
    this.dpoEF.build()
    this.dpoEF.setFlowOpacity(0)
    this.add(this.dpoEF)
    this._dpoR0 = 0.55; this._dpoR1 = 0.15
    this._dpoC0 = 0.45; this._dpoC1 = 0.84
  }

  _buildLabels() {
    const cx = (barX(0) + barX(N - 1)) / 2
    this.lblPolicy = this.label('policy · the model', { pill: true, position: POLICY.clone().add(new THREE.Vector3(0, -0.95, 0)), opacity: 0 })
    this.lblPrompt = this.label('prompt', { pill: true, position: this.prompt.position.clone().add(new THREE.Vector3(0, 0.5, 0)), opacity: 0 })
    this.lblReward = this.label('reward', { className: 'tiny muted', position: new THREE.Vector3(this._axisX, BASE_Y + MAXH + 0.5, 0), opacity: 0 })
    this.lblProb = this.label('probability', { className: 'tiny muted', position: new THREE.Vector3(this._axisX, BASE_Y + MAXH + 0.5, 0), opacity: 0 })
    this.lblAvg = this.label('group average', { className: 'tiny', position: new THREE.Vector3(barX(N - 1) + 0.6, 0, 0), opacity: 0 })
    this.lblRef = this.label('reference model', { className: 'tiny muted', position: this.refCore.position.clone().add(new THREE.Vector3(0, -0.55, 0)), opacity: 0 })
    this.lblJudge = this.label('reward model · judge', { pill: true, position: this.judge.position.clone().add(new THREE.Vector3(0, 0.6, 0)), opacity: 0 })
    this.lblVerify = this.label('verify ✓ / ✗', { pill: true, position: new THREE.Vector3(cx, BASE_Y + MAXH + 0.9, 0), opacity: 0 })
    this.lblAdv = this.label('advantage = reward − average', { className: 'tiny', position: new THREE.Vector3(cx, BASE_Y + MAXH + 0.6, 0), opacity: 0 })
    // beat 1 — imitation ceiling
    this.lblTeacher = this.label('teacher', { pill: true, position: new THREE.Vector3(-1.7, rewardY(TEACH) + 0.02, 0), opacity: 0 })
    this.lblPhase = this.label('', { pill: true, position: new THREE.Vector3(cx, BASE_Y + MAXH + 0.75, 0), opacity: 0 })
    // beat 6 — DPO
    this.lblChosen = this.label('chosen ✓', { pill: true, position: new THREE.Vector3(DPO_XC, 0, 0), opacity: 0 })
    this.lblRejected = this.label('rejected ✗', { pill: true, position: new THREE.Vector3(DPO_XR, 0, 0), opacity: 0 })
    this.lblPair = this.label('preference pair', { pill: true, position: new THREE.Vector3((DPO_XR + DPO_XC) / 2, BASE_Y + MAXH + 0.95, 0), opacity: 0 })
    // beat 9 — process vs outcome rewards
    this.lblOutcome = this.label('outcome reward', { pill: true, position: new THREE.Vector3(CHX0 + CHDX, BASE_Y - 0.55, 0), opacity: 0 })
    this.lblProcess = this.label('process reward', { pill: true, position: new THREE.Vector3(CHX0 + CHDX * 4, BASE_Y - 0.55, 0), opacity: 0 })
    this.lblLucky = this.label('right answer, wrong step', { className: 'tiny', position: new THREE.Vector3(0, 0, 0), opacity: 0 })
  }

  // ---- round sampling -------------------------------------------------------

  _newRound(initial) {
    this._round = initial ? 0 : this._round + 1
    if (this.beat === 1) { this._teacherRound(); return }
    if (this.beat === 6) { this._dpoRound(); return }
    const ramp = clamp01(0.32 + this._round * 0.12)
    const verifiable = this.beat >= 7 // RLVR/GRPO/chains: bimodal (right vs wrong)
    let sum = 0
    for (const a of this.attempts) {
      let r
      if (verifiable) r = Math.random() < ramp ? 0.72 + Math.random() * 0.26 : 0.06 + Math.random() * 0.2
      else r = clamp01(ramp + (Math.random() - 0.5) * 0.6)
      a.target = r
      sum += r
      // per-step verdicts for the reasoning-chain beat: a wrong answer means the
      // chain broke somewhere — steps are ✓ up to the failure, ✗ after it.
      a.steps = []
      if (r > 0.5) for (let c = 0; c < CHAIN; c++) a.steps.push(true)
      else {
        const f = 1 + Math.floor(Math.random() * (CHAIN - 1))
        for (let c = 0; c < CHAIN; c++) a.steps.push(c < f)
      }
    }
    // one "lucky" chain on the process side: right final answer via a wrong
    // middle step — the flaw only per-step marks can catch.
    this._lucky = null
    const cands = []
    for (let k = 3; k < N; k++) if (this.attempts[k].target > 0.5) cands.push(k)
    if (cands.length) {
      const k = cands[Math.floor(Math.random() * cands.length)]
      const c = 1 + Math.floor(Math.random() * (CHAIN - 2))
      this.attempts[k].steps[c] = false
      this._lucky = { k, c }
    }
    this.meanTarget = sum / N
    if (this._round >= 5) this._round = -1 // loop the improvement so it reads
  }

  _teacherRound() {
    // beat 1: two imitation rounds (bars bunch under the teacher line), then
    // three RL rounds (bars break past it), looping.
    if (this.reduced) {
      const T = [TEACH - 0.1, TEACH - 0.04, TEACH - 0.14, TEACH + 0.09, TEACH + 0.2, TEACH + 0.27]
      this.attempts.forEach((a, k) => { a.target = clamp01(T[k]) })
      this.meanTarget = T.reduce((s, v) => s + v, 0) / N
      return
    }
    const rr = this._round % 5
    const im = rr < 2
    let sum = 0
    for (const a of this.attempts) {
      a.target = im
        ? TEACH - 0.03 - Math.random() * (rr === 0 ? 0.34 : 0.15)
        : clamp01(TEACH + Math.random() * 0.3 - (rr === 2 ? 0.14 : 0.04))
      sum += a.target
    }
    this.meanTarget = sum / N
    const txt = im ? this.L('imitation: capped at the teacher') : this.L('RL: beyond the teacher')
    if (txt !== this._phaseTxt) { this._phaseTxt = txt; this.lblPhase.setText(txt) }
    if (this._round >= 5) this._round = -1
  }

  _dpoRound() {
    // beat 6: a fresh preference pair — both answers start near even odds, then
    // probability mass transfers from rejected to chosen over the round.
    this._dpoR0 = 0.5 + Math.random() * 0.1
    this._dpoC0 = 0.42 + Math.random() * 0.08
    this._dpoR1 = 0.12 + Math.random() * 0.06
    this._dpoC1 = 0.8 + Math.random() * 0.08
    if (this.reduced) {
      this.attempts[0].target = this._dpoR1
      this.attempts[1].target = this._dpoC1
    } else {
      this.attempts[0].target = this._dpoR0
      this.attempts[1].target = this._dpoC0
    }
    if (this._round >= 5) this._round = -1
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
    // fresh story on the beats that change the reward regime
    if (i === 1 || i === 2 || i === 5 || i === 6 || i === 7) {
      this._round = 0
      this._roundT = 0
      this._newRound(true)
    }
    this.refCore.visible = i === 5 || i === 6
    // on the DPO beat the reference ghost anchors the pair (the policy corner
    // sits under the prose card there), elsewhere it lives below the policy
    if (i === 6) {
      this.refCore.position.set((DPO_XR + DPO_XC) / 2, BASE_Y - 0.85, 0)
      this.lblRef.position.set((DPO_XR + DPO_XC) / 2, BASE_Y - 1.38, 0)
    } else {
      this.refCore.position.set(POLICY.x, POLICY.y - 1.75, 0)
      this.lblRef.position.set(POLICY.x, POLICY.y - 2.3, 0)
    }
  }

  update(dt, t) {
    this.camera.lookAt(this.lookTarget)
    const rd = this.reduced
    const i = this.beat

    if (i >= 1 && !rd) {
      this._roundT += dt
      if (this._roundT >= ROUND_DUR) { this._roundT = 0; this._newRound(false) }
    }

    // DPO: drain probability from rejected → chosen over the round
    if (i === 6 && !rd) {
      const e = smoothstep(0, 1, clamp01(this._roundT / (ROUND_DUR * 0.75)))
      this.attempts[0].target = lerp(this._dpoR0, this._dpoR1, e)
      this.attempts[1].target = lerp(this._dpoC0, this._dpoC1, e)
    }

    const activeN = i === 0 ? 1 : i === 6 ? 2 : N
    this.mean = rd ? this.meanTarget : damp(this.mean, this.meanTarget, 3, dt)
    const meanY = rewardY(this.mean)
    const advBeat = i === 3 || i === 8
    const trajPos = this.trajEF.lineGeo.attributes.position.array

    this.attempts.forEach((a, k) => {
      const on = k < activeN
      a.reward = rd ? a.target : damp(a.reward, a.target, 4, dt)
      const bx = i === 6 && k < 2 ? (k === 0 ? DPO_XR : DPO_XC) : i === 9 ? CHX0 + CHDX * k : barX(k)
      const top = rewardY(a.reward)
      const h = Math.max(0.02, top - BASE_Y)
      const adv = a.reward - this.mean
      const good = adv >= 0
      let col = palette.cyan
      if (advBeat) col = good ? palette.lime : palette.rose
      else if (i === 1) col = a.reward > TEACH + 0.004 ? palette.lime : palette.cyan
      else if (i === 6) col = k === 0 ? palette.rose : palette.lime
      else if (i === 7) col = a.reward > 0.5 ? palette.lime : palette.rose

      a.bar.visible = on
      a.bar.scale.y = h
      a.bar.position.set(bx, BASE_Y + h / 2, 0)
      a.mat.color.set(col)
      a.mat.opacity = on ? 0.88 : 0
      a.ans.position.set(bx, top, 0)
      a.ans.visible = on
      a.ans.setColor(col)
      a.ans.setLevel(on ? 0.55 + clamp01(Math.abs(adv) * 1.4) * 0.45 : 0)
      this.trajEF.edges[a.idx].b.set(bx, BASE_Y + 0.1, 0)
      trajPos[a.idx * 6 + 3] = bx
      this.trajEF.setWeight(a.idx, on ? 0.55 : 0)

      // score number — the last bar slides under the prose card on right-card
      // beats, so its floating label would print on the card; hide it there
      const showScore = on && i >= 1 && i !== 9 && !(RIGHT_CARD.has(i) && k === N - 1)
      a.scoreLab.position.set(bx, top + (i === 7 ? 0.62 : 0.32), 0)
      a.scoreLab.setOpacity(showScore ? 0.85 : 0)
      if (showScore) { const s = a.reward.toFixed(2); if (s !== a._s) { a._s = s; a.scoreLab.setText(s) } }

      // advantage arrow (▲ reinforce / ▼ suppress)
      const showArrow = advBeat && on
      a.arrow.visible = showArrow
      if (showArrow) {
        // both cones float above the bar top — a rose ▼ sunk into a rose bar is invisible
        a.arrow.position.set(bx, top + 0.62, 0)
        a.arrow.rotation.z = good ? 0 : Math.PI
        a.arrowMat.color.set(good ? palette.lime : palette.rose)
        a.arrowMat.opacity = 0.95
      }

      // verify mark: RLVR (beat 7) and the outcome mark on every chain (beat 9)
      const showMark = (i === 7 || i === 9) && on
      a.mark.visible = showMark
      if (showMark) { a.mark.position.set(bx, top + 0.3, 0); a.markMat.color.set(a.reward > 0.5 ? palette.lime : palette.rose) }

      // reasoning chain (beat 9): policy → waypoints → answer. Left half is
      // outcome-scored (unscored muted steps, one terminal mark); right half is
      // process-scored (each step gets its own ✓/✗ verdict color).
      const showChain = i === 9 && on
      const proc = k >= 3
      a.chain.forEach((n, c) => {
        n.visible = showChain
        if (showChain) {
          const tt = (c + 1) / (CHAIN + 1)
          n.position.set(lerp(POLICY.x, bx, tt), lerp(POLICY.y, top, tt) + (rd ? 0 : Math.sin(t * 2 + k + c) * 0.09), 0)
          const okStep = !a.steps || a.steps[c]
          n.setColor(proc ? (okStep ? C.lime : C.rose) : C.muted)
          n.setLevel(proc ? (okStep ? 0.6 : 0.95) : 0.3 + (rd ? 0 : Math.sin(t * 3 + c + k) * 0.1))
          if (this._lucky && this._lucky.k === k && this._lucky.c === c) {
            this.lblLucky.position.set(n.position.x, n.position.y + 0.34, 0)
          }
        }
      })
    })
    this.trajEF.lineGeo.attributes.position.needsUpdate = true
    this.trajEF.update(dt)
    this.inEF.update(dt)

    // group-average line (hidden where it has no meaning: intro, teacher, DPO, chains)
    const mp = this._avgGeo.attributes.position.array
    mp[1] = meanY; mp[4] = meanY
    this._avgGeo.attributes.position.needsUpdate = true
    const avgOn = i >= 2 && i !== 6 && i !== 9 ? (i === 8 ? 1 : 0.5) : 0
    this.avgMat.opacity = (i === 8 ? 0.9 : 0.45) * avgOn
    // keep the tag away from whichever side the prose card is on; on the PPO and
    // RLVR beats the left slot collides with the policy halo, so drop the tag there
    const avgX = i === 3 ? -1.7 : barX(N - 1) + 0.6
    this.lblAvg.position.set(avgX, meanY, 0)
    this.lblAvg.setOpacity(i === 5 || i === 7 ? 0 : avgOn)

    // teacher ceiling (beat 1)
    const teachOn = i === 1 ? 1 : 0
    this.teachMat.opacity = teachOn * (isLight() ? 0.9 : 0.75)
    this.lblTeacher.setOpacity(teachOn * 0.95)
    this.lblPhase.setOpacity(rd ? 0 : teachOn * 0.95)

    // policy + prompt. In light, drive a higher level (bigger, solid, visible ball);
    // in dark, keep it dim so it doesn't bloom to bright yellow.
    const pol = isLight() ? 1.15 : 0.5 + clamp01(this.mean) * 0.18
    this.policy.setLevel(pol + (rd ? 0 : Math.sin(t * 2) * 0.08))
    this.prompt.setLevel(0.55 + (rd ? 0 : Math.sin(t * 2.5) * 0.1))

    // PPO reference + tether + trust ring (beat 5); the reference also anchors DPO (beat 6)
    const refOn = i === 5 ? 1 : i === 6 ? 0.55 : 0
    this.refCore.setLevel(0.4 * refOn)
    const trustOn = i === 5 ? 1 : 0
    this.tether.setLineOpacity(0.5 * trustOn)
    this.tether.setFlowOpacity(0.85 * trustOn)
    if (trustOn) this.tether.update(dt)
    this.trustMat.opacity = 0.5 * trustOn
    if (!rd) this.trust.rotation.z += dt * 0.3 * trustOn
    this.lblRef.setOpacity(refOn > 0 ? 0.9 : 0)

    // reward-model judge (beat 4)
    const judgeOn = i === 4 ? 1 : 0
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

    // DPO probability transfer (beat 6)
    const dpoOn = i === 6 ? 1 : 0
    if (dpoOn) {
      const rTop = rewardY(this.attempts[0].reward)
      const cTop = rewardY(this.attempts[1].reward)
      const de = this.dpoEF.edges[0]
      de.a.set(DPO_XR, rTop + 0.14, 0)
      de.b.set(DPO_XC, cTop + 0.14, 0)
      this.dpoEF.update(dt)
      this.lblRejected.position.set(DPO_XR, rTop + 0.62, 0)
      this.lblChosen.position.set(DPO_XC, cTop + 0.62, 0)
    }
    this.dpoEF.setFlowOpacity(0.95 * dpoOn)
    this.lblChosen.setOpacity(dpoOn * 0.95)
    this.lblRejected.setOpacity(dpoOn * 0.95)
    this.lblPair.setOpacity(dpoOn * 0.85)
    this.lblProb.setOpacity(dpoOn * 0.7)

    // labels — on left-card beats the policy corner sits under the prose card,
    // so its pills would straddle the card edge; hide them there (beat 0 keeps
    // the approved intro framing)
    const leftCard = i > 0 && !RIGHT_CARD.has(i)
    this.lblPolicy.setOpacity(leftCard ? 0 : i <= 2 || i === 5 ? 0.9 : 0.4)
    this.lblPrompt.setOpacity(leftCard ? 0 : i <= 2 ? 0.85 : 0.3)
    this.lblReward.setOpacity(i >= 1 && i !== 6 ? 0.7 : 0)
    this.lblJudge.setOpacity(judgeOn * 0.9)
    this.lblVerify.setOpacity(i === 7 ? 0.9 : 0)
    this.lblAdv.setOpacity(i === 8 ? 0.9 : 0)
    this.lblOutcome.setOpacity(i === 9 ? 0.9 : 0)
    this.lblProcess.setOpacity(i === 9 ? 0.9 : 0)
    this.lblLucky.setOpacity(i === 9 && this._lucky ? 0.85 : 0)
  }

  dispose() {
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.lookTarget)
    super.dispose()
  }
}
