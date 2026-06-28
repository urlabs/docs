// The journey, in order. Each entry lazily imports its chapter module so chapters
// are code-split — a reader on Ch.1 never downloads Ch.8's bundle.
//
// A chapter module exports:
//   default : a Chapter subclass
//   beats   : [{ side?, html }]   the scrolling prose (length = number of steps)
//   layout  : 'hero' | 'chapter'  (optional, default 'chapter')

export const CHAPTERS = [
  { id: 'map', route: '/', index: 0, title: 'The Map', short: 'Map', loader: () => import('./00-map/index.js') },
  { id: 'neuron', route: '/neuron', index: 1, title: 'The Neuron', short: 'Neuron', loader: () => import('./01-neuron/index.js') },
  { id: 'training', route: '/training', index: 2, title: 'Learning', short: 'Learning', loader: () => import('./02-training/index.js') },
  { id: 'embeddings', route: '/embeddings', index: 3, title: 'Meaning as Geometry', short: 'Embeddings', loader: () => import('./03-embeddings/index.js') },
  { id: 'attention', route: '/attention', index: 4, title: 'Attention', short: 'Attention', loader: () => import('./04-attention/index.js') },
  { id: 'transformer', route: '/transformer', index: 5, title: 'The Transformer', short: 'Transformer', loader: () => import('./05-transformer/index.js') },
  { id: 'pretraining', route: '/pretraining', index: 6, title: 'Pretraining → ChatGPT', short: 'Training', loader: () => import('./06-pretraining/index.js') },
  { id: 'rl', route: '/rl', index: 7, title: 'Reinforcement Learning', short: 'RL', loader: () => import('./07-rl/index.js') },
  { id: 'inference', route: '/inference', index: 8, title: 'Inference', short: 'Inference', loader: () => import('./08-inference/index.js') },
  { id: 'retrieval', route: '/retrieval', index: 9, title: 'Knowledge & Retrieval', short: 'Retrieval', loader: () => import('./09-retrieval/index.js') },
  { id: 'frontier', route: '/frontier', index: 10, title: 'Frontier LLMs', short: 'Frontier', loader: () => import('./10-frontier/index.js') },
]

export const DEEPDIVES = [
  { id: 'tokenization', route: '/deep/tokenization', title: 'Tokenization (BPE)', loader: () => import('../deep/tokenization/index.js') },
  { id: 'attention-math', route: '/deep/attention-math', title: 'The Attention Equation', loader: () => import('../deep/attention-math/index.js') },
  { id: 'sampling', route: '/deep/sampling', title: 'Sampling Strategies', loader: () => import('../deep/sampling/index.js') },
  { id: 'rlhf', route: '/deep/rlhf', title: 'RLHF', loader: () => import('../deep/rlhf/index.js') },
]

const BY_ROUTE = new Map([...CHAPTERS, ...DEEPDIVES].map((e) => [e.route, e]))

export function findEntry(route) {
  return BY_ROUTE.get(route) || null
}

export function isDeepDive(entry) {
  return entry?.route?.startsWith('/deep/')
}
