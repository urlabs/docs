import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">深入解析 · 注意力</span>
      <h2>注意力方程</h2>
      <p class="lead">注意力,就是每个词元从序列中其他每一个词元那里汇集上下文的方式。整套机制归结为一个公式:</p>
      ${tex('\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V', true)}
      <p>每一个符号都有它特定的职责。让我们按顺序一一走过。</p>`,
    },
    {
      html: `<h3>Q、K、V 都是投影</h3>
      <p>每个词元的嵌入 <em>x</em> 会分别穿过三个学到的权重矩阵,生成一个<strong>查询</strong>(Query)、一个<strong>键</strong>(Key)和一个<strong>值</strong>(Value):</p>
      ${tex('Q = XW_Q,\\quad K = XW_K,\\quad V = XW_V', true)}
      <p class="aside">把它想成一次柔性的数据库查找。Q 是一个词元发出的搜索查询。K 是每个词元向其他词元亮出的索引标签。V 是当它的键被匹配上时它递回的内容。让这三者各自分开,能让模型独立地学到每个角色:该索要什么、该宣传什么、以及该分享什么,都可以从同一份原始嵌入中被各自专门化。</p>`,
    },
    {
      html: `<h3>分数、缩放,然后 softmax</h3>
      <p>矩阵乘积 <strong>QKᵀ</strong> 为每一个查询-键对给出一个分数。当两个向量指向同一方向时点积很大,这使它成为一种天然的对齐度量。除数 <strong>√dₖ</strong> 纠正了一个方差问题:当 q 和 k 各自有 dₖ 个相互独立的分量时,它们的点积方差正比于 dₖ,所以一个大模型里的原始分数会远远大于一个小模型里的。除以 √dₖ 让方差恢复到单位量级,从而让 <strong>softmax</strong> 产生一个有意义的权重分布,而不是一个几乎非零即一的尖峰。</p>
      ${tex('\\alpha_{ij}=\\frac{\\exp(q_i\\cdot k_j/\\sqrt{d_k})}{\\sum_{j\'}\\exp(q_i\\cdot k_{j\'}/\\sqrt{d_k})}', true)}
      <p>看着原始分数(左侧)塌缩成一个尖锐的分布。</p>`,
    },
    {
      html: `<h3>值的加权和</h3>
      <p>注意力权重告诉每个位置,该从其他每一个位置借取多少。位置 <em>i</em> 处的输出,是对所有值向量的一次加权平均:</p>
      ${tex('z_i=\\sum_j \\alpha_{ij}\\,v_j', true)}
      <p>若没有 √dₖ 这个除数,过大的分数会把 softmax 推向一个近乎独热的输出:一个词元几乎占去全部权重,而穿过其他每一个值的梯度则几近消失。让分数保持在单位方差附近,能确保注意力分布足够宽,从而在训练时让有意义的梯度回流经过所有做出贡献的位置。</p>
      <div class="postcard">注意力就是一个分数矩阵,经 softmax 变成权重,再用来对值做加权平均。</div>`,
    },
  ],
}
