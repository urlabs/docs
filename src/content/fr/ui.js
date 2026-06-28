// French UI strings — overlay matching the shape of content/en/ui.js.
// Legend symbols are kept; only the descriptions are translated.
export default {
  brand: "NET",

  hero: {
    eyebrow: "Un parcours interactif · 10 chapitres",
    title: "D'un seul neurone aux",
    accent: "modèles de pointe",
    sub: "Comment les grands modèles de langage sont réellement construits, entraînés et exécutés — reconstruits depuis zéro en une seule histoire visuelle et continue. Commencez sans aucune notion de mathématiques ; approfondissez autant que vous le voulez.",
    begin: "Commencer le parcours →",
    legend: "Lire la légende",
    hint: "✦ chaque jalon lumineux est un chapitre — survolez et cliquez pour y plonger",
  },

  nav: {
    prev: "précédent",
    next: "suivant",
    keyhint: "utilisez les touches ← → pour vous déplacer",
    scroll: "défiler",
    back: "← retour au parcours",
  },

  legend: {
    eyebrow: "Comment lire ceci",
    title: "Le langage visuel",
    intro: "Un seul vocabulaire, utilisé dans chaque chapitre. Apprenez-le une fois et tout le parcours se lit sans effort.",
    done: "Compris",
    rows: [
      ["● nœud", "Une unité : un neurone, un token ou un vecteur."],
      ["— arête", "Un poids. Luminosité = magnitude ; teinte = signe (cyan +, magenta −)."],
      ["·→ flux", "Des particules qui filent le long d'une arête = des données qui avancent."],
      ["✦ lueur", "La luminosité d'un nœud = son intensité d'activation."],
      ["↑ haut", "Plus haut = plus profond dans le réseau / plus loin dans la pile."],
      ["◀ onde", "Une onde de lumière inversée = la rétropropagation (l'erreur qui remonte)."],
      ["⛰ relief", "Un paysage ondulant = la surface de perte. Les vallées = faible erreur."],
      ["╱ faisceau", "Un faisceau entre deux tokens = l'attention. Vif = fort ; couleur = tête."],
      ["▭ ruban", "Un ruban qui s'étend latéralement = le cache KV (la mémoire à court terme du modèle)."],
      ["▮ barres", "Un champ de barres = une distribution de probabilité sur le token suivant."],
    ],
  },

  // chapter id → { title, short } for the spine + counter
  chapters: {
    map: { title: "La carte", short: "Carte" },
    neuron: { title: "Le neurone", short: "Neurone" },
    training: { title: "L'apprentissage", short: "Apprentissage" },
    embeddings: { title: "Le sens comme géométrie", short: "Embeddings" },
    attention: { title: "L'attention", short: "Attention" },
    transformer: { title: "Le Transformer", short: "Transformer" },
    pretraining: { title: "Pré-entraînement → ChatGPT", short: "Entraînement" },
    rl: { title: "Apprentissage par renforcement", short: "RL" },
    inference: { title: "L'inférence", short: "Inférence" },
    retrieval: { title: "Connaissances et récupération", short: "Récupération" },
    frontier: { title: "LLM de pointe", short: "Frontière" },
  },

  a11y: {
    theme: "Basculer entre thème clair et sombre",
    legend: "Ouvrir la légende visuelle",
    language: "Choisir la langue",
  },
}
