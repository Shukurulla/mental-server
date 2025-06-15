import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O'yin nomi kiritish majburiy"],
      trim: true,
      maxlength: [100, "O'yin nomi 100 ta belgidan ko'p bo'lmasligi kerak"],
    },
    type: {
      type: String,
      required: [true, "O'yin turi kiritish majburiy"],
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
      unique: true,
    },
    description: {
      type: String,
      required: [true, "O'yin tavsifi kiritish majburiy"],
      maxlength: [500, "Tavsif 500 ta belgidan ko'p bo'lmasligi kerak"],
    },
    instructions: {
      type: String,
      maxlength: [1000, "Ko'rsatmalar 1000 ta belgidan ko'p bo'lmasligi kerak"],
    },
    category: {
      type: String,
      required: true,
      enum: ["memory", "attention", "calculation", "logic", "speed"],
      default: "memory",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    maxLevel: {
      type: Number,
      required: true,
      min: [1, "Maksimal daraja kamida 1 bo'lishi kerak"],
      max: [100, "Maksimal daraja 100 dan ko'p bo'lmasligi kerak"],
      default: 10,
    },
    scoreMultiplier: {
      type: Number,
      required: true,
      min: [1, "Ball ko'paytiruvchisi kamida 1 bo'lishi kerak"],
      default: 10,
    },
    timeLimit: {
      type: Number, // seconds
      min: [5, "Vaqt chegarasi kamida 5 soniya bo'lishi kerak"],
      max: [3600, "Vaqt chegarasi 1 soatdan ko'p bo'lmasligi kerak"],
    },
    defaultSettings: {
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
      },
      timePerQuestion: {
        type: Number,
        default: 30,
      },
      showHints: {
        type: Boolean,
        default: true,
      },
      soundEffects: {
        type: Boolean,
        default: true,
      },
      autoAdvance: {
        type: Boolean,
        default: false,
      },
    },
    gameConfig: {
      // Game-specific configuration
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    statistics: {
      totalPlays: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      highestScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageDuration: {
        type: Number,
        default: 0,
        min: 0,
      },
      uniquePlayers: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    ratings: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
      distribution: {
        fiveStar: { type: Number, default: 0 },
        fourStar: { type: Number, default: 0 },
        threeStar: { type: Number, default: 0 },
        twoStar: { type: Number, default: 0 },
        oneStar: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
gameSchema.index({ type: 1 });
gameSchema.index({ category: 1 });
gameSchema.index({ isActive: 1, isPublic: 1 });
gameSchema.index({ "statistics.totalPlays": -1 });
gameSchema.index({ "ratings.average": -1 });
gameSchema.index({ tags: 1 });

// Virtual for popularity score
gameSchema.virtual("popularityScore").get(function () {
  return (
    this.statistics.totalPlays * 0.4 +
    this.ratings.average * this.ratings.count * 0.6
  );
});

// Virtual for difficulty level
gameSchema.virtual("difficultyLevel").get(function () {
  if (this.maxLevel <= 5) return "Oson";
  if (this.maxLevel <= 15) return "O'rta";
  return "Qiyin";
});

// Pre-save middleware to update lastUpdated
gameSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to get popular games
gameSchema.statics.getPopularGames = function (limit = 10) {
  return this.find({ isActive: true, isPublic: true })
    .sort({ "statistics.totalPlays": -1, "ratings.average": -1 })
    .limit(limit);
};

// Static method to get games by category
gameSchema.statics.getGamesByCategory = function (category) {
  return this.find({
    category,
    isActive: true,
    isPublic: true,
  }).sort({ "statistics.totalPlays": -1 });
};

// Static method to search games
gameSchema.statics.searchGames = function (query) {
  return this.find({
    $and: [
      { isActive: true, isPublic: true },
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } },
        ],
      },
    ],
  }).sort({ "statistics.totalPlays": -1 });
};

// Instance method to update statistics
gameSchema.methods.updateStatistics = function (gameResult) {
  this.statistics.totalPlays += 1;

  // Update average score
  const currentTotal =
    this.statistics.averageScore * (this.statistics.totalPlays - 1);
  this.statistics.averageScore =
    (currentTotal + gameResult.score) / this.statistics.totalPlays;

  // Update highest score
  if (gameResult.score > this.statistics.highestScore) {
    this.statistics.highestScore = gameResult.score;
  }

  // Update average duration
  const currentDurationTotal =
    this.statistics.averageDuration * (this.statistics.totalPlays - 1);
  this.statistics.averageDuration =
    (currentDurationTotal + gameResult.duration) / this.statistics.totalPlays;
};

// Instance method to add rating
gameSchema.methods.addRating = function (rating) {
  const oldTotal = this.ratings.average * this.ratings.count;
  this.ratings.count += 1;
  this.ratings.average = (oldTotal + rating) / this.ratings.count;

  // Update distribution
  switch (rating) {
    case 5:
      this.ratings.distribution.fiveStar += 1;
      break;
    case 4:
      this.ratings.distribution.fourStar += 1;
      break;
    case 3:
      this.ratings.distribution.threeStar += 1;
      break;
    case 2:
      this.ratings.distribution.twoStar += 1;
      break;
    case 1:
      this.ratings.distribution.oneStar += 1;
      break;
  }
};

export default mongoose.model("Game", gameSchema);
