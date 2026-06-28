// English UI strings — the canonical set. Each other language provides the same
// shape in content/<lang>/ui.js. Symbols in legend rows are universal; translate
// only the descriptions.
export default {
  brand: 'NET',

  hero: {
    eyebrow: 'An interactive journey · 10 chapters',
    title: 'From a single neuron to',
    accent: 'frontier models',
    sub: 'How large language models are actually built, trained, and run — rebuilt from the ground up as one continuous, visual story. Start with zero math; go as deep as you like.',
    begin: 'Begin the journey →',
    legend: 'Read the legend',
    hint: '✦ each glowing waypoint is a chapter — hover and click to jump in',
  },

  nav: {
    prev: 'prev',
    next: 'next',
    keyhint: 'use ← → keys to move',
    scroll: 'scroll',
    back: '← back to the journey',
  },

  legend: {
    eyebrow: 'How to read this',
    title: 'The Visual Language',
    intro: 'One vocabulary, used in every chapter. Learn it once and the whole journey reads cleanly.',
    done: 'Got it',
    rows: [
      ['● node', 'A unit: a neuron, a token, or a vector.'],
      ['— edge', 'A weight. Brightness = magnitude; hue = sign (cyan +, magenta −).'],
      ['·→ flow', 'Particles streaming along an edge = data moving forward.'],
      ['✦ glow', 'A node’s brightness = how strongly it is activated.'],
      ['↑ up', 'Higher = deeper into the network / later in the stack.'],
      ['◀ wave', 'A reverse wave of light = backpropagation (blame flowing back).'],
      ['⛰ terrain', 'An undulating landscape = the loss surface. Valleys = low error.'],
      ['╱ beam', 'A beam between two tokens = attention. Bright = strong; color = head.'],
      ['▭ ribbon', 'A sideways-growing ribbon = the KV cache (the model’s short-term memory).'],
      ['▮ bars', 'A field of bars = a probability distribution over the next token.'],
    ],
  },

  // chapter id → { title, short } for the spine + counter
  chapters: {
    map: { title: 'The Map', short: 'Map' },
    neuron: { title: 'The Neuron', short: 'Neuron' },
    training: { title: 'Learning', short: 'Learning' },
    embeddings: { title: 'Meaning as Geometry', short: 'Embeddings' },
    attention: { title: 'Attention', short: 'Attention' },
    transformer: { title: 'The Transformer', short: 'Transformer' },
    pretraining: { title: 'Pretraining → ChatGPT', short: 'Training' },
    rl: { title: 'Reinforcement Learning', short: 'RL' },
    inference: { title: 'Inference', short: 'Inference' },
    retrieval: { title: 'Knowledge & Retrieval', short: 'Retrieval' },
    frontier: { title: 'Frontier LLMs', short: 'Frontier' },
  },

  a11y: {
    theme: 'Toggle light or dark theme',
    legend: 'Open visual legend',
    language: 'Choose language',
  },
}
