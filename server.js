//---------------------
// GLOBAL DEFINITIONS
//---------------------
const adminname = "Melisa";
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
const crypto = require("crypto");
const multer = require("multer");
const session = require("express-session");
const connectSqlite3 = require("connect-sqlite3");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
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

function usefulChunkExample(chunk) {
  const examples = {
    "as strong as": "Who in your life is as strong as a superhero, and why?",
    "be able to": "Who is able to do something impressive, and what is it?",
    "be a bit": "When might someone say, ‘Aren’t you a bit too old for that?’",
    "be a pain": "Studying for exams can sometimes be a pain. What might make it easier?",
    "these days": "Do people still repair things these days? Why or why not?",
    "be ready for": "What is something you are ready for, and why?",
    "would you get": "Would you get excited, scared, or curious if you saw an alien? Why?",
    "flesh and blood": "Would you replace any of your flesh and blood body parts with bionic ones? Why?",
    "like the idea of": "Do you like the idea of replacing human teachers with AI robots? Why or why not?",
    "a lack of": "What happens when there is a lack of skilled players in a sport?",
    "on one's own": "Describe a time when you handled a difficult task on your own.",
    "twice as": "How would you feel if your trip took twice as long as expected?",
    "ahead of one's time": "In what way was Greta Thunberg ahead of her time?",
    "later in life": "What do people appreciate more later in life, and why?",
    "come up with": "Who came up with an idea or invention you admire?",
    "as simple as": "How can learning a new skill be made as simple as possible?",
    "as a means of": "How can mobile phones be used as a means of learning outside class?",
    "carry out": "What project or task would you like to carry out in the future?",
    "set up": "How would you set up a new club at school?",
    "break down": "Have you had a bike or gadget break down at the worst time?",
    "be successful": "What does being successful mean to you?",
    "feel at ease": "What can teachers do to help a new student feel at ease?",
    "spill the beans": "If you know a secret, do you sometimes spill the beans? Why?",
    "take up": "What new hobby or sport would you like to take up, and why?",
    "go both ways": "Where does trust need to go both ways for a relationship to work?",
    "go along with": "When is it better to go along with someone’s idea?",
    "give in": "Is it ever a good idea to give in during an argument?",
    "bring up": "What topics are hardest to bring up with your parents or teachers?",
    "hang out": "Where do you usually hang out with your closest friends?",
    "make fun of": "How do you feel when someone makes fun of you?",
    "reach out to": "Who have you reached out to for support?",
    "take a deep breath": "When has taking a deep breath helped you stay calm?",
    "be targeted": "Student Prompt: Write your own discussion question using this phrase.",
    "live on": "Student Prompt: Write your own discussion question using this phrase.",
    "pet an animal": "Student Prompt: Write your own discussion question using this phrase.",
    "kick in": "Student Prompt: Write your own discussion question using this phrase.",
    "turn to": "Student Prompt: Write your own discussion question using this phrase.",
    "take matters into one's hands": "Student Prompt: Write your own discussion question using this phrase.",
    "a few exceptions": "Student Prompt: Write your own discussion question using this phrase.",
    "a smooth ride": "Student Prompt: Write your own discussion question using this phrase.",
    "if only": "Student Prompt: Write your own discussion question using this phrase.",
    "leave someone be": "Student Prompt: Write your own discussion question using this phrase.",
    "the next generation": "Student Prompt: Write your own discussion question using this phrase.",
    "be brave enough to": "Student Prompt: Write your own discussion question using this phrase.",
  };
  return examples[chunk] || `What personal experience could you describe using “${chunk}”?`;
}

const usefulChunkLists = [
  [
    "Tech yes? Tech no?",
    "as strong as|be able to|be a bit|be a pain|these days|be ready for|would you get|flesh and blood|like the idea of",
  ],
  [
    "Language work",
    "in the early days|a lack of|on one's own|health issues|twice as|ahead of one's time|an early version of|later in life|predict the weather|be successful",
  ],
  [
    "Language work",
    "may have been|come up with|as simple as|as a means of|carry out|set up|in X years' time|break down|became more reliable|offer huge potential",
  ],
  [
    "Relationships & dialogue",
    "be on a date|spill the beans|feel at ease|take up|not mind|go both ways|it's hard to win|go along with|bring up|give in",
  ],
  [
    "Of love and...",
    "get together|keep one's nerves in check|hang out|make fun of|call someone out on|there's nothing to say|chew one's fingernails|drop into|reach out to|take a deep breath",
  ],
  [
    "Language work",
    "constantly evolve|bring with it|pave the way for|turn up at|go in one direction|a strong influence on|slow things down|grow up with|have a chance|put together",
  ],
  [
    "Choices & lifestyle",
    "make a decision|go back to|make up one's mind|ready and willing|be keen|have one's fair share of|take ages|crime rate|to holiday",
  ],
  [
    "Human relations",
    "fall in love|declare war on|good relations with|get on well with|be madly in love|start an affair|be held up as|play by ear|mark the beginning|a world of difference",
  ],
  [
    "Of love and... (Romeo & Juliet)",
    "catch the eye of|be allowed to|coin a term|get hold of|cheer someone up|burst into tears|fall in love with|keep something a secret|lose one's life|draw one's final breath",
  ],
  [
    "Society & current affairs",
    "once the dust has settled|difficult conditions|sign a peace treaty|with complete disregard for|take control of|growing economy|toughen one's stance|no one knows what the future will hold|bring benefits|a hot topic",
  ],
  [
    "Survival & heritage",
    "Indigenous Peoples|hard to come by|from generation to generation|turn around|be deceived|catch someone's eye|in great danger|lose consciousness|stay afloat|turn into",
  ],
  [
    "Culture & perspective",
    "melting pot|in one's daily life|in the neighborhood|the first step|significantly larger|over time|be challenging|mixed feelings",
  ],
  [
    "Travel & experiences",
    "go on a trip|take a stroll|burst out laughing|surprised to hear|give away|drag someone to|check out|wet oneself|change one's mind|adrenaline junkie",
  ],
  [
    "History & identity",
    "declare independence|traced back to|to attract|home to|fight for one's rights|be reflected in|by far|the perfect spot",
  ],
  [
    "Places & leisure",
    "be popular with|a must-see|be looking to|chill out|home to|be lucky enough|one final thing|thanks to|so much more than|a paradise for",
  ],
  [
    "News & media",
    "by word of mouth|spread fear|be hit by|come across|make conversation|make one's way|get rid of|feed on",
  ],
  [
    "Daily language",
    "be the answer|feel a bit tired|an energy boost|you'd be surprised|bend the truth|have no idea|go on TV|tons of|sounds awesome",
  ],
  [
    "Civil rights & justice",
    "campaign for|achieve equality|a major victory|give up|call for|discriminate against|demand justice|spark outrage",
  ],
  [
    "Adventures & everyday life",
    "head out|go exploring|take notes|stay safe|make sense|put something on|stay warm|begin to wonder|be worth it|a brilliant experience",
  ],
  [
    "History & accomplishments",
    "lay the foundation|do deeds|be shipped off|right-hand man|make it one's mission|bring to stage/screen|keep a secret",
  ],
  [
    "The road less traveled",
    "be fascinated by|be determined to|cut corners|set off from|the world's first|give the green light|on one's way|work feverishly",
  ],
  [
    "Media & critical thinking",
    "the whole picture|fully understand|take control of|play a role in|be eager to|keep up|raise questions|be responsible",
  ],
  [
    "Inspiration & resilience",
    "inspired by|against the wishes of|be struck by a storm|wash ashore|keep track of time|keep someone company|catch up|fall to the ground|make someone proud|pass away",
  ],
  [
    "Exploration & journey",
    "set out|keep in mind|be left out|make a journey|step ashore|more accessible|find a shortcut|contribute to|greet someone",
  ],
  [
    "Work & society",
    "at a young age|be common|unskilled manual work|fair wage|deliver a speech|on behalf of|a media outcry|fall on deaf ears|be targeted|live on",
  ],
  [
    "Feelings & psychology",
    "butterflies in one's stomach|come down to|chemical substances|cloud the senses|get someone off one's mind|being infatuated|share someone's feelings|spend time with|have a crush|pet an animal|kick in",
  ],
  [
    "Tech & action",
    "sort out|put an end to|take action|carry on|round up|benefit someone|carry out|a fraction of a second|turn to|take matters into one's hands",
  ],
  [
    "Technology & society",
    "a greater impact|in some respects|in one's heyday|what better way|cut down on|be in use|a few exceptions|a smooth ride",
  ],
  [
    "Human nature & choices",
    "by nature|feel lost|give up|find one's way|agree to|turn someone away|advise someone to|make sacrifices|if only|leave someone be",
  ],
  [
    "Unity, peace & poetry",
    "send a strong message|strive to|put differences aside|lay down arms|stand between|in every nook|the next generation|be brave enough to",
  ],
].map(([title, chunks], index) => ({
  number: index + 1,
  title,
  chunks: chunks.split("|"),
}));

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
app.use(
  "/uploads/profiles",
  express.static(path.join(dataDir, "uploads", "profiles")),
);

db.serialize(() => {
  db.run("ALTER TABLE members ADD COLUMN password_hash TEXT", () => {});
  db.run("ALTER TABLE members ADD COLUMN fname TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE members ADD COLUMN lname TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE members ADD COLUMN email TEXT DEFAULT ''", () => {});
  db.run(
    "ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'student'",
    () => {},
  );
  db.run("ALTER TABLE members ADD COLUMN goal TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE members ADD COLUMN avatar TEXT DEFAULT ''", () => {});
  db.run(
    `CREATE TABLE IF NOT EXISTS user_character (
    user_id TEXT PRIMARY KEY,
    character_hash TEXT NOT NULL,
    character_layers TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES members(username)
  )`,
    () => {},
  );
  db.run(
    "ALTER TABLE user_character ADD COLUMN character_layers TEXT NOT NULL DEFAULT '[]'",
    () => {},
  );
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
  db.run(`CREATE TABLE IF NOT EXISTS useful_chunk_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    list_number INTEGER NOT NULL,
    chunk TEXT NOT NULL,
    sentence TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES members(username)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (username) REFERENCES members(username)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS vocabulary_difficult_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    word TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (username, difficulty_level, word),
    FOREIGN KEY (username) REFERENCES members(username)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lobby_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_question INTEGER NOT NULL DEFAULT 0,
    question_started_at INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lobby_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_a TEXT NOT NULL,
    answer_b TEXT NOT NULL,
    answer_c TEXT NOT NULL,
    answer_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES lobby_rooms(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lobby_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    answer TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    UNIQUE (room_id, username),
    FOREIGN KEY (room_id) REFERENCES lobby_rooms(id)
  )`);
  db.run("ALTER TABLE lobby_rooms ADD COLUMN question_started_at INTEGER", () => {});
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

app.get("/vocabulary", requireAuthenticated, (req, res) => {
  grammarDb.get(
    "SELECT COUNT(*) AS word_count FROM vocabulary",
    (error, result) => {
      if (error) return res.status(500).send("Unable to load vocabulary.");
      res.render("vocabulary.handlebars", { wordCount: result.word_count });
    },
  );
});

app.get("/vocabulary/useful-chunks", requireLogin, (req, res) => {
  const selectedNumber = Math.min(
    usefulChunkLists.length,
    Math.max(1, Number(req.query.list) || 1),
  );
  const selectedList = usefulChunkLists[selectedNumber - 1];
  db.all(
    "SELECT chunk, sentence, submitted_at FROM useful_chunk_submissions WHERE username = ? AND list_number = ? ORDER BY submitted_at DESC",
    [req.session.name, selectedNumber],
    (error, submissions) => {
      if (error) return res.status(500).send("Unable to load useful chunks.");
      res.render("useful-chunks.handlebars", {
        lists: usefulChunkLists.map((list) => ({
          ...list,
          selected: list.number === selectedNumber,
        })),
        selectedList,
        submissions,
        saved: req.query.saved === "1",
      });
    },
  );
});

app.get("/vocabulary/useful-chunks/guide", requireLogin, (req, res) => {
  const selectedNumber = Math.min(
    usefulChunkLists.length,
    Math.max(1, Number(req.query.list) || 1),
  );
  const guideLists = usefulChunkLists.map((list) => ({
      ...list,
      selected: list.number === selectedNumber,
      chunks: list.chunks.map((chunk) => ({ phrase: chunk, example: usefulChunkExample(chunk) })),
    }));
  res.render("useful-chunks-guide.handlebars", {
    lists: guideLists,
    selectedList: guideLists[selectedNumber - 1],
  });
});

app.post("/vocabulary/useful-chunks", requireLogin, (req, res) => {
  const listNumber = Number(req.body.listNumber);
  const chunk = String(req.body.chunk || "").trim();
  const sentence = String(req.body.sentence || "").trim();
  const list = usefulChunkLists[listNumber - 1];
  if (
    !list ||
    !list.chunks.includes(chunk) ||
    sentence.length < 3 ||
    sentence.length > 500
  ) {
    return res
      .status(400)
      .redirect(`/vocabulary/useful-chunks?list=${listNumber}`);
  }
  db.run(
    "INSERT INTO useful_chunk_submissions (username, list_number, chunk, sentence) VALUES (?, ?, ?, ?)",
    [req.session.name, listNumber, chunk, sentence],
    (error) =>
      error
        ? res.status(500).send("Unable to save your sentence.")
        : res.redirect(`/vocabulary/useful-chunks?list=${listNumber}&saved=1`),
  );
});

app.get("/vocabulary/flip-cards", requireAuthenticated, (req, res) => {
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

app.get("/vocabulary/translation", requireAuthenticated, (req, res) => {
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

app.get("/vocabulary/spelling", requireAuthenticated, (req, res) => {
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

app.get("/grammar/chapter/:id", requireAuthenticated, (req, res) => {
  res.redirect(
    `/practice/questions?chapter=${encodeURIComponent(req.params.id)}`,
  );
});

app.get("/practice/questions", requireAuthenticated, (req, res) => {
  const chapterFilter = req.query.chapter ? "WHERE chapters.id = ?" : "";
  const params = req.query.chapter ? [req.query.chapter] : [];
  grammarDb.all(
    "SELECT id, chapter_number, title, description, cefr_level FROM chapters ORDER BY chapter_number",
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
          const availableQuestions = questions;
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

app.get("/practice/sentence-fixer", requireAuthenticated, (req, res) => {
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

app.get("/practice/find-errors", requireAuthenticated, (req, res) => {
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

app.get("/practice/final-test", requireAuthenticated, (req, res) => {
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

app.get("/forgot-password", (req, res) => {
  res.render("forgot-password.handlebars");
});

app.post("/forgot-password", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const genericMessage = "If an account uses that email, a reset link has been sent.";
  if (!email) return res.status(400).render("forgot-password.handlebars", { error: "Enter your email address." });

  db.get("SELECT username FROM members WHERE LOWER(email) = ?", [email], (lookupError, member) => {
    if (lookupError || !member) return res.render("forgot-password.handlebars", { message: genericMessage });
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000;
    db.run("DELETE FROM password_resets WHERE username = ?", [member.username], () => {
      db.run("INSERT INTO password_resets (username, token_hash, expires_at) VALUES (?, ?, ?)", [member.username, tokenHash, expiresAt], (insertError) => {
        if (insertError) return res.status(500).render("forgot-password.handlebars", { error: "Unable to create a reset link." });
        const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
        const resetUrl = `${baseUrl}/reset-password/${token}`;
        const hasMailConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
        if (!hasMailConfig) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`Password reset link for ${member.username}: ${resetUrl}`);
            return res.render("forgot-password.handlebars", { message: "A development reset link was printed in the server terminal." });
          }
          return res.status(500).render("forgot-password.handlebars", { error: "Password reset email is not configured yet." });
        }
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: "Reset your English Labs password",
          text: `Use this link to reset your password: ${resetUrl}\n\nThe link expires in one hour.`,
        }, (mailError) => {
          if (mailError) return res.status(500).render("forgot-password.handlebars", { error: "Unable to send the reset email." });
          res.render("forgot-password.handlebars", { message: genericMessage });
        });
      });
    });
  });
});

app.get("/reset-password/:token", (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  db.get("SELECT id FROM password_resets WHERE token_hash = ? AND expires_at > ?", [tokenHash, Date.now()], (error, reset) => {
    if (error || !reset) return res.status(400).render("reset-password.handlebars", { error: "This reset link is invalid or has expired." });
    res.render("reset-password.handlebars", { token: req.params.token });
  });
});

app.post("/reset-password/:token", (req, res) => {
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  if (password.length < 8 || password !== confirmPassword) {
    return res.status(400).render("reset-password.handlebars", { token: req.params.token, error: "Use matching passwords with at least 8 characters." });
  }
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  db.get("SELECT id, username FROM password_resets WHERE token_hash = ? AND expires_at > ?", [tokenHash, Date.now()], (lookupError, reset) => {
    if (lookupError || !reset) return res.status(400).render("reset-password.handlebars", { error: "This reset link is invalid or has expired." });
    bcrypt.hash(password, saltRounds, (hashError, passwordHash) => {
      if (hashError) return res.status(500).render("reset-password.handlebars", { error: "Unable to reset your password." });
      db.run("UPDATE members SET password_hash = ? WHERE username = ?", [passwordHash, reset.username], (updateError) => {
        if (updateError) return res.status(500).render("reset-password.handlebars", { error: "Unable to reset your password." });
        db.run("DELETE FROM password_resets WHERE id = ?", [reset.id]);
        res.render("login.handlebars", { message: "Your password has been reset. You can now log in." });
      });
    });
  });
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
  const { fname, lname, username, email, password, confirmPassword, goal } = req.body;
  const firstName = String(fname || "").trim();
  const lastName = String(lname || "").trim();
  const requestedUsername = String(username || "").trim();
  const requestedEmail = String(email || "").trim().toLowerCase();
  if (
    !firstName ||
    !lastName ||
    !requestedUsername ||
    !requestedEmail ||
    !/^\S+@\S+\.\S+$/.test(requestedEmail) ||
    !password ||
    password !== confirmPassword ||
    requestedUsername === adminname
  ) {
    return res.status(400).render("signup.handlebars", {
      error: "Enter your name, a valid email, a unique username, and matching passwords.",
    });
  }
  bcrypt.hash(password, saltRounds, (hashError, passwordHash) => {
    if (hashError)
      return res
        .status(500)
        .render("signup.handlebars", { error: "Unable to create account." });
    db.run(
      "INSERT INTO members (username, fname, lname, email, password_hash, role, goal) VALUES (?, ?, ?, ?, ?, 'student', ?)",
      [requestedUsername, firstName, lastName, requestedEmail, passwordHash, goal || ""],
      function (insertError) {
        if (insertError)
          return res.status(400).render("signup.handlebars", {
            error: "That username is already taken.",
          });
        req.session.isLoggedIn = true;
        req.session.isAdmin = false;
        req.session.name = requestedUsername;
        req.session.avatar = "";
        req.session.avatar_initial = requestedUsername.charAt(0).toUpperCase();
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

function requireAuthenticated(req, res, next) {
  if (!req.session.isLoggedIn) return res.redirect("/login");
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

app.get("/lobby", requireAuthenticated, (req, res) => {
  db.get(
    "SELECT * FROM lobby_rooms WHERE status != 'finished' ORDER BY id DESC LIMIT 1",
    (roomError, room) => {
      if (roomError) return res.status(500).send("Unable to load lobby.");
      const renderLobby = (questions = [], participant = null) =>
        res.render("lobby.handlebars", {
          student: { username: req.session.name },
          isAdmin: Boolean(req.session.isAdmin),
          room,
          questions,
          participant,
          leaderboard: [],
          currentQuestion: room ? questions.find((question) => question.question_order === room.current_question) : null,
          isWaiting: room?.status === "waiting",
          isRunning: room?.status === "running",
        });
      if (!room) return renderLobby();
      db.all(
        "SELECT id, question_order, question_text, answer_a, answer_b, answer_c, answer_d FROM lobby_questions WHERE room_id = ? ORDER BY question_order",
        [room.id],
        (questionError, questions) => {
          if (questionError) return res.status(500).send("Unable to load lobby questions.");
          db.get(
            "SELECT * FROM lobby_participants WHERE room_id = ? AND username = ?",
            [room.id, req.session.name],
            (participantError, participant) => participantError
              ? res.status(500).send("Unable to load lobby participant.")
              : renderLobby(questions, participant),
          );
        },
      );
    },
  );
});

app.post("/lobby/rooms", requireAdmin, (req, res) => {
  const title = String(req.body.title || "English Labs quiz").trim().slice(0, 100);
  const code = String(Math.floor(1000 + Math.random() * 9000));
  db.run("INSERT INTO lobby_rooms (code, title) VALUES (?, ?)", [code, title], (error) =>
    error ? res.status(500).send("Unable to create room.") : res.redirect("/lobby"),
  );
});

app.post("/lobby/quit", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  db.run("DELETE FROM lobby_participants WHERE room_id = ?", [roomId], (participantsError) => {
    if (participantsError) return res.status(500).send("Unable to close room.");
    db.run("DELETE FROM lobby_questions WHERE room_id = ?", [roomId], (questionsError) => {
      if (questionsError) return res.status(500).send("Unable to close room.");
      db.run("DELETE FROM lobby_rooms WHERE id = ?", [roomId], (roomError) =>
        roomError ? res.status(500).send("Unable to close room.") : res.redirect("/lobby"),
      );
    });
  });
});

app.post("/lobby/questions", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const answers = ["a", "b", "c", "d"].map((key) => String(req.body[`answer_${key}`] || "").trim());
  const correctAnswer = String(req.body.correctAnswer || "").toLowerCase();
  const questionText = String(req.body.questionText || "").trim();
  if (!roomId || !questionText || answers.some((answer) => !answer) || !["a", "b", "c", "d"].includes(correctAnswer)) {
    return res.status(400).redirect("/lobby");
  }
  db.get("SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order FROM lobby_questions WHERE room_id = ?", [roomId], (orderError, result) => {
    if (orderError) return res.status(500).send("Unable to add question.");
    db.run(
      "INSERT INTO lobby_questions (room_id, question_order, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [roomId, result.next_order, questionText, ...answers, correctAnswer],
      (error) => error ? res.status(500).send("Unable to add question.") : res.redirect("/lobby"),
    );
  });
});

app.post("/lobby/join", requireLogin, (req, res) => {
  const code = String(req.body.code || "").trim();
  db.get("SELECT * FROM lobby_rooms WHERE code = ? AND status != 'finished'", [code], (error, room) => {
    if (error || !room) return res.status(400).redirect("/lobby?error=code");
    db.run("INSERT OR IGNORE INTO lobby_participants (room_id, username) VALUES (?, ?)", [room.id, req.session.name], () => res.redirect("/lobby"));
  });
});

app.post("/lobby/start", requireAdmin, (req, res) => {
  db.run("UPDATE lobby_rooms SET status = 'running', current_question = 1, question_started_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM lobby_questions WHERE room_id = ?)", [Date.now(), Number(req.body.roomId), Number(req.body.roomId)], () => res.redirect("/lobby"));
});

app.post("/lobby/answer", requireLogin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const answer = String(req.body.answer || "").toLowerCase();
  db.get("SELECT current_question FROM lobby_rooms WHERE id = ? AND status = 'running'", [roomId], (roomError, room) => {
    if (roomError || !room) return res.status(400).json({ error: "Room is not running." });
    db.get("SELECT correct_answer FROM lobby_questions WHERE room_id = ? AND question_order = ?", [roomId, room.current_question], (questionError, question) => {
      if (questionError || !question || !["a", "b", "c", "d"].includes(answer)) return res.status(400).json({ error: "Invalid answer." });
      const speedBonus = answer === question.correct_answer
        ? Math.max(0, 50 - Math.floor((Date.now() - (room.question_started_at || Date.now())) / 1000) * 5)
        : 0;
      const points = answer === question.correct_answer ? 100 + speedBonus : 0;
      db.run("UPDATE lobby_participants SET answer = ?, score = score + ? WHERE room_id = ? AND username = ? AND answer IS NULL", [answer, points, roomId, req.session.name], function (updateError) {
        if (updateError) return res.status(500).json({ error: "Unable to save answer." });
        res.json({ correct: this.changes === 1 && points === 1, answered: this.changes === 1 });
      });
    });
  });
});

app.post("/lobby/next", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  db.get("SELECT current_question FROM lobby_rooms WHERE id = ?", [roomId], (error, room) => {
    if (error || !room) return res.redirect("/lobby");
    db.get("SELECT COUNT(*) AS total FROM lobby_questions WHERE room_id = ?", [roomId], (countError, count) => {
      const next = room.current_question + 1;
      db.run("UPDATE lobby_rooms SET current_question = ?, status = ?, question_started_at = ? WHERE id = ?", [next, next > count.total ? "finished" : "running", next > count.total ? null : Date.now(), roomId], () => {
        db.run("UPDATE lobby_participants SET answer = NULL WHERE room_id = ?", [roomId], () => res.redirect("/lobby"));
      });
    });
  });
});

app.get("/api/lobby/state", requireAuthenticated, (req, res) => {
  db.get("SELECT * FROM lobby_rooms WHERE status != 'finished' ORDER BY id DESC LIMIT 1", (error, room) => {
    if (error || !room) return res.json({ room: null });
    db.get("SELECT id, question_order, question_text, answer_a, answer_b, answer_c, answer_d FROM lobby_questions WHERE room_id = ? AND question_order = ?", [room.id, room.current_question], (questionError, question) => {
      db.get("SELECT score, answer FROM lobby_participants WHERE room_id = ? AND username = ?", [room.id, req.session.name], (participantError, participant) => {
        db.all("SELECT username, score FROM lobby_participants WHERE room_id = ? ORDER BY score DESC, username ASC", [room.id], (leaderboardError, leaderboard) => {
          res.json({ room, question: questionError ? null : question, participant: participantError ? null : participant, leaderboard: leaderboardError ? [] : leaderboard });
        });
      });
    });
  });
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
    if (
      submittedValue.startsWith("http://") ||
      submittedValue.startsWith("https://")
    ) {
      characterHash = new URL(submittedValue).hash.slice(1);
    }
  } catch (error) {
    return res.status(400).json({ error: "invalid characterHash format" });
  }

  if (characterHash.length > 2047 || !/^[\w=&%|.-]+$/.test(characterHash)) {
    return res.status(400).json({ error: "invalid characterHash format" });
  }

  let characterLayers = [];
  if (Array.isArray(req.body.layers)) {
    characterLayers = req.body.layers
      .filter(
        (layer) =>
          layer &&
          typeof layer.spritePath === "string" &&
          layer.spritePath.startsWith("spritesheets/") &&
          Number.isFinite(Number(layer.zPos)) &&
          Number.isFinite(Number(layer.yPos)),
      )
      .map((layer) => ({
        spritePath: layer.spritePath,
        zPos: Number(layer.zPos),
        yPos: Number(layer.yPos),
        recolors:
          layer.recolors && typeof layer.recolors === "object"
            ? Object.fromEntries(
                Object.entries(layer.recolors)
                  .filter(
                    ([, mapping]) =>
                      mapping &&
                      Array.isArray(mapping.source) &&
                      Array.isArray(mapping.target) &&
                      mapping.source.length === mapping.target.length &&
                      mapping.source.every(
                        (color) => typeof color === "string",
                      ) &&
                      mapping.target.every(
                        (color) => typeof color === "string",
                      ),
                  )
                  .map(([type, mapping]) => [
                    type,
                    {
                      source: mapping.source,
                      target: mapping.target,
                    },
                  ]),
              )
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
      if (error)
        return res.status(500).json({ error: "Unable to save character" });
      res.json({ ok: true });
    },
  );
});

app.get("/api/profile/:userId/character", requireAuthenticated, (req, res) => {
  if (req.params.userId !== req.session.name && !req.session.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.get(
    "SELECT character_hash, character_layers FROM user_character WHERE user_id = ?",
    [req.params.userId],
    (error, character) => {
      if (error)
        return res.status(500).json({ error: "Unable to load character" });
      if (!character)
        return res.status(404).json({ error: "no character saved" });
      let layers = [];
      try {
        layers = JSON.parse(character.character_layers || "[]");
      } catch (error) {
        layers = [];
      }
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

app.post("/api/vocabulary/difficult-words", requireLogin, (req, res) => {
  const difficultyLevel = ["easy", "medium"].includes(req.body.difficultyLevel)
    ? req.body.difficultyLevel
    : null;
  const words = Array.isArray(req.body.words)
    ? req.body.words.map((word) => String(word).trim()).filter(Boolean).slice(0, 20)
    : [];
  if (!difficultyLevel || !words.length) return res.status(400).json({ error: "Invalid words." });

  const statement = db.prepare(`
    INSERT INTO vocabulary_difficult_words (username, difficulty_level, word)
    VALUES (?, ?, ?)
    ON CONFLICT(username, difficulty_level, word)
    DO UPDATE SET attempts = attempts + 1, last_seen = CURRENT_TIMESTAMP
  `);
  words.forEach((word) => statement.run(req.session.name, difficultyLevel, word));
  statement.finalize((error) =>
    error
      ? res.status(500).json({ error: "Unable to save difficult words." })
      : res.json({ saved: words.length }),
  );
});

app.get("/teacher/dashboard", requireAdmin, (req, res) => {
  db.all(
    `SELECT members.username, members.fname, members.lname, members.goal,
    COALESCE(SUM(progress.points), 0) AS points,
    COALESCE(SUM(progress.total_points), 0) AS possible_points,
    COUNT(progress.id) AS activities,
    COALESCE(GROUP_CONCAT(DISTINCT progress.difficulty_level), '') AS levels,
    COALESCE(SUM(CASE WHEN progress.difficulty_level = 'easy' THEN 1 ELSE 0 END), 0) AS easy_activities,
    COALESCE(SUM(CASE WHEN progress.difficulty_level = 'medium' THEN 1 ELSE 0 END), 0) AS medium_activities
    FROM members LEFT JOIN progress ON progress.username = members.username
    WHERE members.role = 'student'
    GROUP BY members.username ORDER BY members.username`,
    (error, students) => {
      if (error)
        return res.status(500).send("Unable to load student progress.");
      res.render("teacher.handlebars", {
        students: students.map((student) => ({
          ...student,
          levelBadges: [
            { label: "Easy", stronger: student.easy_activities >= student.medium_activities },
            { label: "Medium", stronger: student.medium_activities > student.easy_activities },
          ],
        })),
      });
    },
  );
});

app.get("/teacher/student/:username", requireAdmin, (req, res) => {
  db.get(
    "SELECT username, fname, lname, goal FROM members WHERE username = ? AND role = 'student'",
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
              db.all(
                "SELECT list_number, chunk, sentence, submitted_at FROM useful_chunk_submissions WHERE username = ? ORDER BY submitted_at DESC",
                [student.username],
                (submissionsError, usefulChunkSubmissions) => {
                  if (submissionsError)
                    return res
                      .status(500)
                      .send("Unable to load useful chunk submissions.");
                  db.all(
                    "SELECT DISTINCT difficulty_level FROM progress WHERE username = ? AND activity_type = 'flip-cards' AND difficulty_level IN ('easy', 'medium') ORDER BY difficulty_level",
                    [student.username],
                    (levelsError, flipCompletions) => {
                      if (levelsError)
                        return res.status(500).send("Unable to load flip-card completions.");
                      db.all(
                        "SELECT difficulty_level, word, attempts FROM vocabulary_difficult_words WHERE username = ? ORDER BY attempts DESC, last_seen DESC LIMIT 6",
                        [student.username],
                        (wordsError, hardestWords) => {
                          if (wordsError)
                            return res.status(500).send("Unable to load difficult words.");
                          res.render("teacher-student.handlebars", {
                            student,
                            progress,
                            activityStats: preparedStats,
                            bestActivity: rankedStats[0],
                            needsFocus: rankedStats[rankedStats.length - 1],
                            usefulChunkSubmissions,
                            flipCompletions,
                            hardestWords,
                          });
                        },
                      );
                    },
                  );
                },
              );
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
