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
│       ├── europe-map.js   ← Fond de carte d'Europe (SVG, Natural Earth, domaine public)
│       ├── globe-map.js    ← Globe orthographique centré sur la Tunisie (modèle Globe)
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
  model: 'A'…'H',            // voir MODELS ; C (Décoré) par défaut
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
          type: 'paragraph' | 'definition' | 'timeline' | 'map' | 'table',
          text: string,
          points: number,
          params: { ... }   // dépend du type
        }
      ]
    }
  ],
  decor: { watermark: 'europe' | 'compass' | 'image' | 'none', imageData, imageName }, // filigrane du Modèle C
  opts:  { icons: boolean, closing: string, bw: boolean }, // bw = classe .bw (noir et blanc)            // options communes
  seq: number | null,     // numéro ajouté au nom si un examen enregistré porte déjà le même nom — voir computeSeq() ; nom affiché = examTitle()
  docId: string | null    // id dans la bibliothèque (null = jamais enregistré)
}
```

### Stockage (IndexedDB `examgen`)

- Store `exams` (keyPath `id`) : `{ id, title, subject, level, examType, examNumber, model, createdAt, updatedAt, data: S }`.
- Store `kv` : clé `draft` = JSON de l'examen en cours (brouillon, écrit 400 ms après chaque rendu via `scheduleAutosave()`).
- `_savedJson` = version enregistrée ; `_dirty` = brouillon ≠ version enregistrée → statut « Modifications non enregistrées ».
- Toute action qui remplace l'examen en cours (`newExam`, `openFromLibrary`) passe par `confirmLeave()`.
- Les tests headless avec `--virtual-time-budget` ne laissent pas IndexedDB répondre : piloter Chrome via le protocole DevTools.

### Params par type de question

| type | params |
|---|---|
| `paragraph` | `{ lines: number }` (min 10) |
| `definition` | `{ lines: number }` (min 1) |
| `timeline` | `{ count: number, events: string[] }` |
| `map` | `{ imageData: string\|null, imageName: string, imageWidth: string, legendCount: number }` |
| `table` | `{ cols: 1–6, rows: 1–10, cellHeight: 1–4, headers: string[], cells: string[][] }` (case vide = à compléter) |

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

- **Interface en arabe, `<html lang="ar" dir="rtl">`** : tous les textes affichés (formulaire, boutons, messages, dialogues) sont en arabe.
  Préférer les propriétés logiques (`margin-inline-start`, `padding-inline-start`) aux `left/right` dans le CSS de l'interface ;
  le formulaire est le premier élément de `#screen-app` (donc à droite en RTL), l'aperçu le second (à gauche).
- **Thème de l'interface** : bloc « UI THEME » de `style.css` (variables `--brand`, `--slate`, `--accent`, `--line`, `--r-*`…).
  Rôles des boutons : `.btn-primary` (bleu, enregistrer), `.btn-success` (ardoise, imprimer), `.btn-share` (ocre, partager PDF) ;
  vert / ambre / rouge réservés aux états (total, alertes). Réutiliser les variables plutôt que des couleurs en dur.
- Un nom arabe inséré dans une phrase arabe/latine passe par `iso()` (isolat Unicode) pour garder l'ordre de lecture.

- Échapper tout contenu utilisateur vers le DOM HTML avec `esc(str)`.
- Les IDs d'objets (sections, questions) sont des entiers générés par `gid()` ; ne jamais utiliser l'index de tableau comme identifiant stable.
- Les fonctions `getSec(sid)` et `getQ(sid, qid)` font les lookups dans `S.sections`.
- `AR_ORDINALS[]` fournit les noms arabes des sections (الأول, الثاني…).
- `totalPoints()` doit rester ≤ 18 ; bloquer l'impression sinon.

---

## Ajouter un modèle (ex. I)

1. **`style.css`** — Ajouter une section `MODEL I` avec les classes `.model-i .xxx`.
2. **`app.js`** — Écrire `function genExamI()` (s'inspirer de `genExamD…H` et des helpers `qTitleHTML`, `closingHTML`, `studentLineHTML`, `ornSep`, `cartoucheSVG`).
3. **`app.js — MODELS`** — Ajouter `{ id: 'I', label: 'Nom', gen: genExamI }` ; si la page est décorée pleine page, ajouter `'I'` à `DECO_MODELS`.
4. La miniature du sélecteur est générée automatiquement (`getModelThumbs()`).
5. Vérifier que l'examen type tient sur **une seule page A4** à l'impression.

> Dans les SVG, ne pas utiliser d'`id` (`<pattern>`, `<defs>`…) : les miniatures dupliquent le rendu dans la page. Utiliser des images de fond CSS (data URI) à la place.

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
- Masque `#form-panel` et `.preview-toolbar`.
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
