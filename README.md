# Générateur d'Examens — Histoire & Géographie

Application web **sans serveur** de création d'examens en arabe (RTL) pour les enseignants du collège tunisien (7e, 8e, 9e année de base).

---

## Démarrage rapide

Ouvrir `index.html` directement dans un navigateur (Chrome, Firefox, Edge).  
Aucune installation, aucune dépendance, aucun serveur requis.

---

## Structure des fichiers

```
exam-gen/
├── index.html   — Structure HTML (squelette de l'application)
├── style.css    — Tous les styles (UI, Modèle A, Modèle B, impression)
├── app.js       — Logique JavaScript (état, rendu, impression, JSON)
├── README.md    — Ce fichier
├── CLAUDE.md    — Instructions pour Claude Code
└── agent.md     — Contexte pour agents IA
```

---

## Utilisation

### Étape 1 — Choisir le modèle
L'application s'ouvre directement sur le formulaire. En haut, la carte **🎨 Modèle de l'examen** affiche une miniature de chaque modèle : un clic change le style de l'aperçu sans effacer les questions déjà saisies.

Onze modèles sont disponibles (miniatures générées automatiquement à partir du vrai rendu) :

| Modèle | Style |
|---|---|
| **Décoré** (par défaut) | Double cadre à coins grecs, titre accroché au cadre, bandeaux ardoise / parchemin, filigrane en bas de page : carte d'Europe + rose des vents (défaut), rose des vents + quadrillage, image personnalisée ou aucun |
| **Manuscrit** | Parchemin enroulé, cartouche, rubans de section, sceau rond pour la note |
| **Globe** | En-tête entièrement encadré (professeur, titre, niveau + ligne élève), vrai globe terrestre centré sur la Tunisie en filigrane, titres de section en « équateur » gradué |
| **Carthage** | Bordure à méandre grec, en-tête en temple antique (fronton avec signe de Tanit, colonnes, marches), titres de section sur plaque romaine (tabula ansata) |
| **Élégant** | Style « diplôme » : bordure guillochée, coins à rosace, en-tête encadré avec branches de laurier, titres de section centrés entre doubles filets, questions dans des cadres à coins marqués — idéal pour les devoirs de synthèse |
| **Rome** | Bordure en tresse de mosaïque romaine, nœuds de Salomon aux coins, corniche à denticules, titre sur plaque à rivets, sections I, II dans une couronne de laurier |
| **El Jem** | Titre au centre du plan elliptique de l'amphithéâtre, façade à trois étages d'arcades en filigrane, titres de section suivis d'une rangée d'arches |
| **Fil du temps** | En-tête en frise horizontale, ligne du temps verticale reliant sections (I, II…) et questions |
| **Archives** | Feuille perforée + trombone, sections en onglets de classeur, questions en fiches, points en tampons |
| **Classique** / **Moderne** | Modèles A et B d'origine |

Option **⚫ Noir et blanc** (cochée par défaut) : tous les modèles passent en noir pur sur blanc — pas de fonds teintés (qui deviennent un gris tacheté à la photocopie), traits noirs, carte d'Europe réduite à des contours légers. L'aperçu montre exactement ce qui sera imprimé ; décocher pour une version en couleur.

Options communes : icône par type de question (plume, livre, sablier, carte), phrase de fin (« بالتوفيق والنجاح »…), et style automatique selon la matière (Histoire → Carthage, Géographie → Globe). Dans les modèles décorés, une section contenant une seule question n'affiche pas de numéro.

| Modèle A — Classique | Modèle B — Moderne |
|---|---|
| Double filet autour de l'en-tête | Double cadre décoratif sur toute la page |
| En-tête en tableau 3 colonnes | En-tête à boîtes arrondies |
| Titres de sections soulignés | Titres de sections en « pilules » foncées |
| Questions avec lignes pointillées | Questions dans des encadrés arrondis |

### Étape 2 — Remplir l'en-tête
| Champ | Valeurs |
|---|---|
| Titre professeur | أستاذ / أستاذة |
| Durée | 30 minutes · 1 heure |
| Type de devoir | Devoir de contrôle · Devoir de synthèse |
| Numéro | 1 · 2 · 3 |
| Matière | Histoire · Géographie |
| Niveau | 7e · 8e · 9e année |
| Année scolaire | Saisir l'année de début ; la fin est calculée automatiquement |

Le titre arabe est généré automatiquement :  
> `الفرض العادي عدد 1 في مادة التاريخ`

### Étape 3 — Construire l'examen

#### Sections
- Deux sections par défaut : **القسم الأول (6 ن)** et **القسم الثاني (12 ن)**.
- Modifier le barème de chaque section directement dans le formulaire.
- Ajouter autant de sections que nécessaire (titres numérotés en arabe automatiquement).
- Supprimer une section uniquement si l'examen en contient plus de 2.

#### Questions
Chaque section peut contenir plusieurs questions. Cinq types disponibles :

**Paragraphe (فقرة)**  
Énoncé suivi de N lignes pointillées (minimum 10, défaut 12).

**Définition (تعريف)**  
Énoncé suivi de N lignes pointillées (minimum 1, défaut 3).

**Frise chronologique (سلم زمني)**  
- Choisir le nombre de graduations (2 à 8).
- Saisir le libellé de chaque événement en arabe.
- Rendu SVG : axe horizontal fléché vers la gauche (RTL), zones de date en pointillés au-dessus, libellés d'événements en dessous.

**Carte géographique (خريطة)**  
- Importer une image PNG/JPG depuis le disque (encodée en base64, embarquée dans le JSON).
- Régler la largeur : 50 % · 75 % · 100 %.
- Ajouter optionnellement une légende numérotée à compléter.

**Tableau (جدول)**
- Choisir le nombre de colonnes (1 à 6), de lignes (1 à 10) et la hauteur des cases (1 à 4 lignes d'écriture).
- Saisir les titres des colonnes (en-tête grisé) et, si besoin, le contenu de certaines cases.
- Une case laissée vide est à compléter par l'élève.

### Dépassement de page
Si l'examen ne tient plus sur une page A4, une **ligne rouge en pointillés** apparaît dans l'aperçu à la fin de la page 1, et un message s'affiche sous le compteur de points.

### Validation du barème
- Le total des sections ne peut **pas dépasser 18 ن** (les 2 points restants sont attribués à la qualité de l'expression).
- Compteur permanent dans le pied du formulaire :
  - 🟢 Vert = total exact à 18
  - 🟡 Orange = total inférieur à 18
  - 🔴 Rouge = total dépassé → impression bloquée
- Avertissement si la somme des questions d'une section ne correspond pas à son barème.

---

## Impression et PDF

### 🖨 Imprimer (ordinateur)
Une petite fenêtre d'aide explique comment choisir « Enregistrer au format PDF » ou une imprimante
(masquable avec « Ne plus afficher ce message »), puis la boîte de dialogue d'impression du navigateur s'ouvre.

- Format A4, marges zéro, rendu couleur fidèle ; seul l'examen est imprimé.
- Les questions ne sont pas coupées entre deux pages (`page-break-inside: avoid`).

### 📤 Partager en PDF (ordinateur et téléphone)
Crée un vrai fichier PDF A4 dans le navigateur (≈ 0,5 Mo par page, polices arabes incluses), puis propose :
**Partager** (menu de partage du téléphone : WhatsApp, e-mail…) ou **Télécharger le PDF**.

- Sur téléphone/tablette, le bouton **Imprimer** crée directement le PDF (l'impression du navigateur y est souvent inopérante,
  notamment dans les navigateurs intégrés de WhatsApp/Messenger). Le PDF peut ensuite être imprimé depuis le téléphone.
- Sur téléphone, le bouton est aussi présent sous l'aperçu (onglet « Aperçu »).
- Les bibliothèques [html-to-image](https://github.com/bubkoo/html-to-image) et [jsPDF](https://github.com/parallax/jsPDF)
  sont chargées depuis jsDelivr au premier clic (connexion Internet nécessaire).
- Le PDF est une image haute définition de la page (texte non sélectionnable).

---

## Mes examens (enregistrement et historique)

### Nom de l'examen
Le nom est **automatique** et se met à jour en direct à partir de l'en-tête :
`الفرض العادي عدد 1 – التاريخ – التاسعة أساسي – 2025/2026`.
Le champ facultatif **Thème / chapitre** est ajouté à la fin (ex. `… – الحرب العالمية الأولى`).
Ce nom sert à retrouver l'examen dans « Mes examens » ; il n'est pas imprimé.

### Enregistrer
**💾 Enregistrer** (en bas du formulaire) range l'examen dans **Mes examens**.
L'état est indiqué en permanence : « ✓ Enregistré dans « Mes examens » à HH:MM »
ou « ● Modifications non enregistrées ».

### 📚 Mes examens
Liste des examens enregistrés, du plus récent au plus ancien, avec recherche. Pour chacun :
**📂 Ouvrir** (pour le modifier), **⧉ Dupliquer** (copie, ex. pour l'année suivante),
**⬇** (télécharger le fichier, pour l'envoyer) et **🗑** (supprimer, avec confirmation).

### ➕ Nouvel examen
Repart d'un examen vide en gardant l'en-tête. Si l'examen en cours a des modifications non
enregistrées, l'application propose : Annuler / Ne pas enregistrer / Enregistrer.

### Brouillon automatique
L'examen en cours d'édition est gardé en continu : en cas de fermeture de l'onglet,
il réapparaît à la réouverture (avec l'indication des modifications non enregistrées).

### Sauvegarde de sécurité
Les examens sont stockés **dans le navigateur, sur cet ordinateur** (IndexedDB).
Dans « Mes examens » : **⬇ Sauvegarder tous mes examens** crée un fichier de sauvegarde ;
**⬆ Importer un fichier** recharge une sauvegarde complète ou un examen seul (y compris les anciens fichiers `.json`).

> ⚠ Ouvrir l'application toujours de la même façon (même adresse, même navigateur) :
> l'adresse GitHub Pages et le fichier `index.html` ouvert depuis le disque ont chacun leur propre « Mes examens ».
> Effacer les données de navigation du navigateur efface aussi Mes examens.

---

## Personnalisation CSS

Les styles sont organisés par sections dans `style.css` :

| Section | Description |
|---|---|
| `RESET & BASE` | Base universelle |
| `SCREEN MANAGEMENT` | Gestion des écrans |
| `SCREEN 1` | Page de sélection du modèle |
| `SCREEN 2 / FORM` | Panneau de formulaire |
| `BUTTONS` | Système de boutons |
| `EXAM A4 CONTAINER` | Conteneur de l'aperçu A4 |
| `MODEL A — CLASSIQUE` | Styles spécifiques au Modèle A |
| `MODEL B — MODERNE` | Styles spécifiques au Modèle B |
| `SHARED EXAM ELEMENTS` | Lignes, SVG timeline, carte, légende |
| `PRINT STYLES` | `@media print` |

Pour ajouter un **Modèle C** : créer une classe `.model-c` dans `style.css`, ajouter une branche dans `genExamC()` dans `app.js`, et ajouter une miniature dans `buildModelPickerHTML()`.

---

## Technologies utilisées

- HTML5 / CSS3 / JavaScript ES2020 (vanilla, pas de framework)
- [Google Fonts — Cairo](https://fonts.google.com/specimen/Cairo) + Noto Naskh Arabic
- SVG pour la frise chronologique (impression vectorielle nette)
- `FileReader` API pour l'import d'images
- `Blob` + `URL.createObjectURL` pour l'export JSON
- Fond de carte d'Europe (`assets/js/europe-map.js`) et globe (`assets/js/globe-map.js`) générés à partir de [Natural Earth](https://www.naturalearthdata.com/) 1:50m — domaine public
