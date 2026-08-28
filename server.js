//---------------------
// GLOBAL DEFINITIONS
//---------------------
const adminname = "Melina";
const adminPassword =
  "$2b$12$n0Uw5LlR/4OaSeTKsBFb0OIJZ5QaGoQyo6koa6MJMYYsueqS.8duu";

//---------
// PACKAGES
//----------
const express = require("express");
const { engine } = require("express-handlebars");
const sqlite3 = require("sqlite3");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const connectSqlite3 = require("connect-sqlite3");
const bcrypt = require("bcrypt");
//----------
// PORT
//----------
const port = Number(process.env.PORT || 8090);

//----------
// APPLICATION
//----------
const app = express();

//----------
// DATABASES
//----------
const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, "uploads", "profiles"), { recursive: true });
const db = new sqlite3.Database(path.join(dataDir, "members.sqlite3.db"));
const grammarDb = new sqlite3.Database(path.join(dataDir, "english_lab.db"));
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(dataDir, "uploads", "profiles"),
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${req.session.name}-${Date.now()}${extension}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    callback(
      null,
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.mimetype,
      ),
    );
  },
});

function vocabularyLevel(cefrLevel) {
  return cefrLevel === "A2" ? "easy" : "medium";
}

function vocabularyLevelChoices(selectedLevel) {
  return [
    {
      key: "easy",
      label: "Easy",
      selected: selectedLevel === "easy",
    },
    {
      key: "medium",
      label: "Medium",
      selected: selectedLevel === "medium",
    },
  ];
}

//----------
// SESSIONS
//----------
const SQLiteStore = connectSqlite3(session);

app.use(
  session({
    store: new SQLiteStore({ db: "members.sqlite.db", dir: dataDir }),
    saveUninitialized: false,
    resave: false,
    secret: process.env.SESSION_SECRET || "local-development-secret",
  }),
);
app.use(function (req, res, next) {
  console.log("Session passed to respone locals...");
  if (req.session.name && !req.session.avatar_initial) {
    req.session.avatar_initial = req.session.name.charAt(0).toUpperCase();
  }
  res.locals.session = req.session;
  next();
});

//-------------
// MIDDLEWARES
//-------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads/profiles", express.static(path.join(dataDir, "uploads", "profiles")));

db.serialize(() => {
  db.run("ALTER TABLE members ADD COLUMN password_hash TEXT", () => {});
  db.run(
    "ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'student'",
    () => {},
  );
  db.run("ALTER TABLE members ADD COLUMN goal TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE members ADD COLUMN avatar TEXT DEFAULT ''", () => {});
  db.run(`CREATE TABLE IF NOT EXISTS user_character (
    user_id TEXT PRIMARY KEY,
    character_hash TEXT NOT NULL,
    character_layers TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES members(username)
  )`, () => {});
  db.run("ALTER TABLE user_character ADD COLUMN character_layers TEXT NOT NULL DEFAULT '[]'", () => {});
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_hair TEXT DEFAULT '#3b2416'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_skin TEXT DEFAULT '#f2c6a0'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_shirt TEXT DEFAULT '#8fb9d9'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_bottom TEXT DEFAULT '#263c68'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_shoes TEXT DEFAULT '#ffffff'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_eyes TEXT DEFAULT '#263c68'",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_hair_style INTEGER NOT NULL DEFAULT 1",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN avatar_customized INTEGER NOT NULL DEFAULT 0",
    () => {},
  );
  db.run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    chapter_id INTEGER,
    points INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES members(username)
  )`);
  db.run(
    "ALTER TABLE progress ADD COLUMN difficulty_level TEXT DEFAULT ''",
    () => {},
  );
});

//------------
// VIEW ENGINE
//------------
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

//---------
// ROUTES
//---------
app.get("/", (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.render("auth.handlebars");
  }

  grammarDb.all(
    `SELECT chapters.*, COUNT(grammar_topics.id) AS topic_count
     FROM chapters
     LEFT JOIN grammar_topics ON grammar_topics.chapter_id = chapters.id
     GROUP BY chapters.id
     ORDER BY chapters.chapter_number`,
    (error, chapters) => {
      if (error) {
        console.log("ERROR loading grammar chapters: ", error);
        return res.status(500).send("Unable to load grammar content.");
      }

      grammarDb.all(
        `SELECT chapter_id, topic_code, title, explanation, example_sentence, cefr_level
         FROM grammar_topics
         ORDER BY chapter_id, topic_code`,
        (topicsError, topics) => {
          if (topicsError) {
            console.log("ERROR loading grammar topics: ", topicsError);
            return res.status(500).send("Unable to load grammar content.");
          }

          const topicsByChapter = topics.reduce((groups, topic) => {
            if (!groups[topic.chapter_id]) groups[topic.chapter_id] = [];
            groups[topic.chapter_id].push(topic);
            return groups;
          }, {});

          const model = {
            isLoggedIn: req.session.isLoggedIn,
            name: req.session.name,
            isAdmin: req.session.isAdmin,
            chapters: chapters.map((chapter) => ({
              ...chapter,
              topics: topicsByChapter[chapter.id] || [],
            })),
          };

          res.render("home.handlebars", model);
        },
      );
    },
  );
});

app.get("/vocabulary", (req, res) => {
  grammarDb.get(
    "SELECT COUNT(*) AS word_count FROM vocabulary",
    (error, result) => {
      if (error) return res.status(500).send("Unable to load vocabulary.");
      res.render("vocabulary.handlebars", { wordCount: result.word_count });
    },
  );
});

app.get("/vocabulary/flip-cards", (req, res) => {
  grammarDb.all(
    "SELECT id, english_word, swedish_translation, part_of_speech, definition, example_sentence, cefr_level FROM vocabulary ORDER BY id",
    (error, words) => {
      if (error) return res.status(500).send("Unable to load flashcards.");
      const selectedLevel = ["easy", "medium"].includes(req.query.level)
        ? req.query.level
        : "easy";
      const levelFor = vocabularyLevel;
      const levelWords = words
        .map((word) => ({
          ...word,
          vocabulary_level: levelFor(word.cefr_level),
        }))
        .filter((word) => word.vocabulary_level === selectedLevel);
      res.render("vocabulary-exercise.handlebars", {
        mode: "flip",
        isFlip: true,
        vocabularyLevels: vocabularyLevelChoices(selectedLevel),
        selectedLevel,
        pageTitle: "Flip cards",
        pageIntro:
          "Flip each card to reveal the Swedish word and examples. Swipe right when you know it.",
        words: levelWords,
      });
    },
  );
});

app.get("/vocabulary/translation", (req, res) => {
  grammarDb.all(
    "SELECT id, english_word, swedish_translation, part_of_speech, cefr_level FROM vocabulary ORDER BY id",
    (error, words) => {
      if (error) return res.status(500).send("Unable to load translations.");
      const selectedLevel = ["easy", "medium"].includes(req.query.level)
        ? req.query.level
        : "easy";
      const levelWords = words.filter(
        (word) => vocabularyLevel(word.cefr_level) === selectedLevel,
      );
      const options = levelWords.map((word) => {
        const alternatives = levelWords
          .filter((candidate) => candidate.id !== word.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((candidate) => candidate.swedish_translation);
        return {
          ...word,
          options: [word.swedish_translation, ...alternatives].sort(
            () => Math.random() - 0.5,
          ),
        };
      });
      res.render("vocabulary-exercise.handlebars", {
        mode: "translation",
        isTranslation: true,
        vocabularyLevels: vocabularyLevelChoices(selectedLevel),
        selectedLevel,
        vocabularyBasePath: "/vocabulary/translation",
        pageTitle: "Translation",
        pageIntro:
          "Choose the correct Swedish translation for each English word.",
        words: options,
      });
    },
  );
});

app.get("/vocabulary/spelling", (req, res) => {
  grammarDb.all(
    "SELECT id, english_word, swedish_translation, part_of_speech, definition, cefr_level FROM vocabulary ORDER BY id",
    (error, words) => {
      if (error)
        return res.status(500).send("Unable to load spelling exercise.");
      const selectedLevel = ["easy", "medium"].includes(req.query.level)
        ? req.query.level
        : "easy";
      res.render("vocabulary-exercise.handlebars", {
        mode: "spelling",
        isSpelling: true,
        vocabularyLevels: vocabularyLevelChoices(selectedLevel),
        selectedLevel,
        vocabularyBasePath: "/vocabulary/spelling",
        pageTitle: "Write the word",
        pageIntro: "Type each English word correctly to pass.",
        words: words.filter(
          (word) => vocabularyLevel(word.cefr_level) === selectedLevel,
        ),
      });
    },
  );
});

app.get("/grammar/chapter/:id", (req, res) => {
  res.redirect(
    `/practice/questions?chapter=${encodeURIComponent(req.params.id)}`,
  );
});

app.get("/practice/questions", (req, res) => {
  const chapterFilter = req.query.chapter ? "WHERE chapters.id = ?" : "";
  const params = req.query.chapter ? [req.query.chapter] : [];
  grammarDb.all(
    "SELECT id, chapter_number, title, cefr_level FROM chapters ORDER BY chapter_number",
    (chaptersError, chapters) => {
      if (chaptersError)
        return res.status(500).send("Unable to load chapters.");

      if (!req.query.chapter) {
        return res.render("practice.handlebars", {
          mode: "questions",
          pageTitle: "Practise Questions",
          pageIntro: "Choose a chapter to begin practising.",
          chapterId: "",
          chapters: chapters.map((chapter) => ({
            ...chapter,
            selected: false,
          })),
        });
      }

      grammarDb.all(
        `SELECT quiz_questions.*, chapters.id AS chapter_id, chapters.title AS chapter_title
         FROM quiz_questions
         JOIN grammar_topics ON quiz_questions.topic_id = grammar_topics.id
         JOIN chapters ON grammar_topics.chapter_id = chapters.id
         ${chapterFilter}
         ORDER BY chapters.chapter_number, quiz_questions.id`,
        params,
        (error, questions) => {
          if (error)
            return res.status(500).send("Unable to load practice questions.");
          const questionsByChapter = questions.reduce((groups, question) => {
            if (!groups[question.chapter_id]) groups[question.chapter_id] = [];
            groups[question.chapter_id].push(question);
            return groups;
          }, {});
          const requestedChapter = req.query.chapter
            ? Number(req.query.chapter)
            : null;
          const chaptersWithoutQuestions = chapters.filter(
            (chapter) => !questionsByChapter[chapter.id],
          );
          const grammarFallbacks = {
            1: {
              question_text:
                "Which word is an adjective in this sentence: 'The bright student smiled.'",
              option_a: "bright",
              option_b: "student",
              option_c: "smiled",
              option_d: "the",
              correct_option: "a",
              explanation:
                "'Bright' describes the noun 'student', so it is an adjective.",
            },
            2: {
              question_text:
                "Which part is the subject in 'The young teacher explained the lesson'?",
              option_a: "explained",
              option_b: "the lesson",
              option_c: "The young teacher",
              option_d: "young",
              correct_option: "c",
              explanation:
                "The subject is who performs the action. 'The young teacher' performs the action 'explained'.",
            },
            3: {
              question_text: "Which sentence contains an infinitive phrase?",
              option_a: "She runs quickly.",
              option_b: "To learn English takes practice.",
              option_c: "The blue book is here.",
              option_d: "We arrived yesterday.",
              correct_option: "b",
              explanation:
                "'To learn English' is an infinitive phrase because it begins with 'to' plus the verb 'learn'.",
            },
            4: {
              question_text:
                "Which word correctly completes the adjective clause: 'The book ____ I borrowed is excellent.'?",
              option_a: "where",
              option_b: "that",
              option_c: "when",
              option_d: "why",
              correct_option: "b",
              explanation:
                "'That' introduces an adjective clause modifying the noun 'book'.",
            },
            5: {
              question_text:
                "Which of the following sentences is a compound sentence?",
              option_a:
                "The sun set behind the mountains, and the temperature dropped rapidly.",
              option_b: "The wind howled loudly through the dark night.",
              option_c:
                "Although she was tired, she finished her homework before bedtime.",
              option_d:
                "Walking down the quiet street, he listened to the rustling leaves.",
              correct_option: "a",
              explanation:
                "A compound sentence contains two independent clauses joined by a coordinating conjunction such as 'and'.",
            },
            6: {
              question_text:
                "Which pronoun correctly completes the sentence: 'Sarah gave the note to Mark and ____.'?",
              option_a: "I",
              option_b: "me",
              option_c: "myself",
              option_d: "mine",
              correct_option: "b",
              explanation:
                "'Me' is correct because it is the object of the preposition 'to'.",
            },
            7: {
              question_text: "Which sentence uses the past perfect correctly?",
              option_a: "She had left before I arrived.",
              option_b: "She has left yesterday.",
              option_c: "She leave before I arrived.",
              option_d: "She leaving before I arrived.",
              correct_option: "a",
              explanation:
                "Past perfect uses 'had' plus a past participle for an earlier past action: 'had left'.",
            },
            8: {
              question_text:
                "Which sentence uses commas correctly in a series?",
              option_a: "We bought apples bananas and milk.",
              option_b: "We bought apples, bananas, and milk.",
              option_c: "We bought, apples bananas, and milk.",
              option_d: "We bought apples bananas, and milk.",
              correct_option: "b",
              explanation:
                "Commas separate each item in a series: apples, bananas, and milk.",
            },
            9: {
              question_text: "Which sentence uses a semicolon correctly?",
              option_a: "I was tired; I went to bed.",
              option_b: "I was; tired I went to bed.",
              option_c: "I was tired I; went to bed.",
              option_d: "I; was tired, I went to bed.",
              correct_option: "a",
              explanation:
                "A semicolon can join two closely related independent clauses.",
            },
            10: {
              question_text: "Which sentence uses capitalization correctly?",
              option_a: "My friend lives in sweden.",
              option_b: "My friend lives in Sweden.",
              option_c: "my friend lives in Sweden.",
              option_d: "My Friend lives in Sweden.",
              correct_option: "b",
              explanation:
                "'Sweden' is a proper noun and must begin with a capital letter.",
            },
            11: {
              question_text:
                "Which sentence has correct subject-verb agreement?",
              option_a: "The list of names are long.",
              option_b: "The list of names is long.",
              option_c: "The list of names be long.",
              option_d: "The list of names were long.",
              correct_option: "b",
              explanation:
                "The subject is singular 'list', so it takes the singular verb 'is'.",
            },
            12: {
              question_text:
                "Which word correctly completes the sentence: 'The new rule will ____ how students study.'?",
              option_a: "effect",
              option_b: "affect",
              option_c: "except",
              option_d: "advice",
              correct_option: "b",
              explanation:
                "'Affect' is usually a verb meaning to influence; 'effect' is usually a noun meaning a result.",
            },
          };
          const fallbackQuestions = chaptersWithoutQuestions.map((chapter) => ({
            id: `chapter-${chapter.id}-intro`,
            chapter_id: chapter.id,
            chapter_title: chapter.title,
            ...(grammarFallbacks[chapter.chapter_number] ||
              grammarFallbacks[1]),
            cefr_level: chapter.cefr_level,
          }));
          const availableQuestions = requestedChapter
            ? [
                ...questions,
                ...fallbackQuestions.filter(
                  (question) => question.chapter_id === requestedChapter,
                ),
              ]
            : [...questions, ...fallbackQuestions];
          res.render("practice.handlebars", {
            mode: "questions",
            pageTitle: "Practise Questions",
            pageIntro: "Test one grammar area at a time and build your score.",
            chapterId: req.query.chapter || "",
            questions: availableQuestions.map((question, index) => ({
              ...question,
              question_number: index + 1,
            })),
            chapters: chapters.map((chapter) => ({
              ...chapter,
              selected: String(chapter.id) === String(req.query.chapter),
            })),
          });
        },
      );
    },
  );
});

app.get("/practice/sentence-fixer", (req, res) => {
  res.render("practice.handlebars", {
    mode: "fixer",
    pageTitle: "Sentence Fixer",
    pageIntro: "Rewrite each sentence correctly to complete the activity.",
    fixerQuestions: [
      {
        number: 1,
        text: "She don't have no time for games.",
        answer: "She doesn't have any time for games.",
      },
      {
        number: 2,
        text: "i went to new york city, my brother stayed home.",
        answer: "I went to New York City, and my brother stayed home.",
      },
    ],
  });
});

app.get("/practice/find-errors", (req, res) => {
  res.render("practice.handlebars", {
    mode: "errors",
    isErrorActivity: true,
    pageTitle: "Find Errors",
    pageIntro: "Inspect each word, choose a correction, and check your answer.",
    errorSentences: [
      {
        number: 1,
        text: "She go to school every day.",
        words: ["She", "go", "to", "school", "every", "day"],
        wrongWord: "go",
        correctWord: "goes",
        corrections: ["goes", "went", "going"],
      },
      {
        number: 2,
        text: "The dogs runs in the park.",
        words: ["The", "dogs", "runs", "in", "the", "park"],
        wrongWord: "runs",
        correctWord: "run",
        corrections: ["run", "ran", "running"],
      },
      {
        number: 3,
        text: "Me and Alex finished the project.",
        words: ["Me", "and", "Alex", "finished", "the", "project"],
        wrongWord: "Me",
        correctWord: "I",
        corrections: ["I", "Myself", "Mine"],
      },
      {
        number: 4,
        text: "I have ate breakfast already.",
        words: ["I", "have", "ate", "breakfast", "already"],
        wrongWord: "ate",
        correctWord: "eaten",
        corrections: ["eaten", "eating", "eat"],
      },
      {
        number: 5,
        text: "We was ready for the test.",
        words: ["We", "was", "ready", "for", "the", "test"],
        wrongWord: "was",
        correctWord: "were",
        corrections: ["were", "are", "be"],
      },
    ],
  });
});

app.get("/practice/final-test", (req, res) => {
  grammarDb.all(
    `SELECT quiz_questions.*, chapters.title AS chapter_title
     FROM quiz_questions
     JOIN grammar_topics ON quiz_questions.topic_id = grammar_topics.id
     JOIN chapters ON grammar_topics.chapter_id = chapters.id
     ORDER BY quiz_questions.id`,
    (error, grammarQuestions) => {
      if (error) return res.status(500).send("Unable to load the final test.");
      grammarDb.all(
        "SELECT id, english_word, swedish_translation, cefr_level FROM vocabulary ORDER BY id LIMIT 10",
        (vocabularyError, words) => {
          if (vocabularyError)
            return res
              .status(500)
              .send("Unable to load vocabulary for the final test.");
          const vocabularyQuestions = words.map((word, index) => {
            const alternatives = words
              .filter((candidate) => candidate.id !== word.id)
              .slice(0, 3)
              .map((candidate) => candidate.swedish_translation);
            const options = [word.swedish_translation, ...alternatives];
            return {
              id: `vocabulary-${word.id}`,
              chapter_title: "Vocabulary",
              question_text: `What is the Swedish meaning of “${word.english_word}”?`,
              option_a: options[0],
              option_b: options[1],
              option_c: options[2],
              option_d: options[3],
              correct_option: "a",
              explanation: `The Swedish translation of “${word.english_word}” is “${word.swedish_translation}”.`,
              question_number: grammarQuestions.length + index + 1,
            };
          });
          const questions = [...grammarQuestions, ...vocabularyQuestions].map(
            (question, index) => ({ ...question, question_number: index + 1 }),
          );
          res.render("practice.handlebars", {
            mode: "final",
            pageTitle: "Final Test",
            pageIntro: "Good luck!",
            questions,
          });
        },
      );
    },
  );
});

app.get("/members", (req, res) => {
  db.all("SELECT * FROM members", (error, listofMembers) => {
    if (error) {
      console.log("ERROR: ", error);
    } else {
      const model = { members: listofMembers };
      res.render("members.handlebars", model);
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login.handlebars");
});

app.get("/signup", (req, res) => {
  res.render("signup.handlebars");
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Verification steps
  if (!username || !password) {
    const model = { error: "Username and password are required", message: "" };
    return res.status(400).render("login.handlebars", model);
  }

  if (username === adminname) {
    console.log("The username is the admin one!");

    // Compare hashed adminPassword with the entered password
    bcrypt.compare(password, adminPassword, (err, result) => {
      if (err) {
        const model = {
          error: "Error while comparing passwords: " + err,
          message: "",
        };
        return res.render("login.handlebars", model);
      }

      if (result) {
        console.log("The password is the admin one");
        req.session.isAdmin = true;
        req.session.isLoggedIn = true;
        req.session.name = username;
        req.session.avatar = "";
        req.session.avatar_initial = username.charAt(0).toUpperCase();
        console.log("Session information: " + JSON.stringify(req.session));
        res.redirect("/");
        const model = {
          error: "",
          message: "You are the admin, Welcome home!",
        };
      } else {
        const model = {
          error: "Sorry, the password is not correct...",
          message: "",
        };
        return res.status(400).render("login.handlebars", model);
      }
    });
  } else {
    db.get(
      "SELECT * FROM members WHERE username = ?",
      [username],
      (error, member) => {
        if (error || !member || !member.password_hash) {
          return res.status(400).render("login.handlebars", {
            error: "Username or password is incorrect.",
            message: "",
          });
        }
        bcrypt.compare(
          password,
          member.password_hash,
          (compareError, valid) => {
            if (compareError || !valid)
              return res.status(400).render("login.handlebars", {
                error: "Username or password is incorrect.",
                message: "",
              });
            req.session.isLoggedIn = true;
            req.session.isAdmin = member.role === "admin";
            req.session.name = member.username;
            req.session.avatar = member.avatar || "";
            req.session.avatar_initial = member.username
              .charAt(0)
              .toUpperCase();
            res.redirect("/");
          },
        );
      },
    );
  }
});

app.post("/signup", (req, res) => {
  const { username, password, confirmPassword, goal } = req.body;
  if (
    !username ||
    !password ||
    password !== confirmPassword ||
    username === adminname
  ) {
    return res.status(400).render("signup.handlebars", {
      error: "Enter a unique username and matching passwords.",
    });
  }
  bcrypt.hash(password, saltRounds, (hashError, passwordHash) => {
    if (hashError)
      return res
        .status(500)
        .render("signup.handlebars", { error: "Unable to create account." });
    db.run(
      "INSERT INTO members (username, password_hash, role, goal) VALUES (?, ?, 'student', ?)",
      [username, passwordHash, goal || ""],
      function (insertError) {
        if (insertError)
          return res.status(400).render("signup.handlebars", {
            error: "That username is already taken.",
          });
        req.session.isLoggedIn = true;
        req.session.isAdmin = false;
        req.session.name = username;
        req.session.avatar = "";
        req.session.avatar_initial = username.charAt(0).toUpperCase();
        res.redirect("/profile");
      },
    );
  });
});

function requireLogin(req, res, next) {
  if (!req.session.isLoggedIn || req.session.isAdmin)
    return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin)
    return res.status(403).send("Teacher access required.");
  next();
}

app.get("/profile", requireLogin, (req, res) => {
  db.get(
    "SELECT username, goal, avatar, avatar_hair, avatar_skin, avatar_shirt, avatar_bottom, avatar_shoes, avatar_eyes, avatar_hair_style, avatar_customized FROM members WHERE username = ?",
    [req.session.name],
    (error, student) => {
      if (error || !student) return res.status(404).send("Profile not found.");
      student.avatar_initial = student.username.charAt(0).toUpperCase();
      db.all(
        "SELECT * FROM progress WHERE username = ? ORDER BY completed_at DESC",
        [req.session.name],
        (progressError, progress) => {
          if (progressError)
            return res.status(500).send("Unable to load progress.");
          db.get(
            "SELECT COALESCE(SUM(points), 0) AS points, COALESCE(SUM(total_points), 0) AS possible_points, COUNT(*) AS activities, COALESCE(AVG(percentage), 0) AS average_score FROM progress WHERE username = ?",
            [req.session.name],
            (statsError, stats) => {
              if (statsError)
                return res
                  .status(500)
                  .send("Unable to load progress statistics.");
              stats.average_score = Math.round(stats.average_score || 0);
              const passportStamps = [
                { title: "First steps", earned: progress.length > 0 },
                {
                  title: "Grammar explorer",
                  earned: progress.some(
                    (item) => item.activity_type === "questions",
                  ),
                },
                {
                  title: "Vocabulary traveler",
                  earned: progress.some((item) =>
                    item.activity_type.includes("flip"),
                  ),
                },
                {
                  title: "Final test",
                  earned: progress.some(
                    (item) => item.activity_type === "final",
                  ),
                },
              ];
              grammarDb.all(
                "SELECT id, title FROM chapters",
                (chapterError, chapters) => {
                  if (chapterError)
                    return res.status(500).send("Unable to load chapters.");
                  const chapterNames = Object.fromEntries(
                    chapters.map((chapter) => [chapter.id, chapter.title]),
                  );
                  progress.forEach((item) => {
                    item.display_activity = item.chapter_id
                      ? chapterNames[item.chapter_id] || item.activity_type
                      : item.activity_type;
                  });
                  res.render("profile.handlebars", {
                    student,
                    progress,
                    stats,
                    passportStamps,
                    hairStyles: Array.from(
                      { length: 10 },
                      (_, index) => index + 1,
                    ),
                    query: req.query,
                  });
                },
              );
            },
          );
        },
      );
    },
  );
});

app.get("/lobby", requireLogin, (req, res) => {
  res.render("lobby.handlebars", { student: { username: req.session.name } });
});

app.post("/profile/goal", requireLogin, (req, res) => {
  db.run(
    "UPDATE members SET goal = ? WHERE username = ?",
    [String(req.body.goal || "").trim(), req.session.name],
    (error) => {
      if (error) return res.status(500).redirect("/profile?goalError=1");
      res.redirect("/profile?goalSaved=1");
    },
  );
});

app.post("/api/profile/character", requireLogin, (req, res) => {
  const submittedValue = String(req.body.characterHash || "").trim();
  let characterHash = submittedValue;

  try {
    if (submittedValue.startsWith("http://") || submittedValue.startsWith("https://")) {
      characterHash = new URL(submittedValue).hash.slice(1);
    }
  } catch (error) {
    characterHash = "";
  }

  if (characterHash.startsWith("#")) characterHash = characterHash.slice(1);

  if (
    !characterHash ||
    characterHash.length > 2047 ||
    !/^[\w=&%|.-]+$/.test(characterHash)
  ) {
    return res.status(400).json({ error: "invalid characterHash format" });
  }

  let characterLayers = [];
  if (Array.isArray(req.body.layers)) {
    characterLayers = req.body.layers.filter(
      (layer) =>
        layer &&
        typeof layer.spritePath === "string" &&
        layer.spritePath.startsWith("spritesheets/") &&
        Number.isFinite(Number(layer.zPos)) &&
        Number.isFinite(Number(layer.yPos)),
    ).map((layer) => ({
      spritePath: layer.spritePath,
      zPos: Number(layer.zPos),
      yPos: Number(layer.yPos),
      recolors: layer.recolors && typeof layer.recolors === "object"
        ? Object.fromEntries(Object.entries(layer.recolors).filter(([, mapping]) =>
            mapping && Array.isArray(mapping.source) && Array.isArray(mapping.target)
            && mapping.source.length === mapping.target.length
            && mapping.source.every((color) => typeof color === "string")
            && mapping.target.every((color) => typeof color === "string"),
          ).map(([type, mapping]) => [type, {
            source: mapping.source,
            target: mapping.target,
          }]))
        : {},
    }));
  }

  db.run(
    `INSERT INTO user_character (user_id, character_hash, character_layers)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       character_hash = excluded.character_hash,
       character_layers = excluded.character_layers,
       updated_at = CURRENT_TIMESTAMP`,
    [req.session.name, characterHash, JSON.stringify(characterLayers)],
    (error) => {
      if (error) return res.status(500).json({ error: "Unable to save character" });
      res.json({ ok: true });
    },
  );
});

app.get("/api/profile/:userId/character", requireLogin, (req, res) => {
  if (req.params.userId !== req.session.name) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.get(
    "SELECT character_hash, character_layers FROM user_character WHERE user_id = ?",
    [req.params.userId],
    (error, character) => {
      if (error) return res.status(500).json({ error: "Unable to load character" });
      if (!character) return res.status(404).json({ error: "no character saved" });
      let layers = [];
      try { layers = JSON.parse(character.character_layers || "[]"); } catch (error) { layers = []; }
      res.json({ characterHash: character.character_hash, layers });
    },
  );
});

app.post("/profile/avatar-style", requireLogin, (req, res) => {
  const allowed = {
    hair: ["#3b2416", "#111827", "#d97706", "#b91c1c"],
    skin: ["#f6c7a8", "#e5a07f", "#c77b5b", "#a96845", "#84503c", "#5a3026"],
    shirt: ["#8fb9d9", "#f3a6a6", "#a9d8b8", "#d9b3e6"],
    bottom: ["#263c68", "#374151", "#7c3f58", "#334f3b"],
    shoes: ["#ffffff", "#111827", "#d05a3a", "#f3d59a"],
    eyes: ["#263c68", "#111827", "#236044", "#7c3f58"],
  };
  const value = (name, fallback) =>
    allowed[name].includes(req.body[name]) ? req.body[name] : fallback;
  const hairStyle = Math.min(10, Math.max(1, Number(req.body.hairStyle) || 1));
  db.run(
    "UPDATE members SET avatar_hair = ?, avatar_skin = ?, avatar_shirt = ?, avatar_bottom = ?, avatar_shoes = ?, avatar_eyes = ?, avatar_hair_style = ?, avatar_customized = 1 WHERE username = ?",
    [
      value("hair", allowed.hair[0]),
      value("skin", allowed.skin[0]),
      value("shirt", allowed.shirt[0]),
      value("bottom", allowed.bottom[0]),
      value("shoes", allowed.shoes[0]),
      value("eyes", allowed.eyes[0]),
      hairStyle,
      req.session.name,
    ],
    (error) => {
      if (error) return res.redirect("/profile?avatarError=1");
      res.redirect("/profile?avatarSaved=1");
    },
  );
});

app.post("/profile/avatar", requireLogin, (req, res) => {
  profileUpload.single("profilePicture")(req, res, (uploadError) => {
    if (uploadError || !req.file) {
      return res.status(400).redirect("/profile?avatarError=1");
    }
    db.run(
      "UPDATE members SET avatar = ? WHERE username = ?",
      [req.file.filename, req.session.name],
      (error) => {
        if (error) return res.status(500).redirect("/profile?avatarError=1");
        req.session.avatar = req.file.filename;
        res.redirect("/profile?avatarSaved=1");
      },
    );
  });
});

app.post("/api/progress", requireLogin, (req, res) => {
  const { activityType, chapterId, difficultyLevel, points, totalPoints } =
    req.body;
  const safePoints = Math.max(0, Number(points) || 0);
  const safeTotal = Math.max(1, Number(totalPoints) || 1);
  const percentage = Math.round((safePoints / safeTotal) * 100);
  db.run(
    "INSERT INTO progress (username, activity_type, chapter_id, difficulty_level, points, total_points, percentage) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      req.session.name,
      activityType || "practice",
      chapterId || null,
      difficultyLevel || "",
      safePoints,
      safeTotal,
      percentage,
    ],
    (error) =>
      error
        ? res.status(500).json({ error: "Unable to save progress." })
        : res.json({ points: safePoints, totalPoints: safeTotal, percentage }),
  );
});

app.get("/teacher/dashboard", requireAdmin, (req, res) => {
  db.all(
    `SELECT members.username, members.goal,
    COALESCE(SUM(progress.points), 0) AS points,
    COALESCE(SUM(progress.total_points), 0) AS possible_points,
    COUNT(progress.id) AS activities,
    COALESCE(GROUP_CONCAT(DISTINCT progress.difficulty_level), '') AS levels
    FROM members LEFT JOIN progress ON progress.username = members.username
    WHERE members.role = 'student'
    GROUP BY members.username ORDER BY members.username`,
    (error, students) => {
      if (error)
        return res.status(500).send("Unable to load student progress.");
      res.render("teacher.handlebars", { students });
    },
  );
});

app.get("/teacher/student/:username", requireAdmin, (req, res) => {
  db.get(
    "SELECT username, goal FROM members WHERE username = ? AND role = 'student'",
    [req.params.username],
    (error, student) => {
      if (error || !student) return res.status(404).send("Student not found.");
      db.all(
        "SELECT activity_type, points, total_points, percentage, completed_at FROM progress WHERE username = ? ORDER BY completed_at DESC",
        [student.username],
        (progressError, progress) => {
          if (progressError)
            return res.status(500).send("Unable to load student details.");
          db.all(
            "SELECT activity_type, SUM(points) AS points, SUM(total_points) AS possible_points, AVG(percentage) AS average_score, GROUP_CONCAT(DISTINCT difficulty_level) AS levels FROM progress WHERE username = ? GROUP BY activity_type",
            [student.username],
            (statsError, activityStats) => {
              if (statsError)
                return res
                  .status(500)
                  .send("Unable to load student statistics.");
              const preparedStats = activityStats.map((stat) => ({
                ...stat,
                average_score: Math.round(stat.average_score || 0),
              }));
              const rankedStats = [...preparedStats].sort(
                (a, b) => b.average_score - a.average_score,
              );
              res.render("teacher-student.handlebars", {
                student,
                progress,
                activityStats: preparedStats,
                bestActivity: rankedStats[0],
                needsFocus: rankedStats[rankedStats.length - 1],
              });
            },
          );
        },
      );
    },
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error while destroying the session: ", err);
    } else {
      console.log("Logged out");
      res.redirect("/");
    }
  });
});

//------------------------
// BCRYPT
//------------------------

const saltRounds = 12;

//------------------------
//FUNCTIONS
//------------------------

function initTableEvents(mydb) {
  const events = [
    {
      event_number: "1",
      event: "Kirby Launch",
      date: "2020-08-24",
      time: "16:00",
      dress_code: "Pink clothing",
    },
    {
      event_number: "2",
      event: "Where is Harr- Kirby",
      date: "2020-08-29",
      time: "20:00",
      dress_code: "Harry Potter",
    },
    {
      event_number: "3",
      event: "Help me Kirby",
      date: "2020-08-30",
      time: "17:00",
      dress_code: "Kirby Merch",
    },
    {
      event_number: "4",
      event: "Kirby is God",
      date: "2020-09-08",
      time: "15:00",
      dress_code: "Mario",
    },
    {
      event_number: "5",
      event: "Kirby Funding",
      date: "2020-09-16",
      time: "16:00",
      dress_code: "Casual",
    },
  ];

  mydb.run(
    `CREATE TABLE IF NOT EXISTS events(
      event_number INTEGER PRIMARY KEY, 
      event TEXT, 
      date TEXT, 
      time TEXT, 
      dress_code TEXT
    )`,
    (error) => {
      if (error) {
        console.log("ERROR: ", error);
      } else {
        console.log("---> Table events created");

        events.forEach((oneEvent) => {
          db.run(
            "INSERT OR REPLACE INTO events (event_number, event, date, time, dress_code, username TEXT, FOREIGN KEY (username) REFERENCES members(username)) VALUES (?, ?, ?, ?, ?)",
            [
              oneEvent.event_number,
              oneEvent.event,
              oneEvent.date,
              oneEvent.time,
              oneEvent.dress_code,
            ],
            (error) => {
              if (error) {
                console.log("ERROR: ", error);
              } else {
                console.log("Line added into the events table");
              }
            },
          );
        });
      }
    },
  );
}

function initTableMembers(mydb) {
  const members = [];

  mydb.run(
    "CREATE TABLE IF NOT EXISTS members (username TEXT PRIMARY KEY, fname TEXT NOT NULL, lname TEXT NOT NULL, email TEXT, joined_date TEXT, phone_number TEXT)",
    (error) => {
      if (error) {
        console.log("ERROR: ", error);
      } else {
        console.log("---> Table members created!");

        members.forEach((oneMember) => {
          db.run(
            `INSERT OR REPLACE INTO members (username, fname, lname, email, joined_date, phone_number) VALUES (?, ?, ?, ?, ?, ?) `,
            [
              oneMember.username,
              oneMember.fname,
              oneMember.lname,
              oneMember.email,
              oneMember.joined_date,
              oneMember.phone_number,
            ],
            (error) => {
              if (error) {
                console.log("ERROR: ", error);
              } else {
                console.log(`Line added into the member table`);
              }
            },
          );
        });
      }
    },
  );
}

// The app.listen call should be outside the post route
app.listen(port, () => {
  //initTableEvents(db);
  console.log(
    `Server is up & running. Listening on http://localhost:${port} ... :)`,
  );
});
