import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Approfondissement · inférence</span>
      <h2>Les stratégies d'échantillonnage</h2>
      <p class="lead">Après la passe avant, le modèle produit une probabilité pour chaque token de son vocabulaire. L'<strong>échantillonnage</strong> est l'étape finale : décider quel token émettre réellement.</p>`,
    },
    {
      html: `<h3>Glouton vs échantillonnage</h3>
      <p>Le décodage <strong>glouton</strong> choisit toujours l'unique token de plus haute probabilité. Il est déterministe et cohérent — la même consigne donne toujours la même sortie — mais cette prévisibilité a un coût : le modèle peut se retrouver coincé dans des boucles répétitives et s'aventure rarement au-delà de l'évident. L'<strong>échantillonnage</strong> tire au hasard dans toute la distribution, pondéré par la probabilité. Les tokens moins bien classés gardent une chance, et c'est là qu'entrent la variété et la créativité.</p>`,
    },
    {
      html: `<h3>La température</h3>
      <p>La température T contrôle à quel point la masse de probabilité est concentrée avant l'échantillonnage. Diviser chaque logit par T avant le softmax aiguise la distribution quand T est petit et l'aplatit quand T est grand :</p>
      ${tex('p_i=\\frac{\\exp(z_i/T)}{\\sum_j \\exp(z_j/T)}', true)}
      <p>T = 1 donne la distribution brute du modèle. T &lt; 1 le rend plus tranché — utile pour les questions-réponses factuelles et le code. T &gt; 1 répartit la masse vers les tokens moins bien classés — pratique pour le brainstorming et l'écriture créative. Regardez les barres respirer à mesure que T varie.</p>`,
    },
    {
      html: `<h3>Top-k &amp; Top-p (nucleus)</h3>
      <p>Même avec un réglage soigné de la température, un vocabulaire de 50 000 tokens peut placer une probabilité non négligeable sur des mots complètement faux. Le rognage de la queue les élimine avant le tirage. <strong>Top-k</strong> ne garde que les k tokens les mieux classés — simple, mais fragile quand la forme de la distribution change selon les contextes. <strong>Top-p</strong> (échantillonnage du noyau) garde le plus petit ensemble de tokens dont les probabilités totalisent au moins p, de sorte que le noyau se resserre automatiquement quand le modèle est sûr de lui et s'élargit quand il hésite. Un Top-p autour de 0,9 est le réglage par défaut le plus rigoureux.</p>
      <div class="postcard">Chaîne de traitement : redimensionner avec la température &rarr; rogner la queue avec top-k ou top-p &rarr; tirer un token parmi ce qui reste.</div>`,
    },
  ],
}
