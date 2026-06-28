export default {
  beats: [
    {
      side: 'center',
      html: `<span class="eyebrow">Capítulo 10 · dónde estamos ahora</span>
      <h2>LLM de frontera</h2>
      <p class="lead">Tú construiste el núcleo. Los <strong>modelos de frontera</strong> de hoy — los sistemas más capaces que funcionan ahora mismo — son ese mismo núcleo: los <span class="tok">embeddings</span> convierten los tokens en vectores, la <span class="tok">atención</span> les permite intercambiar significado, los bloques apilados añaden profundidad, y toda la máquina predice un token a la vez.</p>
      <p>No se coló nada nuevo por debajo. Lo que cambió es la <strong>escala</strong> — muchísimos más parámetros, datos y cómputo, exactamente como prometieron las leyes de escalado — y cinco mejoras atornilladas encima. Este capítulo visita cada una y luego vuelve a recorrer todo el viaje.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Mezcla de expertos</h3>
      <p>Imagina un hospital de especialistas en lugar de un solo generalista agotado. Una <strong>mezcla de expertos</strong> reemplaza la única capa feed-forward del bloque por muchas redes <strong>expertas</strong> más pequeñas, más un diminuto <strong>enrutador</strong> que lee cada token y lo dirige solo a uno o dos. El resto permanece a oscuras.</p>
      <p>Eso es la <span class="tok">activación dispersa</span>: los parámetros <em>totales</em> del modelo pueden dispararse hasta los billones mientras que los parámetros <em>activos</em> por token siguen siendo pocos — un cerebro mucho más grande que cuesta aproximadamente lo mismo ejecutar. El enrutador es en sí mismo aprendido (una compuerta softmax), ajustado para repartir la carga de modo que ningún experto quede sobrecargado ni ocioso.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Contexto largo — y por qué es costoso</h3>
      <p>La <strong>ventana de contexto</strong> es todo lo que el modelo puede ver a la vez: su memoria de trabajo. Los primeros modelos sostenían unos pocos miles de tokens; los de hoy sostienen <strong>cientos de miles</strong> — un libro entero, una larga transcripción, una base de código completa de un solo vistazo.</p>
      <p>Pero la atención compara <em>cada token con todos los demás</em>, así que el trabajo crece con el <strong>cuadrado</strong> de la longitud: duplica los tokens y cuadruplicas el coste. Observa la rejilla — esa explosión N×N, más la caché KV en constante crecimiento que la alimenta, es el precio real de una memoria larga, y adonde va buena parte de la ingeniería de frontera.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Muchos sentidos, un espacio</h3>
      <p><strong>Multimodal</strong> significa muchas clases de entrada, un solo modelo. El texto no es lo único que puedes trocear en tokens: una <span style="color:var(--amber)">imagen</span> se corta en parches cuadrados, el <span style="color:var(--violet)">audio</span> en cortas ventanas de sonido. Cada pieza pasa por una pequeña proyección aprendida que la deposita en el <em>mismo</em> espacio vectorial que las <span style="color:var(--cyan)">palabras</span>.</p>
      <p>Una vez que un parche de foto y una palabra son ambos solo tokens en ese único espacio compartido, la mismísima atención que ya entiendes puede ponderarlos <em>juntos</em> — una imagen y una frase volviéndose un solo pensamiento continuo.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Pensar antes de responder</h3>
      <p>En un problema difícil, soltar de golpe el primer token es una mala estrategia. Así que a los modelos se les entrena para <strong>pensar primero</strong> — para escribir una <em>cadena de pensamiento</em> privada: un borrador de pasos, intentos y <span style="color:var(--magenta)">callejones sin salida</span> que abandonar, todo antes de la respuesta visible.</p>
      <p>Aprenden a pensar bien mediante el <strong>aprendizaje por refuerzo</strong> sobre problemas con respuestas comprobables: intentar muchas veces, reforzar el razonamiento que alcanza el resultado correcto. Y la sorpresa — <span class="tok">test-time compute</span> — es que simplemente dejar que un modelo gaste <em>más</em> tokens pensando en la inferencia compra de forma fiable mejores respuestas. La misma máquina de siguiente token, ahora apuntada hacia dentro antes de hablar; el presupuesto de pensamiento cambia latencia por precisión.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Herramientas &amp; agentes</h3>
      <p>Un modelo por sí solo solo puede producir texto. Pero ese texto puede ser una <strong>instrucción</strong>: <span style="color:var(--amber)">buscar en la web</span>, <span style="color:var(--rose)">ejecutar código</span>, <span style="color:var(--blue)">editar un archivo</span>. Un arnés ejecuta la herramienta y reintroduce el <span style="color:var(--lime)">resultado</span> como contexto nuevo.</p>
      <p>Envuelve eso en un bucle — decidir una acción, ejecutarla, observar el resultado, decidir la siguiente — y el modelo se convierte en un <strong>agente</strong>: un sistema que persigue un objetivo paso a paso en lugar de responder de una sola vez. Sigue siendo pura predicción de siguiente token; la diferencia es que la transcripción ahora incluye al mundo respondiendo por escrito.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Todo el viaje</h3>
      <p>Da un paso atrás y todo es una sola idea desplegándose. Una sola <span class="tok">neurona</span> pondera sus entradas. La <span class="tok">atención</span> deja que los tokens compartan significado. El <span class="tok">Transformer</span> apila eso en profundidad. El <span class="tok">entrenamiento</span> moldea los pesos a partir de los datos; la <span class="tok">inferencia</span> los ejecuta para escribir el siguiente token. Todo lo de este capítulo es ese mismo fundamento — escalado, y apuntado al mundo.</p>
      <div class="postcard">Un modelo de frontera es el mismo núcleo Transformer que construiste — escalado, con expertos dispersos, contexto vasto, muchos sentidos, razonamiento que se le puede enseñar y herramientas para actuar en el mundo.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/">repite el viaje ↺</a><a class="deepdive" data-route="/attention">revisita la atención</a></div>`,
    },
  ],
}
