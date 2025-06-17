// scripts/migrateRankingScores.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const migrateRankingScores = async () => {
  try {
    console.log("🚀 Database migration boshlandi...");

    // MongoDB ga ulanish
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/mental-arifmetika"
    );
    console.log("✅ MongoDB ga ulandi");

    // Barcha faol userlarni olish
    const users = await User.find({ isActive: true });
    console.log(`📊 ${users.length} ta faol user topildi`);

    let updatedCount = 0;
    let addedFields = 0;

    for (const user of users) {
      let needsUpdate = false;

      // Agar rankingScore yo'q bo'lsa yoki 0 bo'lsa
      if (!user.rankingScore || user.rankingScore === 0) {
        user.rankingScore = user.calculateRankingScore();
        needsUpdate = true;
        addedFields++;
      }

      // Agar averageScore yo'q bo'lsa
      if (!user.averageScore || user.averageScore === 0) {
        if (user.gamesPlayed > 0) {
          user.averageScore = user.totalScore / user.gamesPlayed;
        } else {
          user.averageScore = 0;
        }
        needsUpdate = true;
      }

      // Agar streak yo'q bo'lsa
      if (user.streak === undefined || user.streak === null) {
        user.streak = Math.floor(Math.random() * 10); // Random streak for existing users
        needsUpdate = true;
      }

      // Flash games stats qo'shish
      if (!user.gameStats.flashAnzan) {
        user.gameStats.flashAnzan = {
          bestScore: 0,
          gamesPlayed: 0,
          averageScore: 0,
          lastPlayed: null,
        };
        needsUpdate = true;
      }

      if (!user.gameStats.flashCards) {
        user.gameStats.flashCards = {
          bestScore: 0,
          gamesPlayed: 0,
          averageScore: 0,
          lastPlayed: null,
        };
        needsUpdate = true;
      }

      // Agar o'zgarish bo'lsa, saqlash
      if (needsUpdate) {
        user.markModified("gameStats");
        await user.save();
        updatedCount++;

        if (updatedCount % 50 === 0) {
          console.log(`⚡ ${updatedCount} ta user yangilandi...`);
        }
      }
    }

    console.log(`✅ Migration tugadi!`);
    console.log(`📈 ${updatedCount} ta user yangilandi`);
    console.log(`🆕 ${addedFields} ta userga ranking score qo'shildi`);

    // Sample userlar yaratish (agar hech qanday user bo'lmasa)
    if (users.length === 0) {
      console.log("📝 Sample userlar yaratilmoqda...");
      await createSampleUsers();
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration xatosi:", error);
    process.exit(1);
  }
};

const createSampleUsers = async () => {
  const sampleUsers = [
    {
      name: "Aziz Rahmonov",
      email: "aziz@example.com",
      password: "123456",
      totalScore: 15000,
      level: 16,
      gamesPlayed: 50,
      isActive: true,
    },
    {
      name: "Malika Toshmatova",
      email: "malika@example.com",
      password: "123456",
      totalScore: 12000,
      level: 13,
      gamesPlayed: 40,
      isActive: true,
    },
    {
      name: "Bobur Akramov",
      email: "bobur@example.com",
      password: "123456",
      totalScore: 10000,
      level: 11,
      gamesPlayed: 35,
      isActive: true,
    },
    {
      name: "Zarina Karimova",
      email: "zarina@example.com",
      password: "123456",
      totalScore: 8000,
      level: 9,
      gamesPlayed: 30,
      isActive: true,
    },
    {
      name: "Jasur Nazarov",
      email: "jasur@example.com",
      password: "123456",
      totalScore: 6000,
      level: 7,
      gamesPlayed: 25,
      isActive: true,
    },
  ];

  for (const userData of sampleUsers) {
    const user = new User(userData);

    // Calculate derived fields
    user.averageScore = user.totalScore / user.gamesPlayed;
    user.streak = Math.floor(Math.random() * 15) + 1;
    user.rankingScore = user.calculateRankingScore();

    await user.save();
    console.log(`👤 Sample user yaratildi: ${user.name}`);
  }

  console.log("✅ Sample userlar yaratildi");
};

// Script ishga tushirish
if (process.argv[2] === "--run") {
  migrateRankingScores();
}

export default migrateRankingScores;
