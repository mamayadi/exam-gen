# agent.md — Contexte pour agents IA

## Projet

**Générateur d'examens — Histoire & Géographie**  
Application web single-page pour enseignants du collège tunisien (7e/8e/9e année).  
Interface en français, contenu d'examen en arabe (RTL), rendu A4 imprimable.

---

## Fichiers du projet

```
exam-gen/
├── index.html   HTML : deux écrans (choix modèle / app)
├── style.css    CSS : UI + Modèle A + Modèle B + @media print
├── app.js       JS  : état, rendu, form, SVG timeline, impression, JSON
├── README.md    Documentation utilisateur
├── CLAUDE.md    Guide technique pour Claude Code
└── agent.md     Ce fichier
```

---

## Domaine métier

### Terminologie

| Terme FR | Terme AR | Notes |
|---|---|---|
| Devoir de contrôle | الفرض العادي | Examen court (30 min) |
| Devoir de synthèse | الفرض التأليفي | Examen long (1 h) |
| Section | القسم | Partie de l'examen avec un barème |
| Barème | ن (نقطة) | Points, notation sur 20 |
| Paragraphe | فقرة | Question à rédiger |
| Définition | تعريف | Question à définir |
| Frise chronologique | سلم زمني | Axe du temps RTL |
| Carte géographique | خريطة | Image + légende |

### Règle de notation
- Total des sections = **18 points maximum**.
- Les **2 points** restants sont réservés à `+2 لوضوح الخط وسلامة اللغة` (qualité de la langue et de l'écriture), affiché automatiquement dans l'en-tête.
- L'impression est bloquée si le total dépasse 18.

### Niveaux scolaires tunisiens
- 7e année → `السابعة أساسي`
- 8e année → `الثامنة أساسي`
- 9e année → `التاسعة أساسي`

---

## Architecture technique clé

### Objet d'état central `S` (dans `app.js`)

```js
S = {
  model: 'A' | 'B',
  header: { teacherGender, teacherName, duration, examType,
            examNumber, subject, level, yearStart },
  sections: [{
    id, points,
    questions: [{ id, type, text, points, params }]
  }]
}
```

### Types de questions et leurs `params`

```js
paragraph  → { lines: 12 }
definition → { lines: 3 }
timeline   → { count: 4, events: ['...', '...'] }
map        → { imageData: 'data:image/...', imageName, imageWidth: '100%', legendCount: 0 }
```

### Cycle de rendu

- **`renderAll()`** : reconstruit formulaire + aperçu (pour changements structurels).
- **`renderExam()`** : reconstruit seulement l'aperçu A4 (pour saisie de texte).
- Les handlers `oninput` sur textarea appellent uniquement `renderExam()` pour préserver le focus.

### Modèles visuels

**Modèle A (`.model-a`)** :
- `border: 3px double` autour de l'en-tête.
- `<table dir="rtl">` à 3 colonnes pour l'en-tête.
- Titres soulignés, questions sans encadré.

**Modèle B (`.model-b`)** :
- Double cadre via `exam-a4.model-b { border }` + `.exam-inner { border; margin }`.
- Flexbox RTL pour les boîtes d'en-tête.
- Séparateur `◆ ◆ ◆`, titres en pilules `border-radius: 20px`.
- Questions dans `.q-box { border; border-radius }`.

### Frise chronologique SVG

- Tracé en SVG avec `viewBox="0 0 630 140"` (s'adapte à la largeur).
- Axe horizontal, flèche pointant à **gauche** (sens arabe, le temps avance vers la gauche).
- Événement[0] = position la plus à droite (premier événement = événement le plus ancien).
- `<foreignObject>` pour le retour à la ligne des libellés arabes.

---

## Décisions de conception

| Décision | Raison |
|---|---|
| Fichier HTML unique à l'origine, maintenant 3 fichiers | Maintenabilité |
| Pas de framework JS | Ouverture directe dans le navigateur sans build |
| `esc()` sur tout le contenu utilisateur | Sécurité XSS |
| IDs entiers stables plutôt qu'index de tableau | Évite les bugs lors d'ajout/suppression |
| `renderFormBody()` jamais appelé sur `oninput` textarea | Préserve la position du curseur |
| Base64 pour les images de carte | Portabilité du JSON sauvegardé |
| `@media print` masque l'UI plutôt que `window.print()` sur un clone | Simplicité |

---

## Tâches communes

### Modifier le style d'un modèle
→ Éditer la section correspondante dans `style.css` (`.model-a` ou `.model-b`).

### Ajouter un type de question
→ Voir la section « Ajouter un type de question » dans `CLAUDE.md`.

### Modifier le titre arabe généré
→ Dans `app.js`, fonctions `genExamA()` et `genExamB()`, ligne :
```js
const title = `${hd.examType} عدد ${hd.examNumber} في مادة ${hd.subject}`;
```

### Changer le barème maximum (18 pts)
→ Dans `app.js` : `totalPoints()` comparé à `18` dans `renderFormFooter()` et `printExam()`.  
→ Dans `style.css` : pas de valeur codée en dur.

### Déboguer le rendu SVG de la frise
→ Fonction `renderTimeline(params)` dans `app.js`.  
→ Variables : `W=630`, `H=140`, `lineY=70`, `mLeft=20`, `mRight=15`.  
→ Les libellés longs sont wrappés via `<foreignObject>` avec un `<div>` HTML interne.
