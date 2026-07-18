import katex from 'katex'
const tex = (s, d = false) => katex.renderToString(s, { displayMode: d, throwOnError: false })

export default {
  beats: [
    {
      html: `<span class="eyebrow">Approfondissement · attention</span>
      <h2>L'équation de l'attention</h2>
      <p class="lead">L'attention est la façon dont chaque token rassemble du contexte depuis tous les autres tokens de la séquence. Tout le mécanisme se résume à une seule formule :</p>
      ${tex('\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V', true)}
      <p>Chaque symbole a un rôle précis. Parcourons-les dans l'ordre.</p>`,
    },
    {
      html: `<h3>Q, K, V sont des projections</h3>
      <p>L'embedding <em>x</em> de chaque token est projeté à travers trois matrices de poids apprises distinctes pour former une <strong>Requête</strong>, une <strong>Clé</strong> et une <strong>Valeur</strong> :</p>
      ${tex('Q = XW_Q,\\quad K = XW_K,\\quad V = XW_V', true)}
      <p class="aside">Voyez cela comme une recherche souple dans une base de données. Q est la requête qu'un token émet. K est l'étiquette d'index que chaque token expose aux autres. V est le contenu qu'il restitue lorsque sa clé correspond. Garder les trois séparés permet au modèle d'apprendre chaque rôle indépendamment : ce qu'il faut demander, ce qu'il faut annoncer et ce qu'il faut partager peuvent tous être spécialisés à partir du même embedding brut.</p>`,
    },
    {
      html: `<h3>Scores, mis à l'échelle, puis softmax</h3>
      <p>Le produit matriciel <strong>QKᵀ</strong> donne un score pour chaque paire requête-clé. Un produit scalaire est grand quand deux vecteurs pointent dans la même direction, ce qui en fait une mesure naturelle d'alignement. Le diviseur <strong>√dₖ</strong> corrige un problème de variance : quand q et k ont chacun dₖ composantes indépendantes, leur produit scalaire a une variance proportionnelle à dₖ, si bien que les scores bruts d'un grand modèle sont bien plus élevés que ceux d'un petit. Diviser par √dₖ rétablit une variance unitaire et permet au <strong>softmax</strong> de produire une répartition de poids significative plutôt qu'un pic proche de zéro-ou-un.</p>
      ${tex('\\alpha_{ij}=\\frac{\\exp(q_i\\cdot k_j/\\sqrt{d_k})}{\\sum_{j\'}\\exp(q_i\\cdot k_{j\'}/\\sqrt{d_k})}', true)}
      <p>Regardez les scores bruts (à gauche) s'effondrer en une distribution nette.</p>`,
    },
    {
      html: `<h3>Somme pondérée des Valeurs</h3>
      <p>Les poids d'attention indiquent à chaque position combien emprunter à chacune des autres. La sortie à la position <em>i</em> est une moyenne pondérée de tous les vecteurs Valeur :</p>
      ${tex('z_i=\\sum_j \\alpha_{ij}\\,v_j', true)}
      <p>Sans le diviseur √dₖ, des scores démesurés poussent le softmax vers une sortie quasi one-hot : un token rafle presque tout le poids et le gradient à travers chaque autre Valeur s'évanouit presque. Garder les scores près d'une variance unitaire garantit que la distribution d'attention reste assez large pour que des gradients significatifs refluent à travers toutes les positions contributrices pendant l'entraînement.</p>
      <div class="postcard">L'attention est une matrice de scores, transformée en poids par softmax, utilisée pour moyenner les Valeurs.</div>`,
    },
  ],
}
