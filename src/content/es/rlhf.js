import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Análisis a fondo · preentrenamiento</span>
      <h2>RLHF</h2>
      <p class="lead">Un modelo preentrenado aprende a predecir el siguiente token a lo largo de la web — brillante para continuar texto, pero igual de dispuesto a completar una frase dañina que una útil. El <strong>aprendizaje por refuerzo a partir de retroalimentación humana (RLHF)</strong> es la receta de tres etapas que convierte un predictor crudo en un modelo genuinamente útil y receptivo a la intención.</p>`,
    },
    {
      html: `<h3>1 · Ajuste fino supervisado (SFT)</h3>
      <p>Antes de cualquier RL, el modelo necesita aprender el <em>registro</em> de ser útil. Contratistas humanos escriben pares ideales de prompt y respuesta — una pregunta junto a una respuesta clara y bien estructurada — y el modelo base se ajusta finamente sobre ellos con la pérdida de entropía cruzada ordinaria. El <strong>SFT</strong> enseña al modelo a seguir instrucciones, mantenerse en el tema y responder en lugar de simplemente continuar. Piénsalo como un aprendizaje de oficio antes de la autonomía.</p>`,
    },
    {
      html: `<h3>2 · Entrena un modelo de recompensa</h3>
      <p>Un humano no puede puntuar cada paso de gradiente, así que entrenamos un sustituto. Dado un prompt, el modelo SFT genera varias respuestas candidatas; los evaluadores humanos las <strong>clasifican</strong> en lugar de puntuarlas — clasificar es más rápido y más consistente que asignar números crudos. Un <strong>modelo de recompensa</strong> aparte (típicamente el modelo SFT con una cabeza de salida escalar) se entrena entonces para reproducir esas clasificaciones mediante una pérdida de comparación: siempre que los evaluadores prefieren A sobre B, el modelo de recompensa debe asignar a A una puntuación más alta que a B.</p>
      <p class="aside">Aquí, la respuesta A se prefiere sobre la B; el modelo de recompensa aprende a asignar a A una puntuación más alta.</p>`,
    },
    {
      html: `<h3>3 · Optimiza con RL</h3>
      <p>El modelo SFT — ahora llamado la <strong>política</strong> — se ajusta finamente para maximizar la puntuación del modelo de recompensa en prompts nuevos. Sin restricciones, aprendería rápidamente a engañar al modelo de recompensa: produciendo texto de sonido fluido que puntúa bien mientras dice muy poco (<em>reward hacking</em>). Una <strong>penalización KL</strong> evita esto penalizando a la política por alejarse demasiado del modelo SFT original, manteniéndola con una correa corta:</p>
      ${tex('\\max_{\\pi}\\; \\mathbb{E}\\big[\\,r(x,y)\\,\\big]\\;-\\;\\beta\\,\\mathrm{KL}\\!\\left(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\right)', true)}
      <p><strong>PPO</strong> (Proximal Policy Optimization) optimiza este objetivo muestreando respuestas nuevas de la política y aplicando actualizaciones de gradiente recortadas. <strong>DPO</strong> (Direct Preference Optimization) es una alternativa offline más simple que se salta por completo el modelo de recompensa explícito, derivando una señal de entrenamiento directamente de los datos de clasificación humana.</p>
      <div class="postcard">RLHF: imitar buenas respuestas, aprender la preferencia humana y luego optimizar hacia ella con una correa corta.</div>`,
    },
  ],
}
