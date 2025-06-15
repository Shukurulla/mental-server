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

// Static method to get user's best score for a game
gameResultSchema.statics.getUserBestScore = function (userId, gameType) {
  return this.findOne({ userId, gameType })
    .sort({ score: -1 })
    .select("score level createdAt");
};

// Static method to get leaderboard
gameResultSchema.statics.getLeaderboard = function (gameType, limit = 10) {
  const pipeline = [
    { $match: { gameType } },
    {
      $group: {
        _id: "$userId",
        bestScore: { $max: "$score" },
        gamesPlayed: { $sum: 1 },
        lastPlayed: { $max: "$createdAt" },
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
        lastPlayed: 1,
        "user.name": 1,
        "user.avatar": 1,
        "user.level": 1,
      },
    },
    { $sort: { bestScore: -1 } },
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
    .select("score level duration accuracy createdAt settings");
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
        averageAccuracy: { $round: ["$averageAccuracy", 2] },
        uniquePlayers: { $size: "$uniquePlayers" },
      },
    },
  ];

  return this.aggregate(pipeline);
};

// Pre-save middleware to calculate accuracy
gameResultSchema.pre("save", function (next) {
  if (this.totalQuestions > 0) {
    this.accuracy = Math.round(
      (this.correctAnswers / this.totalQuestions) * 100
    );
  }
  next();
});

export default mongoose.model("GameResult", gameResultSchema);
