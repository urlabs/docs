export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 05 · la máquina</span>
      <h2>El Transformer</h2>
      <p class="lead">Este es el diagrama que lo empezó todo — el <strong>bloque del Transformer</strong> del artículo de 2017 "Attention Is All You Need", el motor que hay dentro de todo LLM moderno. Parece denso, así que vamos a encenderlo y observar cómo una frase asciende por él, una caja a la vez.</p>
      <p>Léelo de abajo arriba. Los tokens entran por el pie, fluyen hacia arriba por un <strong>flujo residual</strong> central a través de un puñado de cajas, y una predicción de la siguiente palabra cae por la cima. El bloque entero mantiene la fila de vectores exactamente con la misma forma que recibió — que es el secreto para apilarlo en profundidad.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Entradas — incrustar, luego situar</h3>
      <p>Primero cada token se convierte en un <strong>vector</strong> (el embedding del capítulo anterior). Pero la atención, la siguiente caja, es ciega al orden — baraja la fila y devuelve los mismos vectores; para ella, <span class="tok">The cat sat</span> y <span class="tok">sat cat The</span> son idénticos.</p>
      <p>Así que una <strong>codificación posicional</strong> — un vector fijado solo por la ranura (1.ª, 2.ª, 3.ª…) — se <em>suma</em> a cada token antes de que comience el ascenso. Ahora "la palabra" también lleva "dónde se sitúa la palabra". Esto sucede una sola vez, en la base misma.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Atención multi-cabezal enmascarada</h3>
      <p>La primera caja es donde los tokens <strong>hablan</strong>. Cada token forma una consulta, mira a lo largo de la fila y absorbe significado de las palabras que le importan — exactamente el mecanismo del capítulo de la Atención, ejecutado por varios <strong>cabezales</strong> en paralelo, cada uno atento a un tipo distinto de relación.</p>
      <p>"<strong>Enmascarada</strong>" es el giro del LLM: un token solo puede atender a las palabras que están <em>detrás</em> de él, nunca por delante — observa cómo los enlaces corren en un solo sentido. El modelo está aprendiendo a predecir la siguiente palabra, así que dejar que espíe la respuesta sería hacer trampa.</p>
      <p class="aside">Esta es la única caja donde la información se mueve <em>entre</em> tokens. Todo lo demás en el bloque trata cada posición por separado.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Add &amp; Norm — el atajo residual</h3>
      <p>Fíjate en la flecha que rodea <em>por fuera</em> la caja de atención. El bloque nunca reemplaza un token — <strong>suma</strong> el resultado de la atención de vuelta sobre la entrada original. Ese desvío es la <strong>conexión residual</strong>, y es lo que permite que la señal (y, durante el entrenamiento, los gradientes) sobreviva a una pila muy profunda.</p>
      <p>Luego <strong>LayerNorm</strong> reescala el vector de cada token por su cuenta, manteniendo los números sanos en lugar de dispararse o desvanecerse a medida que la torre crece. Suma, luego norma — y verás este mismo emparejamiento de nuevo justo después de la siguiente caja.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Feed-forward — cada token piensa a solas</h3>
      <p>Ahora cada token se refina <em>por su cuenta</em>, sin mirar a los lados. La caja <strong>feed-forward</strong> es una pequeña <strong>red neuronal de dos capas</strong> (un MLP) aplicada a cada posición: infla el vector hasta unas <strong>4× su ancho</strong>, lo dobla a través de una no linealidad y luego lo proyecta de vuelta hacia abajo — observa cómo se despliega y colapsa.</p>
      <p>Nada se consulta en una tabla; cada peso fue aprendido. Si la atención es donde los tokens <em>comparten</em>, el feed-forward es donde cada token <em>digiere</em> lo que oyó. Su salida recibe el mismo tratamiento <strong>Add &amp; Norm</strong> — atajo residual, luego normalizar.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Un bloque — ahora apílalo × N</h3>
      <p>Atención, Add &amp; Norm, feed-forward, Add &amp; Norm: eso es <em>un</em> bloque. Un Transformer real apila <strong>docenas</strong> de ellos (el famoso "N×"), idénticos en forma pero cada uno con sus <em>propios</em> pesos aprendidos, así que cada capa es libre de hacer un trabajo distinto.</p>
      <p>La misma fila de vectores fluye recta hacia arriba a través de todos ellos por ese flujo residual — cada bloque la lee, añade su pequeña edición y la pasa adelante.</p>`,
    },
    {
      side: 'left',
      html: `<h3>El significado se afina con la profundidad</h3>
      <p>Observa cómo el refinamiento se propaga hacia arriba. Los primeros bloques captan lo simple — gramática, límites entre palabras, quién se sienta junto a quién. Los bloques más profundos avanzan hacia el significado abstracto, la intención y los vínculos de largo alcance a lo largo de la frase.</p>
      <p>Cada bloque empuja los vectores un poco; apilados en profundidad, esos empujones se acumulan en una lectura rica y consciente del contexto del texto.</p>
      <p class="aside">Esto no es solo una metáfora — sondea el flujo entre capas y la progresión aparece: las capas inferiores rastrean las categorías gramaticales, las capas superiores cargan con el significado y la referencia. Cada capa deja rasgos para que la siguiente los use.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Linear → Softmax → el siguiente token</h3>
      <p>En la cima, el modelo toma el vector final de la <em>última</em> posición y lo pasa por la caja <strong>Linear</strong> — una gran <strong>matriz de salida</strong> con una fila por palabra del vocabulario — convirtiéndolo en una puntuación en bruto, un <strong>logit</strong>, para cada posible siguiente token.</p>
      <p><strong>Softmax</strong> aplasta luego esa fila dentada de puntuaciones en probabilidades limpias que suman uno. Para <span class="tok">The cat sat on the…</span>, una barra se alza por encima del resto: <span class="tok">mat</span>.</p>
      <p class="aside">Esa matriz de salida es el <strong>unembedding</strong> — un espejo de la tabla de embeddings de la base. Una mapea palabras → vectores; la otra mapea el vector final → un voto sobre las palabras.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La máquina completa</h3>
      <div class="postcard">Incrusta y sitúa los tokens, deja que compartan significado (atención enmascarada), refina cada uno a solas (feed-forward), guardando un atajo residual y una norma después de cada paso. Apila ese bloque × N, lee el vector de arriba, y Linear + Softmax lo puntúan sobre el vocabulario — y cae la siguiente palabra.</div>
      <p class="aside">Eso es la totalidad del <strong>Transformer solo-decodificador</strong>, la forma tras los modelos al estilo de GPT. Más allá de aquí no esperan ideas nuevas — lo que sigue es esta misma máquina, alimentada con mucho más texto y escalada mucho más.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">matemáticas de la atención</a>
        <a class="deepdive" data-route="/pretraining">siguiente: Preentrenamiento →</a>
      </div>`,
    },
  ],
}
