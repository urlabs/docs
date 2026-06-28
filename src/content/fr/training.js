export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 02 · comment il apprend</span>
      <h2>L'apprentissage</h2>
      <p class="lead">Un réseau tout neuf n'est rien d'autre que des <strong>poids</strong> — des millions de molettes internes (ses <em>paramètres</em>), chacune réglée sur une petite valeur aléatoire. Des molettes aléatoires donnent des réponses aléatoires : au tout début, le modèle se trompe sur presque tout — pas mieux que le hasard.</p>
      <p>Personne ne règle ces molettes à la main ; elles sont bien trop nombreuses. À la place, le réseau est <em>entraîné</em> — on lui montre exemple après exemple et on l'ajuste, un peu à la fois, jusqu'à ce que ses réponses deviennent fiablement justes. Tout ce processus, c'est l'<strong>entraînement</strong>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Apprendre par l'exemple</h3>
      <p>Pour apprendre, le réseau a besoin d'une <strong>question dont nous connaissons déjà la réponse</strong>. Montrez-lui le début d'une phrase et le vrai mot suivant ; montrez-lui une photo déjà étiquetée <em>chat</em>. Le réseau formule sa propre supposition, et nous la comparons à la vérité.</p>
      <p>L'écart entre la supposition et la vérité, c'est l'<strong>erreur</strong>. Répétez sur des millions d'exemples et les erreurs cessent d'être du bruit aléatoire — elles forment un <em>motif</em>. Et un motif d'erreurs, c'est quelque chose que l'on peut corriger systématiquement.</p>
      <p>Il y a un piège. Un réseau doté d'assez de molettes peut tout simplement <em>mémoriser</em> les exemples qu'il a étudiés — un sans-faute sur ceux-là, puis l'échec sur tout ce qui est nouveau. Ce piège s'appelle le <strong>surapprentissage</strong>, et pour le repérer on met de côté des données sur lesquelles le réseau ne s'entraîne jamais — un <strong>ensemble de validation</strong>. Réussir la feuille de révision est facile ; le vrai but est de <em>généraliser</em> à des exemples jamais vus.</p>
      <p class="aside">La boule lumineuse représente les poids du réseau en ce moment — pas encore entraînés, perchés haut au-dessus de la vallée.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La perte</h3>
      <p>Pour agir sur toutes ces erreurs, il faut les ramener à un seul nombre : la <strong>perte</strong>. Elle résume à quel point le réseau se trompe sur l'ensemble des exemples — une perte élevée signifie beaucoup de mauvaises réponses, tandis qu'une perte de zéro signifierait la perfection.</p>
      <p>Ce qu'est réellement ce nombre dépend de la tâche. Quand le réseau choisit parmi des catégories — <em>chat</em> contre <em>chien</em>, ou le token suivant dans tout un vocabulaire — la perte est l'<strong>entropie croisée</strong> : elle récompense le fait de concentrer la probabilité sur la bonne réponse et punit les erreurs commises avec assurance. Quand il prédit un simple nombre, la perte est l'<strong>erreur quadratique moyenne</strong> — l'écart entre la supposition et la vérité, élevé au carré. Des règles différentes, le même travail : un score unique pour le degré d'erreur.</p>
      <p>Imaginez maintenant ce nombre comme une <strong>hauteur</strong>. Chaque réglage possible des poids est un point sur le sol, et sa perte est l'altitude du terrain à cet endroit — un vaste paysage vallonné. L'entraînement n'a qu'un seul but : <em>descendre jusqu'à la vallée la plus basse</em>.</p>`,
    },
    {
      side: 'right',
      html: `<h3>La descente de gradient</h3>
      <p>Le paysage est bien trop vaste pour être cartographié — mais vous n'avez jamais besoin de la carte. Où que vous soyez dessus, vous pouvez toujours sentir de quel côté ça <strong>descend</strong>. Cette direction, c'est le <strong>gradient</strong>. Précisément, c'est un vecteur de pentes — une dérivée partielle ∂L/∂wᵢ par poids, chacune indiquant de combien la perte changerait si l'on bougeait cette molette-là. La pente descendante de millions de molettes, lue d'un seul coup.</p>
      <p>La recette est donc d'une simplicité presque gênante : sentez la pente, faites un petit pas vers le bas, puis sentez de nouveau la pente là où vous arrivez. Recommencez. Regardez la perte chuter à chaque pas — c'est cela, très littéralement, un réseau qui apprend.</p>
      <p class="aside">Chaque miette que la boule laisse tomber est un pas. En pratique, on ne mesure pas la pente sur toutes les données à la fois — on l'estime à partir d'un petit <strong>mini-lot</strong> aléatoire et l'on avance sur cette base. C'est la <strong>descente de gradient stochastique</strong> : beaucoup de pas rapides et bruités plutôt que quelques pas exacts, et ce tremblement aide justement la boule à se déloger des impasses peu profondes.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Le taux d'apprentissage</h3>
      <p>Quelle doit être la taille de chaque pas vers le bas ? Cette taille, c'est le <strong>taux d'apprentissage</strong>, et c'est un équilibre délicat.</p>
      <p>Trop grand, et la boule <em>dépasse</em> la cible — elle bondit par-dessus la vallée et atterrit haut sur la pente opposée, ballottant d'un côté à l'autre sans jamais se stabiliser. Trop petit, et elle avance à pas de fourmi, exigeant bien plus d'étapes pour arriver. Un bon entraînement garde le pas juste comme il faut : vif, mais toujours sous contrôle.</p>
      <p>Et contrairement aux poids, personne n'apprend ce nombre — c'est nous qui le fixons. Le taux d'apprentissage est l'<strong>hyperparamètre</strong> le plus lourd de conséquences de l'entraînement, généralement <em>planifié</em> pour diminuer au fil du temps : de grandes enjambées au début pour couvrir du terrain, des pas fins à mesure que la boule approche du fond de la vallée.</p>`,
    },
    {
      side: 'right',
      html: `<h3>La rétropropagation</h3>
      <p>Une boule sur une pente, c'est facile à se représenter. Mais un vrai réseau a des <strong>millions de poids</strong>, et chacun est sa propre direction de déplacement — un paysage à des millions de dimensions, impossible à se figurer.</p>
      <p>L'astuce qui rend tout cela faisable, c'est la <strong>rétropropagation</strong>. En partant de l'erreur à la sortie, elle remonte <em>à rebours</em> à travers les couches — comme retracer une crue vers l'amont pour trouver chaque source qui l'a alimentée — et attribue à chaque poids sa propre part de responsabilité : dans quelle direction se déplacer, et de combien. Son moteur est une seule idée du calcul différentiel — la <strong>règle de dérivation en chaîne</strong> — appliquée couche par couche : la responsabilité de chaque couche est remultipliée vers la couche précédente, pas à pas, jusqu'à ce que cette unique passe arrière ait calculé tout le gradient.</p>
      <p>Mettez tout cela bout à bout et vous obtenez la boucle complète, répétée des millions de fois : <em>supposer → mesurer la perte → rétropropager → pousser chaque poids d'un pas vers le bas → supposer de nouveau</em>.</p>
      <div class="postcard">L'entraînement, c'est rouler vers le bas sur le paysage d'erreur — et la rétropropagation indique à chaque poids, un par un, de quel côté est le bas.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/embeddings">suivant : le sens comme géométrie →</a></div>`,
    },
  ],
}
