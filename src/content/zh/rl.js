export default {
  beats: [
    { side: 'left', html: `<span class="eyebrow">第 07 章 · 从奖励中学习</span>
      <h2>强化学习</h2>
      <p class="lead">预训练和微调靠<em>复制</em>固定的答案来学习。但若一个任务<strong>没有唯一正确的答案</strong>——要真正乐于助人,或是攻克一道它从未见过的难题——你又该如何教会模型?你让它<strong>尝试</strong>,为这次尝试打分,再把它朝着任何得分好的方向去推。这就是<strong>强化学习</strong>(reinforcement learning)。</p>
      <p>模型就是<strong>策略</strong>(policy):给定一个情境,它产出一个动作——在这里,是一整个答案。每一次尝试都赢得一个<strong>奖励</strong>(reward):一个为它有多好打分的数字。没有标注——只有一个分数。</p>` },
    { side: 'right', html: `<h3>这个循环:尝试、打分、轻推</h3>
      <p>强化学习是一个循环。策略生成一批尝试,每一个都被打分,而权重则被轻推,好让那些<em>得分高</em>的行为下一次更可能出现。如此重复,整批尝试便缓缓向上漂移——看着平均奖励一轮接一轮地攀升。</p>
      <p>模型从不会被告知正确答案。它只被告知自己的答案<em>有多好</em>——于是它必须<strong>探索</strong>,跌跌撞撞地撞上奏效的做法,再多做一些那样的事。</p>` },
    { side: 'left', html: `<h3>策略梯度——把奏效的推上去</h3>
      <p>你如何把一个奖励变成一次权重更新?核心的诀窍是<strong>策略梯度</strong>(policy gradient):当一次尝试所做的某个选择奖励高时,就让它<em>更</em>可能出现;奖励低时,就让它<em>更不</em>可能出现——并按分数成比例地缩放。强化赢家(<span style="color:var(--lime)">▲</span>),抑制输家(<span style="color:var(--rose)">▼</span>)。</p>
      <p>在成千上万次尝试上这样做,策略便稳稳地把它的赔率挪向那些有回报的动作。</p>
      <p class="aside">让它稳定下来的关键是一条<strong>基线</strong>(baseline)——一个用来比照的典型分数。奖励在基线<em>之上</em>就向上推;在<em>之下</em>就向下压。记住这个想法:它就是 GRPO 的全部。</p>` },
    { side: 'right', html: `<h3>奖励从何而来</h3>
      <p>对于一个明确的目标,你可以直接打分。但"这个答案<em>有用</em>吗?"却没有公式可循。于是——正如 ChatGPT 那套配方里一样——人们比较成对的答案,而这些偏好训练出一个独立的<strong>奖励模型</strong>(reward model):一个学来的<strong>裁判</strong>,它随后就能像人们当初倾向的那样,为任何一个答案打分。</p>
      <p>策略随后便朝着那个裁判练习。这就是 <strong>RLHF</strong>——基于人类反馈的强化学习——正是它头一回把一个生硬的下一个词元预测器,变成了一个乐于配合的助手。</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/rlhf">RLHF 如何运作</a></div>` },
    { side: 'left', html: `<h3>PPO——别动得太快</h3>
      <p>太贪婪地追逐奖励,模型就会崩坏:它会朝着任何能钻分数空子的方向扭曲,并忘掉该怎么写作。长久以来的那匹主力,<strong>PPO</strong>(近端策略优化),正是为防范这一点。它<strong>裁剪</strong>每一次更新,好让策略无法在一步之内猛地冲得太远,还加上一根 <strong>KL 缰绳</strong>,把它拴在它出发时那个冻结的<strong>参考模型</strong>(reference model)上。</p>
      <p>贴近你曾经的样子,改进一点点,如此重复。稳定——但沉重:PPO 还要训练第二个"价值"网络,只为了估计那条基线。</p>` },
    { side: 'right', html: `<h3>可验证的奖励——让世界来评判</h3>
      <p>对于数学、代码和逻辑,有一样东西胜过一个学来的裁判:<strong>核对答案</strong>。拿代码去跑测试;验证那道证明;比照已知的结果。奖励无非就是<strong>对或错</strong>——没有什么要训练,也没有什么可糊弄。</p>
      <p>这就是 <strong>RLVR</strong>(基于可验证奖励的强化学习),它正是当今<strong>推理模型</strong>背后的引擎:一种诚实、廉价、无法钻空子的信号,你可以在极大的规模上运行它。</p>` },
    { side: 'left', html: `<h3>GRPO——按曲线评分</h3>
      <p>如果奖励只不过是"对或错",你真的需要一整个价值网络来估计基线吗?<strong>GRPO</strong>(组相对策略优化)说不必。对于每一个问题,它采样出<strong>一组</strong>答案,把它们全部打分,再用这一组自己的<strong>平均值</strong>作为基线。</p>
      <p>每个答案的<strong>优势</strong>(advantage),无非就是它落在<em>组内平均值之上还是之下</em>有多远——胜过平均值就被强化,落于人后就被抑制。这就是按曲线评分。舍弃 PPO 的价值网络让它精简得多,它也正是近来那些开放推理模型背后的方法。</p>
      <p class="aside">这还是同一个策略梯度的想法——但基线是免费的:它无非就是同一道问题上你的那些同侪。</p>` },
    { side: 'right', html: `<h3>奖励解锁了什么</h3>
      <p>这样训练出来,模型学会了模仿从未教给它的东西。为了在难题上赢得更多奖励,它们开始<strong>思考得更久</strong>——写出长长的推理链,尝试一种思路,抓住自己的错误,回溯,再试一次。</p>
      <p>没有谁示范过这些习惯;模型<em>自己发现</em>了它们,只因它们能赢得奖励。这正是从一个仅仅作答的模型,到一个真正会<strong>推理</strong>的模型的飞跃。</p>` },
    { side: 'left', html: `<h3>整个想法</h3>
      <div class="postcard">强化学习靠奖励来训练,而不是靠复制:策略去尝试,每一次尝试都被打分——由一个学来的裁判(RLHF)或一个验证器(RLVR)——而策略梯度则把它推向奏效的做法。GRPO 为一整组答案打分,并拿每个答案去比照这一组的平均值:简单、可扩展,并支撑起当今的推理模型。</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF 深入解析</a>
        <a class="deepdive" data-route="/inference">下一章:推理 →</a>
      </div>` },
  ],
}
