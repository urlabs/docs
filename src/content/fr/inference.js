export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 08 · comment il vous répond</span>
      <h2>L'inférence</h2>
      <p class="lead">L'entraînement est terminé et les poids sont figés pour de bon. L'<strong>inférence</strong>, c'est le modèle achevé mis au travail — ce qui tourne chaque fois que vous appuyez sur Envoyer. En dessous, ce n'est rien d'autre qu'une boucle qui écrit la réponse <strong>un token à la fois</strong>.</p>
      <p>En bas se trouve votre <span class="tok">prompt</span>, découpé en tokens. Il remonte vers le cœur du modèle, dont le seul travail est de déterminer quel token devrait venir ensuite.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Le prefill — tout lire d'un coup</h3>
      <p>Avant d'écrire le moindre mot, le modèle traite votre prompt <em>en entier</em> en une seule passe parallèle — tous les tokens en même temps. C'est le <strong>prefill</strong>, et à mesure qu'il s'exécute, chaque token laisse derrière lui un petit paquet de nombres calculés garé juste au-dessus de lui : ses <strong>K</strong> et <strong>V</strong> — les clés et les valeurs du chapitre sur l'attention.</p>
      <p>Voilà pourquoi un long prompt vous fait patienter un instant avant que la réponse commence : le prefill a simplement davantage à lire. La pause que vous ressentez, c'est le <span class="tok">délai jusqu'au premier token</span>.</p>
      <p class="aside">Le prefill est limité par le calcul — une seule grande passe, riche en multiplications de matrices, sur tout le prompt d'un coup.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Logits → softmax</h3>
      <p>Le cœur ne choisit pas de mot. Il émet un score brut — un <strong>logit</strong> — pour chaque token de son vocabulaire, des dizaines de milliers. Le <strong>softmax</strong> écrase ensuite ces scores en probabilités nettes dont la somme fait 1 : une <strong>distribution</strong> complète sur ce qui vient ensuite.</p>
      <p>Après <span class="tok">…&nbsp;sat on the</span>, une barre domine toutes les autres — <span class="tok">mat</span> — et pourtant presque chaque autre mot conserve une parcelle de chance.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Température &amp; échantillonnage</h3>
      <p>Il s'agit maintenant d'<strong>échantillonner</strong> un token parmi ces cotes. Une seule molette, la <strong>température</strong>, les remodèle d'abord : chaque logit est divisé par T avant le softmax. <span style="color:var(--lime)">Une T basse</span> aiguise le pic — à T→0, le tirage devient <em>glouton</em> et prend toujours le token de tête. <span style="color:var(--amber)">Une T élevée</span> aplatit la courbe et donne aux mots plus rares une vraie chance. Regardez les barres respirer à mesure que T tourne.</p>
      <p class="aside">La température remodèle toute la courbe ; <span class="tok">top-k</span> et <span class="tok">top-p</span> coupent plutôt la queue improbable avant le tirage. Des molettes différentes, souvent combinées.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Ajouter, puis réinjecter</h3>
      <p>Le token échantillonné redescend et rejoint la séquence — et devient aussitôt une partie de l'entrée de la prédiction suivante. Regardez la boucle se refermer : <em>noter → échantillonner → ajouter → noter…</em> une phrase qui s'écrit toute seule.</p>
      <p>Chaque nouveau token n'effectue qu'une parcelle de travail neuf : il calcule ses propres K et V, puis porte son attention sur tout ce qui est déjà en cache. La boucle tourne jusqu'à ce que le modèle tire un <strong>token d'arrêt</strong> spécial — sa façon de dire "j'ai fini".</p>`,
    },
    {
      side: 'right',
      html: `<h3>Le cache KV — pourquoi ça reste rapide</h3>
      <p>Voici l'astuce qui rend tout cela praticable. Une fois calculés, les K et V d'un token ne changent jamais — le modèle les <strong>conserve</strong> donc au lieu de les recalculer. Ce tas stocké est le <strong>cache KV</strong>, et les cellules empilées au-dessus de chaque token <em>sont</em> ce cache.</p>
      <p>Sans lui, chaque nouveau token retraiterait tout le passage depuis le début, le travail s'accumulant comme le carré de la longueur — <span class="tok">O(n²)</span>. Avec lui, chaque étape n'ajoute qu'une colonne et lit le reste — à peu près constant, <span class="tok">O(n) par token</span>. Le compteur à gauche montre l'écart se creuser.</p>
      <p class="aside">Le cache explique aussi pourquoi les longues conversations coûtent plus de mémoire : il grandit à chaque token, et le modèle le lit en entier à chaque étape.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La boucle</h3>
      <div class="postcard">L'inférence est une boucle : faire le prefill du prompt, noter chaque token (logits → softmax), en échantillonner un, l'ajouter, recommencer — avec le cache KV qui retient le travail passé pour que chaque étape reste peu coûteuse.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/sampling">échantillonnage</a>
        <a class="deepdive" data-route="/frontier">suivant : la frontière →</a>
      </div>`,
    },
  ],
}
