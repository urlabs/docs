import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">深入解析 · 预训练</span>
      <h2>RLHF</h2>
      <p class="lead">一个预训练好的模型,学会的是在整个网络上预测下一个词元——它擅长续写文本,但既愿意补全一句有用的话,也同样愿意补全一句有害的话。<strong>基于人类反馈的强化学习(Reinforcement Learning from Human Feedback,RLHF)</strong>正是那个三阶段的配方,它把一个原始的预测器变成一个真正有用、能领会意图的模型。</p>`,
    },
    {
      html: `<h3>1 · 监督微调(SFT)</h3>
      <p>在任何强化学习之前,模型需要先学会"乐于助人"这种<em>腔调</em>。人类承包者撰写理想的提示词与回应配对——一个问题,配上一个清晰、结构良好的答案——基础模型则用普通的交叉熵损失在它们上面微调。<strong>SFT</strong> 教会模型遵循指令、紧扣主题,并去回应,而不只是续写。可以把它想成在获得自主权之前的学徒期。</p>`,
    },
    {
      html: `<h3>2 · 训练一个奖励模型</h3>
      <p>人类没法给每一个梯度步骤打分,所以我们训练一个替身。给定一条提示词,SFT 模型生成若干个候选答案;人类评分者对它们<strong>排序</strong>,而不是打分——排序比给出原始数字更快,也更一致。随后训练一个独立的<strong>奖励模型</strong>(通常就是带一个标量输出头的 SFT 模型),让它通过一个比较损失去复现那些排序:每当评分者偏好 A 胜过 B,奖励模型就必须给 A 打一个比 B 更高的分。</p>
      <p class="aside">这里,答案 A 比 B 更受偏好;奖励模型学着给 A 打更高的分。</p>`,
    },
    {
      html: `<h3>3 · 用强化学习优化</h3>
      <p>SFT 模型——如今被称为<strong>策略</strong>(policy)——会被微调,以在新的提示词上最大化奖励模型给出的分数。若不加约束,它很快就会学会糊弄奖励模型:产出听上去流畅、得分很高,却几乎言之无物的文本(<em>奖励作弊</em>,reward hacking)。一个 <strong>KL 惩罚</strong>能阻止这一点,它会因策略偏离原始 SFT 模型太远而惩罚它,把它拴在一根短绳上:</p>
      ${tex('\\max_{\\pi}\\; \\mathbb{E}\\big[\\,r(x,y)\\,\\big]\\;-\\;\\beta\\,\\mathrm{KL}\\!\\left(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\right)', true)}
      <p><strong>PPO</strong>(近端策略优化,Proximal Policy Optimization)通过从策略中采样出新鲜的回应、并施加裁剪过的梯度更新,来优化这个目标。<strong>DPO</strong>(直接偏好优化,Direct Preference Optimization)是一个更简单的离线替代方案,它完全跳过显式的奖励模型,直接从人类的排序数据中导出训练信号。</p>
      <div class="postcard">RLHF:模仿好答案,学习人类偏好,然后牵着短绳朝它优化。</div>`,
    },
  ],
}
