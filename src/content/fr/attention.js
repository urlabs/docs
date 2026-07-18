export default {
  beats: [
    {
      html: `<span class="eyebrow">Chapitre 04 · la percée</span>
      <h2>L'attention</h2>
      <p class="lead">Voici notre phrase sous forme de <strong>dix tokens</strong> — un par mot — disposés en anneau. Chaque token est une liste de nombres — un <em>vecteur</em> — qui capture le sens de son mot. Mais le sens n'est pas figé : un mot change selon la compagnie qu'il fréquente.</p>
      <p>Prenez le mot <span class="tok">it</span> — seul, il ne signifie presque rien. Alors comment un token trouve-t-il les autres qui comptent ? Il prête <em>attention</em> : il parcourt toute la phrase, pèse chaque autre mot et fond leur sens dans le sien.</p>`,
    },
    {
      html: `<h3>Requêtes et clés</h3>
      <p>À partir de ses propres nombres, chaque token produit deux petits signaux : une <strong>Requête</strong> ("qu'est-ce que je cherche ?") et une <strong>Clé</strong> ("qu'est-ce que j'offre ?").</p>
      <p>Imaginez chaque personne dans une salle bondée brandissant deux cartes à la fois — une demande de recherche (la Requête) et une étiquette de nom (la Clé). Le modèle confronte chaque demande à chaque étiquette, le tout en un seul balayage.</p>
      <p>Aucune de ces cartes n'est écrite à la main. Chaque token construit sa Requête et sa Clé en multipliant son propre vecteur par une paire de <strong>matrices apprises</strong> — Wq pour la Requête, Wk pour la Clé. L'entraînement règle ces matrices jusqu'à ce que les bonnes demandes trouvent les bonnes étiquettes.</p>`,
    },
    {
      html: `<h3>Les scores : tout comparer</h3>
      <p>La Requête de chaque token est confrontée à la Clé de <em>chaque</em> autre token, et chaque appariement obtient un <strong>score</strong> brut — élevé quand une demande et une étiquette concordent, faible sinon. Cette correspondance est un <strong>produit scalaire</strong> : multipliez les deux vecteurs terme à terme, additionnez les résultats, et il en sort un seul nombre indiquant la force de leur alignement. Regardez <span class="tok">it</span> jauger toute la phrase d'un seul coup.</p>
      <p class="aside">Dix tokens, cela fait 100 comparaisons. Doublez les mots et vous quadruplez le travail — voilà pourquoi les textes très longs deviennent coûteux à traiter.</p>
      <p class="aside">Une subtilité pour la vraie génération de texte : chaque token ne peut noter que les mots qui le <em>précèdent</em>. Le modèle est occupé à prédire le mot suivant, donc le futur reste masqué — il ne peut pas jeter un œil à la réponse. Ici, nous laissons <span class="tok">it</span> parcourir tout l'anneau, mais dans un vrai LLM les faisceaux vers l'avant resteraient éteints.</p>`,
    },
    {
      html: `<h3>Le softmax : aiguiser en poids</h3>
      <p>D'abord, les scores bruts sont mis à l'échelle — divisés par <strong>√dₖ</strong>, la racine carrée du nombre de valeurs que contient chaque Clé — ce qui les empêche de grandir au point de rendre l'étape suivante instable. Puis ils traversent le <strong>softmax</strong>, qui les transforme en pourcentages dont la somme fait 100 % — les <strong>poids</strong> d'attention.</p>
      <p>Et le softmax a ses préférés par conception : il prend l'exponentielle de chaque score avant d'en répartir le total, de sorte que la plus forte correspondance rafle de loin la plus grosse part tandis que les faibles s'estompent jusqu'à presque rien. Les scores éparpillés de <span class="tok">it</span> se concentrent alors en un seul foyer net.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/attention-math">l'équation de l'attention</a></div>`,
    },
    {
      html: `<h3>Rassembler les Valeurs</h3>
      <p>Chaque token porte un signal de plus : une <strong>Valeur</strong> — le contenu qu'il offre réellement. Si la Clé est l'étiquette de nom, la Valeur est ce que ce token <em>vous dit</em> une fois que vous choisissez de l'écouter. Comme la Requête et la Clé, elle provient d'une matrice apprise — Wv — appliquée au vecteur du token.</p>
      <p>Chaque token attire alors un <strong>mélange pondéré des Valeurs de tous</strong> — beaucoup des mots qu'il a fortement notés, presque rien des autres. Ce mélange est littéralement une somme : chaque Valeur multipliée par son poids d'attention, puis le tout additionné. L'information afflue <em>vers lui</em> le long des faisceaux lumineux, et le sens du token est réécrit comme un mélange de tout ce qu'il a jugé pertinent.</p>`,
    },
    {
      html: `<h3>"it" → "cat"</h3>
      <p>Voici toute la magie en une seule image. Le mot <span class="tok">it</span> parcourt la phrase et se verrouille sur <span class="tok">cat</span> — le modèle a <strong>déterminé à quoi "it" se réfère</strong>, entièrement tout seul.</p>
      <p>Les linguistes appellent cela la <em>coréférence</em>, et c'est notoirement difficile. Aucune règle n'a écrit cela. C'est né de l'attention — la descente de gradient a simplement façonné les matrices de Requête et de Clé jusqu'à ce que la Requête de <span class="tok">it</span> s'aligne avec la Clé de <span class="tok">cat</span>, parce que cet alignement rendait le mot suivant plus facile à prédire.</p>`,
    },
    {
      html: `<h3>Plusieurs têtes à la fois</h3>
      <p>Jusqu'ici, nous avons suivi une seule comparaison. Les vrais modèles font tourner <strong>de nombreuses têtes d'attention</strong> côte à côte, chacune avec ses propres Requêtes, Clés et Valeurs — pour que chacune puisse traquer un type de relation différent.</p>
      <p>Ici, trois : <span style="color:var(--cyan)">la syntaxe</span> (liens grammaticaux), <span style="color:var(--magenta)">la coréférence</span> (ce qui renvoie à quoi), <span style="color:var(--amber)">l'adjacence</span> (mots voisins). Une vraie couche en fait tourner des dizaines.</p>
      <p>Les têtes ne se relaient pas — elles tournent <strong>en parallèle</strong>, chacune travaillant sur sa propre tranche du vecteur. Leurs sorties sont <strong>concaténées</strong> de nouveau en une seule et passées à travers une projection apprise finale, de sorte que la couche suivante voit une unique réponse mélangée.</p>
      <p class="aside">Survolez n'importe quel token pour explorer où il porte son attention.</p>`,
    },
    {
      html: `<h3>Voilà l'astuce</h3>
      <p>Chaque token exécute cette unique routine en même temps — <strong>Requête, Clé, Valeur ; score, poids, mélange</strong> — et chacun en ressort réécrit à la lumière de tous les autres.</p>
      <p>C'est le seul endroit où les tokens partagent réellement de l'information — partout ailleurs, le réseau traite chaque token isolément. Empilez cette opération couche après couche — l'attention qui mélange, puis l'affinage token par token — et vous obtenez un transformer : le moteur au cœur de tout modèle de langage moderne.</p>
      <div class="postcard">L'attention permet à chaque token de regarder tous les autres et d'y prendre ce dont il a besoin. C'est toute l'astuce.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/attention-math">les maths de l'attention</a>
        <a class="deepdive" data-route="/transformer">suivant : le transformer →</a>
      </div>`,
    },
  ],
}
