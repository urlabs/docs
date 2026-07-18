export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 08 · cómo te responde</span>
      <h2>La inferencia</h2>
      <p class="lead">El entrenamiento ha terminado y los pesos están congelados para siempre. La <strong>inferencia</strong> es el modelo terminado puesto a trabajar — lo que se ejecuta cada vez que pulsas enviar. Por debajo, no es más que un bucle que escribe la respuesta <strong>un token a la vez</strong>.</p>
      <p>Abajo del todo se asienta tu <span class="tok">prompt</span>, troceado en tokens. Fluye hacia arriba hasta el núcleo del modelo, cuyo único trabajo es puntuar qué token debería venir después.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Prefill — leerlo todo de una vez</h3>
      <p>Antes de escribir una palabra, el modelo procesa tu prompt <em>entero</em> en una única pasada paralela — todos los tokens al mismo tiempo. Esto es el <strong>prefill</strong>, y mientras se ejecuta, cada token deja tras de sí un pequeño paquete de números calculados aparcado justo encima: su <strong>K</strong> y su <strong>V</strong> — las claves y los valores del capítulo de la atención.</p>
      <p>Por eso un prompt largo te hace esperar un instante antes de que arranque la respuesta: el prefill simplemente tiene más que leer. La pausa que sientes es el <span class="tok">time to first token</span>.</p>
      <p class="aside">El prefill está limitado por el cómputo — una gran pasada, intensiva en matrices, sobre todo el prompt de una vez.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Logits → softmax</h3>
      <p>El núcleo no elige una palabra. Emite una puntuación en bruto — un <strong>logit</strong> — por cada token de su vocabulario, decenas de miles de ellos. <strong>Softmax</strong> aplasta luego esas puntuaciones en probabilidades limpias que suman 1: una <strong>distribución</strong> completa sobre lo que viene después.</p>
      <p>Tras <span class="tok">…&nbsp;sat on the</span>, una barra se alza por encima del resto — <span class="tok">mat</span> — y, aun así, casi cualquier otra palabra conserva una pizca de oportunidad.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Temperatura &amp; muestreo</h3>
      <p>Ahora <strong>muestrea</strong> un token de esas probabilidades. Un solo dial, la <strong>temperatura</strong>, las remodela primero: cada logit se divide por T antes del softmax. Una <span style="color:var(--lime)">T baja</span> agudiza el pico — en T→0 se vuelve <em>voraz</em>, tomando siempre el token de arriba. Una <span style="color:var(--amber)">T alta</span> aplana la curva, dando a las palabras más raras una oportunidad real. Observa cómo respiran las barras a medida que gira la T.</p>
      <p class="aside">La temperatura remodela toda la curva; <span class="tok">top-k</span> y <span class="tok">top-p</span> en cambio cercenan la cola improbable antes de extraer. Distintas perillas, a menudo combinadas.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Añadir y luego realimentar</h3>
      <p>El token muestreado cae y se une a la secuencia — y al instante pasa a formar parte de la entrada para la siguiente predicción. Observa cómo se cierra el bucle: <em>puntuar → muestrear → añadir → puntuar…</em> una frase que se escribe a sí misma.</p>
      <p>Cada nuevo token hace solo una pizca de trabajo nuevo: calcula su propia K y V, y luego atiende sobre todo lo que ya está en caché. El bucle se ejecuta hasta que el modelo extrae un token especial de <strong>parada</strong> — su manera de decir "he terminado".</p>`,
    },
    {
      side: 'right',
      html: `<h3>La caché KV — por qué se mantiene rápida</h3>
      <p>Aquí está el truco que hace esto práctico. Una vez calculadas la K y la V de un token, nunca cambian — así que el modelo <strong>las conserva</strong> en lugar de recalcularlas. Ese montón almacenado es la <strong>caché KV</strong>, y las celdas apiladas encima de cada token <em>son</em> esa caché.</p>
      <p>Sin ella, cada nuevo token reprocesaría todo el pasaje desde cero, con el trabajo amontonándose como el cuadrado de la longitud — <span class="tok">O(n²)</span>. Con ella, cada paso añade solo una columna y lee el resto — casi plano, <span class="tok">O(n) per token</span>. El medidor de la izquierda muestra cómo se ensancha la brecha.</p>
      <p class="aside">La caché es también por lo que las conversaciones largas cuestan más memoria: crece con cada token, y el modelo la lee entera en cada paso.</p>`,
    },
    {
      side: 'left',
      html: `<h3>El bucle</h3>
      <div class="postcard">La inferencia es un bucle: haz el prefill del prompt, puntúa cada token (logits → softmax), muestrea uno, añádelo, repite — con la caché KV guardando el trabajo pasado para que cada paso siga siendo barato.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/sampling">muestreo</a>
        <a class="deepdive" data-route="/frontier">siguiente: La frontera →</a>
      </div>`,
    },
  ],
}
