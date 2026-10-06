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

Sept modèles sont disponibles (miniatures générées automatiquement à partir du vrai rendu) :

| Modèle | Style |
|---|---|
| **Décoré** (par défaut) | Double cadre à coins grecs, titre accroché au cadre, bandeaux ardoise / parchemin, filigrane en bas de page : carte d'Europe + rose des vents (défaut), rose des vents + quadrillage, image personnalisée ou aucun |
| **Manuscrit** | Parchemin enroulé, cartouche, rubans de section, sceau rond pour la note |
| **Carte ancienne** | Bordure graduée noir/blanc avec degrés, cartouche, repères 📍 pour les points, échelle et rose des vents |
| **Fil du temps** | En-tête en frise horizontale, ligne du temps verticale reliant sections (I, II…) et questions |
| **Archives** | Feuille perforée + trombone, sections en onglets de classeur, questions en fiches, points en tampons |
| **Classique** / **Moderne** | Modèles A et B d'origine |

Options communes : icône par type de question (plume, livre, sablier, carte), phrase de fin (« بالتوفيق والنجاح »…), et style automatique selon la matière (Histoire → Manuscrit, Géographie → Carte ancienne). Dans les modèles décorés, une section contenant une seule question n'affiche pas de numéro.

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

## Impression / Export PDF

Cliquer sur **🖨 Imprimer / créer le PDF** (en bas du formulaire).
Une petite fenêtre d'aide explique comment choisir « Enregistrer au format PDF » ou une imprimante
(elle peut être masquée définitivement avec « Ne plus afficher ce message »),
puis la boîte de dialogue d'impression du navigateur s'ouvre.

- Format A4, marges zéro, rendu couleur fidèle.
- Toute l'interface est masquée ; seul l'examen apparaît.
- Les questions ne sont pas coupées entre deux pages (`page-break-inside: avoid`).

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
- Fond de carte d'Europe (`assets/js/europe-map.js`) généré à partir de [Natural Earth](https://www.naturalearthdata.com/) 1:50m — domaine public
