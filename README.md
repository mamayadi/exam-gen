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
Au démarrage, deux modèles sont proposés :

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
Chaque section peut contenir plusieurs questions. Quatre types disponibles :

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

### Validation du barème
- Le total des sections ne peut **pas dépasser 18 ن** (les 2 points restants sont attribués à la qualité de l'expression).
- Compteur permanent dans le pied du formulaire :
  - 🟢 Vert = total exact à 18
  - 🟡 Orange = total inférieur à 18
  - 🔴 Rouge = total dépassé → impression bloquée
- Avertissement si la somme des questions d'une section ne correspond pas à son barème.

---

## Impression / Export PDF

Cliquer sur **🖨 Imprimer / PDF** (ou le bouton équivalent dans le pied du formulaire).  
La boîte de dialogue d'impression du navigateur s'ouvre.  
Pour obtenir un PDF, choisir **« Enregistrer en PDF »** comme imprimante.

- Format A4, marges zéro, rendu couleur fidèle.
- Toute l'interface est masquée ; seul l'examen apparaît.
- Les questions ne sont pas coupées entre deux pages (`page-break-inside: avoid`).

---

## Sauvegarde et chargement

### Sauvegarder
Cliquer sur **💾 Sauvegarder JSON** : un fichier `.json` est téléchargé contenant l'intégralité de l'examen (y compris les images encodées en base64).

### Charger
Cliquer sur **📂 Charger JSON** et sélectionner un fichier `.json` précédemment sauvegardé.  
Le nom du professeur et l'année scolaire de la session en cours sont conservés.

### Réinitialiser
**↺ Réinitialiser** efface toutes les sections et questions tout en conservant les informations d'en-tête.

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

Pour ajouter un **Modèle C** : créer une classe `.model-c` dans `style.css`, ajouter une branche dans `genExamC()` dans `app.js`, et ajouter une carte dans `#screen-model` dans `index.html`.

---

## Technologies utilisées

- HTML5 / CSS3 / JavaScript ES2020 (vanilla, pas de framework)
- [Google Fonts — Cairo](https://fonts.google.com/specimen/Cairo) + Noto Naskh Arabic
- SVG pour la frise chronologique (impression vectorielle nette)
- `FileReader` API pour l'import d'images
- `Blob` + `URL.createObjectURL` pour l'export JSON
