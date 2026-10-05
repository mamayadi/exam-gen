# CLAUDE.md — Instructions pour Claude Code

## Présentation du projet

Générateur d'examens d'Histoire & Géographie en arabe (RTL) pour le collège tunisien.  
Application web **single-page** sans backend : `index.html` + `assets/css/style.css` + `assets/js/app.js`.

---

## Structure des fichiers

```text
exam-gen/
├── index.html              ← Point d'entrée (HTML pur)
├── README.md               ← Documentation utilisateur (affiché sur GitHub)
├── CLAUDE.md               ← Ce fichier — instructions Claude Code
├── .gitignore
├── .nojekyll               ← Désactive Jekyll sur GitHub Pages
├── assets/
│   ├── css/
│   │   └── style.css       ← Tous les styles UI + modèles + @media print
│   └── js/
│       └── app.js          ← État, rendu, formulaire, SVG, impression, JSON
├── docs/
│   └── agent.md            ← Contexte domaine pour agents IA
└── .github/
    └── workflows/
        └── deploy.yml      ← Pipeline GitHub Actions → GitHub Pages
```

---

## Architecture de l'état (`app.js`)

```js
let S = {
  model: 'A' | 'B',
  header: {
    teacherGender, teacherName, duration,
    examType, examNumber, subject, level, yearStart
  },
  sections: [
    {
      id: number,
      points: number,
      questions: [
        {
          id: number,
          type: 'paragraph' | 'definition' | 'timeline' | 'map',
          text: string,
          points: number,
          params: { ... }   // dépend du type
        }
      ]
    }
  ]
}
```

### Params par type de question

| type | params |
|---|---|
| `paragraph` | `{ lines: number }` (min 10) |
| `definition` | `{ lines: number }` (min 1) |
| `timeline` | `{ count: number, events: string[] }` |
| `map` | `{ imageData: string\|null, imageName: string, imageWidth: string, legendCount: number }` |

---

## Flux de rendu

```
Changement d'état
     │
     ├─ structurel (add/remove/reorder, changement de type)
     │         └─> renderAll()  ─> renderFormBody() + renderFormFooter() + renderExam()
     │
     └─ valeur texte (frappe dans textarea)
               └─> updateQText() ─> renderExam() seulement
                                    (préserve le focus du textarea)
```

**Ne jamais appeler `renderFormBody()` lors d'un événement `oninput` sur un textarea** — cela réinitialise le DOM et détruit la position du curseur.

---

## Conventions de code

- Échapper tout contenu utilisateur vers le DOM HTML avec `esc(str)`.
- Les IDs d'objets (sections, questions) sont des entiers générés par `gid()` ; ne jamais utiliser l'index de tableau comme identifiant stable.
- Les fonctions `getSec(sid)` et `getQ(sid, qid)` font les lookups dans `S.sections`.
- `AR_ORDINALS[]` fournit les noms arabes des sections (الأول, الثاني…).
- `totalPoints()` doit rester ≤ 18 ; bloquer l'impression sinon.

---

## Ajouter un modèle

1. **`style.css`** — Ajouter une section `MODEL C` avec les classes `.model-c .xxx`.
2. **`app.js`** — Ajouter `function genExamC()` sur le modèle de `genExamA/B`, brancher dans `renderExam()`.
3. **`index.html`** — Ajouter une `.model-card` dans `#screen-model` avec `onclick="selectModel('C')"`.

---

## Ajouter un type de question

1. **`app.js — defaultParams()`** — Ajouter le cas avec les params par défaut.
2. **`app.js — buildQParamsHTML()`** — Ajouter les champs de formulaire.
3. **`app.js — renderQContent()`** — Ajouter la fonction de rendu HTML/SVG.
4. **`app.js — buildQFormHTML()`** — Ajouter l'option dans le `<select>` de type.
5. **`app.js — newQuestion()`** — S'appuie sur `defaultParams()`, rien à changer.

---

## Styles d'impression

`@media print` dans `style.css` :
- Masque `#form-panel`, `.preview-toolbar`, `#screen-model`.
- Affiche `#preview-panel` en `display: block` avec `overflow: visible`.
- `#print-zone` centré à `210mm`.
- `.q-item` et `.q-box` ont `page-break-inside: avoid`.
- `@page { size: A4; margin: 0; }` + `print-color-adjust: exact`.

---

## Points d'attention

- L'examen entier a `dir="rtl"` et `lang="ar"` ; ne pas les retirer.
- La frise chronologique est rendue en SVG avec `<foreignObject>` pour le retour à la ligne du texte arabe.
- Les images de carte sont stockées en base64 dans `params.imageData` ; les fichiers JSON peuvent être volumineux.
- Le compteur `totalPoints()` affiche les demi-points (`step="0.5"` sur les inputs).
- Après un `loadExam()`, recalculer `_nextId` via `Math.max(...allIds) + 1` pour éviter les collisions d'IDs.
