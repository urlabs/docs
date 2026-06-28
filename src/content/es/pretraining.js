export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 06 · del texto a ChatGPT</span>
      <h2>El preentrenamiento</h2>
      <p class="lead">Antes de que un modelo pueda conversar, lee una porción enorme de internet y juega a un solo juego, una y otra vez: <strong>predecir el siguiente token</strong>. (Un <em>token</em> es un trozo de texto — más o menos una palabra o un fragmento de palabra — la unidad que un modelo lee y escribe.)</p>
      <p>Muéstrale <span class="tok">The cat sat on the&nbsp;▢</span> y debe rellenar el hueco — no con una sola conjetura, sino repartiendo una <strong>probabilidad</strong> entre cada token que conoce.</p>
      <p>Sin entrenar, esa apuesta apenas es mejor que un encogimiento de hombros: una pizca sobre <span class="tok">mat</span>, pizcas sobre un centenar de palabras equivocadas.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Conjeturar, comprobar, empujar — un billón de veces</h3>
      <p>Ahora se revela el hueco: el verdadero siguiente token era <span class="tok">mat</span>. La distancia entre la apuesta del modelo y la verdad es la <strong>pérdida</strong> — un único número que puntúa cuán equivocado estuvo. Seguro y acertado puntúa bajo; seguro y equivocado puntúa alto.</p>
      <p>Esa puntuación empuja los miles de millones de <em>pesos</em> del modelo un pelín hacia equivocarse menos la próxima vez. Luego desliza la ventana un token más allá y repite — cada posición en cada documento es un ejemplo gratis.</p>
      <p class="aside">Nadie etiquetó nada de esto: la siguiente palabra es su propia clave de respuestas. Eso es el <strong>aprendizaje autosupervisado</strong> — y la pérdida que reduce es la <strong>entropía cruzada</strong>, que premia poner probabilidad sobre el token que realmente vino después.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Una frase se convierte en internet</h3>
      <p>Un solo ejemplo no enseña casi nada. La magia es la <strong>escala</strong>. Esa única frase se convierte en libros, páginas web, código y conversaciones — un torrente de texto vertiéndose a través del mismísimo bucle de predecir-el-siguiente-token.</p>
      <p>Los modelos de frontera se entrenan con <strong>billones</strong> de tokens, el internet legible muchas veces. Para rellenar bien cada hueco a lo largo de todo ello — gramática, hechos, razonamiento, código — el modelo se ve obligado a construir una imagen funcional del mundo que el texto describe. El conocimiento llega como <em>efecto secundario</em> de volverse bueno en el juego.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Leyes de escalado</h3>
      <p>Tres palancas deciden cuán bueno llega a ser: más <strong>datos</strong>, más <strong>cómputo</strong> (cálculo en bruto, en horas-GPU) y más <strong>parámetros</strong> (los pesos, contados por miles de millones). Sube las tres a la vez y la pérdida sigue cayendo.</p>
      <p>Lo asombroso es lo <em>predeciblemente</em> que cae — una suave ley de potencias, una línea casi recta en una gráfica log-log. Así que los investigadores entrenan modelos pequeños y baratos y pronostican la pérdida de uno gigante antes de gastar un céntimo en él.</p>
      <p class="aside">Esa previsibilidad es lo que justificó fortunas en ejecuciones cada vez más grandes — la curva prácticamente promete la recompensa por adelantado. (Una regla general del trabajo de Chinchilla: haz crecer datos y parámetros juntos, muy a grandes rasgos 20 tokens por parámetro.)</p>`,
    },
    {
      side: 'left',
      html: `<h3>Brillante, pero todavía no útil</h3>
      <p>Lo que emerge es un <strong>modelo base</strong>. Ha absorbido un conocimiento asombroso — pero su único instinto es <em>continuar</em> el texto al estilo de internet, no ayudarte.</p>
      <p>Pregúntale "¿Cuál es la capital de Francia?" y puede que te devuelva otras cinco preguntas de examen — porque en internet, a una pregunta a menudo le siguen más preguntas. No tiene ningún impulso de responder, ceñirse a la tarea ni rechazar una petición dañina. Fue entrenado para predecir el siguiente token, no para asistir.</p>
      <p>Todo el conocimiento está ahí dentro. Solo hay que enseñarle a <em>comportarse</em>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Enseñarle a comportarse</h3>
      <p>Una segunda fase — el <strong>post-entrenamiento</strong>, o <em>alineación</em> — pone el comportamiento del modelo en línea con lo que la gente realmente quiere. La receta más conocida es <strong>RLHF</strong>, y empieza con pura imitación.</p>
      <p><strong>Ajuste fino supervisado (SFT):</strong> personas expertas escriben miles de respuestas <em>ideales</em>, y el modelo se entrena con ellas con la misma maquinaria de siguiente token — copiando ahora la forma de una buena respuesta: directa, centrada en la tarea, útil. Casi de la noche a la mañana deja de divagar y empieza a responder.</p>
      <p><strong>Modelo de recompensa:</strong> las demostraciones no pueden cubrirlo todo, así que a las personas se les muestran <em>pares</em> de respuestas y eligen la mejor. Miles de esas elecciones entrenan a un <strong>juez</strong> aparte que puede luego puntuar cualquier respuesta como tendía a hacerlo la gente.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Practicar hacia lo que la gente prefiere</h3>
      <p><strong>Ajuste fino con RL:</strong> ahora el modelo practica por su cuenta. Escribe una respuesta, el juez la califica, y el modelo es guiado hacia lo que sea que puntúe más alto — muchos intentos, cada uno reforzado en proporción a su recompensa. (<em>RL</em>, aprendizaje por refuerzo, solo significa aprender de esa señal de recompensa en lugar de ejemplos fijos.)</p>
      <p>Es la misma red de principio a fin: el preentrenamiento vertió el conocimiento, el post-entrenamiento extrajo la utilidad. Ninguna mitad funciona sola — un modelo base sabe pero no coopera; la alineación sin nada debajo no tiene nada que decir.</p>
      <div class="postcard">El preentrenamiento hace que <strong>sepa</strong>. La alineación lo hace <strong>útil</strong>. Juntos, eso es ChatGPT.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF</a>
        <a class="deepdive" data-route="/inference">siguiente: La inferencia →</a>
      </div>`,
    },
  ],
}
