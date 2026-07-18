export default {
  beats: [
    {
      html: `<span class="eyebrow">Capítulo 04 · el gran avance</span>
      <h2>La atención</h2>
      <p class="lead">Aquí está nuestra frase como <strong>diez tokens</strong> — uno por palabra — dispuestos en un anillo. Cada token es una lista de números — un <em>vector</em> — que captura lo que significa su palabra. Pero el significado no es fijo: una palabra cambia según la compañía que la rodea.</p>
      <p>Toma la palabra <span class="tok">it</span> — sola, no significa casi nada. Entonces, ¿cómo encuentra un token a los demás que le importan? Presta <em>atención</em>: se extiende por la frase, sopesa cada una de las demás palabras y funde el significado de ellas en el suyo propio.</p>`,
    },
    {
      html: `<h3>Consultas &amp; Claves</h3>
      <p>A partir de sus propios números, cada token produce dos pequeñas señales: una <strong>Consulta</strong> ("¿qué estoy buscando?") y una <strong>Clave</strong> ("¿qué ofrezco?").</p>
      <p>Imagina a todos en una sala abarrotada levantando dos tarjetas a la vez — una solicitud de búsqueda (la Consulta) y una etiqueta con su nombre (la Clave). El modelo coteja cada solicitud con cada etiqueta, todo en un único barrido.</p>
      <p>Ninguna de las dos tarjetas está escrita a mano. Cada token construye su Consulta y su Clave multiplicando su propio vector por un par de <strong>matrices aprendidas</strong> — Wq para la Consulta, Wk para la Clave. El entrenamiento ajusta esas matrices hasta que las solicitudes correctas encuentran las etiquetas correctas.</p>`,
    },
    {
      html: `<h3>Puntuaciones: comparar todo</h3>
      <p>La Consulta de cada token se coteja con la Clave de <em>cada</em> otro token, y cada emparejamiento obtiene una <strong>puntuación</strong> cruda — alta cuando una solicitud y una etiqueta encajan, baja cuando no. Esa coincidencia es un <strong>producto punto</strong>: multiplica los dos vectores entrada por entrada, suma los resultados, y sale un único número que indica con cuánta fuerza se alinean. Observa cómo <span class="tok">it</span> evalúa toda la frase a la vez.</p>
      <p class="aside">Diez tokens significan 100 comparaciones. Duplica las palabras y cuadruplicas el trabajo — por eso los textos muy largos resultan costosos de procesar.</p>
      <p class="aside">Una salvedad para la generación de texto real: cada token solo puede puntuar las palabras que vienen <em>antes</em> que él. El modelo está ocupado prediciendo la palabra siguiente, así que el futuro permanece enmascarado — no puede espiar la respuesta. Aquí dejamos que <span class="tok">it</span> recorra todo el anillo, pero en un LLM en funcionamiento los haces hacia adelante permanecerían a oscuras.</p>`,
    },
    {
      html: `<h3>Softmax: afinar en pesos</h3>
      <p>Primero las puntuaciones crudas se escalan — divididas por <strong>√dₖ</strong>, la raíz cuadrada de cuántos números hay en cada Clave — lo que evita que crezcan tanto que el siguiente paso se vuelva inestable. Luego pasan por <strong>softmax</strong>, que las convierte en porcentajes que suman 100% — los <strong>pesos</strong> de atención.</p>
      <p>Y softmax tiene favoritos por diseño: exponencia cada puntuación antes de repartir el total, así que la coincidencia más fuerte se lleva, con diferencia, la mayor porción, mientras que las débiles se desvanecen hacia la nada. Ahora las puntuaciones dispersas de <span class="tok">it</span> colapsan en un único foco claro.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/attention-math">la ecuación de la atención</a></div>`,
    },
    {
      html: `<h3>Reunir los Valores</h3>
      <p>Cada token lleva una señal más: un <strong>Valor</strong> — el contenido que en realidad ofrece. Si la Clave es la etiqueta con el nombre, el Valor es lo que ese token <em>te dice</em> una vez que decides escuchar. Como la Consulta y la Clave, proviene de una matriz aprendida — Wv — aplicada al vector del token.</p>
      <p>Ahora cada token atrae una <strong>mezcla ponderada de los Valores de todos</strong> — mucho de las palabras que puntuó alto, casi nada del resto. Esa mezcla es literalmente una suma: cada Valor multiplicado por su peso de atención, y luego todo sumado. La información fluye <em>hacia dentro</em> por los haces brillantes, y el significado del token se reescribe como una mezcla de todo lo que encontró relevante.</p>`,
    },
    {
      html: `<h3>"it" → "cat"</h3>
      <p>Esta es toda la magia en una sola imagen. La palabra <span class="tok">it</span> recorre la frase y se fija en <span class="tok">cat</span> — el modelo ha <strong>deducido a qué se refiere "it"</strong>, completamente por su cuenta.</p>
      <p>Los lingüistas llaman a esto <em>correferencia</em>, y es notoriamente difícil. Ninguna regla escribió eso. Surgió de la atención — el descenso de gradiente simplemente moldeó las matrices de Consulta y Clave hasta que la Consulta de <span class="tok">it</span> se alineó con la Clave de <span class="tok">cat</span>, porque esa alineación hacía más fácil predecir la palabra siguiente.</p>`,
    },
    {
      html: `<h3>Muchos cabezales a la vez</h3>
      <p>Hasta ahora hemos seguido una sola comparación. Los modelos reales ejecutan <strong>muchos cabezales de atención</strong> en paralelo, cada uno con sus propias Consultas, Claves y Valores — para que cada uno pueda buscar un tipo distinto de relación.</p>
      <p>Aquí, tres: <span style="color:var(--cyan)">sintaxis</span> (vínculos gramaticales), <span style="color:var(--magenta)">correferencia</span> (qué se refiere a qué), <span style="color:var(--amber)">adyacencia</span> (palabras vecinas). Una capa real ejecuta decenas.</p>
      <p>Los cabezales no se turnan — se ejecutan <strong>en paralelo</strong>, cada uno trabajando sobre su propia porción del vector. Sus salidas se <strong>concatenan</strong> de vuelta en una sola y pasan por una proyección aprendida final, de modo que la siguiente capa ve una única respuesta combinada.</p>
      <p class="aside">Pasa el cursor sobre cualquier token para explorar adónde atiende.</p>`,
    },
    {
      html: `<h3>Ese es el truco</h3>
      <p>Cada token ejecuta esta única rutina al mismo tiempo — <strong>Consulta, Clave, Valor; puntuar, ponderar, mezclar</strong> — y cada uno sale reescrito a la luz de todos los demás.</p>
      <p>Este es el único lugar donde los tokens de verdad comparten información — en todo lo demás, la red maneja cada token por separado. Apila esa operación capa sobre capa — la atención mezclando, luego el refinamiento por token — y obtienes un transformer: el motor dentro de todo modelo de lenguaje moderno.</p>
      <div class="postcard">La atención permite que cada token mire a todos los demás tokens y tome lo que necesita. Ese es todo el truco.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">matemáticas de la atención</a>
        <a class="deepdive" data-route="/transformer">siguiente: el Transformer →</a>
      </div>`,
    },
  ],
}
