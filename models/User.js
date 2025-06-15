import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ism kiritish majburiy"],
      trim: true,
      minlength: [2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"],
      maxlength: [50, "Ism 50 ta belgidan ko'p bo'lmasligi kerak"],
    },
    email: {
      type: String,
      required: [true, "Email kiritish majburiy"],
      unique: true,
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
      },
      tileMemory: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      alphaNumMemory: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      schulteTable: {
        bestTime: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
      },
      doubleSchulte: {
        bestTime: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageTime: { type: Number, default: 0 },
      },
      mathSystems: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      gcdLcm: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      fractions: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      percentages: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
      },
      readingSpeed: {
        bestSpeed: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageSpeed: { type: Number, default: 0 },
      },
      hideAndSeek: {
        bestScore: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
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

// Hash password before saving
userSchema.pre("save", async function (next) {
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
  if (!this.gameStats[gameType]) return;

  const stats = this.gameStats[gameType];
  stats.gamesPlayed += 1;

  if (isTimeScore) {
    if (stats.bestTime === 0 || score < stats.bestTime) {
      stats.bestTime = score;
    }
    stats.averageTime =
      (stats.averageTime * (stats.gamesPlayed - 1) + score) / stats.gamesPlayed;
  } else {
    if (score > stats.bestScore) {
      stats.bestScore = score;
    }
    stats.averageScore =
      (stats.averageScore * (stats.gamesPlayed - 1) + score) /
      stats.gamesPlayed;
  }

  this.totalScore += score;
  this.gamesPlayed += 1;

  // Level calculation
  this.level = Math.floor(this.totalScore / 1000) + 1;
};

// Virtual for user rank
userSchema.virtual("rank").get(function () {
  return this.level * 100 + this.totalScore;
});

userSchema.set("toJSON", { virtuals: true });

export default mongoose.model("User", userSchema);
