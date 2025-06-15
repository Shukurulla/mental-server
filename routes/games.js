import express from "express";
import { body, validationResult } from "express-validator";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import GameResult from "../models/GameResult.js";

const router = express.Router();

// Game types configuration
const GAME_TYPES = {
  numberMemory: {
    name: "Raqamni Eslab Qolish",
    description: "Ketma-ket ko'rsatiladigan raqamlarni eslab qoling",
    maxLevel: 20,
    scoreMultiplier: 10,
  },
  tileMemory: {
    name: "Plitkalar",
    description: "3x3 katakchalarning joyini eslab qoling",
    maxLevel: 15,
    scoreMultiplier: 15,
  },
  alphaNumMemory: {
    name: "Raqam va Harflar",
    description: "Raqam va harflar aralash ketma-ketlikni eslab qoling",
    maxLevel: 18,
    scoreMultiplier: 12,
  },
  schulteTable: {
    name: "Schulte Jadvali",
    description: "1-25 raqamlarini tartib bo'yicha toping",
    maxLevel: 10,
    scoreMultiplier: 20,
  },
  doubleSchulte: {
    name: "Ikkilangan Schulte",
    description: "Ikkita rangda raqamlarni navbatma-navbat toping",
    maxLevel: 8,
    scoreMultiplier: 25,
  },
  mathSystems: {
    name: "Hisoblash Tizimlari",
    description: "Logarifm, daraja va ildiz hisoblash",
    maxLevel: 12,
    scoreMultiplier: 18,
  },
  gcdLcm: {
    name: "EKUB va EKUK",
    description: "Eng katta umumiy bo'luvchi va karralini toping",
    maxLevel: 10,
    scoreMultiplier: 16,
  },
  fractions: {
    name: "Kasrlar",
    description: "Kasrlarni solishtiring va hisoblang",
    maxLevel: 12,
    scoreMultiplier: 14,
  },
  percentages: {
    name: "Foizlar",
    description: "Foiz masalalarini yeching",
    maxLevel: 15,
    scoreMultiplier: 12,
  },
  readingSpeed: {
    name: "O'qish Tezligi",
    description: "Matnni tez o'qing va tushunishni tekshiring",
    maxLevel: 20,
    scoreMultiplier: 8,
  },
  hideAndSeek: {
    name: "Berkinchoq",
    description: "Yashiringan raqamlarning joyini toping",
    maxLevel: 15,
    scoreMultiplier: 13,
  },
};

// @route   GET /api/games
// @desc    Get all available games
// @access  Public
router.get("/", (req, res) => {
  try {
    const games = Object.entries(GAME_TYPES).map(([key, game]) => ({
      id: key,
      ...game,
    }));

    res.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error("Get games error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/games/:gameType
// @desc    Get specific game info
// @access  Public
router.get("/:gameType", (req, res) => {
  try {
    const { gameType } = req.params;

    if (!GAME_TYPES[gameType]) {
      return res.status(404).json({
        success: false,
        message: "O'yin topilmadi",
      });
    }

    res.json({
      success: true,
      game: {
        id: gameType,
        ...GAME_TYPES[gameType],
      },
    });
  } catch (error) {
    console.error("Get game error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   POST /api/games/:gameType/start
// @desc    Start a game session
// @access  Private
router.post("/:gameType/start", auth, async (req, res) => {
  try {
    const { gameType } = req.params;
    const { level = 1, settings = {} } = req.body;

    if (!GAME_TYPES[gameType]) {
      return res.status(404).json({
        success: false,
        message: "O'yin topilmadi",
      });
    }

    // Generate game content based on type and level
    let gameContent;

    switch (gameType) {
      case "numberMemory":
        gameContent = generateNumberSequence(level);
        break;
      case "tileMemory":
        gameContent = generateTilePattern(level);
        break;
      case "alphaNumMemory":
        gameContent = generateAlphaNumSequence(level);
        break;
      case "schulteTable":
        gameContent = generateSchulteTable();
        break;
      case "doubleSchulte":
        gameContent = generateDoubleSchulte();
        break;
      case "mathSystems":
        gameContent = generateMathProblems(level);
        break;
      case "gcdLcm":
        gameContent = generateGcdLcmProblems(level);
        break;
      case "fractions":
        gameContent = generateFractionProblems(level);
        break;
      case "percentages":
        gameContent = generatePercentageProblems(level);
        break;
      case "readingSpeed":
        gameContent = generateReadingText(level);
        break;
      case "hideAndSeek":
        gameContent = generateHideAndSeekPattern(level);
        break;
      default:
        gameContent = {};
    }

    res.json({
      success: true,
      gameContent,
      gameInfo: GAME_TYPES[gameType],
      level,
      settings,
    });
  } catch (error) {
    console.error("Start game error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   POST /api/games/:gameType/submit
// @desc    Submit game result
// @access  Private
router.post(
  "/:gameType/submit",
  [
    auth,
    body("score").isNumeric().withMessage("Ball raqam bo'lishi kerak"),
    body("level")
      .isInt({ min: 1 })
      .withMessage("Daraja 1 dan katta bo'lishi kerak"),
    body("duration").isNumeric().withMessage("Vaqt raqam bo'lishi kerak"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validatsiya xatolari",
          errors: errors.array(),
        });
      }

      const { gameType } = req.params;
      const {
        score,
        level,
        duration,
        correctAnswers = 0,
        totalQuestions = 0,
        settings = {},
        gameData = {},
      } = req.body;

      if (!GAME_TYPES[gameType]) {
        return res.status(404).json({
          success: false,
          message: "O'yin topilmadi",
        });
      }

      // Create game result
      const gameResult = new GameResult({
        userId: req.user.userId,
        gameType,
        score,
        level,
        duration,
        correctAnswers,
        totalQuestions,
        settings,
        gameData,
      });

      await gameResult.save();

      // Update user stats
      const user = await User.findById(req.user.userId);
      const isTimeScore = [
        "schulteTable",
        "doubleSchulte",
        "readingSpeed",
      ].includes(gameType);
      user.updateGameStats(gameType, score, isTimeScore);
      await user.save();

      res.json({
        success: true,
        message: "Natija muvaffaqiyatli saqlandi",
        result: {
          score,
          level,
          duration,
          accuracy: gameResult.accuracy,
          newTotalScore: user.totalScore,
          newLevel: user.level,
        },
      });
    } catch (error) {
      console.error("Submit game error:", error);
      res.status(500).json({
        success: false,
        message: "Server xatosi",
      });
    }
  }
);

// Helper functions for generating game content
function generateNumberSequence(level) {
  const length = Math.min(3 + level, 15);
  const sequence = Array.from({ length }, () => Math.floor(Math.random() * 10));
  return { sequence, displayTime: Math.max(1000 - level * 50, 300) };
}

function generateTilePattern(level) {
  const patternSize = Math.min(2 + level, 9);
  const pattern = Array.from({ length: patternSize }, () =>
    Math.floor(Math.random() * 9)
  );
  return { pattern, displayTime: Math.max(2000 - level * 100, 500) };
}

function generateAlphaNumSequence(level) {
  const length = Math.min(3 + level, 12);
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const sequence = Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  );
  return { sequence, displayTime: Math.max(1200 - level * 60, 400) };
}

function generateSchulteTable() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  // Shuffle array
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return { table: numbers };
}

function generateDoubleSchulte() {
  const redNumbers = Array.from({ length: 13 }, (_, i) => i + 1);
  const blackNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

  // Shuffle both arrays
  [redNumbers, blackNumbers].forEach((arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  });

  return { redNumbers, blackNumbers };
}

function generateMathProblems(level) {
  const problems = [];
  const count = Math.min(5 + level, 15);

  for (let i = 0; i < count; i++) {
    const type = ["power", "root", "log"][Math.floor(Math.random() * 3)];
    let problem;

    switch (type) {
      case "power":
        const base = Math.floor(Math.random() * 10) + 2;
        const exp = Math.floor(Math.random() * 4) + 2;
        problem = {
          question: `${base}^${exp}`,
          answer: Math.pow(base, exp),
          type: "power",
        };
        break;
      case "root":
        const num = Math.pow(Math.floor(Math.random() * 10) + 2, 2);
        problem = {
          question: `√${num}`,
          answer: Math.sqrt(num),
          type: "root",
        };
        break;
      case "log":
        const logBase = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
        const result = Math.floor(Math.random() * 4) + 1;
        problem = {
          question: `log₍${logBase}₎(${Math.pow(logBase, result)})`,
          answer: result,
          type: "log",
        };
        break;
    }
    problems.push(problem);
  }

  return { problems };
}

function generateGcdLcmProblems(level) {
  const problems = [];
  const count = Math.min(3 + level, 10);

  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 50) + 10;
    const b = Math.floor(Math.random() * 50) + 10;
    const type = Math.random() > 0.5 ? "gcd" : "lcm";

    const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
    const lcm = (x, y) => (x * y) / gcd(x, y);

    problems.push({
      a,
      b,
      type,
      question: type === "gcd" ? `EKUB(${a}, ${b})` : `EKUK(${a}, ${b})`,
      answer: type === "gcd" ? gcd(a, b) : lcm(a, b),
    });
  }

  return { problems };
}

function generateFractionProblems(level) {
  const problems = [];
  const count = Math.min(3 + level, 8);

  for (let i = 0; i < count; i++) {
    const frac1 = {
      num: Math.floor(Math.random() * 9) + 1,
      den: Math.floor(Math.random() * 9) + 2,
    };
    const frac2 = {
      num: Math.floor(Math.random() * 9) + 1,
      den: Math.floor(Math.random() * 9) + 2,
    };

    const val1 = frac1.num / frac1.den;
    const val2 = frac2.num / frac2.den;

    problems.push({
      fraction1: frac1,
      fraction2: frac2,
      question: `${frac1.num}/${frac1.den} va ${frac2.num}/${frac2.den} ni solishtiring`,
      answer: val1 > val2 ? "first" : val1 < val2 ? "second" : "equal",
    });
  }

  return { problems };
}

function generatePercentageProblems(level) {
  const problems = [];
  const count = Math.min(3 + level, 10);

  for (let i = 0; i < count; i++) {
    const baseNumber = Math.floor(Math.random() * 900) + 100;
    const percentage = [5, 10, 15, 20, 25, 30, 40, 50][
      Math.floor(Math.random() * 8)
    ];
    const type = Math.random() > 0.5 ? "find_percent" : "find_whole";

    if (type === "find_percent") {
      problems.push({
        question: `${baseNumber} ning ${percentage}% ni toping`,
        answer: (baseNumber * percentage) / 100,
        type: "find_percent",
      });
    } else {
      const result = (baseNumber * percentage) / 100;
      problems.push({
        question: `${result} qaysi sonning ${percentage}% ini tashkil qiladi?`,
        answer: baseNumber,
        type: "find_whole",
      });
    }
  }

  return { problems };
}

function generateReadingText(level) {
  const texts = [
    "O'zbekiston Markaziy Osiyoda joylashgan davlat. Bu mamlakatning boy tarixi va madaniyati bor.",
    "Ilm-fan rivojlanishi uchun doimiy o'qish va o'rganish zarur. Bilim - eng qimmatli boylik hisoblanadi.",
    "Tabiat muhitini asrash har birimizning burchi. Biz kelajak avlodlar uchun toza muhit qoldirmelimiz.",
    "Sport insonning sog'lig'i uchun juda muhim. Muntazam jismoniy mashqlar immunitetni mustahkamlaydi.",
    "Matematik fanlar mantiqiy fikrlashni rivojlantiradi. Hisoblash qobiliyati kundalik hayotda zarur.",
  ];

  const text = texts[level % texts.length];
  const wordsCount = text.split(" ").length;
  const targetWPM = 150 + level * 10; // words per minute
  const timeLimit = Math.ceil((wordsCount / targetWPM) * 60 * 1000); // in milliseconds

  return {
    text,
    wordsCount,
    timeLimit,
    questions: [
      {
        question: "Matnning asosiy mavzusi nima?",
        options: ["Sport", "Ta'lim", "Tabiat", "Matematik"],
        correct: 1,
      },
    ],
  };
}

function generateHideAndSeekPattern(level) {
  const gridSize = Math.min(4 + Math.floor(level / 2), 8);
  const hiddenCount = Math.min(2 + level, gridSize);
  const hiddenPositions = [];

  while (hiddenPositions.length < hiddenCount) {
    const pos = Math.floor(Math.random() * (gridSize * gridSize));
    if (!hiddenPositions.includes(pos)) {
      hiddenPositions.push(pos);
    }
  }

  return {
    gridSize,
    hiddenPositions,
    displayTime: Math.max(3000 - level * 200, 1000),
  };
}

export default router;
