export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Capítulo 03 · palabras en números</span>
      <h2>Cómo entran las palabras</h2>
      <p class="lead">Por debajo, una red neuronal es pura aritmética — sumas y multiplicaciones, ejecutadas miles de millones de veces. No puede leer una letra; solo sabe procesar <strong>números</strong>. Así que la primerísima tarea es convertir el lenguaje en números con los que pueda trabajar.</p>
      <p>El texto se trocea en <span class="tok">tokens</span> — fragmentos de palabra, cada uno una palabra entera o un trozo de una. Cada token tiene un <strong>ID</strong>: su número de fila en una gigantesca tabla de búsqueda que el modelo construyó durante el entrenamiento. Lee esa fila y obtienes una lista de números — el <strong>vector</strong> del token, también llamado su <strong>embedding</strong>. Esos vectores son lo que fluye hacia la primera capa de la red.</p>
      <p>Esa tabla no se teclea a mano. Es una losa de <strong>pesos</strong> — una fila por token del vocabulario — aprendida durante el entrenamiento como cualquier otro número del modelo. Y elegir una fila es en sí mismo pura aritmética: lo mismo que multiplicar toda la tabla por un vector que es todo ceros excepto un único <strong>1</strong>. Una búsqueda es una multiplicación disfrazada.</p>
      <p class="aside">texto → tokens → IDs → vectores → hacia la primera capa.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Las imágenes también</h3>
      <p>El mismo truco funciona con las imágenes. Una imagen se corta en una cuadrícula de pequeños <strong>parches</strong> — pequeñas baldosas cuadradas — y cada parche se aplana en su propia lista de números, un vector exactamente como el de un token.</p>
      <p>El aplanado oculta un paso: esos números crudos de píxeles pasan por una <strong>proyección</strong> aprendida — una pequeña matriz — que redimensiona cada parche a la longitud de vector del modelo. Solo entonces una baldosa de píxeles coincide con un vector de palabra dimensión por dimensión.</p>
      <p>Así, ya haya empezado como una palabra o como un cuadrado de píxeles, todo llega a la red como la misma clase de cosa: <em>un vector de números</em>. Así es como un mismo modelo puede leer texto <em>y</em> ver imágenes — para cuando llegan, hablan un solo idioma.</p>`,
    },
    {
      side: 'center',
      html: `<h3>El significado como geometría</h3>
      <p class="lead">Aquí viene lo hermoso. Un vector no es más que un <strong>punto en el espacio</strong> — y el entrenamiento organiza ese espacio por <em>significado</em>.</p>
      <p>Cada número del vector es una coordenada. Dos números fijan un punto en un mapa; tres lo ubican dentro de una habitación. Un embedding real lleva muchos más — comúnmente <strong>768</strong> números, y varios <strong>miles</strong> (4096 y más) en los modelos más grandes. Eso son cientos de <strong>dimensiones</strong>, más de las que mente alguna puede imaginar — así que lo comprimimos hasta las tres que podemos dibujar.</p>
      <p>Cada palabra del vocabulario se convierte en un punto, y todo el vocabulario se convierte en una galaxia. Dónde se sitúa un punto <em>es</em> lo que el modelo entiende que esa palabra significa.</p>
      <p class="aside">La galaxia de aquí es una <em>sombra</em> — una proyección 3D de un espacio con cientos de ejes. Las distancias y los ángulos reales viven allá arriba; el dibujo solo los insinúa.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Las cosas similares se agrupan</h3>
      <p>Las palabras que aparecen en compañía parecida acaban en lugares parecidos. Así, <span class="tok">cat</span>, <span class="tok">dog</span> y <span class="tok">lion</span> se asientan en un vecindario — mientras que <span class="tok">paris</span>, <span class="tok">tokyo</span> y <span class="tok">cairo</span> se reúnen en otro.</p>
      <p>¿Cómo? Durante el entrenamiento, el modelo lee cantidades enormes de texto y va adivinando una palabra a partir de sus vecinas. Cada conjetura errónea envía una corrección hacia atrás — la misma <strong>retropropagación</strong> del capítulo anterior — empujando las filas de la tabla de embeddings el ancho de un cabello. Las palabras usadas de la misma manera son arrastradas hacia el mismo lugar, una y otra vez, hasta que las palabras relacionadas se amontonan juntas. Nadie las coloca; las posiciones se organizan por sí solas.</p>
      <p>¿Qué tan cerca es cerca? Lo precisa la <strong>similitud coseno</strong> — el coseno del ángulo entre dos vectores, al que solo le importa la dirección, no la longitud. Apunta en la misma dirección y marca alrededor de <strong>1</strong>; sitúate en ángulo recto y cae a <strong>0</strong>. <span class="tok">cat</span> y <span class="tok">dog</span> puntúan alto; <span class="tok">cat</span> y <span class="tok">tokyo</span> se hunden hacia cero.</p>
      <p class="aside">Nadie etiquetó estos grupos como "animales" o "ciudades". La cercanía <em>es</em> el significado que el modelo dedujo por su cuenta.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Las direcciones cargan significado</h3>
      <p>No es solo <em>dónde</em> se sitúa un punto — la <em>dirección</em> de un punto a otro también carga significado. El ejemplo famoso:</p>
      <p class="lead"><strong>king − man + woman ≈ queen</strong></p>
      <p>El paso de <span class="tok">man</span> a <span class="tok">woman</span> es el mismo paso que de <span class="tok">king</span> a <span class="tok">queen</span> — el espacio ha alineado una dirección constante de "cambiar el género". Sigue esa flecha partiendo de <em>king</em> y aterrizas justo donde vive <em>queen</em>. Puedes hacer <em>aritmética sobre el significado</em>.</p>
      <p>Y no es solo el género. Una dirección de "plural", una dirección de "capital-de", una dirección de "tiempo-pasado" — cada una es un desplazamiento aproximadamente constante que puedes añadir a una palabra para llegar a otra. El significado, resulta, tiene una forma en parte <strong>lineal</strong>, y nadie lo diseñó así.</p>
      <p class="aside">Para ser honestos, la suma rara vez aterriza exactamente sobre <em>queen</em> — tomas el punto más cercano a donde llegas, y los ejemplos más pulcros están un poco escogidos a conveniencia. Pero las direcciones son reales: las relaciones sí viven como desplazamientos repetibles.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Nuestra frase, incrustada</h3>
      <p>Volvamos a nuestra frase recurrente — <em>"The cat sat on the mat because it was tired."</em>. Cada token abandona el origen y vuela hacia su propio punto: esta es la frase siendo <strong>incrustada</strong>.</p>
      <p>Estos vectores son el punto de partida de cada capítulo posterior — pero todavía están crudos y <strong>libres de contexto</strong>. Cada token recibe un punto fijo, el mismo cada vez que aparece, sin importar lo que haya a su lado: el <span class="tok">bank</span> de un río y el <span class="tok">bank</span> que guarda tu dinero comparten un único vector. Antes de que un modelo pueda <em>pensar</em> sobre las palabras, tiene que <strong>ubicarlas</strong> — y eso es todo lo que ha ocurrido hasta ahora.</p>
      <p class="aside">Estos embeddings crudos son <em>estáticos</em> — un vector por token, fijado antes de cualquier contexto. La <strong>atención</strong> del próximo capítulo los hace <em>contextuales</em>: la representación de una palabra se vuelve una función de las palabras que la rodean, de modo que río-<span class="tok">bank</span> y dinero-<span class="tok">bank</span> por fin se separan.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La geometría del significado</h3>
      <div class="postcard">Tanto las palabras como las imágenes se convierten en vectores — puntos en un espacio aprendido donde la cercanía (el ángulo entre ellos) significa similitud y la dirección significa relación. El modelo organizó ese espacio él mismo, a partir de texto crudo. Es el terreno sobre el que se asienta cada capítulo posterior — aunque cada palabra sigue ahí sola, libre de contexto, hasta que la atención les permite mezclarse.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/tokenization">cómo funciona la tokenización</a>
        <a class="deepdive" data-route="/attention">siguiente: La atención →</a>
      </div>`,
    },
  ],
}
