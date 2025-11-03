import express from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "7d",
  });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    body("firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Ism 2-50 belgi orasida bo'lishi kerak"),
    body("lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Familiya 2-50 belgi orasida bo'lishi kerak"),
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username 3-30 belgi orasida bo'lishi kerak")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username faqat harf, raqam va _ belgisidan iborat bo'lishi mumkin"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validatsiya xatolari",
          errors: errors.array(),
        });
      }

      const { firstName, lastName, username, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Bu username allaqachon band",
        });
      }

      // Create new user
      const user = new User({
        firstName,
        lastName,
        username,
        password,
        email: `${username}@mental.uz`, // Auto-generate email
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: "Muvaffaqiyatli ro'yxatdan o'tdingiz",
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          name: user.name,
          email: user.email,
          level: user.level,
          totalScore: user.totalScore,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({
        success: false,
        message: "Server xatosi",
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username kiritish majburiy"),
    body("password").notEmpty().withMessage("Parol kiritish majburiy"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validatsiya xatolari",
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      // Find user by username
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Username yoki parol noto'g'ri",
        });
      }

      // Check password
      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return res.status(400).json({
          success: false,
          message: "Username yoki parol noto'g'ri",
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: "Muvaffaqiyatli kiritdingiz",
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          name: user.name,
          email: user.email,
          level: user.level,
          totalScore: user.totalScore,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server xatosi",
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Ism 2-50 belgi orasida bo'lishi kerak"),
    body("avatar")
      .optional()
      .isURL()
      .withMessage("To'g'ri URL formatini kiriting"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validatsiya xatolari",
          errors: errors.array(),
        });
      }

      const { name, avatar, preferences } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Foydalanuvchi topilmadi",
        });
      }

      // Update fields
      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      if (preferences)
        user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      res.json({
        success: true,
        message: "Profil muvaffaqiyatli yangilandi",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          level: user.level,
          totalScore: user.totalScore,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server xatosi",
      });
    }
  }
);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post(
  "/change-password",
  [
    auth,
    body("currentPassword")
      .notEmpty()
      .withMessage("Joriy parol kiritish majburiy"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validatsiya xatolari",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Foydalanuvchi topilmadi",
        });
      }

      // Check current password
      const isCurrentPasswordMatch = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordMatch) {
        return res.status(400).json({
          success: false,
          message: "Joriy parol noto'g'ri",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: "Parol muvaffaqiyatli o'zgartirildi",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Server xatosi",
      });
    }
  }
);

export default router;
