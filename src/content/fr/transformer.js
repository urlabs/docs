export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 05 · la machine</span>
      <h2>Le Transformer</h2>
      <p class="lead">Voici le schéma qui a tout déclenché — le <strong>bloc transformer</strong> de l'article de 2017 "Attention Is All You Need", le moteur au cœur de chaque LLM moderne. Il paraît dense, alors mettons-le en marche et regardons une phrase le gravir, une boîte à la fois.</p>
      <p>Lisez-le de bas en haut. Les tokens entrent par le pied, remontent un <strong>flux résiduel</strong> central à travers une poignée de boîtes, et une prédiction du mot suivant tombe par le sommet. Le bloc tout entier conserve à la rangée de vecteurs exactement la même forme qu'il a reçue — c'est là le secret qui permet de l'empiler en profondeur.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Entrées — encoder, puis situer</h3>
      <p>D'abord, chaque token devient un <strong>vecteur</strong> (l'embedding du chapitre précédent). Mais l'attention, la boîte suivante, est aveugle à l'ordre — mélangez la rangée et elle restitue les mêmes vecteurs ; pour elle, <span class="tok">The cat sat</span> et <span class="tok">sat cat The</span> sont identiques.</p>
      <p>Alors, un <strong>encodage positionnel</strong> — un vecteur fixé par la seule position (1re, 2e, 3e…) — est <em>ajouté</em> à chaque token avant que l'ascension ne commence. Désormais, "le mot" porte aussi "l'endroit où le mot se trouve". Cela n'a lieu qu'une fois, tout en bas.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Attention multi-têtes masquée</h3>
      <p>La première boîte est l'endroit où les tokens <strong>se parlent</strong>. Chaque token forme une requête, parcourt la rangée et capte le sens des mots qui comptent pour lui — exactement le mécanisme du chapitre sur l'attention, exécuté par plusieurs <strong>têtes</strong> en parallèle, chacune traquant un type de relation différent.</p>
      <p>Le "<strong>masquage</strong>" est la touche propre aux LLM : un token ne peut prêter attention qu'aux mots <em>derrière</em> lui, jamais devant — regardez les liens n'aller que dans un seul sens. Le modèle est en train d'apprendre à prédire le mot suivant ; le laisser jeter un œil à la réponse serait tricher.</p>
      <p class="aside">C'est la seule boîte où l'information circule <em>entre</em> les tokens. Tout le reste du bloc traite chaque position isolément.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Add &amp; Norm — le raccourci résiduel</h3>
      <p>Remarquez la flèche qui fait une boucle <em>autour</em> de la boîte d'attention. Le bloc ne remplace jamais un token — il <strong>ajoute</strong> le résultat de l'attention par-dessus l'entrée d'origine. Ce contournement est la <strong>connexion résiduelle</strong>, et c'est lui qui permet au signal (et, pendant l'entraînement, aux gradients) de survivre à une pile très profonde.</p>
      <p>Ensuite, la <strong>LayerNorm</strong> redimensionne le vecteur de chaque token individuellement, gardant les nombres sains au lieu de les laisser exploser ou s'évanouir à mesure que la tour grandit. Ajouter, puis normaliser — et vous reverrez exactement ce même duo juste après la boîte suivante.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Feed-Forward — chaque token réfléchit seul</h3>
      <p>Maintenant, chaque token est affiné <em>isolément</em>, sans regarder de côté. La boîte <strong>feed-forward</strong> est un petit <strong>réseau de neurones à deux couches</strong> (un MLP) appliqué à chaque position : elle gonfle le vecteur jusqu'à environ <strong>4× sa largeur</strong>, le tord à travers une non-linéarité, puis le reprojette vers le bas — regardez-le se déployer puis se replier.</p>
      <p>Rien n'est consulté dans une table ; chaque poids a été appris. Si l'attention est l'endroit où les tokens <em>partagent</em>, le feed-forward est celui où chaque token <em>digère</em> ce qu'il a entendu. Sa sortie reçoit le même traitement <strong>Add &amp; Norm</strong> — raccourci résiduel, puis normalisation.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Un bloc — maintenant, empilez-le × N</h3>
      <p>Attention, Add &amp; Norm, feed-forward, Add &amp; Norm : voilà <em>un</em> bloc. Un vrai transformer en empile des <strong>dizaines</strong> (le fameux "N×"), tous identiques de forme mais chacun avec ses <em>propres</em> poids appris, si bien que chaque couche est libre de faire un travail différent.</p>
      <p>La même rangée de vecteurs les traverse tout droit vers le haut le long de ce flux résiduel — chaque bloc la lit, y ajoute sa petite retouche et la transmet.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Le sens s'affine avec la profondeur</h3>
      <p>Regardez l'affinage se propager vers le haut. Les premiers blocs captent les choses simples — la grammaire, les frontières entre les mots, qui est assis à côté de qui. Les blocs plus profonds construisent vers le sens abstrait, l'intention et les liens à longue portée à travers la phrase.</p>
      <p>Chaque bloc infléchit un peu les vecteurs ; empilées en profondeur, ces petites poussées se cumulent en une lecture du texte riche et sensible au contexte.</p>
      <p class="aside">Ce n'est pas qu'une métaphore — sondez le flux entre les couches et la progression apparaît : les couches basses suivent les catégories grammaticales, les couches hautes portent le sens et la référence. Chaque couche laisse des caractéristiques que la suivante pourra utiliser.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Linear → Softmax → le token suivant</h3>
      <p>Tout en haut, le modèle prend le vecteur final de la <em>dernière</em> position et le fait passer par la boîte <strong>Linear</strong> — une grande <strong>matrice de sortie</strong> comptant une ligne par mot du vocabulaire — le transformant en un score brut, un <strong>logit</strong>, pour chaque token suivant possible.</p>
      <p>Le <strong>Softmax</strong> écrase ensuite cette rangée de scores en dents de scie pour en faire des probabilités nettes dont la somme fait un. Pour <span class="tok">The cat sat on the…</span>, une barre domine toutes les autres : <span class="tok">mat</span>.</p>
      <p class="aside">Cette matrice de sortie est l'<strong>unembedding</strong> — un miroir de la table d'embeddings tout en bas. L'une fait correspondre les mots → vecteurs ; l'autre, le vecteur final → un vote sur les mots.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Toute la machine</h3>
      <div class="postcard">Encodez et situez les tokens, laissez-les partager du sens (attention masquée), affinez chacun seul (feed-forward), en gardant un raccourci résiduel et une normalisation après chaque étape. Empilez ce bloc × N, lisez le vecteur du sommet, puis laissez Linear + Softmax lui attribuer un score sur tout le vocabulaire — et le mot suivant en tombe.</div>
      <p class="aside">Voilà tout le <strong>transformer à décodeur seul</strong>, la forme derrière les modèles de type GPT. Aucune idée nouvelle n'attend au-delà — ce qui suit est cette même machine, nourrie de bien plus de texte et passée à une bien plus grande échelle.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">les maths de l'attention</a>
        <a class="deepdive" data-route="/pretraining">suivant : le pré-entraînement →</a>
      </div>`,
    },
  ],
}
