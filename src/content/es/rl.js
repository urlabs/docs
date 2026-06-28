export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 07 · aprender de la recompensa</span>
      <h2>Aprendizaje por refuerzo</h2>
      <p class="lead">El preentrenamiento y el ajuste fino aprenden <em>copiando</em> respuestas fijas. Pero ¿cómo le enseñas a un modelo a hacer algo que <strong>no tiene una única respuesta correcta</strong> — a ser genuinamente útil, o a resolver un problema que nunca ha visto? Lo dejas <strong>intentarlo</strong>, puntúas el intento y lo empujas hacia lo que sea que puntuó bien. Eso es el <strong>aprendizaje por refuerzo</strong>.</p>
      <p>El modelo es la <strong>política</strong>: dada una situación produce una acción — aquí, una respuesta entera. Cada intento gana una <strong>recompensa</strong>: un único número que mide cuán buena fue. Sin etiquetas — solo una puntuación.</p>`,
    },
    {
      side: 'right',
      html: `<h3>El bucle: intentar, puntuar, empujar</h3>
      <p>El RL es un bucle. La política genera un lote de intentos, cada uno se puntúa, y los pesos se empujan para hacer más probable la próxima vez el comportamiento <em>de alta puntuación</em>. Repite, y el lote entero deriva hacia arriba — observa cómo la recompensa promedio sube ronda tras ronda.</p>
      <p>Al modelo nunca se le muestra la respuesta correcta. Solo se le dice <em>cuán buenas</em> fueron sus propias respuestas — así que tiene que <strong>explorar</strong>, dar con lo que funciona y hacer más de eso.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Gradientes de política — sube lo que funciona</h3>
      <p>¿Cómo conviertes una recompensa en una actualización de pesos? El truco central es el <strong>gradiente de política</strong>: haz cada elección que hizo un intento <em>más</em> probable cuando su recompensa fue buena, y <em>menos</em> probable cuando fue mala — escalado por la puntuación. Refuerza a los ganadores (<span style="color:var(--lime)">▲</span>), desalienta a los perdedores (<span style="color:var(--rose)">▼</span>).</p>
      <p>Haz eso a lo largo de miles de intentos y la política desplaza de forma constante sus probabilidades hacia las acciones que dan fruto.</p>
      <p class="aside">La clave para hacerlo estable es una <strong>línea base</strong> — una puntuación típica con la que comparar. Una recompensa <em>por encima</em> de la línea base empuja hacia arriba; <em>por debajo</em> empuja hacia abajo. Quédate con esa idea: es todo GRPO.</p>`,
    },
    {
      side: 'right',
      html: `<h3>De dónde viene la recompensa</h3>
      <p>Para un objetivo nítido puedes puntuar directamente. Pero "¿es esta respuesta <em>útil</em>?" no tiene fórmula. Así que — exactamente como en la receta de ChatGPT — las personas comparan pares de respuestas, y esas preferencias entrenan un <strong>modelo de recompensa</strong> aparte: un <strong>juez</strong> aprendido que puntúa cualquier respuesta como tendía a hacerlo la gente.</p>
      <p>La política practica entonces contra ese juez. Esto es <strong>RLHF</strong> — aprendizaje por refuerzo a partir de retroalimentación humana — y es lo que por primera vez convirtió un crudo predictor de siguiente token en un asistente cooperativo.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/rlhf">cómo funciona RLHF</a></div>`,
    },
    {
      side: 'left',
      html: `<h3>PPO — no te muevas demasiado rápido</h3>
      <p>Persigue la recompensa con demasiada avidez y el modelo se rompe: se deforma hacia lo que sea que engañe a la puntuación y olvida cómo escribir. El caballo de batalla de toda la vida, <strong>PPO</strong> (Proximal Policy Optimization), protege contra eso. <strong>Recorta</strong> cada actualización para que la política no pueda dar un bandazo demasiado lejos en un solo paso, y añade una <strong>correa KL</strong> que la ata al <strong>modelo de referencia</strong> congelado del que partió.</p>
      <p>Mantente cerca de lo que eras, mejora un poco, repite. Estable — pero pesado: PPO también entrena una segunda red de "valor" solo para estimar esa línea base.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Recompensas comprobables — deja que el mundo juzgue</h3>
      <p>Para las matemáticas, el código y la lógica hay algo mejor que un juez aprendido: <strong>comprobar la respuesta</strong>. Ejecuta el código contra pruebas; verifica la demostración; compara con el resultado conocido. La recompensa es simplemente <strong>correcta o incorrecta</strong> — nada que entrenar, nada que engañar.</p>
      <p>Esto es <strong>RLVR</strong> (RL a partir de recompensas comprobables), y es el motor detrás de los <strong>modelos de razonamiento</strong> de hoy: una señal honesta, barata e imposible de engañar que puedes ejecutar a escala enorme.</p>`,
    },
    {
      side: 'left',
      html: `<h3>GRPO — calificar en la curva</h3>
      <p>Si la recompensa es solo "correcta o incorrecta", ¿de verdad necesitas toda una red de valor para estimar la línea base? <strong>GRPO</strong> (Group Relative Policy Optimization) dice que no. Para cada pregunta muestrea un <strong>grupo</strong> de respuestas, las puntúa todas, y usa el <strong>promedio</strong> del propio grupo como línea base.</p>
      <p>La <strong>ventaja</strong> de cada respuesta es simplemente cuán por <em>encima o por debajo del promedio del grupo</em> cae — supera el promedio y eres reforzado, quédate corto y eres suprimido. Calificar en la curva. Prescindir de la red de valor de PPO lo hace mucho <strong>más ligero</strong>, y es el método detrás de los recientes modelos abiertos de razonamiento.</p>
      <p class="aside">Es la misma idea del gradiente de política — pero la línea base es gratis: son simplemente tus pares en esa mismísima pregunta.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Lo que desbloquea la recompensa</h3>
      <p>Entrenados así, los modelos aprenden cosas que la imitación nunca les enseñó. Para ganar más recompensa en problemas difíciles empiezan a <strong>pensar durante más tiempo</strong> — escribiendo largas cadenas de razonamiento, probando un enfoque, detectando sus propios errores, retrocediendo e intentándolo de nuevo.</p>
      <p>Nadie demostró esos hábitos; el modelo los <em>descubrió</em> porque ganan recompensa. Ese es el salto de un modelo que meramente responde a uno que genuinamente <strong>razona</strong>.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La idea completa</h3>
      <div class="postcard">El aprendizaje por refuerzo entrena mediante recompensa, no copiando: la política intenta, cada intento se puntúa — por un juez aprendido (RLHF) o un verificador (RLVR) — y los gradientes de política la empujan hacia lo que funciona. GRPO puntúa todo un grupo y califica cada respuesta contra el promedio del grupo: simple, escalable y detrás de los modelos de razonamiento de hoy.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF a fondo</a>
        <a class="deepdive" data-route="/inference">siguiente: La inferencia →</a>
      </div>`,
    },
  ],
}
