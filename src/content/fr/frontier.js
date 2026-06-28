export default {
  beats: [
    {
      side: 'center',
      html: `<span class="eyebrow">Chapitre 10 · où nous en sommes</span>
      <h2>Les LLM de pointe</h2>
      <p class="lead">Vous avez construit le cœur. Les <strong>modèles de pointe</strong> d'aujourd'hui — les systèmes les plus capables actuellement en service — sont ce même cœur : les <span class="tok">embeddings</span> transforment les tokens en vecteurs, l'<span class="tok">attention</span> leur permet d'échanger du sens, des blocs empilés ajoutent de la profondeur, et toute la machine prédit un token à la fois.</p>
      <p>Rien de nouveau n'a été glissé en dessous. Ce qui a changé, c'est l'<strong>échelle</strong> — bien plus de paramètres, de données et de calcul, exactement comme les lois d'échelle l'avaient promis — et cinq améliorations boulonnées par-dessus. Ce chapitre visite chacune d'elles, puis retrace tout le parcours.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Mélange d'experts</h3>
      <p>Imaginez un hôpital de spécialistes au lieu d'un généraliste épuisé. Un <strong>mélange d'experts</strong> (mixture of experts) remplace l'unique couche feed-forward du bloc par de nombreux réseaux <strong>experts</strong> plus petits, plus un minuscule <strong>routeur</strong> qui lit chaque token et l'envoie seulement au meilleur ou aux deux meilleurs. Les autres restent éteints.</p>
      <p>C'est l'<span class="tok">activation parcimonieuse</span> : les paramètres <em>totaux</em> du modèle peuvent gonfler jusqu'aux milliers de milliards tandis que les paramètres <em>actifs</em> par token restent peu nombreux — un cerveau bien plus grand pour un coût d'exécution à peu près identique. Le routeur est lui-même appris (une porte softmax), incité à répartir la charge pour qu'aucun expert ne soit surmené ni affamé.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Le contexte long — et pourquoi il coûte cher</h3>
      <p>La <strong>fenêtre de contexte</strong> est tout ce que le modèle peut voir d'un coup : sa mémoire de travail. Les premiers modèles retenaient quelques milliers de tokens ; ceux d'aujourd'hui en retiennent <strong>des centaines de milliers</strong> — un livre entier, une longue transcription, une base de code complète d'un seul regard.</p>
      <p>Mais l'attention compare <em>chaque token à tous les autres</em>, donc le travail croît avec le <strong>carré</strong> de la longueur : doublez les tokens et vous quadruplez le coût. Regardez la grille — cette explosion en N×N, plus le cache KV en croissance perpétuelle qui l'alimente, voilà le vrai prix d'une longue mémoire, et là où va une grande part de l'ingénierie de pointe.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Plusieurs sens, un seul espace</h3>
      <p><strong>Multimodal</strong> signifie plusieurs types d'entrée, un seul modèle. Le texte n'est pas la seule chose que l'on peut découper en tokens : une <span style="color:var(--amber)">image</span> est tranchée en patchs carrés, l'<span style="color:var(--violet)">audio</span> en courtes fenêtres de son. Chaque morceau passe par une petite projection apprise qui le dépose dans le <em>même</em> espace vectoriel que les <span style="color:var(--cyan)">mots</span>.</p>
      <p>Dès qu'un patch de photo et un mot ne sont tous deux que des tokens dans cet unique espace partagé, l'attention même que vous comprenez déjà peut les pondérer <em>ensemble</em> — une image et une phrase devenant une seule pensée continue.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Réfléchir avant de répondre</h3>
      <p>Face à un problème difficile, lâcher le premier token est une piètre stratégie. On entraîne donc les modèles à <strong>réfléchir d'abord</strong> — à écrire une <em>chaîne de pensée</em> privée : un brouillon d'étapes, de tentatives et d'<span style="color:var(--magenta)">impasses</span> à abandonner, le tout avant la réponse visible.</p>
      <p>Ils apprennent à bien réfléchir par <strong>apprentissage par renforcement</strong> sur des problèmes dont la réponse est vérifiable : essayer de nombreuses fois, renforcer le raisonnement qui atteint le bon résultat. Et la surprise — le <span class="tok">test-time compute</span> — c'est que laisser simplement un modèle dépenser <em>plus</em> de tokens à réfléchir lors de l'inférence procure de façon fiable de meilleures réponses. La même machine à prédire le token suivant, désormais tournée vers l'intérieur avant de parler ; le budget de réflexion échange de la latence contre de la précision.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Outils &amp; agents</h3>
      <p>Un modèle seul ne peut produire que du texte. Mais ce texte peut être une <strong>instruction</strong> : <span style="color:var(--amber)">chercher sur le web</span>, <span style="color:var(--rose)">exécuter du code</span>, <span style="color:var(--blue)">modifier un fichier</span>. Un harnais exécute l'outil et réinjecte le <span style="color:var(--lime)">résultat</span> comme nouveau contexte.</p>
      <p>Enveloppez cela dans une boucle — décider d'une action, l'accomplir, observer le résultat, décider de la suivante — et le modèle devient un <strong>agent</strong> : un système qui poursuit un objectif étape par étape au lieu de répondre d'un seul coup. C'est toujours de la pure prédiction du token suivant ; la différence, c'est que la transcription inclut désormais le monde qui répond.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Tout le parcours</h3>
      <p>Prenez du recul : tout cela n'est qu'une seule idée qui se déploie. Un seul <span class="tok">neurone</span> pèse ses entrées. L'<span class="tok">attention</span> laisse les tokens partager du sens. Le <span class="tok">transformer</span> empile cela en profondeur. L'<span class="tok">entraînement</span> façonne les poids à partir des données ; l'<span class="tok">inférence</span> les exécute pour écrire le token suivant. Tout ce chapitre repose sur ce même socle — passé à l'échelle, et tourné vers le monde.</p>
      <div class="postcard">Un modèle de pointe est le même cœur transformer que vous avez construit — passé à l'échelle, avec des experts parcimonieux, un vaste contexte, plusieurs sens, un raisonnement qui s'enseigne, et des outils pour agir dans le monde.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/">rejouer le parcours ↺</a><a class="deepdive" data-route="/attention">revoir l'attention</a></div>`,
    },
  ],
}
