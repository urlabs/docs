import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">深入解析 · 推理</span>
      <h2>采样策略</h2>
      <p class="lead">在前向传播之后,模型为它词汇表中的每一个词元输出一个概率。<strong>采样</strong>是最后一步:决定真正吐出哪一个词元。</p>`,
    },
    {
      html: `<h3>贪心 vs. 采样</h3>
      <p><strong>贪心</strong>(greedy)解码总是挑出概率最高的那单个词元。它是确定性的,也是连贯的——同一条提示词总是产出同样的输出——但这种可预测性是有代价的:模型可能卡在重复的循环里,而且很少冒险走出显而易见的选择。<strong>采样</strong>则按概率加权,从整个分布里随机抽取。排名较低的词元仍然有机会,而多样性与创造力正是从这里进来的。</p>`,
    },
    {
      html: `<h3>温度</h3>
      <p>温度 T 控制着在你采样之前,概率质量有多集中。在 softmax 之前把每个 logit 除以 T,会在 T 小时锐化分布,在 T 大时把它展平:</p>
      ${tex('p_i=\\frac{\\exp(z_i/T)}{\\sum_j \\exp(z_j/T)}', true)}
      <p>T = 1 给出模型的原始分布。T &lt; 1 让它更果断——适合事实性的问答和代码。T &gt; 1 把质量摊向排名较低的词元——对头脑风暴和创意写作很有用。看着柱条随 T 的扫动而呼吸。</p>`,
    },
    {
      html: `<h3>Top-k &amp; Top-p(核采样)</h3>
      <p>即便仔细调好了温度,一套 50,000 个词元的词汇表仍可能把不可忽视的概率放到一些大错特错的词上。修剪尾部会在抽取之前把它们剪掉。<strong>Top-k</strong> 只保留排名最高的 k 个词元——简单,但当分布形状随上下文变化时就很脆弱。<strong>Top-p</strong>(核采样)保留概率之和至少达到 p 的那个最小词元集合,于是当模型有把握时这个核会自动收窄,在它没把握时则会放宽。Top-p 取 0.9 左右,是更有原则的默认值。</p>
      <div class="postcard">流水线:用温度重新缩放 &rarr; 用 top-k 或 top-p 修剪尾部 &rarr; 从剩下的里抽出一个词元。</div>`,
    },
  ],
}
