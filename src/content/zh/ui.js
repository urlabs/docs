// Simplified Chinese (zh) UI strings. Same shape and keys as content/en/ui.js.
// Legend row symbols are universal and kept unchanged; only descriptions translated.
export default {
  brand: 'NET',

  hero: {
    eyebrow: '一段互动旅程 · 10 个章节',
    title: '从单个神经元到',
    accent: '前沿模型',
    sub: '大语言模型究竟是如何被构建、训练与运行的——从零开始,重新讲述为一个连续、可视化的故事。无需任何数学基础即可开始,想深入多少都可以。',
    begin: '开启旅程 →',
    legend: '阅读图例',
    hint: '✦ 每个发光的路标都是一个章节——悬停并点击即可进入',
  },

  nav: {
    prev: '上一步',
    next: '下一步',
    keyhint: '使用 ← → 键移动',
    scroll: '滚动',
    back: '← 返回旅程',
  },

  legend: {
    eyebrow: '如何阅读本站',
    title: '视觉语言',
    intro: '一套词汇,贯穿每一章。学会一次,整段旅程都能清晰阅读。',
    done: '明白了',
    rows: [
      ['● 节点', '一个单元:一个神经元、一个词元(token)或一个向量。'],
      ['— 边', '一个权重。亮度 = 大小;色相 = 符号(青色 +,品红 −)。'],
      ['·→ 流动', '沿着边流动的粒子 = 数据正在向前传播。'],
      ['✦ 辉光', '节点的亮度 = 它被激活的强度。'],
      ['↑ 向上', '越高 = 越深入网络 / 越靠后的层。'],
      ['◀ 波', '一道反向的光波 = 反向传播(误差责任向回流动)。'],
      ['⛰ 地形', '起伏的地貌 = 损失曲面。山谷 = 低误差。'],
      ['╱ 光束', '两个词元之间的光束 = 注意力。越亮 = 越强;颜色 = 注意力头。'],
      ['▭ 缎带', '横向生长的缎带 = KV 缓存(模型的短期记忆)。'],
      ['▮ 柱条', '一排柱条 = 下一个词元的概率分布。'],
    ],
  },

  // chapter id → { title, short } for the spine + counter
  chapters: {
    map: { title: '地图', short: '地图' },
    neuron: { title: '神经元', short: '神经元' },
    training: { title: '学习', short: '学习' },
    embeddings: { title: '意义即几何', short: '嵌入' },
    attention: { title: '注意力', short: '注意力' },
    transformer: { title: 'Transformer', short: 'Transformer' },
    pretraining: { title: '预训练 → ChatGPT', short: '训练' },
    rl: { title: '强化学习', short: 'RL' },
    inference: { title: '推理', short: '推理' },
    retrieval: { title: '知识与检索', short: '检索' },
    frontier: { title: '前沿 LLM', short: '前沿' },
  },

  a11y: {
    theme: '切换浅色或深色主题',
    legend: '打开视觉图例',
    language: '选择语言',
  },
}
