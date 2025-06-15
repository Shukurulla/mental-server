import express from "express";
import { body, validationResult } from "express-validator";
import auth from "../middleware/auth.js";
import adminMiddleware from "../middleware/admin.js";
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getGameAnalytics,
  getSystemStats,
  exportData,
} from "../controllers/adminController.js";

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(adminMiddleware);

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get("/dashboard", getDashboardStats);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private/Admin
router.get("/users", getUsers);

// @route   GET /api/admin/users/:id
// @desc    Get single user details
// @access  Private/Admin
router.get("/users/:id", getUserDetails);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put(
  "/users/:id",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Ism 2-50 belgi orasida bo'lishi kerak"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("To'g'ri email formatini kiriting"),
    body("role")
      .optional()
      .isIn(["user", "admin"])
      .withMessage("Role user yoki admin bo'lishi kerak"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive boolean qiymat bo'lishi kerak"),
  ],
  updateUser
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete("/users/:id", deleteUser);

// @route   GET /api/admin/analytics/:gameType
// @desc    Get game analytics
// @access  Private/Admin
router.get("/analytics/:gameType", getGameAnalytics);

// @route   GET /api/admin/system
// @desc    Get system statistics
// @access  Private/Admin
router.get("/system", getSystemStats);

// @route   GET /api/admin/export/:type
// @desc    Export data (users, results, analytics)
// @access  Private/Admin
router.get("/export/:type", exportData);

export default router;
