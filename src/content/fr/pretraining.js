export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 06 · du texte à ChatGPT</span>
      <h2>Le pré-entraînement</h2>
      <p class="lead">Avant de pouvoir discuter, un modèle lit une part énorme d'internet et joue à un seul jeu, encore et encore : <strong>prédire le token suivant</strong>. (Un <em>token</em> est un morceau de texte — en gros un mot ou un fragment de mot — l'unité qu'un modèle lit et écrit.)</p>
      <p>Montrez-lui <span class="tok">The cat sat on the&nbsp;▢</span> et il doit remplir le blanc — non pas avec une seule supposition, mais en répartissant une <strong>probabilité</strong> sur chaque token qu'il connaît.</p>
      <p>Sans entraînement, ce pari vaut à peine mieux qu'un haussement d'épaules : un soupçon sur <span class="tok">mat</span>, des soupçons sur une centaine de mots erronés.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Deviner, vérifier, ajuster — mille milliards de fois</h3>
      <p>Le blanc est maintenant révélé : le vrai token suivant était <span class="tok">mat</span>. L'écart entre le pari du modèle et la vérité est la <strong>perte</strong> — un nombre qui mesure à quel point il s'est trompé. Sûr de lui et juste : score faible ; sûr de lui et faux : score élevé.</p>
      <p>Ce score ajuste d'un cheveu les milliards de <em>poids</em> du modèle pour qu'il se trompe un peu moins la prochaine fois. Puis faites glisser la fenêtre d'un token et recommencez — chaque position dans chaque document est un exemple gratuit.</p>
      <p class="aside">Personne n'a étiqueté quoi que ce soit : le mot suivant est sa propre clé de correction. C'est l'<strong>apprentissage auto-supervisé</strong> — et la perte qu'il fait chuter est l'<strong>entropie croisée</strong>, qui récompense le fait de placer de la probabilité sur le token qui est réellement venu ensuite.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Une phrase devient internet</h3>
      <p>Un seul exemple n'enseigne presque rien. La magie, c'est l'<strong>échelle</strong>. Cette unique phrase devient des livres, des pages web, du code et des conversations — un torrent de texte déversé à travers cette même boucle de prédiction du token suivant.</p>
      <p>Les modèles de pointe s'entraînent sur des <strong>milliers de milliards</strong> de tokens, soit l'internet lisible de nombreuses fois. Pour bien remplir chaque blanc sur l'ensemble — grammaire, faits, raisonnement, code — le modèle est forcé de se construire une image opérante du monde que le texte décrit. La connaissance arrive comme un <em>effet secondaire</em> du fait de devenir bon au jeu.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Les lois d'échelle</h3>
      <p>Trois leviers déterminent jusqu'où il devient bon : plus de <strong>données</strong>, plus de <strong>calcul</strong> (la puissance brute, en heures-GPU) et plus de <strong>paramètres</strong> (les poids, comptés en milliards). Augmentez les trois ensemble et la perte continue de chuter.</p>
      <p>Le plus frappant, c'est avec quelle <em>prévisibilité</em> elle chute — une loi de puissance régulière, une ligne presque droite sur un graphique log-log. Les chercheurs entraînent donc de petits modèles peu coûteux et prédisent la perte d'un modèle géant avant d'y dépenser le moindre sou.</p>
      <p class="aside">C'est cette prévisibilité qui a justifié des fortunes englouties dans des entraînements toujours plus grands — la courbe promet pour ainsi dire le gain à l'avance. (Une règle empirique issue des travaux Chinchilla : faites croître données et paramètres ensemble, très grossièrement 20 tokens par paramètre.)</p>`,
    },
    {
      side: 'left',
      html: `<h3>Brillant, mais pas encore utile</h3>
      <p>Ce qui en émerge est un <strong>modèle de base</strong>. Il a absorbé une quantité stupéfiante de connaissances — mais son seul instinct est de <em>poursuivre</em> le texte dans le style de l'internet, pas de vous aider.</p>
      <p>Demandez-lui "Quelle est la capitale de la France ?" et il pourrait vous renvoyer cinq autres questions de quiz — car en ligne, une question est souvent suivie d'autres questions. Il n'a aucune envie de répondre, de rester sur le sujet ou de refuser une requête nuisible. Il a été entraîné à prédire le token suivant, pas à vous assister.</p>
      <p>Toute la connaissance est là. Il faut juste lui apprendre à se <em>comporter</em>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Lui apprendre à se comporter</h3>
      <p>Une seconde phase — le <strong>post-entraînement</strong>, ou <em>alignement</em> — aligne le comportement du modèle sur ce que les gens veulent vraiment. La recette la plus connue est le <strong>RLHF</strong>, et elle commence par de la pure imitation.</p>
      <p><strong>Réglage fin supervisé (SFT) :</strong> des personnes compétentes rédigent des milliers de réponses <em>idéales</em>, et le modèle s'entraîne dessus avec la même mécanique de prédiction du token suivant — copiant désormais la forme d'une bonne réponse : directe, ciblée, utile. Presque du jour au lendemain, il cesse de divaguer et se met à répondre.</p>
      <p><strong>Modèle de récompense :</strong> les démonstrations ne peuvent pas tout couvrir, alors on montre aux gens des <em>paires</em> de réponses et ils choisissent la meilleure. Des milliers de ces choix entraînent un <strong>juge</strong> distinct qui peut ensuite noter n'importe quelle réponse à la manière dont les gens avaient tendance à le faire.</p>`,
    },
    {
      side: 'left',
      html: `<h3>S'exercer vers ce que les gens préfèrent</h3>
      <p><strong>Réglage fin par RL :</strong> le modèle s'exerce maintenant tout seul. Il rédige une réponse, le juge la note, et le modèle est orienté vers ce qui obtient le meilleur score — de nombreuses tentatives, chacune renforcée à proportion de sa récompense. (Le <em>RL</em>, apprentissage par renforcement, signifie simplement apprendre à partir de ce signal de récompense plutôt que d'exemples figés.)</p>
      <p>C'est le même réseau d'un bout à l'autre : le pré-entraînement y a versé la connaissance, le post-entraînement en a tiré l'utilité. Aucune moitié ne fonctionne seule — un modèle de base sait mais ne coopère pas ; un alignement sans rien dessous n'a rien à dire.</p>
      <div class="postcard">Le pré-entraînement le fait <strong>savoir</strong>. L'alignement le rend <strong>utile</strong>. Ensemble, c'est ChatGPT.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF</a>
        <a class="deepdive" data-route="/inference">suivant : l'inférence →</a>
      </div>`,
    },
  ],
}
