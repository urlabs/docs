export default {
  beats: [
    {
      side: 'left',
      html: `<span class="eyebrow">Chapitre 03 · des mots en nombres</span>
      <h2>Comment les mots entrent</h2>
      <p class="lead">En dessous, un réseau de neurones n'est que de l'arithmétique — des additions et des multiplications, exécutées des milliards de fois. Il ne sait pas lire une lettre ; il ne sait que manipuler des <strong>nombres</strong>. La toute première tâche est donc de transformer le langage en nombres qu'il peut traiter.</p>
      <p>Le texte est découpé en <span class="tok">tokens</span> — des morceaux de mots, chacun un mot entier ou un fragment. Chaque token possède un <strong>identifiant</strong> : son numéro de ligne dans une gigantesque table de correspondance que le modèle a bâtie pendant l'entraînement. Lisez cette ligne et vous obtenez une liste de nombres — le <strong>vecteur</strong> du token, aussi appelé son <strong>embedding</strong>. Ce sont ces vecteurs qui circulent dans la première couche du réseau.</p>
      <p>Cette table n'est pas saisie à la main. C'est un bloc de <strong>poids</strong> — une ligne par token du vocabulaire — appris pendant l'entraînement comme tous les autres nombres du modèle. Et choisir une ligne n'est lui-même que de l'arithmétique : cela revient à multiplier toute la table par un vecteur entièrement composé de zéros sauf un unique <strong>1</strong>. Une consultation est une multiplication déguisée.</p>
      <p class="aside">texte → tokens → identifiants → vecteurs → vers la première couche.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Les images aussi</h3>
      <p>La même astuce fonctionne pour les images. Une image est découpée en une grille de petits <strong>patchs</strong> — de petites tuiles carrées — et chaque patch est aplati en sa propre liste de nombres, un vecteur exactement comme celui d'un token.</p>
      <p>Cet aplatissement cache une étape : ces nombres bruts de pixels passent par une <strong>projection</strong> apprise — une petite matrice — qui redimensionne chaque patch à la longueur de vecteur du modèle. C'est seulement alors qu'une tuile de pixels correspond, dimension pour dimension, au vecteur d'un mot.</p>
      <p>Ainsi, qu'elle soit partie d'un mot ou d'un carré de pixels, chaque donnée arrive au réseau sous la même forme : <em>un vecteur de nombres</em>. C'est ainsi qu'un seul modèle peut lire du texte <em>et</em> voir des images — au moment où elles arrivent, elles parlent une seule langue.</p>`,
    },
    {
      side: 'center',
      html: `<h3>Le sens comme géométrie</h3>
      <p class="lead">Voici la partie magnifique. Un vecteur n'est qu'un <strong>point dans l'espace</strong> — et l'entraînement organise cet espace par le <em>sens</em>.</p>
      <p>Chaque nombre du vecteur est une coordonnée. Deux nombres fixent un point sur une carte ; trois le placent dans une pièce. Un vrai embedding en porte bien plus — couramment <strong>768</strong> nombres, et plusieurs <strong>milliers</strong> (4096 et au-delà) dans les plus grands modèles. Cela fait des centaines de <strong>dimensions</strong>, plus que quiconque ne peut se représenter — alors nous le comprimons aux trois que l'on sait dessiner.</p>
      <p>Chaque mot du vocabulaire devient un point, et tout le vocabulaire devient une galaxie. L'endroit où se trouve un point <em>est</em> le sens que le modèle donne à ce mot.</p>
      <p class="aside">La galaxie ici est une <em>ombre</em> — une projection 3D d'un espace à des centaines d'axes. Les vraies distances et les vrais angles vivent là-haut ; le dessin ne fait que les suggérer.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Les choses semblables se regroupent</h3>
      <p>Les mots qui apparaissent en compagnie similaire finissent à des endroits similaires. Ainsi <span class="tok">cat</span>, <span class="tok">dog</span> et <span class="tok">lion</span> s'installent dans un même voisinage — tandis que <span class="tok">paris</span>, <span class="tok">tokyo</span> et <span class="tok">cairo</span> se rassemblent ailleurs.</p>
      <p>Comment ? Pendant l'entraînement, le modèle lit d'immenses quantités de texte et devine sans cesse un mot à partir de ses voisins. Chaque mauvaise supposition renvoie une correction à rebours — la même <strong>rétropropagation</strong> que le chapitre précédent — décalant les lignes de la table d'embeddings d'un cheveu. Les mots employés de la même manière sont tirés vers le même endroit, encore et encore, jusqu'à ce que les mots apparentés s'accumulent ensemble. Personne ne les place ; les positions s'organisent d'elles-mêmes.</p>
      <p>Et la proximité, comment se mesure-t-elle ? Elle se précise par la <strong>similarité cosinus</strong> — le cosinus de l'angle entre deux vecteurs, qui ne se soucie que de la direction, pas de la longueur. Pointez dans la même direction et elle vaut environ <strong>1</strong> ; tenez-vous à angle droit et elle tombe à <strong>0</strong>. <span class="tok">cat</span> et <span class="tok">dog</span> obtiennent un score élevé ; <span class="tok">cat</span> et <span class="tok">tokyo</span> s'enfoncent vers zéro.</p>
      <p class="aside">Personne n'a étiqueté ces groupes "animaux" ou "villes". Cette proximité <em>est</em> le sens que le modèle a dégagé tout seul.</p>`,
    },
    {
      side: 'left',
      html: `<h3>Les directions portent du sens</h3>
      <p>Ce n'est pas seulement <em>où</em> se trouve un point — la <em>direction</em> d'un point vers un autre porte aussi du sens. L'exemple célèbre :</p>
      <p class="lead"><strong>king − man + woman ≈ queen</strong></p>
      <p>Le pas de <span class="tok">man</span> à <span class="tok">woman</span> est le même que de <span class="tok">king</span> à <span class="tok">queen</span> — l'espace a aligné une direction constante "changer de genre". Suivez cette flèche depuis <em>king</em> et vous atterrissez exactement là où vit <em>queen</em>. On peut faire de l'<em>arithmétique sur le sens</em>.</p>
      <p>Et ce n'est pas que le genre. Une direction "pluriel", une direction "capitale-de", une direction "passé" — chacune est un décalage à peu près constant que l'on peut ajouter à un mot pour en atteindre un autre. Le sens, il s'avère, a une forme en partie <strong>linéaire</strong>, et personne ne l'a conçu ainsi.</p>
      <p class="aside">En toute honnêteté, la somme tombe rarement exactement sur <em>queen</em> — on prend le point le plus proche de là où l'on arrive, et les exemples les plus nets sont un peu triés sur le volet. Mais les directions sont réelles : les relations existent bien sous forme de décalages reproductibles.</p>`,
    },
    {
      side: 'right',
      html: `<h3>Notre phrase, plongée dans l'espace</h3>
      <p>Retour à notre phrase de référence — <em>"The cat sat on the mat because it was tired."</em>. Chaque token quitte l'origine et s'envole vers son propre point : c'est la phrase qui est <strong>plongée</strong> dans l'espace.</p>
      <p>Ces vecteurs sont le point de départ de tous les chapitres suivants — mais ils sont encore bruts et <strong>sans contexte</strong>. Chaque token reçoit un point fixe, le même à chaque apparition, peu importe ce qui l'entoure : le <span class="tok">bank</span> d'une rivière (la berge) et le <span class="tok">bank</span> qui détient votre argent (la banque) partagent un seul vecteur. Avant qu'un modèle puisse <em>réfléchir</em> aux mots, il doit les <strong>situer</strong> — et c'est tout ce qui s'est passé jusqu'ici.</p>
      <p class="aside">Ces embeddings bruts sont <em>statiques</em> — un vecteur par token, figé avant tout contexte. L'<strong>attention</strong> du prochain chapitre les rend <em>contextuels</em> : la représentation d'un mot devient une fonction des mots qui l'entourent, de sorte que <span class="tok">bank</span>-rivière et <span class="tok">bank</span>-argent finissent par se séparer.</p>`,
    },
    {
      side: 'left',
      html: `<h3>La géométrie du sens</h3>
      <div class="postcard">Les mots et les images deviennent tous deux des vecteurs — des points dans un espace appris où la proximité (l'angle entre eux) signifie la similarité, et la direction signifie la relation. Le modèle a organisé cet espace lui-même, à partir de texte brut. C'est le socle sur lequel repose chaque chapitre suivant — bien que chaque mot y siège encore seul, sans contexte, jusqu'à ce que l'attention les laisse se mélanger.</div>
      <div class="deepdive-row">
        <a class="deepdive" data-route="/deep/tokenization">comment fonctionne la tokenisation</a>
        <a class="deepdive" data-route="/attention">suivant : l'attention →</a>
      </div>`,
    },
  ],
}
