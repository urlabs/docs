export default {
  brand: 'NET',

  hero: {
    eyebrow: 'Un viaje interactivo · 10 capítulos',
    title: 'De una sola neurona a',
    accent: 'los modelos de frontera',
    sub: 'Cómo se construyen, entrenan y ejecutan realmente los grandes modelos de lenguaje, reconstruidos desde cero como una sola historia visual y continua. Empieza sin nada de matemáticas; profundiza tanto como quieras.',
    begin: 'Comienza el viaje →',
    legend: 'Lee la leyenda',
    hint: '✦ cada punto luminoso es un capítulo — pasa el cursor y haz clic para entrar',
  },

  nav: {
    prev: 'anterior',
    next: 'siguiente',
    keyhint: 'usa las teclas ← → para moverte',
    scroll: 'desplázate',
    back: '← volver al viaje',
  },

  legend: {
    eyebrow: 'Cómo leer esto',
    title: 'El lenguaje visual',
    intro: 'Un solo vocabulario, usado en cada capítulo. Apréndelo una vez y todo el viaje se lee con claridad.',
    done: 'Entendido',
    rows: [
      ['● nodo', 'Una unidad: una neurona, un token o un vector.'],
      ['— arista', 'Un peso. Brillo = magnitud; tono = signo (cian +, magenta −).'],
      ['·→ flujo', 'Partículas que fluyen por una arista = datos avanzando.'],
      ['✦ resplandor', 'El brillo de un nodo = con qué intensidad está activado.'],
      ['↑ arriba', 'Más alto = más profundo en la red / más adelante en la pila.'],
      ['◀ onda', 'Una onda de luz inversa = retropropagación (la culpa fluyendo hacia atrás).'],
      ['⛰ terreno', 'Un paisaje ondulado = la superficie de pérdida. Los valles = error bajo.'],
      ['╱ haz', 'Un haz entre dos tokens = atención. Brillante = fuerte; color = cabezal.'],
      ['▭ cinta', 'Una cinta que crece hacia los lados = la caché KV (la memoria a corto plazo del modelo).'],
      ['▮ barras', 'Un campo de barras = una distribución de probabilidad sobre el siguiente token.'],
    ],
  },

  // chapter id → { title, short } for the spine + counter
  chapters: {
    map: { title: 'El mapa', short: 'Mapa' },
    neuron: { title: 'La neurona', short: 'Neurona' },
    training: { title: 'El aprendizaje', short: 'Aprendizaje' },
    embeddings: { title: 'El significado como geometría', short: 'Embeddings' },
    attention: { title: 'La atención', short: 'Atención' },
    transformer: { title: 'El Transformer', short: 'Transformer' },
    pretraining: { title: 'Preentrenamiento → ChatGPT', short: 'Entrenamiento' },
    rl: { title: 'Aprendizaje por refuerzo', short: 'RL' },
    inference: { title: 'La inferencia', short: 'Inferencia' },
    retrieval: { title: 'Conocimiento y recuperación', short: 'Recuperación' },
    frontier: { title: 'LLM de frontera', short: 'Frontera' },
  },

  a11y: {
    theme: 'Alternar tema claro u oscuro',
    legend: 'Abrir la leyenda visual',
    language: 'Elegir idioma',
  },
}
