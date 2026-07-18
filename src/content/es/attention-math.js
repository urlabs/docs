import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Análisis a fondo · atención</span>
      <h2>La ecuación de la atención</h2>
      <p class="lead">La atención es cómo cada token reúne contexto a partir de todos los demás tokens de la secuencia. Todo el mecanismo se reduce a una sola fórmula:</p>
      ${tex('\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V', true)}
      <p>Cada símbolo tiene una función específica. Vamos a recorrerlos en orden.</p>`,
    },
    {
      html: `<h3>Q, K, V son proyecciones</h3>
      <p>El embedding <em>x</em> de cada token se proyecta a través de tres matrices de pesos aprendidas por separado para formar una <strong>Consulta</strong>, una <strong>Clave</strong> y un <strong>Valor</strong>:</p>
      ${tex('Q = XW_Q,\\quad K = XW_K,\\quad V = XW_V', true)}
      <p class="aside">Piénsalo como una búsqueda suave en una base de datos. Q es la consulta de búsqueda que un token envía. K es la etiqueta de índice que cada token expone a los demás. V es el contenido que devuelve cuando su clave coincide. Mantener las tres separadas permite al modelo aprender cada rol de forma independiente: qué pedir, qué anunciar y qué compartir pueden especializarse todos a partir del mismo embedding crudo.</p>`,
    },
    {
      html: `<h3>Puntuaciones, escaladas, luego softmax</h3>
      <p>El producto matricial <strong>QKᵀ</strong> da una puntuación para cada par consulta-clave. Un producto escalar es grande cuando dos vectores apuntan en la misma dirección, lo que lo convierte en una medida natural de alineación. El divisor <strong>√dₖ</strong> corrige un problema de varianza: cuando q y k tienen cada uno dₖ componentes independientes, su producto escalar tiene una varianza proporcional a dₖ, así que las puntuaciones crudas en un modelo grande son mucho mayores que en uno pequeño. Dividir por √dₖ restaura la varianza unitaria y permite que <strong>softmax</strong> produzca una distribución de pesos significativa en lugar de un pico de casi cero o uno.</p>
      ${tex('\\alpha_{ij}=\\frac{\\exp(q_i\\cdot k_j/\\sqrt{d_k})}{\\sum_{j\'}\\exp(q_i\\cdot k_{j\'}/\\sqrt{d_k})}', true)}
      <p>Observa cómo las puntuaciones crudas (a la izquierda) colapsan en una distribución nítida.</p>`,
    },
    {
      html: `<h3>Suma ponderada de Valores</h3>
      <p>Los pesos de atención le dicen a cada posición cuánto tomar prestado de cada una de las demás. La salida en la posición <em>i</em> es un promedio ponderado sobre todos los vectores de Valor:</p>
      ${tex('z_i=\\sum_j \\alpha_{ij}\\,v_j', true)}
      <p>Sin el divisor √dₖ, las puntuaciones excesivas empujan al softmax hacia una salida casi one-hot: un token reclama casi todo el peso y el gradiente a través de cada otro Valor casi se desvanece. Mantener las puntuaciones cerca de la varianza unitaria asegura que la distribución de atención se mantenga lo bastante amplia para que gradientes significativos fluyan de vuelta por todas las posiciones que contribuyen durante el entrenamiento.</p>
      <div class="postcard">La atención es una matriz de puntuaciones, convertida en pesos por softmax, usada para promediar los Valores.</div>`,
    },
  ],
}
