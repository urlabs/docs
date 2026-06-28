export default {
  beats: [
    {
      html: `<span class="eyebrow">Approfondissement · embeddings</span>
      <h2>La tokenisation</h2>
      <p class="lead">Les modèles ne lisent ni les mots ni les lettres — ils lisent des <strong>tokens</strong> : des morceaux de sous-mots. Un vocabulaire au niveau des mots exigerait des millions d'entrées et calerait encore sur les fautes de frappe, les mots rares et les nouveaux noms propres. Les séquences caractère par caractère évitent ce piège, mais deviennent si longues qu'elles saturent la fenêtre de contexte du modèle — l'entrée de longueur fixe qu'il peut tenir d'un coup. Les tokens de sous-mots font le compromis.</p>
      <p>Partez des caractères bruts d'un mot — chaque lettre comme symbole indépendant.</p>`,
    },
    {
      html: `<h3>Fusionner la paire la plus fréquente</h3>
      <p>Le <strong>codage par paires d'octets (BPE)</strong> parcourt tout le corpus d'entraînement — des milliards de mots de texte —, compte chaque paire de symboles adjacents et fond la paire la plus courante en un seul nouveau token. Ce token entre dans le vocabulaire et le balayage recommence depuis le début.</p>
      <p class="aside">Les paires très fréquentes comme <span class="tok">to</span>, <span class="tok">ke</span> et <span class="tok">on</span> fusionnent en premier : elles apparaissent dans des milliers de mots anglais, donc chaque fusion réduit le plus la longueur de séquence en une seule étape.</p>`,
    },
    {
      html: `<h3>Continuer à fusionner</h3>
      <p>Répétez des milliers de fois. Les chaînes courantes se condensent en tokens uniques ; les chaînes rares ou inédites restent découpées en morceaux plus petits. Voilà l'idée clé : le modèle peut traiter <em>n'importe quel</em> mot, même jamais vu à l'entraînement, en composant des morceaux de sous-mots familiers.</p>
      <p class="aside">GPT-2 a effectué environ 50 000 fusions ; les grands modèles modernes en font 100 000 ou plus, aboutissant à des vocabulaires de cette taille.</p>`,
    },
    {
      html: `<h3>Les tokens et le vocabulaire</h3>
      <p>Après toutes les fusions, vous disposez d'un <strong>vocabulaire</strong> fixe — une table de correspondance qui associe chaque morceau à un identifiant entier. Le modèle ne voit jamais de texte brut ; il voit une liste d'identifiants. "tokenization" se résume alors à deux : <span class="tok">token</span> + <span class="tok">ization</span>.</p>
      <p>Un mot courant comme <em>the</em> obtient un seul identifiant ; un mot rare comme <em>antidisestablishmentarianism</em> est découpé en plusieurs. Les mots de la même famille morphologique partagent souvent des préfixes de tokens, donnant au modèle une longueur d'avance pour apprendre leur sens.</p>
      <div class="postcard">La tokenisation transforme le texte brut en une séquence d'identifiants entiers — les véritables atomes qu'un modèle lit, prédit et génère, un à la fois.</div>`,
    },
  ],
}
