import mongoose from "mongoose";

const gameResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: [
        "numberMemory",
        "tileMemory",
        "alphaNumMemory",
        "schulteTable",
        "doubleSchulte",
        "mathSystems",
        "gcdLcm",
        "fractions",
        "percentages",
        "readingSpeed",
        "hideAndSeek",
        // NEW GAMES
        "flashAnzan",
        "flashCards",
      ],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
    },
    duration: {
      type: Number, // seconds
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number, // percentage
      min: 0,
      max: 100,
      default: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    settings: {
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "expert"],
        default: "medium",
      },
      timeLimit: Number, // seconds
      customSettings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    gameData: {
      type: mongoose.Schema.Types.Mixed, // Store game-specific data
      default: {},
    },
    performance: {
      reactionTime: Number, // average reaction time in ms
      consistency: Number, // score consistency rating
      improvement: Number, // improvement over previous games
    },
    deviceInfo: {
      userAgent: String,
      screenResolution: String,
      isMobile: Boolean,
    },
    // NEW: Game-specific ranking score
    gameRankingScore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
gameResultSchema.index({ userId: 1, gameType: 1 });
gameResultSchema.index({ gameType: 1, score: -1 });
gameResultSchema.index({ userId: 1, createdAt: -1 });
gameResultSchema.index({ score: -1, createdAt: -1 });
gameResultSchema.index({ gameType: 1, gameRankingScore: -1 });

// Pre-save middleware to calculate accuracy and game ranking score
gameResultSchema.pre("save", function (next) {
  if (this.totalQuestions > 0) {
    this.accuracy = Math.round(
      (this.correctAnswers / this.totalQuestions) * 100
    );
  }

  // Calculate game-specific ranking score
  this.gameRankingScore = this.calculateGameRankingScore();

  next();
});

// Instance method to calculate game-specific ranking score
gameResultSchema.methods.calculateGameRankingScore = function () {
  const score = this.score || 0;
  const level = this.level || 1;
  const accuracy = this.accuracy || 0;
  const duration = this.duration || 1;

  // Game-specific ranking formula:
  // score * 0.6 + level * 50 + accuracy * 2 + (3600 / duration) * 0.5
  // Duration bonus: faster completion gets higher score
  const durationBonus = duration > 0 ? (3600 / duration) * 0.5 : 0;

  return Math.round(score * 0.6 + level * 50 + accuracy * 2 + durationBonus);
};

// Static method to get user's best score for a game
gameResultSchema.statics.getUserBestScore = function (userId, gameType) {
  return this.findOne({ userId, gameType })
    .sort({ score: -1 })
    .select("score level createdAt gameRankingScore");
};

// Static method to get leaderboard for specific game
gameResultSchema.statics.getLeaderboard = function (gameType, limit = 10) {
  const pipeline = [
    { $match: { gameType } },
    {
      $group: {
        _id: "$userId",
        bestScore: { $max: "$score" },
        gamesPlayed: { $sum: 1 },
        avgScore: { $avg: "$score" },
        bestLevel: { $max: "$level" },
        lastPlayed: { $max: "$createdAt" },
        totalDuration: { $sum: "$duration" },
        gameRankingScore: { $max: "$gameRankingScore" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 1,
        bestScore: 1,
        gamesPlayed: 1,
        avgScore: { $round: ["$avgScore", 1] },
        bestLevel: 1,
        lastPlayed: 1,
        totalDuration: 1,
        gameRankingScore: 1,
        "user.name": 1,
        "user.avatar": 1,
        "user.level": 1,
      },
    },
    {
      $sort: {
        gameRankingScore: -1,
        bestScore: -1,
        gamesPlayed: -1,
        _id: 1,
      },
    },
    { $limit: limit },
  ];

  return this.aggregate(pipeline);
};

// Static method to get user's game history
gameResultSchema.statics.getUserHistory = function (
  userId,
  gameType,
  limit = 20
) {
  return this.find({ userId, gameType })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "score level duration accuracy createdAt settings gameRankingScore"
    );
};

// Static method to get game analytics
gameResultSchema.statics.getGameAnalytics = function (gameType) {
  const pipeline = [
    { $match: { gameType } },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        averageScore: { $avg: "$score" },
        maxScore: { $max: "$score" },
        minScore: { $min: "$score" },
        averageDuration: { $avg: "$duration" },
        maxDuration: { $max: "$duration" },
        minDuration: { $min: "$duration" },
        averageAccuracy: { $avg: "$accuracy" },
        uniquePlayers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        totalGames: 1,
        averageScore: { $round: ["$averageScore", 2] },
        maxScore: 1,
        minScore: 1,
        averageDuration: { $round: ["$averageDuration", 2] },
        maxDuration: 1,
        minDuration: 1,
        averageAccuracy: { $round: ["$averageAccuracy", 2] },
        uniquePlayers: { $size: "$uniquePlayers" },
      },
    },
  ];

  return this.aggregate(pipeline);
};

// Static method to get performance over time
gameResultSchema.statics.getPerformanceOverTime = function (
  gameType,
  days = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
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
        gamesPlayed: { $sum: 1 },
        avgDuration: { $avg: "$duration" },
        avgAccuracy: { $avg: "$accuracy" },
        uniquePlayers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        date: "$_id.date",
        avgScore: { $round: ["$avgScore", 2] },
        gamesPlayed: 1,
        avgDuration: { $round: ["$avgDuration", 2] },
        avgAccuracy: { $round: ["$avgAccuracy", 2] },
        uniquePlayers: { $size: "$uniquePlayers" },
      },
    },
    { $sort: { "_id.date": 1 } },
  ];

  return this.aggregate(pipeline);
};

// Static method to get level distribution
gameResultSchema.statics.getLevelDistribution = function (gameType) {
  const pipeline = [
    { $match: { gameType } },
    {
      $group: {
        _id: "$level",
        count: { $sum: 1 },
        avgScore: { $avg: "$score" },
        avgDuration: { $avg: "$duration" },
        avgAccuracy: { $avg: "$accuracy" },
      },
    },
    {
      $project: {
        level: "$_id",
        count: 1,
        avgScore: { $round: ["$avgScore", 2] },
        avgDuration: { $round: ["$avgDuration", 2] },
        avgAccuracy: { $round: ["$avgAccuracy", 2] },
      },
    },
    { $sort: { _id: 1 } },
  ];

  return this.aggregate(pipeline);
};

export default mongoose.model("GameResult", gameResultSchema);
