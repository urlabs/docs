export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 07 · apprendre par la récompense</span>
      <h2>L'apprentissage par renforcement</h2>
      <p class="lead">Le pré-entraînement et le réglage fin apprennent en <em>copiant</em> des réponses figées. Mais comment enseigner à un modèle une tâche sans <strong>aucune bonne réponse unique</strong> — être véritablement utile, ou résoudre un problème qu'il n'a jamais vu ? On le laisse <strong>essayer</strong>, on note la tentative, et on le pousse vers ce qui a obtenu un bon score. C'est l'<strong>apprentissage par renforcement</strong>.</p>
      <p>Le modèle est la <strong>politique</strong> : face à une situation, il produit une action — ici, une réponse entière. Chaque tentative reçoit une <strong>récompense</strong> : un seul nombre indiquant sa qualité. Aucune étiquette — juste un score.</p>`,
    },
    {
      side: 'right',
      html: `<h3>La boucle : essayer, noter, ajuster</h3>
      <p>Le RL est une boucle. La politique génère un lot de tentatives, chacune est notée, et les poids sont ajustés pour rendre le comportement <em>le mieux noté</em> plus probable la fois suivante. Répétez, et tout le lot dérive vers le haut — regardez la récompense moyenne grimper tour après tour.</p>
      <p>On ne montre jamais la bonne réponse au modèle. On lui dit seulement <em>à quel point</em> ses propres réponses étaient bonnes — il doit donc <strong>explorer</strong>, tomber par hasard sur ce qui marche, et en faire davantage.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Les gradients de politique — renforcer ce qui marche</h3>
      <p>Comment transformer une récompense en mise à jour des poids ? L'astuce centrale est le <strong>gradient de politique</strong> : rendre chaque choix d'une tentative <em>plus</em> probable quand sa récompense était bonne, et <em>moins</em> probable quand elle était mauvaise — à proportion du score. Renforcer les gagnants (<span style="color:var(--lime)">▲</span>), décourager les perdants (<span style="color:var(--rose)">▼</span>).</p>
      <p>Faites cela sur des milliers de tentatives et la politique déplace régulièrement ses chances vers les actions qui rapportent.</p>
      <p class="aside">La clé pour rendre cela stable est une <strong>référence</strong> (baseline) — un score typique auquel se comparer. Une récompense <em>au-dessus</em> de la référence pousse vers le haut ; <em>en dessous</em>, vers le bas. Retenez bien cette idée : c'est là tout GRPO.</p>`,
    },
    {
      side: 'right',
      html: `<h3>D'où vient la récompense</h3>
      <p>Pour un objectif net, on peut noter directement. Mais "cette réponse est-elle <em>utile</em> ?" n'a aucune formule. Alors — exactement comme dans la recette de ChatGPT — des personnes comparent des paires de réponses, et ces préférences entraînent un <strong>modèle de récompense</strong> distinct : un <strong>juge</strong> appris qui note n'importe quelle réponse à la manière dont les gens avaient tendance à le faire.</p>
      <p>La politique s'exerce ensuite face à ce juge. C'est le <strong>RLHF</strong> — apprentissage par renforcement à partir de retours humains — et c'est ce qui a, le premier, transformé un simple prédicteur du token suivant en assistant coopératif.</p>
      <div class="deepdive-row"><a class="deepdive" data-route="/deep/rlhf">comment fonctionne le RLHF</a></div>`,
    },
    {
      side: 'left',
      html: `<h3>PPO — ne pas aller trop vite</h3>
      <p>Poursuivez la récompense trop avidement et le modèle se brise : il se déforme vers tout ce qui trompe le score et oublie comment écrire. Le cheval de trait de longue date, <strong>PPO</strong> (Proximal Policy Optimization), prémunit contre cela. Il <strong>écrête</strong> chaque mise à jour pour que la politique ne fasse pas un bond trop grand en une seule étape, et ajoute une <strong>laisse KL</strong> qui la relie au <strong>modèle de référence</strong> figé dont elle est partie.</p>
      <p>Rester proche de ce que l'on était, s'améliorer un peu, recommencer. Stable — mais lourd : PPO entraîne aussi un second réseau de "valeur" rien que pour estimer cette référence.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Les récompenses vérifiables — laisser le monde juger</h3>
      <p>Pour les maths, le code et la logique, il y a mieux qu'un juge appris : <strong>vérifier la réponse</strong>. Exécuter le code sur des tests ; vérifier la preuve ; comparer au résultat connu. La récompense est simplement <strong>juste ou fausse</strong> — rien à entraîner, rien à tromper.</p>
      <p>C'est le <strong>RLVR</strong> (RL à partir de récompenses vérifiables), et c'est le moteur des <strong>modèles de raisonnement</strong> d'aujourd'hui : un signal honnête, peu coûteux et impossible à tromper, que l'on peut exécuter à une échelle colossale.</p>`,
    },
    {
      side: 'left',
      html: `<h3>GRPO — noter sur une courbe</h3>
      <p>Si la récompense n'est que "juste ou fausse", a-t-on vraiment besoin de tout un réseau de valeur pour estimer la référence ? <strong>GRPO</strong> (Group Relative Policy Optimization) répond non. Pour chaque question, il échantillonne un <strong>groupe</strong> de réponses, les note toutes, et utilise la <strong>moyenne</strong> du groupe lui-même comme référence.</p>
      <p>L'<strong>avantage</strong> de chaque réponse est simplement l'écart auquel elle se situe <em>au-dessus ou en dessous de la moyenne du groupe</em> — battez la moyenne et vous êtes renforcé, restez en deçà et vous êtes supprimé. Noter sur une courbe. Abandonner le réseau de valeur de PPO le rend bien plus <strong>léger</strong>, et c'est la méthode derrière les récents modèles de raisonnement ouverts.</p>
      <p class="aside">C'est la même idée de gradient de politique — mais la référence est gratuite : ce sont simplement vos pairs sur cette même question.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Ce que la récompense débloque</h3>
      <p>Entraînés ainsi, les modèles apprennent des choses que l'imitation ne leur a jamais enseignées. Pour gagner plus de récompense sur les problèmes difficiles, ils se mettent à <strong>réfléchir plus longtemps</strong> — rédigeant de longues chaînes de raisonnement, essayant une approche, repérant leurs propres erreurs, revenant en arrière, et réessayant.</p>
      <p>Personne n'a démontré ces habitudes ; le modèle les a <em>découvertes</em> parce qu'elles rapportent de la récompense. C'est le saut d'un modèle qui se contente de répondre à un modèle qui <strong>raisonne</strong> véritablement.</p>`,
    },
    {
      side: 'left',
      html: `<h3>L'idée d'ensemble</h3>
      <div class="postcard">L'apprentissage par renforcement entraîne par la récompense, non par la copie : la politique essaie, chaque tentative est notée — par un juge appris (RLHF) ou un vérificateur (RLVR) — et les gradients de politique la poussent vers ce qui marche. GRPO note tout un groupe et évalue chaque réponse par rapport à la moyenne du groupe : simple, passant à l'échelle, et derrière les modèles de raisonnement d'aujourd'hui.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/rlhf">RLHF en détail</a>
        <a class="deepdive" data-route="/inference">suivant : l'inférence →</a>
      </div>`,
    },
  ],
}
