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
    const limit = parseInt(req.query.limit) || 10;

    const globalLeaderboard = await User.find({ isActive: true })
      .select("name avatar level totalScore gamesPlayed")
      .sort({ totalScore: -1, level: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: globalLeaderboard,
    });
  } catch (error) {
    console.error("Get global leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
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
router.get("/progress/:gameType", auth, async (req, res) => {
  try {
    const { gameType } = req.params;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get progress data
    const progressData = await GameResult.aggregate([
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
      { $sort: { "_id.date": 1 } },
    ]);

    // Get overall stats for this game type
    const overallStats = await GameResult.aggregate([
      { $match: { userId: req.user.userId, gameType } },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          bestScore: { $max: "$score" },
          avgScore: { $avg: "$score" },
          bestLevel: { $max: "$level" },
          totalTime: { $sum: "$duration" },
          avgAccuracy: { $avg: "$accuracy" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        progressData,
        overallStats: overallStats[0] || {},
        period: `${days} kun`,
      },
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

export default router;
