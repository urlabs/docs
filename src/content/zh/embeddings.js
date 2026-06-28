export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">第 03 章 · 把词变成数字</span>
      <h2>词是如何进入的</h2>
      <p class="lead">说到底,一个神经网络只是算术——加法和乘法,运行数十亿次。它读不懂一个字母;它只能咀嚼<strong>数字</strong>。所以最最首要的工作,就是把语言变成它能处理的数字。</p>
      <p>文本被切分成一个个<span class="tok">词元</span>(token)——词的小块,每块或是一个完整的词,或是一个词的一部分。每个词元都有一个 <strong>ID</strong>:它在模型训练时建起的那张巨大查找表中的行号。读出那一行,你就得到一串数字——这个词元的<strong>向量</strong>,也叫它的<strong>嵌入</strong>(embedding)。流入网络第一层的,正是这些向量。</p>
      <p>那张表并不是手敲进去的。它是一整块<strong>权重</strong>——词汇表里每个词元对应一行——和模型里其他每一个数字一样,都是在训练中学来的。而挑出一行本身也只是算术:这和拿整张表去乘以一个除单个 <strong>1</strong> 以外全是零的向量,完全是一回事。一次查找,就是一次乔装打扮的乘法。</p>
      <p class="aside">文本 → 词元 → ID → 向量 → 进入第一层。</p>`,
    },
    {
      side: 'left',
      html: `<h3>图像也一样</h3>
      <p>同样的技巧也适用于图像。一张图片被切成一格格小小的<strong>图块</strong>(patch)——一个个小方块——每个图块都被展平成它自己的一串数字,一个和词元一模一样的向量。</p>
      <p>这一展平藏起了一个步骤:那些原始的像素数字会穿过一个学来的<strong>投影</strong>(projection)——一个小矩阵——它把每个图块的尺寸调整到模型的向量长度。只有到那时,一块像素才能和一个词向量逐维对齐。</p>
      <p>所以,无论它最初是一个词,还是一小方块像素,所有东西抵达网络时都是同一种东西:<em>一串数字组成的向量</em>。这正是同一个模型既能读文本<em>又</em>能看图像的原因——等它们抵达时,已经说着同一种语言了。</p>`,
    },
    {
      side: 'center',
      html: `<h3>意义即几何</h3>
      <p class="lead">精彩的部分来了。一个向量不过是<strong>空间中的一个点</strong>——而训练会按<em>意义</em>来安排这个空间。</p>
      <p>向量里的每个数字都是一个坐标。两个数字在地图上钉住一个点;三个数字把它安放进一个房间里。一个真实的嵌入携带的远不止这些——通常有 <strong>768</strong> 个数字,在最大的那些模型里更有好几<strong>千</strong>个(4096 起步)。那是几百个<strong>维度</strong>,超出任何人头脑所能想象——所以我们把它压缩到我们能画出来的那三个。</p>
      <p>词汇表里的每一个词都变成一个点,而整个词汇表就变成了一片星系。一个点坐落在哪里,<em>就是</em>模型对那个词所理解的含义。</p>
      <p class="aside">这里的星系是一道<em>影子</em>——一个有着几百条轴的空间的三维投影。真正的距离与角度活在那上面;这幅图画只是隐约透露了它们。</p>`,
    },
    {
      side: 'right',
      html: `<h3>相似的事物聚在一起</h3>
      <p>出现在相似环境里的词,最终会落在相似的位置。于是 <span class="tok">cat</span>、<span class="tok">dog</span> 和 <span class="tok">lion</span> 安顿进同一个邻里——而 <span class="tok">paris</span>、<span class="tok">tokyo</span> 和 <span class="tok">cairo</span> 则在另一处聚拢。</p>
      <p>怎么做到的?在训练中,模型读入海量的文本,不断地根据邻词去猜测一个词。每一次猜错,都会把一个修正向后传去——正是上一章里那套<strong>反向传播</strong>——让嵌入表的那些行挪动一丝一毫。以相同方式使用的词,会被一次又一次地拽向同一个位置,直到相关的词彼此堆叠在一起。没有谁来安放它们;这些位置是自行排列出来的。</p>
      <p>靠近,到底有多近?这要靠<strong>余弦相似度</strong>(cosine similarity)来精确刻画——两个向量夹角的余弦,它只在乎方向,不在乎长度。指向相同的方向,它读出约 <strong>1</strong>;成直角相对,它就跌到 <strong>0</strong>。<span class="tok">cat</span> 和 <span class="tok">dog</span> 得分很高;<span class="tok">cat</span> 和 <span class="tok">tokyo</span> 则沉向零。</p>
      <p class="aside">没有谁把这些分组标注成"动物"或"城市"。这种靠近本身<em>就是</em>模型自己琢磨出来的意义。</p>`,
    },
    {
      side: 'left',
      html: `<h3>方向承载意义</h3>
      <p>重要的不只是一个点坐落在<em>何处</em>——从一个点到另一个点的<em>方向</em>同样承载着意义。那个著名的例子:</p>
      <p class="lead"><strong>king − man + woman ≈ queen</strong></p>
      <p>从 <span class="tok">man</span> 到 <span class="tok">woman</span> 的这一步,和从 <span class="tok">king</span> 到 <span class="tok">queen</span> 是同一步——这个空间已经排列出了一个稳定的"切换性别"方向。沿着那个箭头从 <em>king</em> 走出去,你正好落在 <em>queen</em> 所在的地方。你可以<em>对意义做算术</em>。</p>
      <p>而且不只是性别。一个"复数"方向、一个"首都是"方向、一个"过去时"方向——每一个都是一段大致恒定的偏移量,你把它加到一个词上,就能抵达另一个词。原来,意义有着一种部分<strong>线性</strong>的形状,而这并非任何人设计出来的。</p>
      <p class="aside">老实说,这个和很少正好落在 <em>queen</em> 上——你取的是离你抵达之处最近的那个点,而那些最齐整的例子,也多少是精挑细选过的。但这些方向是真实的:关系确实以可复现的偏移量的形式存在着。</p>`,
    },
    {
      side: 'right',
      html: `<h3>我们的句子,被嵌入</h3>
      <p>回到我们贯穿全程的那一行——<em>"The cat sat on the mat because it was tired."</em>。每个词元都离开原点,飞向属于它自己的那个点:这就是句子正在被<strong>嵌入</strong>。</p>
      <p>这些向量正是之后每一章开始的地方——但它们仍是生的,而且<strong>不依赖语境</strong>。每个词元都得到一个固定的点,无论它出现多少次、旁边坐着什么,都一模一样:河<span class="tok">bank</span>(岸)和存你现金的<span class="tok">bank</span>(银行)共用着同一个向量。在一个模型能够<em>思考</em>词语之前,它必须先<strong>安放</strong>它们——而到目前为止,所发生的就只有这些。</p>
      <p class="aside">这些生的嵌入是<em>静态</em>的——每个词元一个向量,在任何语境之前就已固定。下一章的<strong>注意力</strong>会让它们变得<em>依赖语境</em>:一个词的表示成为它周围词语的函数,于是河岸的 <span class="tok">bank</span> 和钱财的 <span class="tok">bank</span> 终于分道扬镳。</p>`,
    },
    {
      side: 'left',
      html: `<h3>意义的几何</h3>
      <div class="postcard">词语和图像都会变成向量——一个学来的空间中的点,其中靠近(它们之间的夹角)意味着相似,方向意味着关系。这个空间是模型自己从生文本中安排出来的。它是之后每一章赖以立足的地基——尽管每个词仍孤零零地坐在那里,不依赖语境,直到注意力让它们彼此交融。</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/tokenization">分词是如何工作的</a>
        <a class="deepdive" data-route="/attention">下一章:注意力 →</a>
      </div>`,
    },
  ],
}
