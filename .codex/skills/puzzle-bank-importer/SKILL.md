---
name: puzzle-bank-importer
description: Import brain teasers, riddles, and logic puzzles into the everyday-brain-teaser SQLite puzzle bank. Use when the user asks to expand, add, import, or bulk-load puzzles into the database, or when they want to acquire new puzzle datasets. Covers searching public datasets (MDRiddle, GitHub), extracting and transforming data to match the project schema, deduplicating, and importing via Node.js SQLite.
---

# Puzzle Bank Importer

Import puzzles from public datasets into the everyday-brain-teaser SQLite database.

## Project schema

The database table `puzzles` has these columns:

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | e.g. `word-07`, `number-06`, `logic-01` |
| `type` | TEXT | `number`, `logic`, or `word` |
| `difficulty` | TEXT | `easy`, `medium`, or `hard` |
| `question` | TEXT | The puzzle question |
| `answer` | TEXT | Standard answer |
| `accepted_answers` | TEXT | JSON array of accepted answer variants |
| `explanation` | TEXT | Solution explanation |

## Workflow

### 1. Obtain puzzle data

Preferred sources:

- **[MDRiddle](https://github.com/canwuying/MDRiddle)** — 3000 Chinese brain teasers + 300 number riddles + 16766 character riddles in `.7z` Excel files. Clone the repo, extract with `py7zr`, read `.xlsx` with `openpyxl`.
- **GitHub search** — `curl` the GitHub API for repos matching `riddles dataset`, `brain teaser JSON`, `logic puzzles collection`.
- **Hand-crafted** — for missing types (especially `logic` and `number` patterns), write high-quality puzzles directly.

Install required Python packages if missing: `pip install py7zr openpyxl`.

### 2. Transform to project schema

Run `scripts/process_mdriddle.py` after adjusting `BASE` to the project root.

The script:
- Reads existing puzzles from `data/puzzles.db` for dedup
- Parses MDRiddle Excel files: `riddle` = question, `choice0-4` = options, `label` = correct answer index
- Maps types: brain teasers → `word`, number-related riddles → `number` or `word`
- Assigns difficulty based on question length with hash-based randomness for variety
- Generates `explanation` text when source lacks it
- Deduplicates by normalized question text
- Assigns sequential IDs (e.g. `word-07` after existing `word-06`)
- Outputs `new_puzzles.json`

To add hand-crafted puzzles, edit the `HAND_CRAFTED` list in the script.

### 3. Import into database

Run `scripts/import_puzzles.js` from the project root:

```bash
node scripts/import_puzzles.js
```

This uses `node:sqlite` (`DatabaseSync`) to bulk-insert with `ON CONFLICT(id) DO UPDATE` for idempotent imports.

### 4. Verify

```bash
node -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/puzzles.db');console.log(db.prepare('SELECT COUNT(*) as c FROM puzzles').get())"
```

Also verify via `GET /api/puzzles` after starting `node server.js`.

## Quality rules

- Prioritize puzzle quality over quantity
- Ensure balanced type distribution: aim for ~50% word, ~25% logic, ~25% number
- Ensure balanced difficulty: aim for ~30% easy, ~40% medium, ~30% hard
- Deduplicate by normalized question (strip punctuation, lowercase, collapse whitespace)
- Each puzzle must have a non-empty `explanation`
