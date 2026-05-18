const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "puzzles.db");

const seedPuzzles = [
  {
    id: "number-01",
    type: "number",
    difficulty: "easy",
    question: "找规律：2，4，8，16，下一项是多少？",
    answer: "32",
    acceptedAnswers: ["32", "三十二"],
    explanation: "每一项都是前一项乘以 2，所以 16 的下一项是 32。"
  },
  {
    id: "number-02",
    type: "number",
    difficulty: "easy",
    question: "找规律：1，4，9，16，下一项是多少？",
    answer: "25",
    acceptedAnswers: ["25", "二十五"],
    explanation: "这是平方数列，分别是 1^2、2^2、3^2、4^2，下一项是 5^2 = 25。"
  },
  {
    id: "number-03",
    type: "number",
    difficulty: "medium",
    question: "找规律：3，6，11，18，下一项是多少？",
    answer: "27",
    acceptedAnswers: ["27", "二十七"],
    explanation: "相邻差值分别是 3、5、7，按连续奇数递增，下一次加 9，所以答案是 27。"
  },
  {
    id: "number-04",
    type: "number",
    difficulty: "medium",
    question: "小明把一个数加 5 再乘 2，结果是 26。原来的数是多少？",
    answer: "8",
    acceptedAnswers: ["8", "八"],
    explanation: "设原数为 x，则 (x + 5) × 2 = 26，所以 x + 5 = 13，原数是 8。"
  },
  {
    id: "number-05",
    type: "number",
    difficulty: "hard",
    question: "一只蜗牛白天向上爬 5 米，晚上滑下 2 米。井深 17 米，它第几天能爬出来？",
    answer: "5",
    acceptedAnswers: ["5", "五", "第5天", "第五天"],
    explanation: "前 4 天结束时净爬升 12 米，第 5 天白天再爬 5 米到 17 米，当天就出井，不再下滑。"
  },
  {
    id: "logic-01",
    type: "logic",
    difficulty: "easy",
    question: "有 3 个开关控制另一个房间里的 1 盏灯，只能进那个房间看 1 次。至少要先操作几个开关，才能判断哪个开关控制灯？",
    answer: "2",
    acceptedAnswers: ["2", "两个", "二"],
    explanation: "先开第一个开关一会儿再关掉，再开第二个开关，进入房间后：灯亮是第二个，灯灭但发热是第一个，灯灭且不热是第三个。"
  },
  {
    id: "logic-02",
    type: "logic",
    difficulty: "medium",
    question: "一个篮子里有 5 个苹果，要分给 5 个小朋友，并且篮子里还要剩 1 个苹果，怎么分？",
    answer: "最后一个连篮子一起给",
    acceptedAnswers: [
      "最后一个连篮子一起给",
      "把最后一个苹果连篮子一起给最后一个小朋友",
      "最后一个小朋友拿走装着苹果的篮子"
    ],
    explanation: "前 4 个小朋友各拿 1 个，最后 1 个苹果放在篮子里，连篮子一起给第 5 个小朋友。"
  },
  {
    id: "logic-03",
    type: "logic",
    difficulty: "medium",
    question: "两个爸爸和两个儿子一起去钓鱼，结果一共只钓到 3 条鱼，却保证每人都有 1 条。这是怎么回事？",
    answer: "其实只有三个人",
    acceptedAnswers: ["其实只有三个人", "祖孙三人", "爷爷爸爸儿子", "爷孙三人"],
    explanation: "这三个人分别是爷爷、爸爸、儿子。爷爷和爸爸是两个爸爸，爸爸和儿子是两个儿子，所以总共其实只有 3 人。"
  },
  {
    id: "logic-04",
    type: "logic",
    difficulty: "hard",
    question: "医生给你开了 3 片药，要求每半小时吃 1 片，最短多久能吃完？",
    answer: "1小时",
    acceptedAnswers: ["1小时", "一个小时", "60分钟"],
    explanation: "第一片立刻吃，半小时后吃第二片，再过半小时吃第三片，所以从开始到吃完只需 1 小时。"
  },
  {
    id: "logic-05",
    type: "logic",
    difficulty: "hard",
    question: "今天是星期日，100 天后是星期几？",
    answer: "星期二",
    acceptedAnswers: ["星期二", "周二", "礼拜二"],
    explanation: "100 除以 7 余 2，所以在星期日基础上往后推 2 天，是星期二。"
  },
  {
    id: "word-01",
    type: "word",
    difficulty: "easy",
    question: "什么东西越洗越脏？",
    answer: "水",
    acceptedAnswers: ["水"],
    explanation: "水本来是拿来洗东西的，但洗过之后自己反而会变脏。"
  },
  {
    id: "word-02",
    type: "word",
    difficulty: "easy",
    question: "什么门永远关不上？",
    answer: "球门",
    acceptedAnswers: ["球门"],
    explanation: "球门是体育比赛中的门，不是用来开关的门，所以说它永远关不上。"
  },
  {
    id: "word-03",
    type: "word",
    difficulty: "medium",
    question: "什么东西明明是你的，别人却比你用得更多？",
    answer: "名字",
    acceptedAnswers: ["名字", "你的名字"],
    explanation: "别人称呼你时会经常用到你的名字，而你自己反而不常说自己的名字。"
  },
  {
    id: "word-04",
    type: "word",
    difficulty: "medium",
    question: "什么东西有头有尾，却没有身体？",
    answer: "硬币",
    acceptedAnswers: ["硬币", "一枚硬币"],
    explanation: "硬币常被形容成有头有尾，但当然没有身体。"
  },
  {
    id: "word-05",
    type: "word",
    difficulty: "hard",
    question: "什么东西打破了大家都叫好？",
    answer: "纪录",
    acceptedAnswers: ["纪录", "记录", "世界纪录"],
    explanation: "这里的“打破”指的是刷新纪录，所以大家会叫好。"
  },
  {
    id: "word-06",
    type: "word",
    difficulty: "hard",
    question: "什么东西看不见、摸不着，但一旦失去，很多人会很着急？",
    answer: "时间",
    acceptedAnswers: ["时间"],
    explanation: "时间没有实体，但一旦来不及、错过了，大家就会很着急。"
  }
];

function openDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  return new DatabaseSync(dbPath);
}

function mapRow(row) {
  return {
    id: row.id,
    type: row.type,
    difficulty: row.difficulty,
    question: row.question,
    answer: row.answer,
    acceptedAnswers: JSON.parse(row.accepted_answers),
    explanation: row.explanation
  };
}

function normalizeAcceptedAnswers(acceptedAnswers) {
  if (!Array.isArray(acceptedAnswers)) {
    return [];
  }

  return acceptedAnswers
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function validatePuzzleInput(puzzle) {
  const normalizedPuzzle = {
    id: String(puzzle.id || "").trim(),
    type: String(puzzle.type || "").trim(),
    difficulty: String(puzzle.difficulty || "").trim(),
    question: String(puzzle.question || "").trim(),
    answer: String(puzzle.answer || "").trim(),
    acceptedAnswers: normalizeAcceptedAnswers(puzzle.acceptedAnswers),
    explanation: String(puzzle.explanation || "").trim()
  };

  if (!normalizedPuzzle.id) {
    throw new Error("题目 ID 不能为空");
  }

  if (!["number", "logic", "word"].includes(normalizedPuzzle.type)) {
    throw new Error("题型不合法");
  }

  if (!["easy", "medium", "hard"].includes(normalizedPuzzle.difficulty)) {
    throw new Error("难度不合法");
  }

  if (!normalizedPuzzle.question) {
    throw new Error("题目内容不能为空");
  }

  if (!normalizedPuzzle.answer) {
    throw new Error("标准答案不能为空");
  }

  if (!normalizedPuzzle.explanation) {
    throw new Error("题目解析不能为空");
  }

  if (normalizedPuzzle.acceptedAnswers.length === 0) {
    normalizedPuzzle.acceptedAnswers = [normalizedPuzzle.answer];
  }

  return normalizedPuzzle;
}

function ensureDatabase() {
  const db = openDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS puzzles (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      accepted_answers TEXT NOT NULL,
      explanation TEXT NOT NULL
    )
  `);

  const countRow = db.prepare("SELECT COUNT(*) AS count FROM puzzles").get();

  if (countRow.count === 0) {
    const insert = db.prepare(`
      INSERT INTO puzzles (
        id,
        type,
        difficulty,
        question,
        answer,
        accepted_answers,
        explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");

    try {
      for (const puzzle of seedPuzzles) {
        insert.run(
          puzzle.id,
          puzzle.type,
          puzzle.difficulty,
          puzzle.question,
          puzzle.answer,
          JSON.stringify(puzzle.acceptedAnswers),
          puzzle.explanation
        );
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }

  db.close();
}

function listPuzzles() {
  const db = openDatabase();
  const rows = db.prepare(`
    SELECT
      id,
      type,
      difficulty,
      question,
      answer,
      accepted_answers,
      explanation
    FROM puzzles
    ORDER BY id
  `).all();

  db.close();

  return rows.map(mapRow);
}

function savePuzzle(puzzle) {
  const normalizedPuzzle = validatePuzzleInput(puzzle);
  const db = openDatabase();
  const saveStatement = db.prepare(`
    INSERT INTO puzzles (
      id,
      type,
      difficulty,
      question,
      answer,
      accepted_answers,
      explanation
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      difficulty = excluded.difficulty,
      question = excluded.question,
      answer = excluded.answer,
      accepted_answers = excluded.accepted_answers,
      explanation = excluded.explanation
  `);

  saveStatement.run(
    normalizedPuzzle.id,
    normalizedPuzzle.type,
    normalizedPuzzle.difficulty,
    normalizedPuzzle.question,
    normalizedPuzzle.answer,
    JSON.stringify(normalizedPuzzle.acceptedAnswers),
    normalizedPuzzle.explanation
  );

  const savedRow = db.prepare(`
    SELECT
      id,
      type,
      difficulty,
      question,
      answer,
      accepted_answers,
      explanation
    FROM puzzles
    WHERE id = ?
  `).get(normalizedPuzzle.id);

  db.close();

  return mapRow(savedRow);
}

module.exports = {
  dbPath,
  ensureDatabase,
  listPuzzles,
  savePuzzle,
  validatePuzzleInput
};
