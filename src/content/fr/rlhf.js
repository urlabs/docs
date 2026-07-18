import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Approfondissement · pré-entraînement</span>
      <h2>RLHF</h2>
      <p class="lead">Un modèle pré-entraîné apprend à prédire le token suivant à travers le web — brillant pour poursuivre du texte, mais tout aussi disposé à compléter une phrase nuisible qu'une phrase utile. L'<strong>apprentissage par renforcement à partir de retours humains (RLHF)</strong> est la recette en trois étapes qui transforme un prédicteur brut en un modèle réellement utile et sensible à l'intention.</p>`,
    },
    {
      html: `<h3>1 · Réglage fin supervisé (SFT)</h3>
      <p>Avant tout RL, le modèle doit apprendre le <em>registre</em> de l'utilité. Des prestataires humains rédigent des paires consigne-réponse idéales — une question accompagnée d'une réponse claire et bien structurée — et le modèle de base est affiné dessus avec une perte d'entropie croisée ordinaire. Le <strong>SFT</strong> apprend au modèle à suivre les instructions, à rester dans le sujet et à répondre plutôt qu'à simplement poursuivre. Voyez-le comme un apprentissage avant l'autonomie.</p>`,
    },
    {
      html: `<h3>2 · Entraîner un modèle de récompense</h3>
      <p>Un humain ne peut pas noter chaque étape de gradient, alors on entraîne un substitut. Pour une consigne donnée, le modèle SFT génère plusieurs réponses candidates ; des évaluateurs humains les <strong>classent</strong> plutôt que de les noter — classer est plus rapide et plus cohérent qu'attribuer des nombres bruts. Un <strong>modèle de récompense</strong> distinct (généralement le modèle SFT muni d'une tête de sortie scalaire) est ensuite entraîné à reproduire ces classements via une perte de comparaison : chaque fois que les évaluateurs préfèrent A à B, le modèle de récompense doit attribuer à A un score plus élevé qu'à B.</p>
      <p class="aside">Ici, la réponse A est préférée à B ; le modèle de récompense apprend à attribuer à A un score plus élevé.</p>`,
    },
    {
      html: `<h3>3 · Optimiser avec le RL</h3>
      <p>Le modèle SFT — désormais appelé la <strong>politique</strong> — est affiné pour maximiser le score du modèle de récompense sur de nouvelles consignes. Sans contrainte, il apprendrait vite à tromper le modèle de récompense : produire un texte d'allure fluide qui obtient un bon score tout en disant très peu (<em>reward hacking</em>). Une <strong>pénalité KL</strong> empêche cela en pénalisant la politique lorsqu'elle s'éloigne trop du modèle SFT d'origine, la gardant en laisse courte :</p>
      ${tex('\\max_{\\pi}\\; \\mathbb{E}\\big[\\,r(x,y)\\,\\big]\\;-\\;\\beta\\,\\mathrm{KL}\\!\\left(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\right)', true)}
      <p><strong>PPO</strong> (Proximal Policy Optimization) optimise cet objectif en échantillonnant de nouvelles réponses depuis la politique et en appliquant des mises à jour de gradient écrêtées. <strong>DPO</strong> (Direct Preference Optimization) est une alternative hors ligne plus simple qui se passe entièrement du modèle de récompense explicite, en dérivant un signal d'entraînement directement des données de classement humain.</p>
      <div class="postcard">RLHF : imiter les bonnes réponses, apprendre la préférence humaine, puis optimiser vers elle en laisse courte.</div>`,
    },
  ],
}
