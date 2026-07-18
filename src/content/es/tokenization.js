export default {
  beats: [
    {
      html: `<span class="eyebrow">Análisis a fondo · embeddings</span>
      <h2>Tokenización</h2>
      <p class="lead">Los modelos no leen palabras ni letras — leen <strong>tokens</strong>: fragmentos de subpalabra. Un vocabulario a nivel de palabra necesitaría millones de entradas y aun así fallaría con erratas, palabras raras y nombres propios nuevos. Las secuencias carácter a carácter evitan esa trampa, pero crecen tanto que fuerzan la ventana de contexto del modelo — la entrada de longitud fija que puede sostener a la vez. Los tokens de subpalabra encuentran el punto medio.</p>
      <p>Empieza con los caracteres crudos de una palabra — cada letra su propio símbolo independiente.</p>`,
    },
    {
      html: `<h3>Fusiona el par más frecuente</h3>
      <p><strong>Byte-Pair Encoding (BPE)</strong> recorre todo el corpus de entrenamiento — miles de millones de palabras de texto — cuenta cada par adyacente de símbolos y fusiona el par más común en un único token nuevo. Ese token entra en el vocabulario y el recorrido se repite desde cero.</p>
      <p class="aside">Los pares de alta frecuencia como <span class="tok">to</span>, <span class="tok">ke</span> y <span class="tok">on</span> se fusionan primero: aparecen en miles de palabras en inglés, así que cada fusión recorta la mayor longitud de secuencia en un solo paso.</p>`,
    },
    {
      html: `<h3>Sigue fusionando</h3>
      <p>Repite miles de veces. Las cadenas comunes colapsan en tokens individuales; las cadenas raras o novedosas quedan partidas en piezas más pequeñas. Esa es la idea clave: el modelo puede manejar <em>cualquier</em> palabra, incluso las nunca vistas en el entrenamiento, componiendo piezas de subpalabra familiares.</p>
      <p class="aside">GPT-2 ejecutó aproximadamente 50,000 fusiones; los grandes modelos modernos ejecutan 100,000 o más, llegando a vocabularios de ese tamaño.</p>`,
    },
    {
      html: `<h3>Tokens & el vocabulario</h3>
      <p>Tras todas las fusiones tienes un <strong>vocabulario</strong> fijo — una tabla de búsqueda que asigna a cada pieza un ID entero. El modelo nunca ve texto crudo; ve una lista de IDs. "tokenization" termina como solo dos: <span class="tok">token</span> + <span class="tok">ization</span>.</p>
      <p>Una palabra común como <em>the</em> obtiene un único ID; una palabra rara como <em>antidisestablishmentarianism</em> se parte en muchos. Las palabras relacionadas morfológicamente a menudo comparten prefijos de token, dando al modelo una ventaja inicial para aprender su significado.</p>
      <div class="postcard">La tokenización convierte el texto crudo en una secuencia de IDs enteros — los átomos reales que un modelo lee, predice y genera, uno a la vez.</div>`,
    },
  ],
}
