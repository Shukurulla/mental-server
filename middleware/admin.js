import User from "../models/User.js";

// Admin middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated (auth middleware should run before this)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Autentifikatsiya talab qilinadi",
      });
    }

    // Get user from database
    const user = await User.findById(req.user.userId).select("role isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Foydalanuvchi hisobi faol emas",
      });
    }

    // Check if user is admin
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu amalni bajarish uchun admin huquqi kerak",
      });
    }

    // Add user role to request object
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};

export default adminMiddleware;
