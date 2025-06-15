import User from "../models/User.js";
import GameResult from "../models/GameResult.js";

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });

    // Game statistics
    const totalGames = await GameResult.countDocuments();
    const gamesThisWeek = await GameResult.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const gamesThisMonth = await GameResult.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });

    // Top scores
    const topScore = await GameResult.findOne()
      .sort({ score: -1 })
      .select("score");
    const avgScore = await GameResult.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" } } },
    ]);

    // Popular games
    const popularGames = await GameResult.aggregate([
      {
        $group: {
          _id: "$gameType",
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // User activity over time
    const userActivity = await GameResult.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          gamesPlayed: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
        },
      },
      {
        $project: {
          date: "$_id.date",
          gamesPlayed: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
      { $sort: { "_id.date": -1 } },
      { $limit: 30 },
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
        },
        games: {
          total: totalGames,
          thisWeek: gamesThisWeek,
          thisMonth: gamesThisMonth,
        },
        scores: {
          highest: topScore?.score || 0,
          average: Math.round(avgScore[0]?.avgScore || 0),
        },
        popularGames,
        userActivity,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";

    // Build filter
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Get user's game results
    const gameResults = await GameResult.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get user's game statistics
    const gameStats = await GameResult.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: "$gameType",
          gamesPlayed: { $sum: 1 },
          bestScore: { $max: "$score" },
          avgScore: { $avg: "$score" },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        user,
        gameResults,
        gameStats,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yangilandi",
      data: { user: user.toObject() },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Don't allow deleting other admins
    if (user.role === "admin" && req.user.userId !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Boshqa adminlarni o'chirib bo'lmaydi",
      });
    }

    // Delete user's game results
    await GameResult.deleteMany({ userId: user._id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Get game analytics
// @route   GET /api/admin/analytics/:gameType
// @access  Private/Admin
export const getGameAnalytics = async (req, res) => {
  try {
    const { gameType } = req.params;

    // Basic analytics
    const basicStats = await GameResult.getGameAnalytics(gameType);

    // Score distribution
    const scoreDistribution = await GameResult.aggregate([
      { $match: { gameType } },
      {
        $bucket: {
          groupBy: "$score",
          boundaries: [0, 100, 500, 1000, 5000, 10000, Infinity],
          default: "Other",
          output: {
            count: { $sum: 1 },
            avgDuration: { $avg: "$duration" },
          },
        },
      },
    ]);

    // Performance over time
    const performanceOverTime = await GameResult.aggregate([
      { $match: { gameType } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          avgScore: { $avg: "$score" },
          gamesPlayed: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
        },
      },
      { $sort: { "_id.date": 1 } },
      { $limit: 30 },
    ]);

    // Level distribution
    const levelDistribution = await GameResult.aggregate([
      { $match: { gameType } },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        basicStats: basicStats[0] || {},
        scoreDistribution,
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
};

// @desc    Get system statistics
// @route   GET /api/admin/system
// @access  Private/Admin
export const getSystemStats = async (req, res) => {
  try {
    // Database stats
    const dbStats = {
      users: await User.countDocuments(),
      gameResults: await GameResult.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      admins: await User.countDocuments({ role: "admin" }),
    };

    // Growth stats (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const growthStats = {
      newUsers: await User.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      }),
      newGames: await GameResult.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      }),
    };

    // Performance metrics
    const performanceStats = await GameResult.aggregate([
      {
        $group: {
          _id: null,
          avgGameDuration: { $avg: "$duration" },
          totalGames: { $sum: 1 },
          avgScore: { $avg: "$score" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        database: dbStats,
        growth: growthStats,
        performance: performanceStats[0] || {},
        serverInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: Math.floor(process.uptime()),
          memoryUsage: process.memoryUsage(),
        },
      },
    });
  } catch (error) {
    console.error("System stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// @desc    Export data
// @route   GET /api/admin/export/:type
// @access  Private/Admin
export const exportData = async (req, res) => {
  try {
    const { type } = req.params;
    const { format = "json" } = req.query;

    let data;
    let filename;

    switch (type) {
      case "users":
        data = await User.find().select("-password");
        filename = `users_export_${Date.now()}`;
        break;
      case "results":
        data = await GameResult.find().populate("userId", "name email");
        filename = `game_results_export_${Date.now()}`;
        break;
      case "analytics":
        // Export comprehensive analytics
        const analytics = await Promise.all([
          GameResult.aggregate([
            {
              $group: {
                _id: "$gameType",
                totalGames: { $sum: 1 },
                avgScore: { $avg: "$score" },
                maxScore: { $max: "$score" },
                avgDuration: { $avg: "$duration" },
              },
            },
          ]),
          User.aggregate([
            {
              $group: {
                _id: "$role",
                count: { $sum: 1 },
                avgLevel: { $avg: "$level" },
                avgTotalScore: { $avg: "$totalScore" },
              },
            },
          ]),
        ]);
        data = { gameAnalytics: analytics[0], userAnalytics: analytics[1] };
        filename = `analytics_export_${Date.now()}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Noto'g'ri export turi",
        });
    }

    if (format === "csv" && Array.isArray(data)) {
      // Convert to CSV (simplified)
      const csv = convertToCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.csv"`
      );
      return res.send(csv);
    }

    // Default JSON export
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.json"`
    );
    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      type,
      data,
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === "string" ? `"${value}"` : value;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}
