import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Ism kiritish majburiy"],
      trim: true,
      minlength: [2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"],
      maxlength: [50, "Ism 50 ta belgidan ko'p bo'lmasligi kerak"],
    },
    lastName: {
      type: String,
      required: [true, "Familiya kiritish majburiy"],
      trim: true,
      minlength: [2, "Familiya kamida 2 ta belgidan iborat bo'lishi kerak"],
      maxlength: [50, "Familiya 50 ta belgidan ko'p bo'lmasligi kerak"],
    },
    username: {
      type: String,
      required: [true, "Username kiritish majburiy"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username kamida 3 ta belgidan iborat bo'lishi kerak"],
      maxlength: [30, "Username 30 ta belgidan ko'p bo'lmasligi kerak"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username faqat harf, raqam va _ belgisidan iborat bo'lishi kerak",
      ],
    },
    name: {
      type: String,
      // Computed field: firstName + lastName
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Email optional
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "To'g'ri email formatini kiriting",
      ],
    },
    password: {
      type: String,
      required: [true, "Parol kiritish majburiy"],
      minlength: [6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"],
    },
    avatar: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    // NEW: Ranking score for leaderboard
    rankingScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    // NEW: Average score calculation
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    // NEW: Streak counter
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    achievements: [
      {
        name: String,
        description: String,
        icon: String,
        unlockedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    gameStats: {
      numberMemory: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      tileMemory: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      alphaNumMemory: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      schulteTable: {
        bestTime: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      doubleSchulte: {
        bestTime: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      mathSystems: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      gcdLcm: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      fractions: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      percentages: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      readingSpeed: {
        bestSpeed: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageSpeed: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      hideAndSeek: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      // NEW GAMES
      flashAnzan: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
      flashCards: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        lastPlayed: { type: Date },
      },
    },
    preferences: {
      language: {
        type: String,
        enum: ["uz", "ru", "en"],
        default: "uz",
      },
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
      },
      soundEnabled: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving and set name field
userSchema.pre("save", async function (next) {
  // Set full name
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }

  // Hash password if modified
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update user stats after game
userSchema.methods.updateGameStats = function (
  gameType,
  score,
  isTimeScore = false
) {
  if (!this.gameStats[gameType]) {
    // Initialize game stats if not exists
    this.gameStats[gameType] = {
      bestScore: 0,
      gamesPlayed: 0,
      averageScore: 0,
      lastPlayed: new Date(),
    };
  }

  const stats = this.gameStats[gameType];
  stats.gamesPlayed += 1;
  stats.lastPlayed = new Date();

  if (isTimeScore) {
    // For time-based games (lower is better)
    if (stats.bestTime === 0 || score < stats.bestTime) {
      stats.bestTime = score;
    }
    stats.averageTime =
      (stats.averageTime * (stats.gamesPlayed - 1) + score) / stats.gamesPlayed;
  } else {
    // For score-based games (higher is better)
    if (score > stats.bestScore) {
      stats.bestScore = score;
    }
    stats.averageScore =
      (stats.averageScore * (stats.gamesPlayed - 1) + score) /
      stats.gamesPlayed;
  }

  // Update overall user stats
  this.totalScore += score;
  this.gamesPlayed += 1;

  // Calculate average score
  this.averageScore = this.totalScore / this.gamesPlayed;

  // Level calculation (every 1000 points = 1 level)
  this.level = Math.floor(this.totalScore / 1000) + 1;

  // Calculate ranking score
  this.rankingScore = this.calculateRankingScore();

  // Mark as modified for MongoDB
  this.markModified("gameStats");
};

// Calculate ranking score method
userSchema.methods.calculateRankingScore = function () {
  const totalScore = this.totalScore || 0;
  const level = this.level || 1;
  const gamesPlayed = this.gamesPlayed || 0;
  const averageScore = this.averageScore || 0;
  const streak = this.streak || 0;

  // Ranking formula:
  // totalScore * 0.5 + level * 150 + gamesPlayed * 3 + averageScore * 0.3 + streak * 10
  return Math.round(
    totalScore * 0.5 +
      level * 150 +
      gamesPlayed * 3 +
      averageScore * 0.3 +
      streak * 10
  );
};

// Virtual for user rank (deprecated, use rankingScore instead)
userSchema.virtual("rank").get(function () {
  return this.level * 100 + this.totalScore;
});

// Index for better performance
userSchema.index({ rankingScore: -1 });
userSchema.index({ totalScore: -1 });
userSchema.index({ level: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1 });

// Static method to get leaderboard
userSchema.statics.getGlobalLeaderboard = function (limit = 50) {
  return this.find({ isActive: true })
    .select(
      "name avatar totalScore level gamesPlayed rankingScore averageScore streak"
    )
    .sort({
      rankingScore: -1,
      totalScore: -1,
      level: -1,
      gamesPlayed: -1,
      _id: 1, // For consistent sorting
    })
    .limit(limit)
    .lean();
};

// Static method to update all users' ranking scores (for migration)
userSchema.statics.updateAllRankingScores = async function () {
  const users = await this.find({ isActive: true });

  for (const user of users) {
    user.rankingScore = user.calculateRankingScore();
    await user.save();
  }

  return users.length;
};

userSchema.set("toJSON", { virtuals: true });

export default mongoose.model("User", userSchema);
