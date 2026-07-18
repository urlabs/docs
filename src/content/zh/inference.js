export default {
  beats: [
    { side: 'left', html: `<span class="eyebrow">第 08 章 · 它如何回答你</span>
      <h2>推理</h2>
      <p class="lead">训练结束了,权重也就此永久冻结。<strong>推理</strong>就是把这个完工的模型投入使用——每一次你按下发送时所运行的东西。在底下,它无非是一个循环,<strong>一次一个词元</strong>地把回复写出来。</p>
      <p>最底部坐着你的<span class="tok">提示词</span>,被切成一个个词元。它向上流入模型核心,而核心唯一的工作,就是给下一个该出现的词元打分。</p>` },
    { side: 'right', html: `<h3>预填充——一次把它全部读完</h3>
      <p>在写下一个词之前,模型会在单独一趟并行的处理中把你<em>整个</em>提示词处理一遍——所有词元同时进行。这就是<strong>预填充</strong>(prefill),在它运行时,每个词元都会在自己正上方留下一小捆算好的数字:它的 <strong>K</strong> 和 <strong>V</strong>——也就是注意力那一章里的键和值。</p>
      <p>这正是为什么一段长提示词会让你在回复开始前等上一拍:预填充要读的东西就是更多。你感觉到的那一顿,就是<span class="tok">首词元生成时间</span>。</p>
      <p class="aside">预填充是计算密集型的——对整个提示词一次性地、以矩阵为主地大跑一趟。</p>` },
    { side: 'left', html: `<h3>logits → softmax</h3>
      <p>核心并不挑选一个词。它为词汇表里的每一个词元——成千上万个——各发出一个原始分数,一个 <strong>logit</strong>。随后 <strong>softmax</strong> 把这些分数压成加起来等于 1 的干净概率:一个关于下一个词的完整<strong>分布</strong>。</p>
      <p>在 <span class="tok">…&nbsp;sat on the</span> 之后,有一根柱条高高耸出其余——<span class="tok">mat</span>——可几乎每一个别的词,都仍保留着一丝渺茫的机会。</p>` },
    { side: 'right', html: `<h3>温度 &amp; 采样</h3>
      <p>现在,从这些赔率里<strong>采样</strong>出一个词元。有一个旋钮,也就是<strong>温度</strong>(temperature),会先把它们重新塑形:在 softmax 之前,每个 logit 都被除以 T。<span style="color:var(--lime)">低 T</span> 会锐化峰值——在 T→0 时它变得<em>贪心</em>,总是取走最靠前的那个词元。<span style="color:var(--amber)">高 T</span> 会压平曲线,给更稀有的词一个真正的机会。看着柱条随 T 的转动而呼吸起伏。</p>
      <p class="aside">温度重塑整条曲线;而 <span class="tok">top-k</span> 和 <span class="tok">top-p</span> 则是在抽取之前,把不太可能的尾巴砍掉。不同的旋钮,常常组合在一起使用。</p>` },
    { side: 'left', html: `<h3>追加,然后回灌</h3>
      <p>被采样出的词元落下来,加入这个序列——并立刻成为下一次预测的输入的一部分。看这个循环闭合起来:<em>打分 → 采样 → 追加 → 打分……</em>一个句子在自己写自己。</p>
      <p>每个新词元只做一丁点新鲜的工作:它算出自己的 K 和 V,然后注意已经缓存下来的一切。这个循环一直运行,直到模型抽到一个特殊的<strong>停止</strong>词元——这是它表示"我说完了"的方式。</p>` },
    { side: 'right', html: `<h3>KV 缓存——它为何能保持飞快</h3>
      <p>让这一切变得实用的诀窍在这里。一个词元的 K 和 V 一旦算出便永不改变——于是模型把它们<strong>留存下来</strong>,而不是重新计算。那一堆存下来的东西,就是 <strong>KV 缓存</strong>,而堆叠在每个词元上方的那些格子,<em>就是</em>这个缓存。</p>
      <p>没有它,每个新词元都得从头把整段文字重新处理一遍,工作量按长度的平方堆积起来——<span class="tok">O(n²)</span>。有了它,每一步只添加一列,再读取其余的部分——大致平坦,<span class="tok">每词元 O(n)</span>。左边的计量表显示着这道差距在不断拉大。</p>
      <p class="aside">这个缓存也是为什么长对话会花掉更多内存:它随每一个词元增长,而模型在每一步都要把它整个读一遍。</p>` },
    { side: 'left', html: `<h3>这个循环</h3>
      <div class="postcard">推理是一个循环:预填充提示词,为每一个词元打分(logits → softmax),采样出一个,把它追加上去,如此重复——同时由 KV 缓存留存过去的工作,好让每一步都保持廉价。</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/sampling">采样</a>
        <a class="deepdive" data-route="/frontier">下一章:前沿 →</a>
      </div>` },
  ],
}
