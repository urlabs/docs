export default {
  beats: [
    {
      html: `<span class="eyebrow">Capítulo 01 · el bloque básico</span>
      <h2>La neurona</h2>
      <p class="lead">Todo lo que hace una IA está construido a partir de una pieza diminuta, repetida millones de veces. Una neurona — en su forma clásica de unidad única, el <strong>perceptrón</strong> — toma un puñado de números como <strong>entradas</strong> y los reduce a un único número. El arte está en <em>cómo</em> los combina.</p>
      <p>Imagina decidir si salir a caminar. ¿Está lloviendo? ¿Cuán ocupado estás? ¿Te invitó un amigo a acompañarlo? Cada hecho te inclina en una medida distinta — y ese "cuánto importa" es su <strong>peso</strong>. La neurona multiplica cada entrada por su peso y luego suma los resultados — cada entrada <span class="tok">x</span> contra su peso <span class="tok">w</span>, emparejados y sumados. Los matemáticos llaman a ese único movimiento un <strong>producto punto</strong>, escrito <span class="tok">w·x</span>.</p>
      <p>Por último añade un <strong>sesgo</strong>&nbsp;<span class="tok">b</span>: una inclinación de base, como ser alguien que simplemente tiende a decir que sí. El recuento hasta ahora es <span class="tok">w·x + b</span> — muchos números entran, sale un único total acumulado. A continuación veremos qué desencadena ese total.</p>`,
    },
    {
      side: 'right',
      html: `<h3>La compuerta</h3>
      <p>Ese total acumulado se topa entonces con una compuerta. Volvamos al paseo: no sales por la puerta ante cada leve impulso — tus ganas tienen que acumularse primero. Una neurona funciona igual. A medida que el total supera un <strong>umbral</strong> empieza a <strong>dispararse</strong>, enviando una señal más fuerte hacia adelante. Pero "dispararse" es una metáfora — nada se acciona como un interruptor de luz. La respuesta se curva hacia arriba con suavidad, un recodo pronunciado en lugar de un salto brusco.</p>
      <p>Esa compuerta es la <em>activación</em>, escrita <span class="tok">σ</span>, así que la salida completa de una neurona es <span class="tok">y = σ(w·x + b)</span> — ponderar, sumar, inclinar y luego doblar. Ese recodo es la <strong>no linealidad</strong>, un término rebuscado para "la respuesta no es una línea recta". <span class="tok">sigmoid</span> traza una suave curva en S que aplasta cualquier número en el rango de 0 a 1; <span class="tok">tanh</span> hace lo mismo pero centrada en cero; <span class="tok">ReLU</span> es simplemente <span class="tok">max(0, x)</span> — conserva los positivos, anula el resto, un quiebre limpio.</p>
      <p>Ese recodo lo es todo. Apila solo pasos de línea recta y toda la pila vuelve a colapsar en una única línea recta — cien capas no más sabias que una. Añade el recodo y las matemáticas dejan de plegarse planas: capa sobre capa de suaves curvas puede trazar patrones de una complejidad asombrosa. Con suficientes neuronas, una red puede aproximar esencialmente cualquier función.</p>
      <p class="aside">Observa cómo el núcleo se ilumina a medida que el total asciende, y luego se eleva con fuerza — sin saltar de golpe — al superar el umbral.</p>`,
    },
    {
      html: `<h3>Una capa</h3>
      <p>Una sola neurona hace una sola pregunta, así que solo puede detectar un tipo de patrón. Los problemas reales necesitan muchas a la vez. Una <strong>capa</strong> es una fila de neuronas trabajando <em>en paralelo</em> — una al lado de la otra, todas en el mismo momento. Cada una lee exactamente las mismas entradas, pero cada una lleva su propio conjunto privado de pesos.</p>
      <p>Así, cada neurona acaba afinada para algo distinto — una se centra en el clima, otra en tu tiempo libre, otra en quién te acompaña. Los mismos hechos entran, se hacen preguntas distintas. Juntas notan mucho más de lo que cualquiera de ellas podría por sí sola.</p>
      <p>Apila esas filas privadas de pesos y forman una rejilla — una <strong>matriz</strong>&nbsp;<span class="tok">W</span> — y todo el trabajo de la capa se reduce a una sola línea, <span class="tok">σ(Wx + b)</span>: una multiplicación de matrices, un sesgo, un recodo, todas las neuronas a la vez. Es el mismo movimiento que una sola neurona, solo que ejecutado en masa — que es exactamente por qué estas matemáticas vuelan en hardware construido para multiplicar matrices.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Una red</h3>
      <p>Ahora apila las capas, cada una alimentando a la siguiente: <span class="tok">input</span> → <span class="tok">hidden</span> → <span class="tok">hidden</span> → <span class="tok">output</span>. La capa de entrada recibe los números crudos. Las capas <strong>ocultas</strong> del medio — ocultas porque nada del exterior las lee jamás de forma directa — los refinan en patrones cada vez más ricos. La capa de salida reporta la respuesta.</p>
      <p>Por debajo es puro anidamiento: el vector de salida de cada capa se convierte en la entrada de la siguiente, así que la red no es más que <span class="tok">σ(Wx + b)</span> envuelto sobre sí mismo una y otra vez — funciones compuestas, una metida dentro de la siguiente.</p>
      <p>La profundidad es la clave de todo. Cada capa combina lo que halló la anterior en algo más abstracto — muy parecido a cómo los trazos se vuelven letras, y las letras, palabras. Una sola capa ancha podría en teoría encajar casi cualquier cosa; la profundidad simplemente llega ahí mucho más barato, cada capa construyendo sobre el trabajo de la anterior.</p>`,
    },
    {
      html: `<h3>El pase hacia adelante</h3>
      <p>Verlo en marcha es lo mejor. Introduce números por el borde izquierdo y se propagan hacia la derecha, cada capa despertando a la siguiente, hasta que una respuesta se enciende en el extremo opuesto. Ese único barrido de izquierda a derecha es un <strong>pase hacia adelante</strong> — un trayecto por la red que convierte una entrada en una salida.</p>
      <p>La onda viajera es todo el cómputo desplegándose en orden: todas esas sumas ponderadas y suaves recodos, una capa iluminándose tras otra — y el orden es estricto, ya que cada capa necesita que la anterior termine primero. Fija los pesos y es perfectamente repetible: los mismos números a la entrada dan siempre la misma respuesta a la salida. Eso, muy literalmente, es la red <em>pensando</em> — y este mismo barrido se ejecuta cada vez que le das un prompt a uno de los modelos hacia los que avanzamos.</p>
      <p class="aside">Sigue el pulso brillante mientras cruza de la entrada a la salida.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Por qué funciona</h3>
      <p>Ninguna neurona por sí sola es ingeniosa — cada una solo pondera unos pocos números y dobla el resultado. La inteligencia está en el apilamiento: capa sobre capa, cada compuerta añadiendo una pequeña curva, hasta que el conjunto compuesto puede amoldarse a casi cualquier patrón que puedas imaginar.</p>
      <p>Cada uno de esos pesos y sesgos es una perilla ajustable — una red pequeña tiene miles, una grande tiene miles de millones. Y nada de esto está escrito a mano: las perillas empiezan como ruido aleatorio, y a la red se le <em>enseñan</em> los ajustes correctos, ejemplo a ejemplo, hasta que sus respuestas salen bien. Esa búsqueda es exactamente adonde vamos a continuación.</p>
      <p class="aside">Ese poder tiene un nombre formal — el <em>teorema de aproximación universal</em>: con suficientes neuronas, una red puede igualar cualquier función continua tan de cerca como quieras. Promete que tales pesos existen; nunca dice cómo encontrarlos.</p>
      <div class="postcard">Una neurona es una suma ponderada que pasa por una compuerta. Apila suficientes y obtienes un sistema capaz de moldearse para encajar casi cualquier cosa.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/training">siguiente: El aprendizaje →</a></div>`,
    },
  ],
}
