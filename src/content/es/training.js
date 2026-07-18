export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 02 · cómo aprende</span>
      <h2>El aprendizaje</h2>
      <p class="lead">Una red recién creada no es más que <strong>pesos</strong> — millones de diales internos (sus <em>parámetros</em>), cada uno fijado a un pequeño valor aleatorio. Diales aleatorios dan respuestas aleatorias, así que al principio el modelo se equivoca en casi todo — no mejor que adivinar al azar.</p>
      <p>Nadie ajusta esos diales a mano; son demasiados. En su lugar, a la red se la <em>enseña</em> — se le muestra ejemplo tras ejemplo y se la empuja, poco a poco, hasta que sus respuestas se vuelven fiablemente correctas. Todo ese proceso es el <strong>entrenamiento</strong>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Aprender con ejemplos</h3>
      <p>Para aprender, la red necesita una <strong>pregunta cuya respuesta ya conocemos</strong>. Le mostramos el comienzo de una frase y la palabra siguiente real; le mostramos una foto ya etiquetada como <em>cat</em>. La red hace su propia conjetura, y comparamos esa conjetura con la verdad.</p>
      <p>La distancia entre la conjetura y la verdad es el <strong>error</strong>. Repítelo a lo largo de millones de ejemplos y los errores dejan de ser ruido aleatorio — forman un <em>patrón</em>. Y un patrón de fallos es algo que podemos corregir de forma sistemática.</p>
      <p>Hay una trampa. Una red con suficientes diales puede simplemente <em>memorizar</em> los ejemplos que estudió — puntuando a la perfección en ellos, y luego fallando en cualquier cosa nueva. Esa trampa se llama <strong>sobreajuste</strong>, y para detectarla reservamos datos con los que la red nunca entrena — un <strong>conjunto de validación</strong>. Clavar la hoja de estudio es fácil; el verdadero objetivo es <em>generalizar</em> a ejemplos que nunca ha visto.</p>
      <p class="aside">La bola brillante representa los pesos actuales de la red — sin entrenar, situada en lo alto, muy por encima del valle.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La pérdida</h3>
      <p>Para actuar sobre todos esos errores necesitamos reducirlos a un único número: la <strong>pérdida</strong>. Resume cuán equivocada está la red a lo largo de los ejemplos — una pérdida alta significa muchas respuestas malas, mientras que una pérdida de cero sería perfecta.</p>
      <p>Lo que ese número es en realidad depende de la tarea. Cuando la red elige entre categorías — <em>cat</em> frente a <em>dog</em>, o el siguiente token de todo un vocabulario — la pérdida es la <strong>entropía cruzada</strong>: recompensa acumular probabilidad sobre la respuesta correcta y castiga los errores cometidos con confianza. Cuando predice un simple número, la pérdida es el <strong>error cuadrático medio</strong> — la diferencia entre la conjetura y la verdad, elevada al cuadrado. Distintas reglas de medir, el mismo trabajo: una única puntuación de cuán equivocada.</p>
      <p>Ahora imagina ese número como <strong>altura</strong>. Cada posible configuración de los pesos es un punto en el suelo, y su pérdida es lo alto que se eleva el terreno ahí — un vasto paisaje ondulado. El entrenamiento tiene un único objetivo: <em>bajar hasta el valle más bajo</em>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Descenso de gradiente</h3>
      <p>El paisaje es demasiado enorme para cartografiarlo — pero nunca necesitas el mapa. Estés donde estés sobre él, siempre puedes sentir hacia qué lado se inclina <strong>cuesta abajo</strong>. Esa dirección es el <strong>gradiente</strong>. Con precisión, es un vector de pendientes — una derivada parcial ∂L/∂wᵢ por peso, cada una indicando cuánto cambiaría la pérdida si movieras ese único dial. El cuesta abajo de millones de diales, leído todo a la vez.</p>
      <p>Así que la receta es casi vergonzosamente simple: siente la pendiente, da un pequeño paso cuesta abajo y luego vuelve a sentir la pendiente desde donde aterrizas. Repite. Observa cómo la pérdida baja con cada paso — eso, literalmente, es la red aprendiendo.</p>
      <p class="aside">Cada miga de pan que la bola deja caer es un paso. En la práctica no mides la pendiente sobre todos los datos a la vez — la estimas a partir de un pequeño <strong>minilote</strong> aleatorio y das el paso sobre eso. Esto es el <strong>descenso de gradiente estocástico</strong>: muchos pasos rápidos y ruidosos en lugar de unos pocos exactos, y el propio temblor ayuda a la bola a salir traqueteando de los callejones sin salida poco profundos.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La tasa de aprendizaje</h3>
      <p>¿De qué tamaño debe ser cada paso cuesta abajo? Ese tamaño es la <strong>tasa de aprendizaje</strong>, y es un equilibrio delicado.</p>
      <p>Demasiado grande y la bola se <em>pasa de largo</em> — salta limpiamente al otro lado del valle y aterriza en lo alto de la ladera opuesta, oscilando de un lado a otro sin asentarse nunca. Demasiado pequeña y avanza a rastras, necesitando muchos más pasos para llegar. Un buen entrenamiento mantiene el paso en su punto justo: ágil, pero aún bajo control.</p>
      <p>Y a diferencia de los pesos, nadie aprende este número — lo fijamos nosotros. La tasa de aprendizaje es el <strong>hiperparámetro</strong> más decisivo del entrenamiento, normalmente <em>programado</em> para encogerse a medida que avanzas: grandes zancadas al principio para cubrir terreno, pasos finos a medida que la bola se acerca al fondo del valle.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Retropropagación</h3>
      <p>Una bola en una ladera es fácil de imaginar. Pero una red real tiene <strong>millones de pesos</strong>, y cada uno es su propia dirección independiente en la que moverse — un paisaje con millones de dimensiones, imposible de abarcar con la mente.</p>
      <p>El truco que lo hace todo manejable es la <strong>retropropagación</strong>. Partiendo del error en la salida, trabaja <em>hacia atrás</em> a través de las capas — como seguir una inundación río arriba para hallar cada manantial que la alimentó — y entrega a cada peso individual su propia parte de la culpa: hacia dónde moverse, y cuánto. Su motor es una sola idea del cálculo — la <strong>regla de la cadena</strong> — aplicada capa por capa: la culpa en cada capa se multiplica hacia atrás en la capa anterior, paso a paso, hasta que ese único pase hacia atrás ha calculado todo el gradiente.</p>
      <p>Júntalo todo y tienes el bucle completo, repetido millones de veces: <em>conjeturar → medir la pérdida → retropropagar → empujar cada peso un paso cuesta abajo → conjeturar de nuevo</em>.</p>
      <div class="postcard">Entrenar es rodar cuesta abajo por el paisaje del error — y la retropropagación le dice a cada peso individual hacia dónde está el descenso.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/embeddings">siguiente: El significado como geometría →</a></div>`,
    },
  ],
}
