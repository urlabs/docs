export default {
  beats: [
    {
      html: `<span class="eyebrow">Chapitre 01 · la brique de base</span>
      <h2>Le neurone</h2>
      <p class="lead">Tout ce que fait une IA est bâti à partir d'une seule petite pièce, répétée des millions de fois. Un neurone — dans sa forme classique à unité unique, le <strong>perceptron</strong> — prend une poignée de nombres en <strong>entrée</strong> et les réduit à un unique nombre. L'art réside dans la <em>manière</em> dont il les combine.</p>
      <p>Imaginez que vous décidiez d'aller vous promener. Pleut-il ? À quel point êtes-vous occupé ? Un ami vous a-t-il proposé de venir ? Chaque fait pèse sur vous d'un montant différent — et ce "à quel point cela compte" est son <strong>poids</strong>. Le neurone multiplie chaque entrée par son poids, puis additionne les résultats — chaque entrée <span class="tok">x</span> face à son poids <span class="tok">w</span>, appariées puis sommées. Les mathématiciens appellent cette opération un <strong>produit scalaire</strong>, noté <span class="tok">w·x</span>.</p>
      <p>Enfin, il ajoute un <strong>biais</strong>&nbsp;<span class="tok">b</span> : un penchant de base, comme quelqu'un qui a simplement tendance à dire oui. Le total jusqu'ici est <span class="tok">w·x + b</span> — plusieurs nombres en entrée, un seul total courant en sortie. Nous verrons ensuite ce que ce total déclenche.</p>`,
    },
    {
      side: 'right',
      html: `<h3>La porte</h3>
      <p>Ce total courant rencontre ensuite une porte. Revenons à la promenade : vous ne franchissez pas la porte au moindre petit signal — votre envie doit d'abord monter. Un neurone fonctionne pareil. À mesure que le total dépasse un <strong>seuil</strong>, il commence à se <strong>déclencher</strong>, envoyant un signal plus fort plus loin. Mais "se déclencher" est une métaphore — rien ne bascule comme un interrupteur. La réponse s'incurve en douceur, une courbure marquée plutôt qu'un basculement soudain.</p>
      <p>Cette porte est l'<em>activation</em>, notée <span class="tok">σ</span>, si bien que la sortie complète d'un neurone est <span class="tok">y = σ(w·x + b)</span> — pondérer, sommer, pencher, puis courber. Cette courbure est la <strong>non-linéarité</strong>, un terme savant pour dire que "la réponse n'est pas une droite". <span class="tok">sigmoid</span> trace une douce courbe en S qui comprime n'importe quel nombre dans l'intervalle 0 à 1 ; <span class="tok">tanh</span> fait de même mais centrée sur zéro ; <span class="tok">ReLU</span> est simplement <span class="tok">max(0, x)</span> — garder les positifs, annuler le reste, une cassure nette.</p>
      <p>Cette courbure fait tout. Empilez uniquement des étapes en ligne droite et toute la pile s'effondre en une seule droite — cent couches pas plus avisées qu'une seule. Ajoutez la courbure et le calcul cesse de s'aplatir : couche après couche de douces courbes peut tracer des motifs d'une complexité stupéfiante. Avec assez de neurones, un réseau peut approximer pratiquement n'importe quelle fonction.</p>
      <p class="aside">Observez le cœur s'illuminer à mesure que le total grimpe, puis s'élever fortement — sans à-coup — quand il franchit le seuil.</p>`,
    },
    {
      html: `<h3>Une couche</h3>
      <p>Un seul neurone pose une seule question, il ne peut donc repérer qu'un seul type de motif. Les vrais problèmes en exigent plusieurs à la fois. Une <strong>couche</strong> est une rangée de neurones qui travaillent <em>en parallèle</em> — côte à côte, tous au même instant. Chacun lit exactement les mêmes entrées, mais chacun porte son propre jeu de poids.</p>
      <p>Ainsi chaque neurone finit accordé à quelque chose de différent — l'un se cale sur la météo, un autre sur votre temps libre, un autre sur qui vous accompagne. Mêmes faits en entrée, questions différentes posées. Ensemble, ils remarquent bien plus que n'importe lequel d'entre eux seul.</p>
      <p>Empilez ces rangées de poids propres et elles forment une grille — une <strong>matrice</strong>&nbsp;<span class="tok">W</span> — et tout le travail de la couche se réduit à une ligne, <span class="tok">σ(Wx + b)</span> : une multiplication de matrice, un biais, une courbure, tous les neurones d'un coup. C'est la même opération qu'un seul neurone, simplement exécutée en masse — et c'est exactement pourquoi ce calcul s'envole sur du matériel conçu pour multiplier des matrices.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Un réseau</h3>
      <p>Empilez maintenant les couches, chacune alimentant la suivante : <span class="tok">entrée</span> → <span class="tok">cachée</span> → <span class="tok">cachée</span> → <span class="tok">sortie</span>. La couche d'entrée reçoit les nombres bruts. Les couches <strong>cachées</strong> du milieu — cachées car rien d'extérieur ne les lit jamais directement — les affinent en motifs de plus en plus riches. La couche de sortie livre la réponse.</p>
      <p>Sous le capot, ce n'est que de l'imbrication : le vecteur de sortie de chaque couche devient l'entrée de la suivante, si bien que le réseau n'est que <span class="tok">σ(Wx + b)</span> enveloppé autour de lui-même encore et encore — des fonctions composées, l'une nichée dans l'autre.</p>
      <p>La profondeur est tout l'enjeu. Chaque couche combine ce que la précédente a trouvé en quelque chose de plus abstrait — un peu comme des traits forment des lettres, et les lettres des mots. Une seule couche très large pourrait en théorie s'ajuster à presque tout ; la profondeur y parvient simplement à bien moindre coût, chaque couche s'appuyant sur le travail de la précédente.</p>`,
    },
    {
      html: `<h3>La passe avant</h3>
      <p>Le plus beau, c'est de la regarder tourner. Injectez des nombres par le bord gauche et ils se propagent vers la droite, chaque couche réveillant la suivante, jusqu'à ce qu'une réponse s'allume tout au bout. Ce seul balayage de gauche à droite est une <strong>passe avant</strong> — un unique trajet à travers le réseau qui transforme une entrée en sortie.</p>
      <p>L'onde voyageuse, c'est l'ensemble du calcul qui se déroule dans l'ordre : toutes ces sommes pondérées et ces douces courbures, une couche s'allumant après l'autre — et l'ordre est strict, car chaque couche a besoin que la précédente ait fini d'abord. Fixez les poids et c'est parfaitement reproductible : les mêmes nombres en entrée donnent toujours la même réponse en sortie. Voilà, très littéralement, le réseau qui <em>réfléchit</em> — et ce balayage même se déroule chaque fois que vous interrogez l'un des modèles vers lesquels nous avançons.</p>
      <p class="aside">Suivez l'impulsion lumineuse qui traverse de l'entrée à la sortie.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Pourquoi ça marche</h3>
      <p>Aucun neurone n'est intelligent à lui seul — chacun se contente de pondérer quelques nombres et de courber le résultat. L'intelligence est dans l'empilement : couche après couche, chaque porte ajoutant un peu de courbure, jusqu'à ce que l'ensemble composé puisse se mouler sur presque n'importe quel motif imaginable.</p>
      <p>Chacun de ces poids et de ces biais est une molette réglable — un petit réseau en compte des milliers, un grand en compte des milliards. Et rien de tout cela n'est écrit à la main : les molettes débutent comme du bruit aléatoire, et l'on <em>enseigne</em> au réseau les bons réglages, exemple après exemple, jusqu'à ce que ses réponses tombent juste. Cette recherche est exactement là où nous allons ensuite.</p>
      <p class="aside">Cette puissance porte un nom officiel — le <em>théorème d'approximation universelle</em> : avec assez de neurones, un réseau peut approcher n'importe quelle fonction continue d'aussi près que l'on veut. Il promet que de tels poids existent ; il ne dit jamais comment les trouver.</p>
      <div class="postcard">Un neurone est une somme pondérée passée par une porte. Empilez-en suffisamment et vous obtenez un système capable de se modeler pour s'ajuster à presque tout.</div>
      <div class="deepdive-row"><a class="deepdive" data-route="/training">suivant : l'apprentissage →</a></div>`,
    },
  ],
}
