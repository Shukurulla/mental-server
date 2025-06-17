// routes/results.js - Global leaderboard endpointini to'liq qayta yozish
import express from "express";
import { body, validationResult } from "express-validator";
import auth from "../middleware/auth.js";
import GameResult from "../models/GameResult.js";
import User from "../models/User.js";

const router = express.Router();

// @route   GET /api/results/user/:gameType
// @desc    Get user's game results for specific game type
// @access  Private
router.get("/user/:gameType", auth, async (req, res) => {
  try {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const results = await GameResult.getUserHistory(
      req.user.userId,
      gameType,
      limit
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Get user results error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/user/all
// @desc    Get all user's game results
// @access  Private
router.get("/user/all", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const results = await GameResult.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("gameType score level duration accuracy createdAt");

    const total = await GameResult.countDocuments({ userId: req.user.userId });

    res.json({
      success: true,
      data: {
        results,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get all user results error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/leaderboard/:gameType
// @desc    Get leaderboard for specific game type
// @access  Public
router.get("/leaderboard/:gameType", async (req, res) => {
  try {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await GameResult.getLeaderboard(gameType, limit);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/leaderboard/global
// @desc    Get global leaderboard (all games combined)
// @access  Public
router.get("/leaderboard/global", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    console.log("Global leaderboard so'raldi, limit:", limit);

    // Avval User collection'da ma'lumot borligini tekshiramiz
    const totalUsersCount = await User.countDocuments({ isActive: true });
    console.log("Jami faol foydalanuvchilar soni:", totalUsersCount);

    if (totalUsersCount === 0) {
      console.log("Faol foydalanuvchilar topilmadi");
      return res.json({
        success: true,
        data: [],
        message: "Hali faol foydalanuvchilar yo'q",
      });
    }

    // Oddiy query bilan barcha faol userlarni olish
    const users = await User.find({ isActive: true })
      .select(
        "name email avatar totalScore level gamesPlayed rankingScore averageScore streak createdAt"
      )
      .sort({ totalScore: -1, level: -1, gamesPlayed: -1 })
      .limit(limit)
      .lean(); // .lean() performance uchun

    console.log("Topilgan userlar soni:", users.length);
    console.log("Birinchi user:", users[0]);

    // Ranking score hisoblash va rank qo'shish
    const rankedUsers = users.map((user, index) => {
      // Agar rankingScore yo'q bo'lsa, hisoblash
      const rankingScore = user.rankingScore || calculateRankingScore(user);

      return {
        _id: user._id,
        name: user.name || "Noma'lum foydalanuvchi",
        avatar: user.avatar || null,
        totalScore: user.totalScore || 0,
        level: user.level || 1,
        gamesPlayed: user.gamesPlayed || 0,
        rankingScore: rankingScore,
        averageScore: user.averageScore || 0,
        streak: user.streak || 0,
        rank: index + 1,
      };
    });

    console.log("Qaytarilayotgan ma'lumotlar:", rankedUsers.slice(0, 3));

    res.json({
      success: true,
      data: rankedUsers,
      total: totalUsersCount,
    });
  } catch (error) {
    console.error("Global leaderboard xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + error.message,
      data: [],
    });
  }
});

// @route   GET /api/results/stats
// @desc    Get user's statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Get recent results
    const recentResults = await GameResult.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("gameType score level duration createdAt");

    // Get best scores for each game type
    const bestScores = await GameResult.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: "$gameType",
          bestScore: { $max: "$score" },
          gamesPlayed: { $sum: 1 },
          avgScore: { $avg: "$score" },
          bestLevel: { $max: "$level" },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]);

    // Get user rank
    const userRank =
      (await User.countDocuments({
        totalScore: { $gt: user.totalScore },
      })) + 1;

    res.json({
      success: true,
      data: {
        user,
        recentResults,
        bestScores,
        userRank,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/progress/:gameType
// @desc    Get user's progress for specific game type
// @access  Private
router.get("/leaderboard/global", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Aniq ranking algoritmi
    const globalLeaderboard = await User.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          // Ranking formulasi: totalScore * 0.7 + level * 100 + gamesPlayed * 2
          rankingScore: {
            $add: [
              { $multiply: ["$totalScore", 0.7] },
              { $multiply: ["$level", 100] },
              { $multiply: ["$gamesPlayed", 2] },
            ],
          },
        },
      },
      {
        $sort: {
          rankingScore: -1,
          totalScore: -1,
          level: -1,
          gamesPlayed: -1,
          _id: 1, // Consistent sorting
        },
      },
      { $limit: limit },
      {
        $project: {
          name: 1,
          avatar: 1,
          totalScore: 1,
          level: 1,
          gamesPlayed: 1,
          rankingScore: 1,
        },
      },
    ]);

    // Add rank numbers
    const rankedLeaderboard = globalLeaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
    console.log(globalLeaderboard);

    res.json({
      success: true,
      data: rankedLeaderboard,
    });
  } catch (error) {
    console.error("Get global leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   POST /api/results/compare
// @desc    Compare user's performance with others
// @access  Private
router.post("/compare", auth, async (req, res) => {
  try {
    const { gameType, metric = "score" } = req.body;

    // Get user's best performance
    const userBest = await GameResult.findOne({
      userId: req.user.userId,
      gameType,
    }).sort({ [metric]: -1 });

    if (!userBest) {
      return res.status(404).json({
        success: false,
        message: "Bu o'yin uchun natijalaringiz topilmadi",
      });
    }

    // Get percentile ranking
    const betterCount = await GameResult.countDocuments({
      gameType,
      [metric]: { $gt: userBest[metric] },
    });

    const totalCount = await GameResult.countDocuments({ gameType });
    const percentile =
      totalCount > 0
        ? Math.round(((totalCount - betterCount) / totalCount) * 100)
        : 0;

    // Get average performance
    const avgPerformance = await GameResult.aggregate([
      { $match: { gameType } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$score" },
          avgDuration: { $avg: "$duration" },
          avgAccuracy: { $avg: "$accuracy" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        userPerformance: userBest,
        percentile,
        avgPerformance: avgPerformance[0] || {},
        comparison: {
          scoreVsAvg: userBest.score - (avgPerformance[0]?.avgScore || 0),
          durationVsAvg:
            userBest.duration - (avgPerformance[0]?.avgDuration || 0),
          accuracyVsAvg:
            userBest.accuracy - (avgPerformance[0]?.avgAccuracy || 0),
        },
      },
    });
  } catch (error) {
    console.error("Compare performance error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/achievements
// @desc    Get user's achievements
// @access  Private
router.get("/achievements", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "achievements gameStats totalScore level"
    );

    // Calculate potential new achievements
    const newAchievements = [];

    // Total score achievements
    const scoreThresholds = [1000, 5000, 10000, 25000, 50000, 100000];
    for (const threshold of scoreThresholds) {
      if (user.totalScore >= threshold) {
        const achievement = {
          name: `Toplam ${threshold} Ball`,
          description: `${threshold} ball to'plash yutuqi`,
          icon: "🏆",
          category: "score",
          unlockedAt: new Date(),
        };

        // Check if user already has this achievement
        const hasAchievement = user.achievements.some(
          (a) => a.name === achievement.name
        );
        if (!hasAchievement) {
          newAchievements.push(achievement);
        }
      }
    }

    // Level achievements
    const levelThresholds = [5, 10, 20, 50, 100];
    for (const threshold of levelThresholds) {
      if (user.level >= threshold) {
        const achievement = {
          name: `${threshold}-daraja`,
          description: `${threshold}-darajaga yetish yutuqi`,
          icon: "⭐",
          category: "level",
          unlockedAt: new Date(),
        };

        const hasAchievement = user.achievements.some(
          (a) => a.name === achievement.name
        );
        if (!hasAchievement) {
          newAchievements.push(achievement);
        }
      }
    }

    // Game-specific achievements
    Object.entries(user.gameStats).forEach(([gameType, stats]) => {
      if (stats.gamesPlayed >= 10) {
        const achievement = {
          name: `${gameType} Mutaxassisi`,
          description: `${gameType} o'yinida 10 marta o'ynash`,
          icon: "🎮",
          category: "games",
          unlockedAt: new Date(),
        };

        const hasAchievement = user.achievements.some(
          (a) => a.name === achievement.name
        );
        if (!hasAchievement) {
          newAchievements.push(achievement);
        }
      }
    });

    // Add new achievements to user
    if (newAchievements.length > 0) {
      user.achievements.push(...newAchievements);
      await user.save();
    }

    res.json({
      success: true,
      data: {
        achievements: user.achievements,
        newAchievements,
      },
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   DELETE /api/results/:id
// @desc    Delete specific game result (user can only delete their own)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const gameResult = await GameResult.findById(req.params.id);

    if (!gameResult) {
      return res.status(404).json({
        success: false,
        message: "Natija topilmadi",
      });
    }

    // Check if user owns this result
    if (gameResult.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Bu natijani o'chirish huquqingiz yo'q",
      });
    }

    await GameResult.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Natija muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    console.error("Delete result error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   GET /api/results/analytics/personal
// @desc    Get personal analytics
// @access  Private
router.get("/analytics/personal", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Games played over time
    const gamesOverTime = await GameResult.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
      { $sort: { "_id.date": 1 } },
      { $limit: 30 },
    ]);

    // Performance by game type
    const performanceByGame = await GameResult.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$gameType",
          avgScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          gamesPlayed: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
          improvement: {
            $avg: {
              $subtract: ["$score", { $avg: "$score" }],
            },
          },
        },
      },
    ]);

    // Best streaks
    const bestStreaks = await GameResult.find({ userId })
      .sort({ createdAt: 1 })
      .select("gameType score createdAt");

    res.json({
      success: true,
      data: {
        gamesOverTime,
        performanceByGame,
        totalResults: bestStreaks.length,
      },
    });
  } catch (error) {
    console.error("Personal analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});
router.get("/debug-users", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const sampleUsers = await User.find()
      .limit(5)
      .select("name email isActive totalScore level gamesPlayed");

    res.json({
      success: true,
      debug: {
        totalUsers,
        activeUsers,
        sampleUsers,
        databaseConnected: true,
      },
    });
  } catch (error) {
    console.error("Debug xatosi:", error);
    res.json({
      success: false,
      debug: {
        error: error.message,
        databaseConnected: false,
      },
    });
  }
});

router.post("/create-sample-users", async (req, res) => {
  try {
    // Faqat development environmentda ishlash
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Bu endpoint faqat development uchun",
      });
    }

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.json({
        success: true,
        message: "Userlar allaqachon mavjud",
        count: existingUsers,
      });
    }

    // Sample userlar
    const sampleUsers = [
      {
        name: "Aziz Rahmonov",
        email: "aziz@test.com",
        password: "123456",
        totalScore: 15000,
        level: 16,
        gamesPlayed: 50,
        averageScore: 300,
        streak: 12,
        isActive: true,
      },
      {
        name: "Malika Toshmatova",
        email: "malika@test.com",
        password: "123456",
        totalScore: 12000,
        level: 13,
        gamesPlayed: 40,
        averageScore: 300,
        streak: 8,
        isActive: true,
      },
      {
        name: "Bobur Akramov",
        email: "bobur@test.com",
        password: "123456",
        totalScore: 10000,
        level: 11,
        gamesPlayed: 35,
        averageScore: 285,
        streak: 5,
        isActive: true,
      },
      {
        name: "Zarina Karimova",
        email: "zarina@test.com",
        password: "123456",
        totalScore: 8000,
        level: 9,
        gamesPlayed: 30,
        averageScore: 266,
        streak: 3,
        isActive: true,
      },
      {
        name: "Jasur Nazarov",
        email: "jasur@test.com",
        password: "123456",
        totalScore: 6000,
        level: 7,
        gamesPlayed: 25,
        averageScore: 240,
        streak: 2,
        isActive: true,
      },
    ];

    // Userlarni yaratish
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push({
        name: user.name,
        totalScore: user.totalScore,
        level: user.level,
      });
    }

    res.json({
      success: true,
      message: "Sample userlar yaratildi",
      users: createdUsers,
    });
  } catch (error) {
    console.error("Sample userlar yaratishda xato:", error);
    res.status(500).json({
      success: false,
      message: "Xato: " + error.message,
    });
  }
});
function calculateRankingScore(user) {
  const totalScore = user.totalScore || 0;
  const level = user.level || 1;
  const gamesPlayed = user.gamesPlayed || 0;
  const averageScore = user.averageScore || 0;
  const streak = user.streak || 0;

  return Math.round(
    totalScore * 0.5 +
      level * 150 +
      gamesPlayed * 3 +
      averageScore * 0.3 +
      streak * 10
  );
}

export default router;
