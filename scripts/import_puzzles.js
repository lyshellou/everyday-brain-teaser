/**
 * Import new puzzles from new_puzzles.json into puzzles.db
 * Uses direct SQLite access for speed (bypasses HTTP layer).
 */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dbPath = path.join(__dirname, "..", "data", "puzzles.db");
const jsonPath = path.join(__dirname, "..", "new_puzzles.json");

const puzzles = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

console.log(`Importing ${puzzles.length} puzzles into ${dbPath}...`);

const db = new DatabaseSync(dbPath);

const insert = db.prepare(`
  INSERT INTO puzzles (
    id, type, difficulty, question, answer, accepted_answers, explanation
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    difficulty = excluded.difficulty,
    question = excluded.question,
    answer = excluded.answer,
    accepted_answers = excluded.accepted_answers,
    explanation = excluded.explanation
`);

db.exec("BEGIN");

try {
  for (const p of puzzles) {
    insert.run(
      p.id,
      p.type,
      p.difficulty,
      p.question,
      p.answer,
      JSON.stringify(p.acceptedAnswers),
      p.explanation
    );
  }
  db.exec("COMMIT");
  console.log(`Successfully imported ${puzzles.length} puzzles.`);
} catch (error) {
  db.exec("ROLLBACK");
  console.error("Import failed, rolled back:", error.message);
  process.exit(1);
} finally {
  db.close();
}

// Verify
const db2 = new DatabaseSync(dbPath);
const count = db2.prepare("SELECT COUNT(*) AS count FROM puzzles").get();
db2.close();

console.log(`Total puzzles in database: ${count.count}`);
