import express from "express";
import { body, validationResult } from "express-validator";
import auth from "../middleware/auth.js";
import GameResult from "../models/GameResult.js";
import User from "../models/User.js";
import mongoose from "mongoose";

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
      .select(
        "gameType score level duration accuracy createdAt gameRankingScore"
      );

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
    const limit = parseInt(req.query.limit) || 50;

    console.log(`Getting leaderboard for ${gameType}, limit: ${limit}`);

    // VALIDATION OLIB TASHLANDI - har qanday gameType qabul qilamiz

    // Avval o'sha o'yin turida natija bor foydalanuvchilarni topamiz
    const gameResults = await GameResult.find({ gameType })
      .populate("userId", "name avatar level")
      .sort({ score: -1 })
      .limit(limit * 3); // Ko'proq olish, keyin eng yaxshisini tanlaymiz

    console.log(`Found ${gameResults.length} game results for ${gameType}`);

    if (gameResults.length === 0) {
      // Agar bu o'yin turi uchun natija yo'q bo'lsa
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: `${gameType} o'yini uchun hali natijalar yo'q`,
      });
    }

    // Har bir foydalanuvchining eng yaxshi natijasini olish
    const userBestScores = {};

    for (const result of gameResults) {
      if (!result.userId) continue; // populate bo'lmagan holatlar uchun

      const userId = result.userId._id.toString();

      if (
        !userBestScores[userId] ||
        result.score > userBestScores[userId].bestScore
      ) {
        userBestScores[userId] = {
          _id: result.userId._id,
          id: result.userId._id,
          name: result.userId.name || "Noma'lum foydalanuvchi",
          avatar: result.userId.avatar,
          level: result.userId.level || 1,
          bestScore: result.score || 0,
          gameRankingScore: result.gameRankingScore || 0,
          lastPlayed: result.createdAt,
        };
      }
    }

    // Massivga aylantirib, saralash
    const leaderboard = Object.values(userBestScores)
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, limit);

    // Rank qo'shish
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      totalScore: user.bestScore,
      gamesPlayed: 1, // Bu yerda aniq raqam bo'lishi kerak, lekin soddalik uchun 1
      averageScore: user.bestScore,
    }));

    console.log(
      `Returning ${rankedLeaderboard.length} users for ${gameType} leaderboard`
    );

    res.json({
      success: true,
      data: rankedLeaderboard,
      total: rankedLeaderboard.length,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + error.message,
      data: [],
    });
  }
});

// results.js - Soddalashtirilgan versiya

// @route   GET /api/results/leaderboard/global
// @desc    Get global leaderboard (all games combined) - SODDA VERSIYA
// @access  Public

router.get("/leaderboard/global", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    console.log("Getting global leaderboard, limit:", limit);

    // ODDIY USUL: Faqat userlarni olish
    const users = await User.find()
      .sort({
        totalScore: -1, // Eng yuqori ball bo'yicha
        level: -1, // Keyin daraja bo'yicha
        gamesPlayed: -1, // Keyin o'yinlar soni bo'yicha
      })
      .limit(limit);
    console.log(users);

    // Oddiy rank qo'shish
    const rankedUsers = users.map((user, index) => ({
      _id: user._id,
      id: user._id,
      rank: index + 1,
      name: user.name || "Foydalanuvchi",
      avatar: user.avatar,
      level: user.level || 1,
      totalScore: user.totalScore || 0,
      gamesPlayed: user.gamesPlayed || 0,
      rankingScore: user.rankingScore || 0,
      averageScore:
        user.gamesPlayed > 0
          ? Math.round(user.totalScore / user.gamesPlayed)
          : 0,
      streak: user.streak || 0,
    }));
    console.log(users);

    console.log(`Returning ${rankedUsers.length} users for global leaderboard`);

    res.json({
      success: true,
      data: rankedUsers,
      total: rankedUsers.length,
    });
  } catch (error) {
    console.error("Global leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + error.message,
      data: [],
    });
  }
});

// @route   GET /api/results/leaderboard/:gameType
// @desc    Get leaderboard for specific game type - SODDA VERSIYA
// @access  Public
router.get("/leaderboard/:gameType", async (req, res) => {
  try {
    const { gameType } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`Getting leaderboard for ${gameType}, limit: ${limit}`);

    // Avval o'sha o'yin turida natija bor foydalanuvchilarni topamiz
    const gameResults = await GameResult.find({ gameType })
      .populate("userId", "name avatar level")
      .sort({ score: -1 })
      .limit(limit);

    console.log(`Found ${gameResults.length} game results for ${gameType}`);

    // Har bir foydalanuvchining eng yaxshi natijasini olish
    const userBestScores = {};

    for (const result of gameResults) {
      const userId = result.userId._id.toString();

      if (
        !userBestScores[userId] ||
        result.score > userBestScores[userId].score
      ) {
        userBestScores[userId] = {
          _id: result.userId._id,
          id: result.userId._id,
          name: result.userId.name,
          avatar: result.userId.avatar,
          level: result.userId.level,
          bestScore: result.score,
          gameRankingScore: result.gameRankingScore || 0,
        };
      }
    }

    // Massivga aylantirib, saralash
    const leaderboard = Object.values(userBestScores)
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, limit);

    // Rank qo'shish
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      totalScore: user.bestScore,
      gamesPlayed: 1, // Bu yerda aniq raqam bo'lishi kerak, lekin soddalik uchun 1
      averageScore: user.bestScore,
    }));

    console.log(
      `Returning ${rankedLeaderboard.length} users for ${gameType} leaderboard`
    );

    res.json({
      success: true,
      data: rankedLeaderboard,
      total: rankedLeaderboard.length,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + error.message,
      data: [],
    });
  }
});

// @route   GET /api/results/check-data
// @desc    Ma'lumotlar bazasini tekshirish
// @access  Public
router.get("/check-data", async (req, res) => {
  try {
    // Oddiy hisoblar
    const totalUsers = await User.countDocuments();
    const totalGameResults = await GameResult.countDocuments();

    // Eng yuqori ballli foydalanuvchilar
    const topUsers = await User.find()
      .select("name totalScore gamesPlayed")
      .sort({ totalScore: -1 })
      .limit(5);

    // Eng ko'p o'ynagan foydalanuvchilar
    const activeUsers = await User.find({ gamesPlayed: { $gt: 0 } })
      .select("name gamesPlayed totalScore")
      .sort({ gamesPlayed: -1 })
      .limit(5);

    // O'yin natijalar bo'yicha
    const gameTypes = await GameResult.distinct("gameType");

    res.json({
      success: true,
      data: {
        totalUsers,
        totalGameResults,
        topUsers,
        activeUsers,
        gameTypes,
        hasData: totalUsers > 0 && totalGameResults > 0,
      },
    });
  } catch (error) {
    console.error("Check data error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + error.message,
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
      .select("gameType score level duration createdAt gameRankingScore");

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
          gameRankingScore: { $max: "$gameRankingScore" },
          lastPlayed: { $max: "$createdAt" },
        },
      },
    ]);

    // Get user rank in global leaderboard
    const higherRankedCount = await User.countDocuments({
      rankingScore: { $gt: user.rankingScore || 0 },
      isActive: { $ne: false },
      gamesPlayed: { $gt: 0 },
    });
    const userRank = higherRankedCount + 1;

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
router.get("/progress/:gameType", auth, async (req, res) => {
  try {
    const { gameType } = req.params;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's progress over time
    const progress = await GameResult.aggregate([
      {
        $match: {
          userId: req.user.userId,
          gameType,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          avgScore: { $avg: "$score" },
          maxScore: { $max: "$score" },
          gamesPlayed: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
          avgAccuracy: { $avg: "$accuracy" },
        },
      },
      {
        $project: {
          date: "$_id.date",
          avgScore: { $round: ["$avgScore", 2] },
          maxScore: 1,
          gamesPlayed: 1,
          avgDuration: { $round: ["$avgDuration", 2] },
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("Get progress error:", error);
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
      "achievements gameStats totalScore level gamesPlayed"
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

    // Games played achievements
    const gamesThresholds = [10, 50, 100, 500, 1000];
    for (const threshold of gamesThresholds) {
      if (user.gamesPlayed >= threshold) {
        const achievement = {
          name: `${threshold} O'yin`,
          description: `${threshold} ta o'yin o'ynash yutuqi`,
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
    }

    // Game-specific achievements
    Object.entries(user.gameStats).forEach(([gameType, stats]) => {
      if (stats.gamesPlayed >= 10) {
        const achievement = {
          name: `${gameType} Mutaxassisi`,
          description: `${gameType} o'yinida 10 marta o'ynash`,
          icon: "🎯",
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
    const userId = new mongoose.Types.ObjectId(req.user.userId);

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
          totalScore: { $sum: "$score" },
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
          totalScore: { $sum: "$score" },
          avgAccuracy: { $avg: "$accuracy" },
          gameRankingScore: { $max: "$gameRankingScore" },
        },
      },
      {
        $project: {
          gameType: "$_id",
          avgScore: { $round: ["$avgScore", 2] },
          bestScore: 1,
          gamesPlayed: 1,
          avgDuration: { $round: ["$avgDuration", 2] },
          totalScore: 1,
          avgAccuracy: { $round: ["$avgAccuracy", 2] },
          gameRankingScore: 1,
        },
      },
    ]);

    // Best streaks and improvement trends
    const recentResults = await GameResult.find({ userId })
      .sort({ createdAt: 1 })
      .select("gameType score createdAt duration accuracy")
      .limit(100);

    res.json({
      success: true,
      data: {
        gamesOverTime,
        performanceByGame,
        totalResults: recentResults.length,
        recentTrend: recentResults.slice(-10), // Last 10 games
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

// @route   GET /api/results/game-analytics/:gameType
// @desc    Get analytics for specific game type
// @access  Public
router.get("/game-analytics/:gameType", async (req, res) => {
  try {
    const { gameType } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Get basic stats
    const basicStats = await GameResult.getGameAnalytics(gameType);

    // Get performance over time
    const performanceOverTime = await GameResult.getPerformanceOverTime(
      gameType,
      days
    );

    // Get level distribution
    const levelDistribution = await GameResult.getLevelDistribution(gameType);

    res.json({
      success: true,
      data: {
        basicStats: basicStats[0] || {},
        performanceOverTime,
        levelDistribution,
      },
    });
  } catch (error) {
    console.error("Game analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   POST /api/results/update-ranking-scores
// @desc    Update all users' ranking scores (admin only or migration)
// @access  Private
router.post("/update-ranking-scores", auth, async (req, res) => {
  try {
    console.log("Starting ranking scores update...");

    // Get all users
    const users = await User.find({ gamesPlayed: { $gt: 0 } });
    let updatedCount = 0;

    for (const user of users) {
      const oldRankingScore = user.rankingScore || 0;

      // Calculate new ranking score
      const totalScore = user.totalScore || 0;
      const level = user.level || 1;
      const gamesPlayed = user.gamesPlayed || 0;
      const averageScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;
      const streak = user.streak || 0;

      const newRankingScore = Math.round(
        totalScore * 0.5 +
          level * 150 +
          gamesPlayed * 3 +
          averageScore * 0.3 +
          streak * 10
      );

      // Update if different
      if (newRankingScore !== oldRankingScore) {
        await User.findByIdAndUpdate(user._id, {
          rankingScore: newRankingScore,
        });
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} users' ranking scores`);

    res.json({
      success: true,
      message: `${updatedCount} foydalanuvchining reyting ballari yangilandi`,
      updatedCount,
    });
  } catch (error) {
    console.error("Update ranking scores error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

export default router;
