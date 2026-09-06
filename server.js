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

const loadRuleBasedGrammarChapter = (fileName, chapterNumber) => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "grammar", fileName), "utf8"),
  );
  return {
    id: String(chapterNumber),
    chapterNumber,
    unit: data.chapter.title,
    exercises: data.exercises.map((exercise, index) => ({
      id: `ex${index + 1}`,
      title: exercise.title,
      type: "multiple-choice",
      instructions: data.chapter.description,
      questions: exercise.questions.map((question) => ({
        id: question.id,
        sentence: question.question ?? question.sentence,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
      })),
    })),
  };
};

const loadThisOrThatGrammarChapter = (fileName, chapterNumber) => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "grammar", fileName), "utf8"),
  );
  return {
    id: String(chapterNumber),
    chapterNumber,
    unit: data.chapter.title,
    exercises: data.sections.map((section, index) => ({
      id: `ex${index + 1}`,
      title: section.title,
      type: "multiple-choice",
      instructions: section.explanation,
      questions: section.exercises.map((question) => ({
        id: question.id,
        sentence: question.question,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
      })),
    })),
  };
};

const practiceQuestionChapters = [
  {
    id: "1",
    chapterNumber: 1,
    ...(() => {
      const indefiniteArticles = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "grammar", "Indefinite_articles_ch1.json"),
          "utf8",
        ),
      );
      return {
        ...indefiniteArticles,
        unit: "Articles: A, An, Some & The",
        exercises: [
          ...indefiniteArticles.exercises.map((exercise) => ({
            ...exercise,
            instructions:
              "Use 'a' before consonant sounds and 'an' before vowel sounds.",
          })),
          (() => {
            const articleQuiz = JSON.parse(
              fs.readFileSync(
                path.join(__dirname, "grammar", "articles_ch2.json"),
                "utf8",
              ),
            );
            return {
              id: `ex${indefiniteArticles.exercises.length + 1}`,
              title: articleQuiz.quizTitle,
              type: "multiple-choice",
              instructions: articleQuiz.instructions,
              questions: articleQuiz.questions
                .filter((question) => question.correctAnswer !== "-")
                .map((question) => ({
                  id: question.id,
                  sentence: question.question,
                  options: question.options.filter((option) => option !== "-"),
                  answer: question.correctAnswer,
                  explanation: "Choose the correct article to fill the gap.",
                })),
            };
          })(),
        ],
      };
    })(),
  },
  {
    id: "2",
    chapterNumber: 2,
    unit: "Irregular Verbs",
    exercises: [
      (() => {
        const irregularVerbQuiz = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "grammar", "irregular_verbs_ch3.json"),
            "utf8",
          ),
        );
        return {
          id: "ex1",
          title: irregularVerbQuiz.quizTitle,
          type: "write-answer",
          instructions: irregularVerbQuiz.instructions,
          questions: irregularVerbQuiz.questions.map((question) => ({
            id: question.id,
            sentence: question.sentence,
            answer: question.correctAnswer,
            explanation: `The past simple form of “${question.baseVerb}” is “${question.correctAnswer}”.`,
          })),
        };
      })(),
      (() => {
        const irregularVerbQuiz = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "grammar", "irregularverbs2_ch3.json"),
            "utf8",
          ),
        );
        return {
          id: "ex2",
          title: irregularVerbQuiz.quizTitle,
          type: "write-answer",
          instructions: irregularVerbQuiz.instructions,
          questions: irregularVerbQuiz.questions.map((question) => ({
            id: question.id,
            sentence: question.sentence,
            answer: question.correctAnswer,
            explanation: `The past simple form of “${question.baseVerb}” is “${question.correctAnswer}”.`,
          })),
        };
      })(),
      (() => {
        const irregularVerbQuiz = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "grammar", "irregularverbs3_ch3.json"),
            "utf8",
          ),
        );
        return {
          id: "ex3",
          title: irregularVerbQuiz.quizTitle,
          type: "write-answer",
          instructions: irregularVerbQuiz.instructions,
          questions: irregularVerbQuiz.questions.map((question) => ({
            id: question.id,
            sentence: question.sentence,
            answer: question.correctAnswer,
            explanation: `The correct past participle of “${question.baseVerb}” is “${question.correctAnswer}”.`,
          })),
        };
      })(),
      (() => {
        const irregularVerbQuiz = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "grammar", "irregularverbs4_ch3.json"),
            "utf8",
          ),
        );
        return {
          id: "ex4",
          title: irregularVerbQuiz.quizTitle,
          type: "write-answer",
          instructions: irregularVerbQuiz.instructions,
          questions: irregularVerbQuiz.questions.map((question) => ({
            id: question.id,
            sentence: question.sentence,
            answer: question.correctAnswer,
            explanation: `The correct past participle of “${question.baseVerb}” is “${question.correctAnswer}”.`,
          })),
        };
      })(),
    ],
  },
  loadRuleBasedGrammarChapter("subject_verb_agreement_ch4.json", 3),
  loadRuleBasedGrammarChapter("apostrophes_ch5.json", 4),
  loadRuleBasedGrammarChapter("contractions_ch6.json", 5),
  loadRuleBasedGrammarChapter("there_their_they're_ch7.json", 6),
  loadRuleBasedGrammarChapter("prepositions_ch8.json", 7),
  loadRuleBasedGrammarChapter("phrasel_verb_ch9.json", 8),
  loadRuleBasedGrammarChapter("adjectives_adverbs_ch10.json", 9),
  loadRuleBasedGrammarChapter("capitalization_ch11.json", 10),
  loadRuleBasedGrammarChapter("pronouns_ch12.json", 11),
  loadThisOrThatGrammarChapter("this_or_that_ch13 (2).json", 12),
];
const listeningTopics = [
  (() => {
    const reading = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "listening1", "eating_out.json"),
        "utf8",
      ),
    );
    return {
      ...reading,
      listeningLevel: "1",
      audioUrl: "/audio/eating-out",
      exercises: reading.exercises.map((exercise, index) => ({
        ...exercise,
        id: `exercise-${index + 1}`,
        number: index + 1,
        isTrueOrFalse: exercise.type === "true_or_false",
        questions: exercise.questions.map((question, questionIndex) => ({
          ...question,
          number: questionIndex + 1,
          answer: String(question.correctAnswer ?? question.answer),
        })),
      })),
    };
  })(),
  (() => {
    const listening = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "listening1", "Free_time.json"),
        "utf8",
      ),
    );
    return {
      ...listening,
      listeningLevel: "1",
      audioUrl: "/audio/free-time",
      exercises: listening.exercises.map((exercise, index) => ({
        ...exercise,
        id: `exercise-${index + 1}`,
        number: index + 1,
        isSportsGrouping: exercise.type === "sports_grouping",
        isTrueOrFalse: exercise.type === "true_or_false",
        questions: (exercise.questions || []).map(
          (question, questionIndex) => ({
            ...question,
            number: questionIndex + 1,
            answer: String(question.correctAnswer ?? question.answer),
          }),
        ),
      })),
    };
  })(),
  (() => {
    const listening = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "listening1", "giving_directions.json"),
        "utf8",
      ),
    );
    return {
      ...listening,
      listeningLevel: "1",
      audioUrl: "/audio/giving-directions",
      exercises: listening.exercises.map((exercise, index) => ({
        ...exercise,
        id: `exercise-${index + 1}`,
        number: index + 1,
        isTrueOrFalse: exercise.type === "true_or_false",
        questions: exercise.questions.map((question, questionIndex) => ({
          ...question,
          number: questionIndex + 1,
          sentence: question.sentence || question.question,
          answer: String(question.correctAnswer ?? question.answer),
        })),
      })),
    };
  })(),
  (() => {
    const listening = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "listening1", "going_tothecinema.json"),
        "utf8",
      ),
    );
    return {
      ...listening,
      listeningLevel: "1",
      audioUrl: "/audio/going-cinema",
      exercises: listening.exercises.map((exercise, index) => ({
        ...exercise,
        id: `exercise-${index + 1}`,
        number: index + 1,
        isTrueOrFalse: exercise.type === "true_or_false",
        questions: exercise.questions.map((question, questionIndex) => ({
          ...question,
          number: questionIndex + 1,
          sentence: question.sentence || question.question,
          answer: String(question.correctAnswer ?? question.answer),
        })),
      })),
    };
  })(),
  (() => {
    const listening = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "listening1", "shopping_for_clothes.json"),
        "utf8",
      ),
    );
    return {
      ...listening,
      listeningLevel: "1",
      audioUrl: "/audio/shopping-clothes",
      exercises: listening.exercises.map((exercise, index) => ({
        ...exercise,
        id: `exercise-${index + 1}`,
        number: index + 1,
        isSportsGrouping: exercise.type === "sports_grouping",
        isTrueOrFalse: exercise.type === "true_or_false",
        questions: (exercise.questions || []).map(
          (question, questionIndex) => ({
            ...question,
            number: questionIndex + 1,
            answer: String(question.correctAnswer ?? question.answer),
          }),
        ),
      })),
    };
  })(),
];

const shuffleArray = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const audioUrlByTopicId = {
  "advice-exams": "/audio/advice-exams",
  "amazing-facts": "/audio/amazing-facts",
  celebrations: "/audio/celebrations",
  "difficult-situations": "/audio/difficult-situations",
  "favourite-things": "/audio/favourite-things",
  "important-people": "/audio/important-people",
  llamas: "/audio/llamas",
  "my-favourite-film": "/audio/my-favourite-film",
  "organising-your-time": "/audio/organising-your-time",
  "sports-centres": "/audio/sports-centres",
  "the-weekend": "/audio/the-weekend",
  "theme-parks": "/audio/theme-parks",
  "stop-wasting-time": "/audio/stop-wasting-time",
  "taking-notes": "/audio/taking-notes",
  "tour-of-london": "/audio/tour-of-london",
  "trains-and-travel": "/audio/trains-and-travel",
  "travelling-abroad": "/audio/travelling-abroad",
  "using-colours-to-do-homework": "/audio/using-colours-to-do-homework",
  "weather-forecast": "/audio/weather-forecast",
  work: "/audio/work",
};

const matchingPairTypes = [
  "matching_definitions",
  "phrase_matching",
  "matching_synonyms",
];

const buildTopicExercise = (exercise, index) => {
  const base = { ...exercise, id: `exercise-${index + 1}`, number: index + 1 };
  if (matchingPairTypes.includes(exercise.type)) {
    const categories = exercise.pairs.map((pair, pairIndex) => ({
      id: `match-${pairIndex + 1}`,
      title: pair.word ?? pair.start ?? pair.verb ?? pair.phrase,
      items: [pair.definition ?? pair.end ?? pair.noun ?? pair.meaning],
    }));
    return {
      ...base,
      isSportsGrouping: true,
      activity: { title: exercise.title, instruction: exercise.instruction },
      categories,
      allItems: shuffleArray(categories.map((category) => category.items[0])),
    };
  }
  if (exercise.type === "drag_and_drop") {
    return {
      ...base,
      isSportsGrouping: true,
      activity: { title: exercise.title, instruction: exercise.instruction },
      categories: exercise.categories,
      allItems: exercise.allItems,
    };
  }
  if (exercise.type === "ordering_stages") {
    const categories = exercise.stages.map((stage) => ({
      id: `step-${stage.order}`,
      title: `Step ${stage.order}`,
      items: [stage.text],
    }));
    return {
      ...base,
      isSportsGrouping: true,
      activity: { title: exercise.title, instruction: exercise.instruction },
      categories,
      allItems: shuffleArray(categories.map((category) => category.items[0])),
    };
  }
  if (exercise.type === "unscramble_sentences") {
    return {
      ...base,
      questions: exercise.sentences.map((sentence, sentenceIndex) => ({
        id: sentence.id,
        number: sentenceIndex + 1,
        sentence: shuffleArray(sentence.targetSentence.split(" ")).join(" / "),
        answer: sentence.targetSentence,
      })),
    };
  }
  if (exercise.type === "multiple_choice") {
    return {
      ...base,
      isMultipleChoice: true,
      questions: exercise.questions.map((question, questionIndex) => ({
        ...question,
        number: questionIndex + 1,
        answer: String(question.correctAnswer ?? question.answer),
      })),
    };
  }
  if (exercise.type === "speaker_matching") {
    return {
      ...base,
      questions: exercise.questions.map((question, questionIndex) => ({
        ...question,
        number: questionIndex + 1,
        sentence: question.speaker,
        answer: String(question.correctAnswer ?? question.answer),
      })),
    };
  }
  return {
    ...base,
    isTrueOrFalse: exercise.type === "true_or_false",
    questions: (exercise.questions || []).map((question, questionIndex) => ({
      ...question,
      number: questionIndex + 1,
      answer: String(question.correctAnswer ?? question.answer),
    })),
  };
};

const level2Topics = [
  ...JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "listening2", "listeningtopics.json"),
      "utf8",
    ),
  ),
  ...JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "listening2", "listeningtopics2.json"),
      "utf8",
    ),
  ),
].map((entry) => ({
  ...entry,
  listeningLevel: "2",
  audioUrl: audioUrlByTopicId[entry.topic.id] || "",
  exercises: entry.exercises.map(buildTopicExercise),
}));
listeningTopics.push(...level2Topics);

const level1ExtraTopics = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "listening1", "listeningtopicslevel1.json"),
    "utf8",
  ),
).map((entry) => ({
  ...entry,
  listeningLevel: "1",
  audioUrl: audioUrlByTopicId[entry.topic.id] || "",
  exercises: entry.exercises.map(buildTopicExercise),
}));
listeningTopics.push(...level1ExtraTopics);

const writingTopics = [
  ...JSON.parse(
    fs.readFileSync(path.join(__dirname, "writing1", "writing1.json"), "utf8"),
  ).map((entry) => ({ ...entry, writingLevel: "1" })),
  ...JSON.parse(
    fs.readFileSync(path.join(__dirname, "writing2", "writing2.json"), "utf8"),
  ).map((entry) => ({ ...entry, writingLevel: "2" })),
].map((entry) => ({
  ...entry,
  exercises: entry.exercises.map(buildTopicExercise),
}));

const buildGapFillSegments = (template) => {
  const segments = [];
  const blankPattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match = blankPattern.exec(template);
  while (match) {
    if (match.index > lastIndex) {
      segments.push({ text: template.slice(lastIndex, match.index) });
    }
    segments.push({ blank: match[1] });
    lastIndex = blankPattern.lastIndex;
    match = blankPattern.exec(template);
  }
  if (lastIndex < template.length) {
    segments.push({ text: template.slice(lastIndex) });
  }
  return segments;
};

const normalizeReadingV2Preparation = (preparation, imageBase) => {
  if (!preparation) return null;
  if (preparation.type === "matching") {
    return {
      instruction: preparation.instruction,
      isWordList: true,
      pairs: preparation.pairs,
    };
  }
  if (
    preparation.type === "image_matching" ||
    preparation.type === "image_drag_and_drop"
  ) {
    const items = preparation.items.map((item) => ({
      word: item.word,
      image: `${imageBase}/${item.image}`,
    }));
    return {
      instruction: preparation.instruction,
      isImageMatch: true,
      items,
      shuffledWords: shuffleArray(items.map((item) => item.word)),
    };
  }
  if (preparation.type === "gap_fill_box") {
    return {
      instruction: preparation.instruction,
      isGapFillBox: true,
      wordBox: shuffleArray(preparation.word_box),
      segments: buildGapFillSegments(preparation.template),
      answers: preparation.answers,
    };
  }
  return null;
};

const buildReadingV2Exercise = (exercise, index) => {
  const base = {
    id: `exercise-${index + 1}`,
    number: index + 1,
    title: exercise.title,
    instruction: exercise.instruction,
  };

  if (exercise.type === "true_false") {
    return {
      ...base,
      isTrueOrFalse: true,
      questions: exercise.questions.map((question, questionIndex) => ({
        number: questionIndex + 1,
        statement: question.statement,
        answer: String(question.answer),
      })),
    };
  }

  if (exercise.type === "multiple_choice") {
    return {
      ...base,
      isMultipleChoice: true,
      questions: exercise.questions.map((question, questionIndex) => {
        const correctAnswers = question.correct_answers || [
          question.correct_answer ?? question.answer,
        ];
        return {
          number: questionIndex + 1,
          question: question.question,
          options: question.options,
          isMultiAnswer: correctAnswers.length > 1,
          answer: correctAnswers.join("||"),
        };
      }),
    };
  }

  if (exercise.type === "matching") {
    const allDefinitions = exercise.pairs.map((pair) => pair.definition);
    return {
      ...base,
      isMultipleChoice: true,
      questions: exercise.pairs.map((pair, pairIndex) => ({
        number: pairIndex + 1,
        question: pair.term,
        options: shuffleArray(allDefinitions),
        isMultiAnswer: false,
        answer: pair.definition,
      })),
    };
  }

  if (exercise.type === "category_matching") {
    return {
      ...base,
      isMultipleChoice: true,
      questions: exercise.items.map((entry, itemIndex) => ({
        number: itemIndex + 1,
        question: entry.item,
        options: exercise.categories,
        isMultiAnswer: false,
        answer: entry.correct_category,
      })),
    };
  }

  if (exercise.type === "gap_fill") {
    const questions = exercise.questions.map((question, questionIndex) => ({
      number: questionIndex + 1,
      segments: buildGapFillSegments(
        question.sentence.replace("[]", `[${questionIndex + 1}]`),
      ),
      answer: String(question.answer),
    }));
    const answers = {};
    questions.forEach((question) => {
      answers[question.number] = question.answer;
    });
    return {
      ...base,
      isGapFill: true,
      wordBox: exercise.word_box ? shuffleArray(exercise.word_box) : null,
      questions,
      answers,
    };
  }

  if (exercise.type === "ordering") {
    return {
      ...base,
      isMultipleChoice: true,
      questions: exercise.items.map((item, itemIndex) => ({
        number: itemIndex + 1,
        question: `What happened at step ${itemIndex + 1}?`,
        options: shuffleArray(exercise.items),
        isMultiAnswer: false,
        answer: item,
      })),
    };
  }

  return { ...base, questions: [] };
};

// category_matching / gap_fill_drag preparations reuse existing exercise UI instead of new preparation UI.
const convertPreparationToExercise = (preparation) => {
  if (!preparation) return null;
  if (preparation.type === "category_matching") {
    return {
      title: "Before you read",
      instruction: preparation.instruction,
      type: "category_matching",
      categories: preparation.categories,
      items: preparation.items,
    };
  }
  if (preparation.type === "gap_fill_drag") {
    return {
      title: "Before you read",
      instruction: preparation.instruction,
      type: "gap_fill",
      word_box: preparation.word_box,
      questions: preparation.questions,
    };
  }
  return null;
};

const normalizeReadingV2Topic = (entry, imageBase) => {
  const preparationExercise = convertPreparationToExercise(entry.preparation);
  const exercises = preparationExercise
    ? [preparationExercise, ...entry.exercises]
    : entry.exercises;
  return {
    topic: {
      id: entry.id,
      title: entry.title,
      category: "Reading practice",
      description: "",
    },
    content:
      entry.content.type === "image"
        ? { image: `${imageBase}/${entry.content.image}` }
        : { readingPassage: { text: entry.content.text } },
    preparation: preparationExercise
      ? null
      : normalizeReadingV2Preparation(entry.preparation, imageBase),
    tips: [],
    exercises: exercises.map(buildReadingV2Exercise),
    discussion: null,
  };
};

const readingTopics = [
  ...JSON.parse(
    fs.readFileSync(path.join(__dirname, "reading1", "reading1.json"), "utf8"),
  ).topics.map((entry) => ({
    ...normalizeReadingV2Topic(entry, "/reading1"),
    readingLevel: "1",
  })),
  ...JSON.parse(
    fs.readFileSync(path.join(__dirname, "reading2", "reading2.json"), "utf8"),
  ).topics.map((entry) => ({
    ...normalizeReadingV2Topic(entry, "/reading2"),
    readingLevel: "2",
  })),
];

const topicExerciseCount = (topic) => topic.exercises.length;
const decorateTopics = (topics, progress, activityType, levelKey) => {
  const completions = new Map();
  progress
    .filter(
      (item) =>
        item.activity_type === activityType &&
        item.difficulty_level.startsWith(`${activityType}:`),
    )
    .forEach((item) => {
      const [, topicId, exerciseNumber] = item.difficulty_level.split(":");
      if (
        topicId &&
        exerciseNumber &&
        !completions.has(`${topicId}:${exerciseNumber}`)
      ) {
        completions.set(`${topicId}:${exerciseNumber}`, item);
      }
    });
  return topics.map((topic) => {
    const exercises = topic.exercises.map((exercise, index) => {
      const completion = completions.get(`${topic.topic.id}:${index + 1}`);
      return {
        ...exercise,
        completed: Boolean(completion),
        savedPoints: completion?.points,
        savedTotal: completion?.total_points,
      };
    });
    return {
      ...topic,
      exercises,
      completed:
        exercises.length > 0 &&
        exercises.every((exercise) => exercise.completed),
      [levelKey]: topic[levelKey],
    };
  });
};
const buildAreaProgress = (progress) => {
  const areas = [
    {
      key: "grammar",
      label: "Grammar",
      rows: progress.filter((item) =>
        ["questions", "final"].includes(item.activity_type),
      ),
      total: null,
    },
    {
      key: "vocabulary",
      label: "Vocabulary",
      rows: progress.filter((item) => item.activity_type === "flip-cards"),
      total: null,
    },
    {
      key: "reading",
      label: "Reading",
      topics: readingTopics,
      type: "reading",
    },
    {
      key: "writing",
      label: "Writing",
      topics: writingTopics,
      type: "writing",
    },
    {
      key: "listening",
      label: "Listening",
      topics: listeningTopics,
      type: "listening",
    },
  ];
  return areas.map((area) => {
    if (!area.topics) {
      const percentage = area.rows.length
        ? Math.round(
            area.rows.reduce((sum, row) => sum + row.percentage, 0) /
              area.rows.length,
          )
        : 0;
      return {
        ...area,
        percentage,
        completed: area.rows.length,
        total: area.rows.length || 1,
      };
    }
    const total = area.topics.reduce(
      (sum, topic) => sum + topicExerciseCount(topic),
      0,
    );
    const completed = progress.filter(
      (item) =>
        item.activity_type === area.type &&
        item.difficulty_level.startsWith(`${area.type}:`),
    ).length;
    return {
      ...area,
      percentage: total
        ? Math.min(100, Math.round((completed / total) * 100))
        : 0,
      completed,
      total,
    };
  });
};

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

function getAccessibleTextColor(hexColor) {
  const normalized = String(hexColor || "#edf4ff").trim();
  const value = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "#14213d";

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.72 ? "#14213d" : "#f8fafc";
}

function darkenHexColor(hexColor, amount) {
  const normalized = String(hexColor || "#edf4ff").trim();
  const value = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "#365a82";

  const darkenChannel = (channelHex) =>
    Math.max(0, Math.round(Number.parseInt(channelHex, 16) * (1 - amount)))
      .toString(16)
      .padStart(2, "0");

  return `#${darkenChannel(value.slice(0, 2))}${darkenChannel(value.slice(2, 4))}${darkenChannel(value.slice(4, 6))}`;
}

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

const usefulChunkListsData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "vocabulary", "useful-chunks.json"),
    "utf8",
  ),
).lists;

const usefulChunkExamples = new Map(
  usefulChunkListsData.flatMap((list) =>
    list.chunks
      .filter((chunk) => chunk.example)
      .map((chunk) => [chunk.phrase, chunk.example]),
  ),
);

function usefulChunkExample(chunk) {
  return (
    usefulChunkExamples.get(chunk) ||
    `What personal experience could you describe using “${chunk}”?`
  );
}

const usefulChunkLists = usefulChunkListsData.map((list, index) => ({
  number: index + 1,
  title: list.title,
  chunks: list.chunks.map((chunk) => chunk.phrase),
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
app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));
app.use("/audio1", express.static(path.join(__dirname, "audio1")));
app.use(
  "/uploads/profiles",
  express.static(path.join(dataDir, "uploads", "profiles")),
);
app.use("/reading1", express.static(path.join(__dirname, "reading1")));
app.use("/reading2", express.static(path.join(__dirname, "reading2")));
app.use((req, res, next) => {
  if (!req.session.name || req.session.isAdmin) return next();
  db.get(
    "SELECT COUNT(*) AS count FROM writing_submissions WHERE username = ? AND feedback IS NOT NULL AND feedback_seen = 0",
    [req.session.name],
    (error, row) => {
      res.locals.unreadFeedbackCount = error ? 0 : row.count;
      next();
    },
  );
});
app.get("/audio/eating-out", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_eating_out.mp3"));
});
app.get("/audio/free-time", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_free_time.mp3"));
});
app.get("/audio/giving-directions", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_giving_directions.mp3"));
});
app.get("/audio/going-cinema", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_going_to-the_cinema.mp3"));
});
app.get("/audio/shopping-clothes", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_shopping_for_clothes.mp3"));
});
app.get("/audio/advice-exams", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_Advice_for_exams.mp3"));
});
app.get("/audio/amazing-facts", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_amazing_facts.mp3"));
});
app.get("/audio/celebrations", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_celebrations.mp3"));
});
app.get("/audio/difficult-situations", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_difficult_situations.mp3"));
});
app.get("/audio/favourite-things", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_favourite_things.mp3"));
});
app.get("/audio/important-people", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_important_people.mp3"));
});
app.get("/audio/llamas", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_llamas.mp3"));
});
app.get("/audio/my-favourite-film", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_my_favourite_film.mp3"));
});
app.get("/audio/organising-your-time", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_Organising_your_time.mp3"));
});
app.get("/audio/sports-centres", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1-sports_centres.mp3"));
});
app.get("/audio/the-weekend", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_the_weekend.mp3"));
});
app.get("/audio/theme-parks", (req, res) => {
  res.sendFile(path.join(__dirname, "audio2", "B1_theme_parks.mp3"));
});
app.get("/audio/stop-wasting-time", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_Stop_wasting_time.mp3"));
});
app.get("/audio/taking-notes", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_Taking_notes.mp3"));
});
app.get("/audio/tour-of-london", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_tour_of_london.mp3"));
});
app.get("/audio/trains-and-travel", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_trains_and_travel.mp3"));
});
app.get("/audio/travelling-abroad", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_travelling_abroad.mp3"));
});
app.get("/audio/using-colours-to-do-homework", (req, res) => {
  res.sendFile(
    path.join(__dirname, "audio1", "A2_Using_colours_to_do_homework.mp3"),
  );
});
app.get("/audio/weather-forecast", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_weather_forecast.mp3"));
});
app.get("/audio/work", (req, res) => {
  res.sendFile(path.join(__dirname, "audio1", "A2_work.mp3"));
});

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
  db.run(
    "ALTER TABLE members ADD COLUMN profile_background TEXT DEFAULT '#edf4ff'",
    () => {},
  );
  db.run("ALTER TABLE members ADD COLUMN avatar TEXT DEFAULT ''", () => {});
  db.run(
    "ALTER TABLE members ADD COLUMN spritesheet TEXT DEFAULT ''",
    () => {},
  );
  db.run(
    "ALTER TABLE members ADD COLUMN character_config TEXT DEFAULT ''",
    () => {},
  );
  db.run(
    "INSERT OR IGNORE INTO members (username, fname, lname, email, role, goal, avatar, spritesheet, character_config) VALUES (?, ?, ?, ?, 'admin', '', '', '', '')",
    [adminname, adminname, "", ""],
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
  db.run(`CREATE TABLE IF NOT EXISTS writing_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    topic_title TEXT NOT NULL,
    submission_text TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    feedback_at TEXT,
    FOREIGN KEY (username) REFERENCES members(username),
    UNIQUE (username, topic_id)
  )`);
  db.run(
    "ALTER TABLE writing_submissions ADD COLUMN feedback_seen INTEGER NOT NULL DEFAULT 0",
    () => {},
  );
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
    mode TEXT NOT NULL DEFAULT 'lobby',
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
  db.run(
    "ALTER TABLE lobby_participants ADD COLUMN x REAL NOT NULL DEFAULT 160",
    () => {},
  );
  db.run(
    "ALTER TABLE lobby_participants ADD COLUMN y REAL NOT NULL DEFAULT 190",
    () => {},
  );
  db.run(
    "ALTER TABLE lobby_participants ADD COLUMN direction INTEGER NOT NULL DEFAULT 2",
    () => {},
  );
  db.run(
    "ALTER TABLE lobby_participants ADD COLUMN frame REAL NOT NULL DEFAULT 0",
    () => {},
  );
  db.run(
    "ALTER TABLE lobby_rooms ADD COLUMN mode TEXT NOT NULL DEFAULT 'lobby'",
    () => {},
  );
  db.run(`CREATE TABLE IF NOT EXISTS lobby_quicktype_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    question_order INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    target_word TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES lobby_rooms(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS lobby_quicktype_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    question_order INTEGER NOT NULL,
    username TEXT NOT NULL,
    submitted_word TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES lobby_rooms(id),
    FOREIGN KEY (username) REFERENCES members(username),
    UNIQUE (room_id, question_order, username)
  )`);
  db.run(
    "ALTER TABLE lobby_rooms ADD COLUMN question_started_at INTEGER",
    () => {},
  );
  db.run("ALTER TABLE lobby_rooms ADD COLUMN last_event TEXT", () => {});
  db.run(
    "ALTER TABLE lobby_rooms ADD COLUMN teacher_present INTEGER NOT NULL DEFAULT 0",
    () => {},
  );
});

//------------
// VIEW ENGINE
//------------
app.engine(
  "handlebars",
  engine({
    helpers: {
      json: (context) => JSON.stringify(context).replace(/'/g, "&#39;"),
    },
  }),
);
app.set("view engine", "handlebars");
app.set("views", "./views");

//---------
// ROUTES
//---------
app.get("/", (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.render("auth.handlebars");
  }
  res.redirect("/practice/questions?chapter=1");
});

app.get("/character-generator", requireAuthenticated, (req, res) => {
  res.render("character-generator.handlebars", { layout: false });
});

app.get("/api/profile/character", requireLogin, (req, res) => {
  db.get(
    "SELECT character_config FROM members WHERE username = ?",
    [req.session.name],
    (error, member) => {
      if (error || !member)
        return res.status(500).json({ error: "Unable to load character." });
      let config = {};
      try {
        config = member.character_config
          ? JSON.parse(member.character_config)
          : {};
      } catch (parseError) {
        config = {};
      }
      res.json({ config });
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

app.get("/listening", requireAuthenticated, (req, res) => {
  const selectedLevel = req.query.level === "2" ? "2" : "1";
  db.all(
    "SELECT activity_type, difficulty_level, points, total_points, percentage FROM progress WHERE username = ? ORDER BY completed_at DESC",
    [req.session.name],
    (error, progress) => {
      if (error)
        return res.status(500).send("Unable to load listening progress.");
      const decorated = decorateTopics(
        listeningTopics,
        progress,
        "listening",
        "listeningLevel",
      );
      const selectedTopic =
        decorated.find(
          (topic) =>
            topic.topic.id === req.query.topic &&
            topic.listeningLevel === selectedLevel,
        ) || decorated.find((topic) => topic.listeningLevel === selectedLevel);
      res.render("listening.handlebars", {
        listeningLevels: ["1", "2"].map((level) => ({
          number: level,
          selected: level === selectedLevel,
          topics: decorated
            .filter((topic) => topic.listeningLevel === level)
            .map((topic) => ({
              ...topic.topic,
              selected: topic.topic.id === selectedTopic?.topic.id,
            })),
        })),
        topic: selectedTopic?.topic,
        content: selectedTopic?.content,
        audioUrl: selectedTopic?.audioUrl,
        exercises: selectedTopic?.exercises,
        discussion: selectedTopic?.discussion,
      });
    },
  );
});

app.get("/writing", requireAuthenticated, (req, res) => {
  const selectedLevel = req.query.level === "1" ? "1" : "2";
  db.all(
    "SELECT activity_type, difficulty_level, points, total_points, percentage FROM progress WHERE username = ? ORDER BY completed_at DESC",
    [req.session.name],
    (progressError, progress) => {
      if (progressError)
        return res.status(500).send("Unable to load writing progress.");
      const decorated = decorateTopics(
        writingTopics,
        progress,
        "writing",
        "writingLevel",
      );
      const selectedTopic =
        decorated.find(
          (topic) =>
            topic.topic.id === req.query.topic &&
            topic.writingLevel === selectedLevel,
        ) || decorated.find((topic) => topic.writingLevel === selectedLevel);
      const renderWriting = (mySubmission) => {
        res.render("writing.handlebars", {
          writingLevels: ["1", "2"].map((level) => ({
            number: level,
            selected: level === selectedLevel,
            topics: decorated
              .filter((topic) => topic.writingLevel === level)
              .map((topic) => ({
                ...topic.topic,
                selected: topic.topic.id === selectedTopic?.topic.id,
              })),
          })),
          topic: selectedTopic?.topic,
          content: selectedTopic?.content,
          tips: selectedTopic?.tips,
          exercises: selectedTopic?.exercises,
          discussion: selectedTopic?.discussion,
          mySubmission,
        });
      };
      if (!selectedTopic) return renderWriting(null);
      db.get(
        "SELECT submission_text, submitted_at, feedback, feedback_at FROM writing_submissions WHERE username = ? AND topic_id = ?",
        [req.session.name, selectedTopic.topic.id],
        (error, submission) => renderWriting(error ? null : submission),
      );
    },
  );
});

app.get("/reading", requireAuthenticated, (req, res) => {
  const selectedLevel = req.query.level === "1" ? "1" : "2";
  db.all(
    "SELECT activity_type, difficulty_level, points, total_points, percentage FROM progress WHERE username = ? ORDER BY completed_at DESC",
    [req.session.name],
    (progressError, progress) => {
      if (progressError)
        return res.status(500).send("Unable to load reading progress.");
      const decorated = decorateTopics(
        readingTopics,
        progress,
        "reading",
        "readingLevel",
      );
      const selectedTopic =
        decorated.find(
          (topic) =>
            topic.topic.id === req.query.topic &&
            topic.readingLevel === selectedLevel,
        ) || decorated.find((topic) => topic.readingLevel === selectedLevel);
      res.render("reading.handlebars", {
        readingLevels: ["1", "2"].map((level) => ({
          number: level,
          selected: level === selectedLevel,
          topics: decorated
            .filter((topic) => topic.readingLevel === level)
            .map((topic) => ({
              ...topic.topic,
              selected: topic.topic.id === selectedTopic?.topic.id,
            })),
        })),
        topic: selectedTopic?.topic,
        content: selectedTopic?.content,
        preparation: selectedTopic?.preparation,
        tips: selectedTopic?.tips,
        exercises: selectedTopic?.exercises,
        discussion: selectedTopic?.discussion,
      });
    },
  );
});

app.post("/api/writing/submissions", requireLogin, (req, res) => {
  const topicId = String(req.body.topicId || "").trim();
  const topicTitle = String(req.body.topicTitle || "").trim();
  const text = String(req.body.text || "").trim();
  if (!topicId || !text)
    return res.status(400).json({ error: "Writing text is required." });
  db.run(
    `INSERT INTO writing_submissions (username, topic_id, topic_title, submission_text)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(username, topic_id)
     DO UPDATE SET submission_text = excluded.submission_text, submitted_at = CURRENT_TIMESTAMP, feedback = NULL, feedback_at = NULL`,
    [req.session.name, topicId, topicTitle, text],
    (error) =>
      error
        ? res.status(500).json({ error: "Unable to save your writing." })
        : res.json({ saved: true }),
  );
});

app.get("/writing/feedback/:id/open", requireLogin, (req, res) => {
  db.get(
    "SELECT topic_id FROM writing_submissions WHERE id = ? AND username = ?",
    [req.params.id, req.session.name],
    (error, submission) => {
      if (error || !submission) return res.redirect("/writing");
      db.run(
        "UPDATE writing_submissions SET feedback_seen = 1 WHERE id = ? AND username = ?",
        [req.params.id, req.session.name],
      );
      const topic = writingTopics.find(
        (entry) => entry.topic.id === submission.topic_id,
      );
      res.redirect(
        `/writing?level=${topic?.writingLevel || "2"}&topic=${submission.topic_id}`,
      );
    },
  );
});

app.get("/vocabulary/useful-chunks", requireAuthenticated, (req, res) => {
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

app.get("/vocabulary/useful-chunks/guide", requireAuthenticated, (req, res) => {
  const selectedNumber = Math.min(
    usefulChunkLists.length,
    Math.max(1, Number(req.query.list) || 1),
  );
  const guideLists = usefulChunkLists.map((list) => ({
    ...list,
    selected: list.number === selectedNumber,
    chunks: list.chunks.map((chunk) => ({
      phrase: chunk,
      example: usefulChunkExample(chunk),
    })),
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
  const selectedChapter = practiceQuestionChapters.find(
    (chapter) => chapter.id === String(req.query.chapter || ""),
  );
  const requestedExercise = selectedChapter?.exercises.find(
    (exercise) => exercise.id === req.query.exercise,
  );
  const requestedExerciseNumber =
    selectedChapter?.exercises.findIndex(
      (exercise) => exercise.id === requestedExercise?.id,
    ) + 1;
  const selectedExercise = requestedExercise && {
    ...requestedExercise,
    isFillInBlanks: requestedExercise.type === "fill-in-the-blanks",
    isWrittenAnswer: requestedExercise.type === "write-answer",
    exerciseNumber: requestedExerciseNumber,
    totalQuestions:
      requestedExercise.items?.length ||
      requestedExercise.questions?.length ||
      0,
    items: requestedExercise.items?.map((item, index) => ({
      ...item,
      questionNumber: index + 1,
    })),
    questions: requestedExercise.questions?.map((question, index) => ({
      ...question,
      questionNumber: index + 1,
    })),
    paragraphs: requestedExercise.paragraphs?.map((paragraph) => ({
      ...paragraph,
      parts: paragraph.text
        .split(/(\{\{blank\d+\}\})/)
        .filter(Boolean)
        .map((part) => {
          const blankId = part.match(/^\{\{(blank\d+)\}\}$/)?.[1];
          return blankId
            ? { isBlank: true, ...paragraph.blanks[blankId] }
            : { text: part };
        }),
    })),
  };

  db.all(
    "SELECT difficulty_level FROM progress WHERE username = ? AND activity_type = 'questions'",
    [req.session.name],
    (progressError, progress) => {
      const completedKeys = new Set(
        progressError ? [] : progress.map((item) => item.difficulty_level),
      );
      const decoratedChapters = practiceQuestionChapters.map((chapter) => ({
        ...chapter,
        selected: chapter.id === selectedChapter?.id,
        exercises: chapter.exercises.map((exercise, index) => ({
          ...exercise,
          selected: exercise.id === selectedExercise?.id,
          completed: completedKeys.has(`questions:${chapter.id}:${index + 1}`),
        })),
      }));
      res.render("practice-questions.handlebars", {
        pageTitle: "Chapters",
        chapters: decoratedChapters,
        selectedChapter: decoratedChapters.find(
          (chapter) => chapter.id === selectedChapter?.id,
        ),
        selectedExercise,
      });
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
  const shuffleQuestions = (items) => {
    const list = [...items];
    for (let index = list.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
    }
    return list;
  };

  db.all(
    `SELECT activity_type, points, total_points, percentage, completed_at
     FROM progress
      WHERE username = ? AND activity_type = 'final'
     ORDER BY completed_at DESC
      LIMIT 3`,
    [req.session.name],
    (progressError, recentProgress) => {
      if (progressError)
        return res.status(500).send("Unable to load recent scores.");

      const recentResults = recentProgress.map((item) => ({
        ...item,
        shortDate: new Date(item.completed_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      }));

      grammarDb.all(
        `SELECT quiz_questions.*, chapters.title AS chapter_title
         FROM quiz_questions
         JOIN grammar_topics ON quiz_questions.topic_id = grammar_topics.id
         JOIN chapters ON grammar_topics.chapter_id = chapters.id
         ORDER BY quiz_questions.id`,
        (error, grammarQuestions) => {
          if (error)
            return res.status(500).send("Unable to load the final test.");
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
                };
              });

              const finalQuestionPool = shuffleQuestions([
                ...grammarQuestions,
                ...vocabularyQuestions,
              ]);
              const questions = finalQuestionPool
                .slice(0, 30)
                .map((question, index) => ({
                  ...question,
                  question_number: index + 1,
                }));

              res.render("practice.handlebars", {
                mode: "final",
                pageTitle: "Final Test",
                pageIntro: "Good luck!",
                questions,
                recentResults,
                showFinalTestIntro: true,
              });
            },
          );
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
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const genericMessage =
    "If an account uses that email, a reset link has been sent.";
  if (!email)
    return res.status(400).render("forgot-password.handlebars", {
      error: "Enter your email address.",
    });

  db.get(
    "SELECT username FROM members WHERE LOWER(email) = ?",
    [email],
    (lookupError, member) => {
      if (lookupError || !member)
        return res.render("forgot-password.handlebars", {
          message: genericMessage,
        });
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = Date.now() + 60 * 60 * 1000;
      db.run(
        "DELETE FROM password_resets WHERE username = ?",
        [member.username],
        () => {
          db.run(
            "INSERT INTO password_resets (username, token_hash, expires_at) VALUES (?, ?, ?)",
            [member.username, tokenHash, expiresAt],
            (insertError) => {
              if (insertError)
                return res.status(500).render("forgot-password.handlebars", {
                  error: "Unable to create a reset link.",
                });
              const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
              const resetUrl = `${baseUrl}/reset-password/${token}`;
              const hasMailConfig =
                process.env.SMTP_HOST &&
                process.env.SMTP_USER &&
                process.env.SMTP_PASS;
              if (!hasMailConfig) {
                if (process.env.NODE_ENV !== "production") {
                  console.log(
                    `Password reset link for ${member.username}: ${resetUrl}`,
                  );
                  return res.render("forgot-password.handlebars", {
                    message:
                      "A development reset link was printed in the server terminal.",
                  });
                }
                return res.status(500).render("forgot-password.handlebars", {
                  error: "Password reset email is not configured yet.",
                });
              }
              const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
                },
              });
              transporter.sendMail(
                {
                  from: process.env.SMTP_FROM || process.env.SMTP_USER,
                  to: email,
                  subject: "Reset your English Labs password",
                  text: `Use this link to reset your password: ${resetUrl}\n\nThe link expires in one hour.`,
                },
                (mailError) => {
                  if (mailError)
                    return res
                      .status(500)
                      .render("forgot-password.handlebars", {
                        error: "Unable to send the reset email.",
                      });
                  res.render("forgot-password.handlebars", {
                    message: genericMessage,
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

app.get("/reset-password/:token", (req, res) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  db.get(
    "SELECT id FROM password_resets WHERE token_hash = ? AND expires_at > ?",
    [tokenHash, Date.now()],
    (error, reset) => {
      if (error || !reset)
        return res.status(400).render("reset-password.handlebars", {
          error: "This reset link is invalid or has expired.",
        });
      res.render("reset-password.handlebars", { token: req.params.token });
    },
  );
});

app.post("/reset-password/:token", (req, res) => {
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  if (password.length < 8 || password !== confirmPassword) {
    return res.status(400).render("reset-password.handlebars", {
      token: req.params.token,
      error: "Use matching passwords with at least 8 characters.",
    });
  }
  const tokenHash = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  db.get(
    "SELECT id, username FROM password_resets WHERE token_hash = ? AND expires_at > ?",
    [tokenHash, Date.now()],
    (lookupError, reset) => {
      if (lookupError || !reset)
        return res.status(400).render("reset-password.handlebars", {
          error: "This reset link is invalid or has expired.",
        });
      bcrypt.hash(password, saltRounds, (hashError, passwordHash) => {
        if (hashError)
          return res.status(500).render("reset-password.handlebars", {
            error: "Unable to reset your password.",
          });
        db.run(
          "UPDATE members SET password_hash = ? WHERE username = ?",
          [passwordHash, reset.username],
          (updateError) => {
            if (updateError)
              return res.status(500).render("reset-password.handlebars", {
                error: "Unable to reset your password.",
              });
            db.run("DELETE FROM password_resets WHERE id = ?", [reset.id]);
            res.render("login.handlebars", {
              message: "Your password has been reset. You can now log in.",
            });
          },
        );
      });
    },
  );
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
  const { fname, lname, username, email, password, confirmPassword, goal } =
    req.body;
  const firstName = String(fname || "").trim();
  const lastName = String(lname || "").trim();
  const requestedUsername = String(username || "").trim();
  const requestedEmail = String(email || "")
    .trim()
    .toLowerCase();
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
      error:
        "Enter your name, a valid email, a unique username, and matching passwords.",
    });
  }
  bcrypt.hash(password, saltRounds, (hashError, passwordHash) => {
    if (hashError)
      return res
        .status(500)
        .render("signup.handlebars", { error: "Unable to create account." });
    db.run(
      "INSERT INTO members (username, fname, lname, email, password_hash, role, goal) VALUES (?, ?, ?, ?, ?, 'student', ?)",
      [
        requestedUsername,
        firstName,
        lastName,
        requestedEmail,
        passwordHash,
        goal || "",
      ],
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

function requireProfileUser(req, res, next) {
  if (!req.session.isLoggedIn) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin)
    return res.status(403).send("Teacher access required.");
  next();
}

app.get("/profile", requireProfileUser, (req, res) => {
  res.locals.unreadFeedbackCount = 0;
  db.run(
    "UPDATE writing_submissions SET feedback_seen = 1 WHERE username = ? AND feedback IS NOT NULL",
    [req.session.name],
  );
  db.get(
    "SELECT username, goal, avatar, character_config, profile_background FROM members WHERE username = ?",
    [req.session.name],
    (error, student) => {
      if (error || !student) return res.status(404).send("Profile not found.");
      const background = /^#[0-9a-fA-F]{6}$/.test(
        student.profile_background || "",
      )
        ? student.profile_background
        : "#edf4ff";
      student.profile_background = background;
      student.profile_text_color = getAccessibleTextColor(background);
      student.profile_muted_color =
        student.profile_text_color === "#14213d" ? "#475569" : "#dbeafe";
      student.profile_button_color = darkenHexColor(background, 0.22);
      student.profile_button_text_color = getAccessibleTextColor(
        student.profile_button_color,
      );
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
                  db.all(
                    "SELECT id, topic_id, topic_title, feedback, feedback_at, feedback_seen FROM writing_submissions WHERE username = ? AND feedback IS NOT NULL ORDER BY feedback_at DESC",
                    [req.session.name],
                    (feedbackError, feedbackMessages) => {
                      if (feedbackError)
                        return res.status(500).send("Unable to load messages.");
                      res.render("profile.handlebars", {
                        student,
                        isAdmin: Boolean(req.session.isAdmin),
                        progress,
                        stats,
                        areaProgress: buildAreaProgress(progress),
                        passportStamps,
                        feedbackMessages,
                        unreadFeedbackCount: feedbackMessages.filter(
                          (message) => !message.feedback_seen,
                        ).length,
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
    },
  );
});

const QUESTION_DURATION_MS = 20000;
const QUICKTYPE_COUNTDOWN_MS = 3000;
const QUICKTYPE_DURATION_MS = 15000;

// Lazily flips a running round to "leaderboard" once the timer expires or everyone has answered.
const finalizeRoundIfNeeded = (room, callback) => {
  if (room && room.status === "countdown") {
    if (
      Date.now() - (room.question_started_at || Date.now()) <
      QUICKTYPE_COUNTDOWN_MS
    ) {
      return callback(room);
    }
    return db.run(
      "UPDATE lobby_rooms SET status = 'running', question_started_at = ? WHERE id = ? AND status = 'countdown'",
      [Date.now(), room.id],
      () =>
        db.get(
          "SELECT * FROM lobby_rooms WHERE id = ?",
          [room.id],
          (error, updatedRoom) =>
            callback(error || !updatedRoom ? room : updatedRoom),
        ),
    );
  }
  if (!room || room.status !== "running") return callback(room);
  const duration =
    room.mode === "quicktype" ? QUICKTYPE_DURATION_MS : QUESTION_DURATION_MS;
  const elapsed = Date.now() - (room.question_started_at || Date.now());
  db.get(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN answer IS NOT NULL THEN 1 ELSE 0 END) AS answered FROM lobby_participants WHERE room_id = ?",
    [room.id],
    (countError, counts) => {
      const total = countError ? 0 : counts.total || 0;
      const answered = countError ? 0 : counts.answered || 0;
      const timeUp = elapsed >= duration;
      const allAnswered = total > 0 && answered >= total;
      if (!timeUp && !allAnswered) return callback(room);
      db.run(
        "UPDATE lobby_rooms SET status = 'leaderboard' WHERE id = ? AND status = 'running'",
        [room.id],
        () => {
          db.get(
            "SELECT * FROM lobby_rooms WHERE id = ?",
            [room.id],
            (refetchError, updatedRoom) =>
              callback(refetchError || !updatedRoom ? room : updatedRoom),
          );
        },
      );
    },
  );
};

app.get("/lobby", requireAuthenticated, (req, res) => {
  const requestedMode = req.query.mode === "quicktype" ? "quicktype" : "lobby";
  const renderLobby = (room, questions = [], participant = null) => {
    db.get(
      "SELECT avatar, spritesheet, character_config FROM members WHERE username = ?",
      [req.session.name],
      (memberError, member) => {
        let characterConfig = {
          skin: "#f6c89f",
          hair: "#2b1b16",
          shirt: "#e85d4a",
          accessory: "none",
        };
        try {
          characterConfig = member?.character_config
            ? JSON.parse(member.character_config)
            : {};
        } catch (parseError) {
          characterConfig = {};
        }
        characterConfig = {
          skin: "#f6c89f",
          hair: "#2b1b16",
          shirt: "#e85d4a",
          accessory: "none",
          ...characterConfig,
        };
        const renderData = {
          student: {
            username: req.session.name,
            id: req.session.name,
            avatar: member?.avatar || "",
            spritesheet: member?.spritesheet || member?.avatar || "",
            characterConfig,
          },
          isAdmin: Boolean(req.session.isAdmin),
          room,
          questions,
          participant,
          isQuicktype:
            room?.mode === "quicktype" || requestedMode === "quicktype",
          leaderboard: [],
          totalQuestions: questions.length,
          currentQuestion: room
            ? questions.find(
                (question) => question.question_order === room.current_question,
              )
            : null,
          isWaiting: room?.status === "waiting",
          isRunning: room?.status === "running",
          isLeaderboardPhase: room?.status === "leaderboard",
          isFinished:
            room?.status === "finished" &&
            questions.length > 0 &&
            room.current_question > questions.length,
          isActiveSession:
            questions.length > 0 &&
            ["countdown", "running", "leaderboard", "finished"].includes(
              room?.status,
            ),
        };
        if (
          renderData.isAdmin &&
          renderData.isQuicktype &&
          renderData.isWaiting
        ) {
          grammarDb.all(
            "SELECT id, english_word, swedish_translation, cefr_level FROM vocabulary ORDER BY english_word COLLATE NOCASE",
            (vocabularyError, vocabularyWords) => {
              if (vocabularyError)
                return res.status(500).send("Unable to load vocabulary.");
              res.render("lobby.handlebars", {
                ...renderData,
                vocabularyWords,
              });
            },
          );
        } else {
          res.render("lobby.handlebars", renderData);
        }
      },
    );
  };
  if (!req.session.isAdmin && !req.query.roomId) return renderLobby(null);
  const roomQuery = req.session.isAdmin
    ? "SELECT * FROM lobby_rooms WHERE mode = ? ORDER BY id DESC LIMIT 1"
    : "SELECT * FROM lobby_rooms WHERE id = ? AND mode = ?";
  const roomParams = req.session.isAdmin
    ? [requestedMode]
    : [Number(req.query.roomId), requestedMode];
  db.get(roomQuery, roomParams, (roomError, room) => {
    if (roomError) return res.status(500).send("Unable to load lobby.");
    if (!room) return renderLobby(null);
    finalizeRoundIfNeeded(room, (updatedRoom) => {
      const questionQuery =
        updatedRoom.mode === "quicktype"
          ? `SELECT id, question_order, prompt AS question_text${req.session.isAdmin ? ", target_word" : ""} FROM lobby_quicktype_questions WHERE room_id = ? ORDER BY question_order`
          : "SELECT id, question_order, question_text, answer_a, answer_b, answer_c, answer_d FROM lobby_questions WHERE room_id = ? ORDER BY question_order";
      db.all(questionQuery, [updatedRoom.id], (questionError, questions) => {
        if (questionError)
          return res.status(500).send("Unable to load lobby questions.");
        db.get(
          "SELECT * FROM lobby_participants WHERE room_id = ? AND username = ?",
          [updatedRoom.id, req.session.name],
          (participantError, participant) =>
            participantError
              ? res.status(500).send("Unable to load lobby participant.")
              : renderLobby(updatedRoom, questions, participant),
        );
      });
    });
  });
});

app.get("/quicktype", requireAuthenticated, (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/lobby?mode=quicktype");
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const title = "QuickType";
  db.run(
    "INSERT INTO lobby_rooms (code, title, mode) VALUES (?, ?, 'quicktype')",
    [code, title],
    function (error) {
      if (error)
        return res.status(500).send("Unable to create QuickType room.");
      db.run(
        "INSERT INTO lobby_participants (room_id, username) VALUES (?, ?)",
        [this.lastID, req.session.name],
        (participantError) =>
          participantError
            ? res.status(500).send("Unable to join QuickType room.")
            : res.redirect("/lobby?mode=quicktype"),
      );
    },
  );
});

app.get("/question-game", requireAuthenticated, (req, res) => {
  if (!req.session.isAdmin) return res.redirect("/lobby?mode=lobby");
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const title = "Question Game";
  db.run(
    "INSERT INTO lobby_rooms (code, title, mode) VALUES (?, ?, 'lobby')",
    [code, title],
    function (error) {
      if (error)
        return res.status(500).send("Unable to create Question Game room.");
      db.run(
        "INSERT INTO lobby_participants (room_id, username) VALUES (?, ?)",
        [this.lastID, req.session.name],
        (participantError) =>
          participantError
            ? res.status(500).send("Unable to join Question Game room.")
            : res.redirect("/lobby?mode=lobby"),
      );
    },
  );
});

app.post("/lobby/rooms", requireAdmin, (req, res) => {
  const title = String(req.body.title || "English Labs quiz")
    .trim()
    .slice(0, 100);
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const mode = req.body.mode === "quicktype" ? "quicktype" : "lobby";
  db.run(
    "INSERT INTO lobby_rooms (code, title, mode) VALUES (?, ?, ?)",
    [code, title, mode],
    function (error) {
      if (error) return res.status(500).send("Unable to create room.");
      db.run(
        "INSERT OR IGNORE INTO lobby_participants (room_id, username) VALUES (?, ?)",
        [this.lastID, req.session.name],
        (participantError) =>
          participantError
            ? res.status(500).send("Unable to join teacher to room.")
            : res.redirect(
                `/lobby?mode=${mode === "quicktype" ? "quicktype" : "lobby"}`,
              ),
      );
    },
  );
});

app.post("/lobby/quit", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  db.run(
    "DELETE FROM lobby_participants WHERE room_id = ?",
    [roomId],
    (participantsError) => {
      if (participantsError)
        return res.status(500).send("Unable to close room.");
      db.run(
        "DELETE FROM lobby_questions WHERE room_id = ?",
        [roomId],
        (questionsError) => {
          if (questionsError)
            return res.status(500).send("Unable to close room.");
          db.run(
            "DELETE FROM lobby_quicktype_submissions WHERE room_id = ?",
            [roomId],
            (submissionsError) => {
              if (submissionsError)
                return res.status(500).send("Unable to close room.");
              db.run(
                "DELETE FROM lobby_quicktype_questions WHERE room_id = ?",
                [roomId],
                (quicktypeError) => {
                  if (quicktypeError)
                    return res.status(500).send("Unable to close room.");
                  db.run(
                    "DELETE FROM lobby_rooms WHERE id = ?",
                    [roomId],
                    (roomError) =>
                      roomError
                        ? res.status(500).send("Unable to close room.")
                        : res.redirect("/lobby"),
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

app.post("/lobby/questions", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const answers = ["a", "b", "c", "d"].map((key) =>
    String(req.body[`answer_${key}`] || "").trim(),
  );
  const correctAnswer = String(req.body.correctAnswer || "").toLowerCase();
  const questionText = String(req.body.questionText || "").trim();
  if (
    !roomId ||
    !questionText ||
    answers.some((answer) => !answer) ||
    !["a", "b", "c", "d"].includes(correctAnswer)
  ) {
    return res.status(400).redirect("/lobby");
  }
  db.get(
    "SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order FROM lobby_questions WHERE room_id = ?",
    [roomId],
    (orderError, result) => {
      if (orderError) return res.status(500).send("Unable to add question.");
      db.run(
        "INSERT INTO lobby_questions (room_id, question_order, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [roomId, result.next_order, questionText, ...answers, correctAnswer],
        (error) =>
          error
            ? res.status(500).send("Unable to add question.")
            : res.redirect("/lobby"),
      );
    },
  );
});

app.post("/lobby/quicktype/questions", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const prompt = String(req.body.prompt || "").trim();
  const targetWord = String(req.body.targetWord || "").trim();
  if (!roomId || !prompt || !targetWord)
    return res.status(400).redirect("/lobby?mode=quicktype");
  db.get(
    "SELECT mode, status FROM lobby_rooms WHERE id = ?",
    [roomId],
    (roomError, room) => {
      if (
        roomError ||
        !room ||
        room.mode !== "quicktype" ||
        room.status !== "waiting"
      )
        return res.status(400).redirect("/lobby?mode=quicktype");
      db.get(
        "SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order FROM lobby_quicktype_questions WHERE room_id = ?",
        [roomId],
        (orderError, result) => {
          if (orderError)
            return res.status(500).send("Unable to add Quicktype prompt.");
          db.run(
            "INSERT INTO lobby_quicktype_questions (room_id, question_order, prompt, target_word) VALUES (?, ?, ?, ?)",
            [roomId, result.next_order, prompt, targetWord],
            (error) =>
              error
                ? res.status(500).send("Unable to add Quicktype prompt.")
                : res.redirect("/lobby?mode=quicktype"),
          );
        },
      );
    },
  );
});

app.post("/lobby/quicktype/create", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const rawWordIds = Array.isArray(req.body.wordIds)
    ? req.body.wordIds
    : req.body.wordIds
      ? [req.body.wordIds]
      : [];
  const wordIds = [...new Set(rawWordIds.map(Number).filter(Number.isInteger))];
  if (!roomId || !wordIds.length)
    return res.status(400).redirect("/lobby?mode=quicktype");
  db.get(
    "SELECT mode, status FROM lobby_rooms WHERE id = ?",
    [roomId],
    (roomError, room) => {
      if (
        roomError ||
        !room ||
        room.mode !== "quicktype" ||
        room.status !== "waiting"
      )
        return res.status(400).redirect("/lobby?mode=quicktype");
      const placeholders = wordIds.map(() => "?").join(",");
      grammarDb.all(
        `SELECT id, english_word FROM vocabulary WHERE id IN (${placeholders})`,
        wordIds,
        (vocabularyError, words) => {
          if (vocabularyError || words.length !== wordIds.length)
            return res.status(400).redirect("/lobby?mode=quicktype");
          const byId = new Map(words.map((word) => [word.id, word]));
          db.serialize(() => {
            db.run(
              "DELETE FROM lobby_quicktype_submissions WHERE room_id = ?",
              [roomId],
            );
            db.run("DELETE FROM lobby_quicktype_questions WHERE room_id = ?", [
              roomId,
            ]);
            const insert = db.prepare(
              "INSERT INTO lobby_quicktype_questions (room_id, question_order, prompt, target_word) VALUES (?, ?, ?, ?)",
            );
            wordIds.forEach((wordId, index) => {
              const word = byId.get(wordId);
              insert.run(
                roomId,
                index + 1,
                "Type the word you hear.",
                word.english_word,
              );
            });
            insert.finalize((insertError) => {
              if (insertError)
                return res.status(500).send("Unable to create Quicktype game.");
              db.run(
                "UPDATE lobby_rooms SET current_question = 1, status = 'waiting', question_started_at = NULL WHERE id = ?",
                [roomId],
                (updateError) =>
                  updateError
                    ? res
                        .status(500)
                        .send("Unable to initialize Quicktype game.")
                    : res.redirect("/lobby?mode=quicktype"),
              );
            });
          });
        },
      );
    },
  );
});

app.post("/lobby/quicktype/activate", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  db.run(
    "UPDATE lobby_rooms SET status = 'countdown', current_question = COALESCE(NULLIF(current_question, 0), 1), question_started_at = ?, last_event = NULL WHERE id = ? AND mode = 'quicktype' AND status = 'waiting' AND EXISTS (SELECT 1 FROM lobby_quicktype_questions WHERE room_id = ?)",
    [Date.now(), roomId, roomId],
    function (error) {
      if (error)
        return res.status(500).json({ error: "Unable to activate word." });
      res.json({ activated: this.changes === 1 });
    },
  );
});

app.post("/lobby/join", requireLogin, (req, res) => {
  const code = String(req.body.code || "").trim();
  db.get(
    "SELECT * FROM lobby_rooms WHERE code = ? AND status != 'finished'",
    [code],
    (error, room) => {
      if (error || !room) return res.status(400).redirect("/lobby?error=code");
      db.run(
        "INSERT OR IGNORE INTO lobby_participants (room_id, username) VALUES (?, ?)",
        [room.id, req.session.name],
        () =>
          res.redirect(
            `/lobby?mode=${room.mode === "quicktype" ? "quicktype" : "lobby"}&roomId=${room.id}`,
          ),
      );
    },
  );
});

app.post("/api/lobby/player-state", requireProfileUser, (req, res) => {
  const roomId = Number(req.body.roomId);
  const x = Math.max(0, Math.min(310, Number(req.body.x) || 0));
  const y = Math.max(60, Math.min(210, Number(req.body.y) || 60));
  const direction = [0, 1, 2, 3].includes(Number(req.body.direction))
    ? Number(req.body.direction)
    : 2;
  const frame = Math.max(0, Math.min(8.99, Number(req.body.frame) || 0));
  if (!roomId) return res.status(400).json({ error: "Room is required." });
  db.run(
    "UPDATE lobby_participants SET x = ?, y = ?, direction = ?, frame = ? WHERE room_id = ? AND username = ?",
    [x, y, direction, frame, roomId, req.session.name],
    function (error) {
      if (error)
        return res.status(500).json({ error: "Unable to sync player." });
      res.json({ saved: this.changes === 1 });
    },
  );
});

app.post("/api/lobby/teacher-entrance", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const entering = req.body.entering === true || req.body.entering === "true";
  if (!roomId) return res.status(400).json({ error: "Room is required." });
  db.run(
    "UPDATE lobby_rooms SET teacher_present = ?, last_event = ? WHERE id = ? AND mode = 'quicktype'",
    [
      entering ? 1 : 0,
      entering
        ? `TEACHER_ENTRANCE:${Date.now()}`
        : `TEACHER_EXIT:${Date.now()}`,
      roomId,
    ],
    function (error) {
      if (error)
        return res
          .status(500)
          .json({ error: "Unable to update teacher entrance." });
      if (!this.changes)
        return res.status(404).json({ error: "QuickType room not found." });
      res.json({ teacherPresent: entering });
    },
  );
});

app.post("/lobby/start", requireAdmin, (req, res) => {
  db.run(
    "UPDATE lobby_rooms SET status = 'running', current_question = 1, question_started_at = ? WHERE id = ? AND ((mode = 'lobby' AND EXISTS (SELECT 1 FROM lobby_questions WHERE room_id = ?)) OR (mode = 'quicktype' AND EXISTS (SELECT 1 FROM lobby_quicktype_questions WHERE room_id = ?)))",
    [
      Date.now(),
      Number(req.body.roomId),
      Number(req.body.roomId),
      Number(req.body.roomId),
    ],
    () =>
      res.redirect(
        `/lobby?mode=${req.body.mode === "quicktype" ? "quicktype" : "lobby"}`,
      ),
  );
});

app.post("/lobby/quicktype/submit", requireLogin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const submittedWord = String(req.body.word || "").trim();
  const normalizedWord = submittedWord
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!roomId || !submittedWord || !normalizedWord)
    return res.status(400).json({ error: "Enter a word." });
  db.get(
    "SELECT * FROM lobby_rooms WHERE id = ? AND mode = 'quicktype' AND status = 'running'",
    [roomId],
    (roomError, room) => {
      if (roomError || !room)
        return res.status(400).json({ error: "Room is not running." });
      db.get(
        "SELECT target_word FROM lobby_quicktype_questions WHERE room_id = ? AND question_order = ?",
        [roomId, room.current_question],
        (questionError, question) => {
          if (questionError || !question)
            return res.status(400).json({ error: "Prompt is unavailable." });
          if (
            Date.now() - (room.question_started_at || Date.now()) >=
            QUICKTYPE_DURATION_MS
          ) {
            return finalizeRoundIfNeeded(room, () =>
              res.status(400).json({ error: "This round has ended." }),
            );
          }
          const expectedWord = String(question.target_word)
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, "");
          const isCorrect = normalizedWord === expectedWord;
          db.get(
            "SELECT 1 FROM lobby_quicktype_submissions WHERE room_id = ? AND question_order = ? AND username = ?",
            [roomId, room.current_question, req.session.name],
            (existingError, existing) => {
              if (existingError)
                return res
                  .status(500)
                  .json({ error: "Unable to save answer." });
              if (existing)
                return res.json({ correct: false, points: 0, answered: true });
              db.get(
                "SELECT COUNT(*) AS correct_count FROM lobby_quicktype_submissions WHERE room_id = ? AND question_order = ? AND is_correct = 1",
                [roomId, room.current_question],
                (countError, count) => {
                  if (countError)
                    return res
                      .status(500)
                      .json({ error: "Unable to score answer." });
                  const points = isCorrect ? (count.correct_count ? 1 : 2) : 0;
                  db.run(
                    "INSERT INTO lobby_quicktype_submissions (room_id, question_order, username, submitted_word, is_correct, points) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                      roomId,
                      room.current_question,
                      req.session.name,
                      submittedWord,
                      isCorrect ? 1 : 0,
                      points,
                    ],
                    (insertError) => {
                      if (insertError)
                        return res
                          .status(500)
                          .json({ error: "Unable to save answer." });
                      db.run(
                        "UPDATE lobby_participants SET answer = ?, score = score + ? WHERE room_id = ? AND username = ? AND answer IS NULL",
                        [submittedWord, points, roomId, req.session.name],
                        () => {
                          finalizeRoundIfNeeded(room, () => {});
                          res.json({
                            correct: isCorrect,
                            points,
                            answered: true,
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

app.post("/lobby/answer", requireLogin, (req, res) => {
  const roomId = Number(req.body.roomId);
  const answer = String(req.body.answer || "").toLowerCase();
  db.get(
    "SELECT * FROM lobby_rooms WHERE id = ? AND status = 'running'",
    [roomId],
    (roomError, room) => {
      if (roomError || !room)
        return res.status(400).json({ error: "Room is not running." });
      db.get(
        "SELECT correct_answer FROM lobby_questions WHERE room_id = ? AND question_order = ?",
        [roomId, room.current_question],
        (questionError, question) => {
          if (
            questionError ||
            !question ||
            !["a", "b", "c", "d"].includes(answer)
          )
            return res.status(400).json({ error: "Invalid answer." });
          const isCorrect = answer === question.correct_answer;
          const speedBonus = isCorrect
            ? Math.max(
                0,
                50 -
                  Math.floor(
                    (Date.now() - (room.question_started_at || Date.now())) /
                      1000,
                  ) *
                    5,
              )
            : 0;
          const points = isCorrect ? 100 + speedBonus : 0;
          db.run(
            "UPDATE lobby_participants SET answer = ?, score = score + ? WHERE room_id = ? AND username = ? AND answer IS NULL",
            [answer, points, roomId, req.session.name],
            function (updateError) {
              if (updateError)
                return res
                  .status(500)
                  .json({ error: "Unable to save answer." });
              finalizeRoundIfNeeded(room, () => {});
              res.json({
                correct: this.changes === 1 && isCorrect,
                answered: this.changes === 1,
              });
            },
          );
        },
      );
    },
  );
});

app.post("/lobby/next", requireAdmin, (req, res) => {
  const roomId = Number(req.body.roomId);
  db.get(
    "SELECT current_question, mode FROM lobby_rooms WHERE id = ?",
    [roomId],
    (error, room) => {
      if (error || !room) return res.redirect("/lobby");
      db.get(
        room.mode === "quicktype"
          ? "SELECT COUNT(*) AS total FROM lobby_quicktype_questions WHERE room_id = ?"
          : "SELECT COUNT(*) AS total FROM lobby_questions WHERE room_id = ?",
        [roomId],
        (countError, count) => {
          const next = room.current_question + 1;
          db.run(
            "UPDATE lobby_rooms SET current_question = ?, status = ?, question_started_at = ?, last_event = ? WHERE id = ?",
            [
              next,
              next > count.total
                ? "finished"
                : room.mode === "quicktype"
                  ? "waiting"
                  : "running",
              next > count.total
                ? null
                : room.mode === "quicktype"
                  ? null
                  : Date.now(),
              next > count.total
                ? null
                : room.mode === "quicktype"
                  ? "NEXT_WORD_PREPARED"
                  : null,
              roomId,
            ],
            () => {
              db.run(
                "UPDATE lobby_participants SET answer = NULL WHERE room_id = ?",
                [roomId],
                () =>
                  res.redirect(
                    `/lobby?mode=${room.mode === "quicktype" ? "quicktype" : "lobby"}`,
                  ),
              );
            },
          );
        },
      );
    },
  );
});

app.get("/api/lobby/state", requireAuthenticated, (req, res) => {
  const requestedRoomId = Number(req.query.roomId);
  db.get(
    requestedRoomId
      ? "SELECT * FROM lobby_rooms WHERE id = ?"
      : "SELECT * FROM lobby_rooms ORDER BY id DESC LIMIT 1",
    requestedRoomId ? [requestedRoomId] : [],
    (error, room) => {
      if (error || !room) return res.json({ room: null });
      finalizeRoundIfNeeded(room, (updatedRoom) => {
        const totalQuery =
          updatedRoom.mode === "quicktype"
            ? "SELECT COUNT(*) AS total FROM lobby_quicktype_questions WHERE room_id = ?"
            : "SELECT COUNT(*) AS total FROM lobby_questions WHERE room_id = ?";
        db.get(
          totalQuery,
          [updatedRoom.id],
          (totalQuestionsError, totalQuestionsRow) => {
            const questionQuery =
              updatedRoom.mode === "quicktype"
                ? `SELECT id, question_order, prompt AS question_text${req.session.isAdmin ? ", target_word" : ""} FROM lobby_quicktype_questions WHERE room_id = ? AND question_order = ?`
                : "SELECT id, question_order, question_text, answer_a, answer_b, answer_c, answer_d FROM lobby_questions WHERE room_id = ? AND question_order = ?";
            db.get(
              questionQuery,
              [updatedRoom.id, updatedRoom.current_question],
              (questionError, question) => {
                db.get(
                  "SELECT score, answer FROM lobby_participants WHERE room_id = ? AND username = ?",
                  [updatedRoom.id, req.session.name],
                  (participantError, participant) => {
                    db.get(
                      "SELECT COUNT(*) AS total, SUM(CASE WHEN answer IS NOT NULL THEN 1 ELSE 0 END) AS answered FROM lobby_participants WHERE room_id = ?",
                      [updatedRoom.id],
                      (countError, counts) => {
                        db.all(
                          "SELECT lobby_participants.username AS userId, lobby_participants.username AS username, lobby_participants.score AS score, lobby_participants.x AS x, lobby_participants.y AS y, lobby_participants.direction AS direction, lobby_participants.frame AS frame, members.avatar AS avatar, COALESCE(NULLIF(members.spritesheet, ''), members.avatar) AS spritesheet, CASE WHEN members.role = 'admin' THEN 1 ELSE 0 END AS isAdmin FROM lobby_participants LEFT JOIN members ON members.username = lobby_participants.username WHERE lobby_participants.room_id = ? ORDER BY lobby_participants.score DESC, lobby_participants.username ASC",
                          [updatedRoom.id],
                          (leaderboardError, leaderboard) => {
                            const elapsed =
                              updatedRoom.status === "running"
                                ? Date.now() -
                                  (updatedRoom.question_started_at ||
                                    Date.now())
                                : 0;
                            const duration =
                              updatedRoom.mode === "quicktype"
                                ? QUICKTYPE_DURATION_MS
                                : QUESTION_DURATION_MS;
                            const sendState = (correctWord = null) =>
                              res.json({
                                room: updatedRoom,
                                event: updatedRoom.last_event || null,
                                totalQuestions: totalQuestionsError
                                  ? 0
                                  : totalQuestionsRow.total,
                                question: questionError ? null : question,
                                participant: participantError
                                  ? null
                                  : participant,
                                leaderboard: leaderboardError
                                  ? []
                                  : leaderboard,
                                countdownRemaining:
                                  updatedRoom.status === "countdown"
                                    ? Math.max(
                                        0,
                                        Math.ceil(
                                          (QUICKTYPE_COUNTDOWN_MS -
                                            (Date.now() -
                                              (updatedRoom.question_started_at ||
                                                Date.now()))) /
                                            1000,
                                        ),
                                      )
                                    : 0,
                                timeRemaining:
                                  updatedRoom.status === "running"
                                    ? Math.max(
                                        0,
                                        Math.ceil((duration - elapsed) / 1000),
                                      )
                                    : 0,
                                correctWord,
                                answeredCount: countError
                                  ? 0
                                  : counts.answered || 0,
                                totalParticipants: countError
                                  ? 0
                                  : counts.total || 0,
                              });
                            if (
                              updatedRoom.mode === "quicktype" &&
                              ["leaderboard", "finished"].includes(
                                updatedRoom.status,
                              )
                            ) {
                              db.get(
                                "SELECT target_word FROM lobby_quicktype_questions WHERE room_id = ? AND question_order = ?",
                                [updatedRoom.id, updatedRoom.current_question],
                                (wordError, result) =>
                                  sendState(
                                    wordError
                                      ? null
                                      : result?.target_word || null,
                                  ),
                              );
                            } else {
                              sendState();
                            }
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
    },
  );
});

app.post("/profile/goal", requireProfileUser, (req, res) => {
  db.run(
    "UPDATE members SET goal = ? WHERE username = ?",
    [String(req.body.goal || "").trim(), req.session.name],
    (error) => {
      if (error) return res.status(500).redirect("/profile?goalError=1");
      res.redirect("/profile?goalSaved=1");
    },
  );
});

app.post("/profile/background", requireProfileUser, (req, res) => {
  const backgroundColor = String(req.body.profileBackgroundColor || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(backgroundColor)) {
    return res.status(400).redirect("/profile?backgroundError=1");
  }

  db.run(
    "UPDATE members SET profile_background = ? WHERE username = ?",
    [backgroundColor.toLowerCase(), req.session.name],
    (error) => {
      if (error) return res.status(500).redirect("/profile?backgroundError=1");
      res.redirect("/profile?backgroundSaved=1");
    },
  );
});

app.post("/profile/avatar", requireProfileUser, (req, res) => {
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

app.post("/api/profile/character", requireProfileUser, (req, res) => {
  const previewImage = String(
    req.body.previewImage || req.body.image || req.body.spritesheetImage || "",
  );
  const spritesheetImage = String(
    req.body.spritesheetImage || req.body.image || "",
  );
  const config =
    req.body.config && typeof req.body.config === "object"
      ? req.body.config
      : {};
  const previewMatch = previewImage
    .trim()
    .match(
      /^data:image\/(png|jpeg|webp|gif)(?:;charset=[^;]+)?;base64,([A-Za-z0-9+/=\r\n]+)$/i,
    );
  const spritesheetMatch = spritesheetImage
    .trim()
    .match(
      /^data:image\/(png|jpeg|webp|gif)(?:;charset=[^;]+)?;base64,([A-Za-z0-9+/=\r\n]+)$/i,
    );
  if (!previewMatch || !spritesheetMatch)
    return res.status(400).json({ error: "Invalid character data." });

  const previewBuffer = Buffer.from(
    previewMatch[2].replace(/[\r\n\s]/g, ""),
    "base64",
  );
  const spritesheetBuffer = Buffer.from(
    spritesheetMatch[2].replace(/[\r\n\s]/g, ""),
    "base64",
  );
  if (
    !previewBuffer.length ||
    !spritesheetBuffer.length ||
    previewBuffer.length > 2 * 1024 * 1024 ||
    spritesheetBuffer.length > 8 * 1024 * 1024
  ) {
    return res
      .status(400)
      .json({ error: "Character image must be under 2 MB." });
  }
  const extension = (type) => (type === "jpeg" ? "jpg" : type);
  const avatarFilename = `character-preview-${crypto.randomUUID()}.${extension(previewMatch[1])}`;
  const spritesheetFilename = `character-sheet-${crypto.randomUUID()}.${extension(spritesheetMatch[1])}`;
  const profileDirectory = path.join(dataDir, "uploads", "profiles");
  fs.writeFile(
    path.join(profileDirectory, avatarFilename),
    previewBuffer,
    (previewWriteError) => {
      if (previewWriteError)
        return res.status(500).json({ error: "Unable to save character." });
      fs.writeFile(
        path.join(profileDirectory, spritesheetFilename),
        spritesheetBuffer,
        (spritesheetWriteError) => {
          if (spritesheetWriteError)
            return res.status(500).json({ error: "Unable to save character." });
          db.run(
            "UPDATE members SET avatar = ?, spritesheet = ?, character_config = ? WHERE username = ?",
            [
              avatarFilename,
              spritesheetFilename,
              JSON.stringify(config),
              req.session.name,
            ],
            (error) => {
              if (error)
                return res
                  .status(500)
                  .json({ error: "Unable to save character." });
              req.session.avatar = avatarFilename;
              res.json({
                saved: true,
                avatar: avatarFilename,
                spritesheet: spritesheetFilename,
              });
            },
          );
        },
      );
    },
  );
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
    ? req.body.words
        .map((word) => String(word).trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  if (!difficultyLevel || !words.length)
    return res.status(400).json({ error: "Invalid words." });

  const statement = db.prepare(`
    INSERT INTO vocabulary_difficult_words (username, difficulty_level, word)
    VALUES (?, ?, ?)
    ON CONFLICT(username, difficulty_level, word)
    DO UPDATE SET attempts = attempts + 1, last_seen = CURRENT_TIMESTAMP
  `);
  words.forEach((word) =>
    statement.run(req.session.name, difficultyLevel, word),
  );
  statement.finalize((error) =>
    error
      ? res.status(500).json({ error: "Unable to save difficult words." })
      : res.json({ saved: words.length }),
  );
});

const teacherCategories = {
  grammar: { label: "Grammar", activityTypes: ["questions", "final"] },
  vocabulary: { label: "Vocabulary", activityTypes: ["flip-cards"] },
  reading: { label: "Reading", activityTypes: ["reading"] },
  writing: { label: "Writing", activityTypes: ["writing"] },
  listening: { label: "Listening", activityTypes: ["listening"] },
};

app.get("/teacher/dashboard", requireAdmin, (req, res) => {
  const categoryKey = teacherCategories[req.query.category]
    ? req.query.category
    : null;
  const category = categoryKey ? teacherCategories[categoryKey] : null;
  const joinFilter = category
    ? `AND progress.activity_type IN (${category.activityTypes.map(() => "?").join(",")})`
    : "";
  const params = category ? category.activityTypes : [];
  db.all(
    `SELECT members.username, members.fname, members.lname, members.goal,
    COALESCE(SUM(progress.points), 0) AS points,
    COALESCE(SUM(progress.total_points), 0) AS possible_points,
    COUNT(progress.id) AS activities,
    COALESCE(GROUP_CONCAT(DISTINCT progress.difficulty_level), '') AS levels,
    COALESCE(SUM(CASE WHEN progress.difficulty_level = 'easy' THEN 1 ELSE 0 END), 0) AS easy_activities,
    COALESCE(SUM(CASE WHEN progress.difficulty_level = 'medium' THEN 1 ELSE 0 END), 0) AS medium_activities
    FROM members LEFT JOIN progress ON progress.username = members.username ${joinFilter}
    WHERE members.role = 'student'
    GROUP BY members.username ORDER BY members.username`,
    params,
    (error, students) => {
      if (error)
        return res.status(500).send("Unable to load student progress.");
      const renderDashboard = (pendingWritingByUsername) => {
        res.render("teacher.handlebars", {
          categoryKey,
          categoryLabel: category?.label,
          categories: Object.entries(teacherCategories).map(([key, value]) => ({
            key,
            label: value.label,
            selected: key === categoryKey,
          })),
          students: students.map((student) => ({
            ...student,
            pendingWriting: pendingWritingByUsername?.[student.username] || 0,
            levelBadges: [
              {
                label: "Easy",
                stronger: student.easy_activities >= student.medium_activities,
              },
              {
                label: "Medium",
                stronger: student.medium_activities > student.easy_activities,
              },
            ],
          })),
        });
      };
      if (categoryKey !== "writing") return renderDashboard(null);
      db.all(
        "SELECT username, COUNT(*) AS pending FROM writing_submissions WHERE feedback IS NULL GROUP BY username",
        (pendingError, pendingRows) => {
          if (pendingError) return renderDashboard(null);
          const pendingWritingByUsername = Object.fromEntries(
            pendingRows.map((row) => [row.username, row.pending]),
          );
          renderDashboard(pendingWritingByUsername);
        },
      );
    },
  );
});

app.get("/teacher/student/:username", requireAdmin, (req, res) => {
  const profileCategory = teacherCategories[req.query.category]
    ? req.query.category
    : "grammar";
  db.get(
    "SELECT username, fname, lname, goal, avatar FROM members WHERE username = ? AND role = 'student'",
    [req.params.username],
    (error, student) => {
      if (error || !student) return res.status(404).send("Student not found.");
      student.avatar_initial = student.username.charAt(0).toUpperCase();
      db.all(
        "SELECT activity_type, difficulty_level, points, total_points, percentage, completed_at FROM progress WHERE username = ? ORDER BY completed_at DESC",
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
                        return res
                          .status(500)
                          .send("Unable to load flip-card completions.");
                      db.all(
                        "SELECT difficulty_level, word, attempts FROM vocabulary_difficult_words WHERE username = ? ORDER BY attempts DESC, last_seen DESC LIMIT 6",
                        [student.username],
                        (wordsError, hardestWords) => {
                          if (wordsError)
                            return res
                              .status(500)
                              .send("Unable to load difficult words.");
                          const latestSubmissionByChunk = new Map();
                          usefulChunkSubmissions.forEach((submission) => {
                            const key = `${submission.list_number}:${submission.chunk}`;
                            if (!latestSubmissionByChunk.has(key))
                              latestSubmissionByChunk.set(key, submission);
                          });
                          const usefulChunkListsForAdmin = usefulChunkLists.map(
                            (list) => {
                              const chunks = list.chunks.map((chunk) => {
                                const submission = latestSubmissionByChunk.get(
                                  `${list.number}:${chunk}`,
                                );
                                return {
                                  chunk,
                                  submitted: Boolean(submission),
                                  sentence: submission?.sentence,
                                  submitted_at: submission?.submitted_at,
                                };
                              });
                              return {
                                number: list.number,
                                chunks,
                                submittedCount: chunks.filter(
                                  (chunk) => chunk.submitted,
                                ).length,
                                totalCount: chunks.length,
                              };
                            },
                          );
                          const listeningCompletions = progress
                            .filter(
                              (item) =>
                                item.activity_type === "listening" &&
                                item.difficulty_level.startsWith("listening:"),
                            )
                            .map((item) => {
                              const [, topicId, exerciseNumber] =
                                item.difficulty_level.split(":");
                              const topic = listeningTopics.find(
                                (entry) => entry.topic.id === topicId,
                              );
                              return {
                                ...item,
                                title: topic?.topic.title || "Listening topic",
                                level: topic?.listeningLevel || "1",
                                exerciseNumber,
                              };
                            });
                          const readingCompletions = progress
                            .filter(
                              (item) =>
                                item.activity_type === "reading" &&
                                item.difficulty_level.startsWith("reading:"),
                            )
                            .map((item) => {
                              const [, topicId, exerciseNumber] =
                                item.difficulty_level.split(":");
                              const topic = readingTopics.find(
                                (entry) => entry.topic.id === topicId,
                              );
                              return {
                                ...item,
                                title: topic?.topic.title || "Reading topic",
                                level: topic?.readingLevel || "1",
                                exerciseNumber,
                              };
                            });
                          db.all(
                            "SELECT id, topic_id, topic_title, submission_text, submitted_at, feedback, feedback_at FROM writing_submissions WHERE username = ? ORDER BY submitted_at DESC",
                            [student.username],
                            (writingError, writingSubmissions) => {
                              if (writingError)
                                return res
                                  .status(500)
                                  .send("Unable to load writing submissions.");
                              const groupTopicsByLevel = (topics, levelKey) => {
                                const levels = new Map();
                                topics.forEach((topic) => {
                                  const level = String(topic[levelKey] || "1");
                                  if (!levels.has(level)) {
                                    levels.set(level, {
                                      level,
                                      topics: [],
                                      completed: 0,
                                      total: 0,
                                    });
                                  }
                                  const levelData = levels.get(level);
                                  const completedExercises =
                                    topic.exercises.filter(
                                      (exercise) => exercise.completed,
                                    ).length;
                                  levelData.topics.push({
                                    title: topic.topic.title,
                                    status: topic.completed
                                      ? "Completed"
                                      : completedExercises
                                        ? "In Progress"
                                        : "Not Started",
                                    statusClass: topic.completed
                                      ? "completed"
                                      : completedExercises
                                        ? "in-progress"
                                        : "not-started",
                                    completedExercises,
                                    totalExercises: topic.exercises.length,
                                  });
                                  levelData.completed += completedExercises;
                                  levelData.total += topic.exercises.length;
                                });
                                return [...levels.values()].sort(
                                  (first, second) =>
                                    Number(first.level) - Number(second.level),
                                );
                              };
                              const decoratedReadingTopics = decorateTopics(
                                readingTopics,
                                progress,
                                "reading",
                                "readingLevel",
                              );
                              const decoratedWritingTopics = decorateTopics(
                                writingTopics,
                                progress,
                                "writing",
                                "writingLevel",
                              );
                              const decoratedListeningTopics = decorateTopics(
                                listeningTopics,
                                progress,
                                "listening",
                                "listeningLevel",
                              );
                              const grammarProgress = progress.filter((item) =>
                                ["questions", "final"].includes(
                                  item.activity_type,
                                ),
                              );
                              const grammarChapters =
                                practiceQuestionChapters.map((chapter) => {
                                  const exercises = chapter.exercises.map(
                                    (exercise, index) => {
                                      const completion = grammarProgress.find(
                                        (item) =>
                                          item.activity_type === "questions" &&
                                          item.difficulty_level ===
                                            `questions:${chapter.id}:${index + 1}`,
                                      );
                                      return {
                                        title: exercise.title,
                                        completed: Boolean(completion),
                                        score: completion?.percentage,
                                      };
                                    },
                                  );
                                  return {
                                    title: `Chapter ${chapter.chapterNumber}: ${chapter.unit}`,
                                    status: exercises.every(
                                      (exercise) => exercise.completed,
                                    )
                                      ? "Completed"
                                      : exercises.some(
                                            (exercise) => exercise.completed,
                                          )
                                        ? "In Progress"
                                        : "Not Started",
                                    statusClass: exercises.every(
                                      (exercise) => exercise.completed,
                                    )
                                      ? "completed"
                                      : exercises.some(
                                            (exercise) => exercise.completed,
                                          )
                                        ? "in-progress"
                                        : "not-started",
                                    showStatus: exercises.some(
                                      (exercise) => exercise.completed,
                                    ),
                                    exercises,
                                  };
                                });
                              const finalTestRows = grammarProgress.filter(
                                (item) => item.activity_type === "final",
                              );
                              res.render("teacher-student.handlebars", {
                                student,
                                profileCategory,
                                profileIsGrammar: profileCategory === "grammar",
                                profileIsReading: profileCategory === "reading",
                                profileIsActivity:
                                  profileCategory === "grammar",
                                profileIsVocabulary:
                                  profileCategory === "vocabulary",
                                profileIsWriting: profileCategory === "writing",
                                profileIsListening:
                                  profileCategory === "listening",
                                progress,
                                grammarStats: preparedStats.filter((stat) =>
                                  ["questions", "final"].includes(
                                    stat.activity_type,
                                  ),
                                ),
                                activityStats: preparedStats,
                                bestActivity: rankedStats[0],
                                needsFocus: rankedStats[rankedStats.length - 1],
                                usefulChunkSubmissions,
                                usefulChunkSubmissionCount:
                                  usefulChunkSubmissions.length,
                                usefulChunkListsForAdmin,
                                flipCompletions,
                                hardestWords,
                                listeningCompletions,
                                readingCompletions,
                                readingProgressLevels: groupTopicsByLevel(
                                  decoratedReadingTopics,
                                  "readingLevel",
                                ),
                                writingProgressLevels: groupTopicsByLevel(
                                  decoratedWritingTopics,
                                  "writingLevel",
                                ),
                                listeningProgressLevels: groupTopicsByLevel(
                                  decoratedListeningTopics,
                                  "listeningLevel",
                                ),
                                grammarChapters,
                                finalTestRows,
                                writingSubmissions: writingSubmissions.map(
                                  (submission) => {
                                    const topic = writingTopics.find(
                                      (entry) =>
                                        entry.topic.id === submission.topic_id,
                                    );
                                    return {
                                      ...submission,
                                      level: topic?.writingLevel || "2",
                                      needsFeedback: !submission.feedback,
                                    };
                                  },
                                ),
                                writingSubmissionCount:
                                  writingSubmissions.length,
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
    },
  );
});

app.post(
  "/teacher/student/:username/writing/:id/feedback",
  requireAdmin,
  (req, res) => {
    const feedback = String(req.body.feedback || "").trim();
    if (!feedback)
      return res.redirect(`/teacher/student/${req.params.username}`);
    db.run(
      "UPDATE writing_submissions SET feedback = ?, feedback_at = CURRENT_TIMESTAMP, feedback_seen = 0 WHERE id = ? AND username = ?",
      [feedback, req.params.id, req.params.username],
      () => res.redirect(`/teacher/student/${req.params.username}`),
    );
  },
);

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
