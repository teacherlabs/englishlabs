const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const databasePath = path.join(__dirname, "english_lab.db");
const banks = ["grammar_a1_a2.json", "grammar_b1_b2.json"].flatMap((fileName) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, fileName), "utf8")),
);
const categories = banks.filter((group) => group.type === "multiple_choice");
const db = new sqlite3.Database(databasePath);

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, function (error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

(async () => {
  try {
    await run("PRAGMA foreign_keys = OFF");
    await run("CREATE TABLE IF NOT EXISTS grammar_bank_meta (version INTEGER PRIMARY KEY, installed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    const installed = await all("SELECT version FROM grammar_bank_meta WHERE version = 1");
    if (installed.length) {
      console.log("Supplied grammar question bank is already installed.");
      return;
    }
    await run("BEGIN TRANSACTION");
    await run("DELETE FROM quiz_questions");
    await run("DELETE FROM grammar_topics");
    await run("DELETE FROM chapters");

    for (const [index, category] of categories.entries()) {
      const chapter = await run(
        "INSERT INTO chapters (chapter_number, title, description, cefr_level) VALUES (?, ?, ?, ?)",
        [index + 1, category.category, category.instruction, category.level],
      );
      const topic = await run(
        "INSERT INTO grammar_topics (chapter_id, topic_code, title, explanation, example_sentence, cefr_level) VALUES (?, ?, ?, ?, ?, ?)",
        [chapter.lastID, `${index + 1}.1`, category.category, category.instruction, "Choose the best answer in each question.", category.level],
      );

      for (const question of category.questions) {
        const options = question.options;
        await run(
          "INSERT INTO quiz_questions (topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, cefr_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            topic.lastID,
            question.question,
            options[0],
            options[1],
            options[2] || null,
            options[3] || null,
            String.fromCharCode(97 + options.indexOf(question.correct_answer)),
            category.instruction,
            category.level,
          ],
        );
      }
    }

    await run("INSERT INTO grammar_bank_meta (version) VALUES (1)");

    await run("COMMIT");
    const counts = await all("SELECT COUNT(*) AS count FROM chapters UNION ALL SELECT COUNT(*) FROM quiz_questions");
    console.log(`Imported ${categories.length} grammar categories and ${counts[0].count} chapters.`);
    console.log(`Imported ${counts[1].count} multiple-choice questions.`);
  } catch (error) {
    await run("ROLLBACK").catch(() => {});
    console.error("Unable to reset grammar content:", error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
