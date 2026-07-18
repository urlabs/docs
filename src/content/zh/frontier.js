export default {
  beats: [
    { side: 'center', html: `<span class="eyebrow">第 10 章 · 我们如今走到了哪里</span>
      <h2>前沿 LLM</h2>
      <p class="lead">你已经建好了那个核心。今天的<strong>前沿模型</strong>——当下运行中最强大的那些系统——正是同一个核心:<span class="tok">嵌入</span>把词元变成向量,<span class="tok">注意力</span>让它们交换含义,堆叠起来的区块增添深度,而整台机器一次预测一个词元。</p>
      <p>底下并没有偷偷塞进任何新东西。改变的是<strong>规模</strong>——多得多的参数、数据和算力,恰如缩放定律所预言的——再加上叠在顶上的五项升级。本章会逐一探访它们,然后回溯整段旅程。</p>` },
    { side: 'left', html: `<h3>专家混合</h3>
      <p>设想一所满是专科医生的医院,而不是一个疲惫不堪的全科大夫。<strong>专家混合</strong>(mixture of experts)用许多个更小的<strong>专家</strong>网络,替换掉区块里那一个前馈层,再加上一个小小的<strong>路由器</strong>,它读取每个词元,只把它送往最靠前的那一两个专家。其余的则保持熄灭。</p>
      <p>这就是<span class="tok">稀疏激活</span>(sparse activation):模型的<em>总</em>参数量可以膨胀到数万亿,而每个词元的<em>活跃</em>参数量却保持得很小——一颗大得多的大脑,运行起来的代价却大致相同。路由器本身也是学来的(一个 softmax 门控),会被轻轻推动着去分摊负载,好让没有哪个专家被累垮或被饿着。</p>` },
    { side: 'right', html: `<h3>长上下文——以及它为何昂贵</h3>
      <p><strong>上下文窗口</strong>(context window)就是模型一次能看到的全部:它的工作记忆。早期的模型只能容纳几千个词元;今天的能容纳<strong>几十万个</strong>——一整本书、一份长长的对话记录、一整个代码库,尽收眼底。</p>
      <p>但注意力会拿<em>每个词元和其他每个词元</em>相比较,所以工作量随长度的<strong>平方</strong>增长:词元翻一倍,代价就翻两番。看这张网格——那场 N×N 的暴涨,加上不断喂养它的、越来越大的 KV 缓存,才是一段长记忆真正的代价,也是前沿工程大量心血的去处。</p>` },
    { side: 'left', html: `<h3>多种感官,同一个空间</h3>
      <p><strong>多模态</strong>(multimodal)意味着多种输入,同一个模型。能被你切成词元的不只是文本:一张<span style="color:var(--amber)">图像</span>会被切成一个个方形图块,<span style="color:var(--violet)">音频</span>则被切成一段段短促的声音窗口。每一片都会穿过一个小小的、学来的投影,把它降落到与<span style="color:var(--cyan)">词语</span><em>相同</em>的向量空间里。</p>
      <p>一旦一块照片图块和一个词都只是那一个共享空间里的词元,你早已理解的那套一模一样的注意力,就能把它们放在<em>一起</em>掂量——一幅画和一个句子,化作一道连绵不断的思绪。</p>` },
    { side: 'right', html: `<h3>回答之前先思考</h3>
      <p>面对一道难题,脱口而出第一个词元是个糟糕的策略。于是模型被训练去<strong>先思考</strong>——去写下一段私下的<em>思维链</em>(chain of thought):一张写满步骤、尝试,以及需要放弃的<span style="color:var(--magenta)">死胡同</span>的草稿纸,这一切都在可见的答案之前。</p>
      <p>它们通过在答案可核验的问题上做<strong>强化学习</strong>,学会好好思考:尝试许多次,强化那条抵达正确结果的推理。而令人意外的是——<span class="tok">测试时计算</span>(test-time compute)——仅仅是让模型在推理时花<em>更多</em>词元去思考,就可靠地换来更好的答案。还是那台预测下一个词元的机器,如今在开口之前先转向了内心;思考预算用延迟换来了准确。</p>` },
    { side: 'left', html: `<h3>工具 &amp; 智能体</h3>
      <p>一个模型单凭自己,只能产出文本。但那段文本可以是一条<strong>指令</strong>:<span style="color:var(--amber)">搜索网络</span>、<span style="color:var(--rose)">运行一些代码</span>、<span style="color:var(--blue)">编辑一个文件</span>。一套外壳程序会运行这个工具,再把<span style="color:var(--lime)">结果</span>作为新鲜的上下文喂回来。</p>
      <p>把这一切包进一个循环——决定一个动作、执行它、观察结果、再决定下一个——模型就成了一个<strong>智能体</strong>(agent):一个一步一步追求目标的系统,而不是一次性给出答案。它依然是纯粹的下一个词元预测;只不过如今,这份记录里也包含了世界写回来的话。</p>` },
    { side: 'right', html: `<h3>整段旅程</h3>
      <p>退后一步看,这一切不过是同一个想法在徐徐展开。单个<span class="tok">神经元</span>给它的输入加权。<span class="tok">注意力</span>让词元共享含义。<span class="tok">Transformer</span> 把这一切堆叠出深度。<span class="tok">训练</span>用数据塑造权重;<span class="tok">推理</span>则运行它们,写出下一个词元。本章中的一切,都是那同一块地基——被放大,并指向了世界。</p>
      <div class="postcard">一个前沿模型,就是你建好的那个 Transformer 核心——只是规模更大,配上稀疏的专家、浩瀚的上下文、多种感官、可被教会的推理,以及在世界中行动的工具。</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/">重温这段旅程 ↺</a><a class="deepdive" data-route="/attention">回顾注意力</a></div>` },
  ],
}
