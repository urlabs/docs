export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 09 · conocimiento que nunca aprendió</span>
      <h2>Conocimiento &amp; recuperación</h2>
      <p class="lead">Una vez que termina el entrenamiento, los pesos de un modelo quedan <strong>congelados</strong>. Todo lo que "sabe" quedó grabado antes de su fecha de corte — así que no puede haber leído las noticias de hoy, la wiki de tu empresa ni el archivo que subiste hace un segundo.</p>
      <p>Y sin embargo, un buen asistente responde sin problema sobre tu PDF. El truco no es más entrenamiento — es dejar que el modelo <strong>busque la información</strong> en el momento de responder y la lea antes de contestar. Ese patrón es la <strong>recuperación</strong>, y combinado con la generación se llama <strong>RAG</strong>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Convierte los documentos en un mapa de significado</h3>
      <p>Primero, el conocimiento que quieres tener a mano — manuales, páginas web, una base de código entera — se trocea en <strong>fragmentos</strong> del tamaño de un bocado, y cada fragmento se hace pasar por el modelo de embeddings de <span class="tok">El significado como geometría</span>. Cada fragmento se convierte en un <strong>vector</strong>: un punto en ese mismo espacio de significado de alta dimensión.</p>
      <p>Almacena todos esos puntos y tendrás una <strong>base de datos vectorial</strong> — una galaxia donde la cercanía significa "trata de lo mismo", lista para buscarse por significado en lugar de por palabra clave.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Incrusta también la pregunta</h3>
      <p>Cuando preguntas algo, tu pregunta pasa por el <em>mismo</em> modelo de embeddings, y aterriza como un punto en ese mismísimo espacio — derivando justo al lado de los fragmentos que hablan de ella.</p>
      <p>Ahora "encontrar los documentos relevantes" se convierte en un problema de geometría: <strong>¿qué puntos están más cerca de la pregunta?</strong></p>`,
    },
    {
      side: 'right',
      html: `<h3>Busca por significado, no por palabras</h3>
      <p>La base de datos encuentra los fragmentos <strong>más cercanos</strong> a la pregunta — por la misma similitud coseno del capítulo de embeddings. Esto es la <strong>búsqueda semántica</strong>: empareja el <em>significado</em>, así que una pregunta sobre "mi coche no arranca" puede sacar a la luz un fragmento sobre "batería agotada" que no comparte ni una sola palabra con ella.</p>
      <p class="aside">A gran escala esto no es un barrido por fuerza bruta — un índice de <strong>vecinos más cercanos aproximados</strong> lo mantiene casi instantáneo entre miles de millones de vectores.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Extrae las mejores coincidencias</h3>
      <p>Quédate con el puñado más cercano — los fragmentos <strong>top-k</strong>. Son los que tienen más probabilidad de contener la respuesta, sacados directamente de tus propias fuentes en lugar de la memoria del modelo.</p>
      <p>La calidad se juega aquí mismo: recupera los fragmentos equivocados y el modelo responderá a partir de hechos equivocados. Un buen troceado, buenos embeddings y un corte sensato: todo importa.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Suéltalos en el contexto</h3>
      <p>Los fragmentos recuperados se pegan en la <strong>ventana de contexto</strong> del modelo — la memoria de trabajo del capítulo de la inferencia — justo al lado de tu pregunta, normalmente envueltos en una instrucción como "responde usando estas fuentes".</p>
      <p>El modelo nunca aprendió estos hechos. Simplemente los está <em>leyendo</em> ahora, exactamente igual que lee el resto del prompt.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Una respuesta fundamentada</h3>
      <p>Ahora el modelo escribe su respuesta <em>a partir del texto recuperado</em> — y como las fuentes están ahí mismo en el contexto, puede <strong>citarlas</strong>. Preguntado en frío, un modelo puede inventar con total seguridad una respuesta de apariencia plausible (una <strong>alucinación</strong>); fundamentada en fragmentos reales, la respuesta permanece atada a algo verdadero.</p>
      <p>Los mismos pesos congelados, la misma máquina de siguiente token — ahora anclada a hechos que puede señalar.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Por qué la recuperación lo cambió todo</h3>
      <div class="postcard">La recuperación le entrega a un modelo congelado conocimiento fresco, privado y verificable: incrusta tus documentos en una base de datos vectorial, incrusta la pregunta, recupera los fragmentos más cercanos y deja que el modelo los lea antes de responder. Eso es RAG — cómo los asistentes se mantienen al día, citan fuentes y aprenden tu mundo sin reentrenamiento.</div>
      <p class="aside">La misma jugada impulsa la <strong>memoria</strong> a largo plazo de un modelo y sus <strong>herramientas</strong>: una búsqueda web no es más que recuperación sobre todo internet, soltada en el contexto.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/embeddings">revisita los embeddings</a>
        <a class="deepdive" data-route="/frontier">siguiente: La frontera →</a>
      </div>`,
    },
  ],
}
