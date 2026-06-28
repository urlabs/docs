export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 09 · ce qu'il n'a jamais appris</span>
      <h2>Connaissances &amp; récupération</h2>
      <p class="lead">Une fois l'entraînement terminé, les poids d'un modèle sont <strong>figés</strong>. Tout ce qu'il "sait" a été gravé avant sa date de coupure — il n'a donc pas pu lire l'actualité du jour, le wiki de votre entreprise, ni le fichier que vous avez téléversé il y a une seconde.</p>
      <p>Pourtant, un bon assistant répond volontiers au sujet de votre PDF. L'astuce n'est pas plus d'entraînement — c'est de laisser le modèle <strong>aller chercher des informations</strong> au moment de répondre, et de les lire avant de répliquer. Ce procédé est la <strong>récupération</strong>, et associée à la génération, on l'appelle <strong>RAG</strong>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Transformer les documents en une carte du sens</h3>
      <p>D'abord, les connaissances que vous voulez avoir sous la main — manuels, pages web, une base de code entière — sont découpées en petits <strong>morceaux</strong> (chunks), et chaque morceau passe par le modèle d'embedding du chapitre <span class="tok">Le sens comme géométrie</span>. Chaque morceau devient un <strong>vecteur</strong> : un point dans ce même espace de sens à haute dimension.</p>
      <p>Stockez tous ces points et vous obtenez une <strong>base de données vectorielle</strong> — une galaxie où la proximité signifie "à peu près la même chose", prête à être interrogée par le sens plutôt que par mot-clé.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Plonger la question, elle aussi</h3>
      <p>Quand vous demandez quelque chose, votre question est poussée à travers le <em>même</em> modèle d'embedding, ce qui la dépose comme un point dans ce même espace — venant dériver juste à côté des morceaux qui en parlent.</p>
      <p>Désormais, "trouver les documents pertinents" devient un problème de géométrie : <strong>quels points se trouvent le plus près de la question ?</strong></p>`,
    },
    {
      side: 'right',
      html: `<h3>Chercher par le sens, pas par les mots</h3>
      <p>La base de données trouve les morceaux les <strong>plus proches</strong> de la question — par la même proximité cosinus que dans le chapitre sur les embeddings. C'est la <strong>recherche sémantique</strong> : elle met en correspondance le <em>sens</em>, si bien qu'une question sur "ma voiture ne démarre pas" peut faire remonter un morceau traitant de "batterie à plat" qui ne partage pas un seul mot avec elle.</p>
      <p class="aside">À grande échelle, ce n'est pas un balayage par force brute — un index de <strong>plus proches voisins approchés</strong> le maintient quasi instantané sur des milliards de vecteurs.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Extraire les meilleures correspondances</h3>
      <p>Gardez la poignée la plus proche — les morceaux <strong>top-k</strong>. Ce sont les extraits les plus susceptibles de contenir la réponse, tirés directement de vos propres sources plutôt que de la mémoire du modèle.</p>
      <p>C'est ici que la qualité se gagne ou se perd : récupérez les mauvais morceaux et le modèle répond à partir des mauvais faits. Un bon découpage, de bons embeddings et un seuil raisonnable comptent tous.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Les déposer dans le contexte</h3>
      <p>Les morceaux récupérés sont collés dans la <strong>fenêtre de contexte</strong> du modèle — la mémoire de travail du chapitre sur l'inférence — juste à côté de votre question, généralement enveloppés dans une instruction du type "réponds en utilisant ces sources".</p>
      <p>Le modèle n'a jamais appris ces faits. Il ne fait que les <em>lire</em> maintenant, exactement comme il lit le reste du prompt.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Une réponse ancrée</h3>
      <p>Maintenant, le modèle rédige sa réponse <em>à partir du texte récupéré</em> — et comme les sources se trouvent là, dans le contexte, il peut les <strong>citer</strong>. Interrogé à froid, un modèle peut inventer avec assurance une réponse d'apparence plausible (une <strong>hallucination</strong>) ; ancrée dans de vrais morceaux, la réponse reste liée à quelque chose de vrai.</p>
      <p>Les mêmes poids figés, la même machine à prédire le token suivant — désormais ancrée à des faits qu'elle peut désigner.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Pourquoi la récupération a tout changé</h3>
      <div class="postcard">La récupération offre à un modèle figé un savoir frais, privé et vérifiable : plongez vos documents dans une base de données vectorielle, plongez la question, allez chercher les morceaux les plus proches, et laissez le modèle les lire avant de répondre. C'est RAG — comment les assistants restent à jour, citent leurs sources et apprennent votre monde sans réentraînement.</div>
      <p class="aside">Le même mécanisme alimente la <strong>mémoire</strong> à long terme d'un modèle et ses <strong>outils</strong> : une recherche web n'est que de la récupération sur tout l'internet, déposée dans le contexte.</p>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/embeddings">revoir les embeddings</a>
        <a class="deepdive" data-route="/frontier">suivant : la frontière →</a>
      </div>`,
    },
  ],
}
