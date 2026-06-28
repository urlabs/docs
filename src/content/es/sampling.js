import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Análisis a fondo · inferencia</span>
      <h2>Estrategias de muestreo</h2>
      <p class="lead">Tras el pase hacia adelante, el modelo produce una probabilidad para cada token de su vocabulario. El <strong>muestreo</strong> es el paso final: decidir qué token emitir en realidad.</p>`,
    },
    {
      html: `<h3>Voraz vs. muestreo</h3>
      <p>La decodificación <strong>voraz</strong> siempre toma el único token de mayor probabilidad. Es determinista y coherente — el mismo prompt siempre da la misma salida — pero esa previsibilidad tiene un costo: el modelo puede quedar atrapado en bucles repetitivos y rara vez se aventura más allá de lo obvio. El <strong>muestreo</strong> extrae de toda la distribución al azar, ponderado por la probabilidad. Los tokens peor clasificados todavía tienen una oportunidad, y ahí es donde entran la variedad y la creatividad.</p>`,
    },
    {
      html: `<h3>Temperatura</h3>
      <p>La temperatura T controla cuán concentrada está la masa de probabilidad antes de muestrear. Dividir cada logit por T antes del softmax agudiza la distribución cuando T es pequeña y la aplana cuando T es grande:</p>
      ${tex('p_i=\\frac{\\exp(z_i/T)}{\\sum_j \\exp(z_j/T)}', true)}
      <p>T = 1 da la distribución cruda del modelo. T &lt; 1 la hace más decidida — buena para preguntas y respuestas factuales y para código. T &gt; 1 reparte masa hacia los tokens peor clasificados — útil para la lluvia de ideas y la escritura creativa. Observa cómo las barras respiran mientras T barre.</p>`,
    },
    {
      html: `<h3>Top-k &amp; Top-p (núcleo)</h3>
      <p>Incluso con un ajuste cuidadoso de la temperatura, un vocabulario de 50,000 tokens puede asignar una probabilidad no trivial a palabras descabelladamente erróneas. El recorte de la cola las elimina antes de la extracción. <strong>Top-k</strong> conserva solo los k tokens mejor clasificados — simple, pero frágil cuando la forma de la distribución cambia de un contexto a otro. <strong>Top-p</strong> (muestreo por núcleo) conserva el conjunto más pequeño de tokens cuyas probabilidades suman al menos p, de modo que el núcleo se estrecha automáticamente cuando el modelo está seguro y se ensancha cuando tiene dudas. Un top-p en torno a 0.9 es el valor por defecto más fundamentado.</p>
      <div class="postcard">Tubería: reescalar con la temperatura &rarr; recortar la cola con top-k o top-p &rarr; extraer un token de lo que queda.</div>`,
    },
  ],
}
