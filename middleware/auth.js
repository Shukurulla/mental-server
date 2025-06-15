import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token topilmadi, ruxsat berilmadi",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token yaroqsiz",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi hisobi faol emas",
      });
    }

    req.user = decoded;
    req.userDoc = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Token yaroqsiz",
    });
  }
};

export default auth;
