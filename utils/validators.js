import { body } from "express-validator";

// User registration validation
export const validateRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Ism 2-50 belgi orasida bo'lishi kerak")
    .matches(/^[a-zA-Z\s\u0400-\u04FF\u0100-\u017F]+$/)
    .withMessage("Ism faqat harflardan iborat bo'lishi kerak"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("To'g'ri email formatini kiriting")
    .isLength({ max: 100 })
    .withMessage("Email 100 belgidan ko'p bo'lmasligi kerak"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Parol 6-128 belgi orasida bo'lishi kerak")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Parol kamida bitta kichik harf, katta harf va raqam bo'lishi kerak"
    ),
];

// User login validation
export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("To'g'ri email formatini kiriting"),

  body("password")
    .notEmpty()
    .withMessage("Parol kiritish majburiy")
    .isLength({ min: 1, max: 128 })
    .withMessage("Parol juda uzun"),
];

// Profile update validation
export const validateProfileUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Ism 2-50 belgi orasida bo'lishi kerak")
    .matches(/^[a-zA-Z\s\u0400-\u04FF\u0100-\u017F]+$/)
    .withMessage("Ism faqat harflardan iborat bo'lishi kerak"),

  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar to'g'ri URL formatida bo'lishi kerak")
    .isLength({ max: 500 })
    .withMessage("Avatar URL juda uzun"),

  body("preferences.language")
    .optional()
    .isIn(["uz", "ru", "en"])
    .withMessage("Til uz, ru yoki en bo'lishi kerak"),

  body("preferences.theme")
    .optional()
    .isIn(["light", "dark"])
    .withMessage("Tema light yoki dark bo'lishi kerak"),

  body("preferences.soundEnabled")
    .optional()
    .isBoolean()
    .withMessage("soundEnabled boolean qiymat bo'lishi kerak"),

  body("preferences.notifications")
    .optional()
    .isBoolean()
    .withMessage("notifications boolean qiymat bo'lishi kerak"),
];

// Password change validation
export const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Joriy parol kiritish majburiy"),

  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("Yangi parol 6-128 belgi orasida bo'lishi kerak")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Yangi parol kamida bitta kichik harf, katta harf va raqam bo'lishi kerak"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Parollar mos kelmaydi");
    }
    return true;
  }),
];

// Game result submission validation
export const validateGameResult = [
  body("score")
    .isNumeric()
    .withMessage("Ball raqam bo'lishi kerak")
    .isFloat({ min: 0 })
    .withMessage("Ball manfiy bo'lmasligi kerak"),

  body("level")
    .isInt({ min: 1, max: 100 })
    .withMessage("Daraja 1-100 orasida bo'lishi kerak"),

  body("duration")
    .isNumeric()
    .withMessage("Vaqt raqam bo'lishi kerak")
    .isFloat({ min: 0 })
    .withMessage("Vaqt manfiy bo'lmasligi kerak"),

  body("correctAnswers")
    .optional()
    .isInt({ min: 0 })
    .withMessage("To'g'ri javoblar soni manfiy bo'lmasligi kerak"),

  body("totalQuestions")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Jami savollar soni manfiy bo'lmasligi kerak"),

  body("settings")
    .optional()
    .isObject()
    .withMessage("Settings obyekt bo'lishi kerak"),

  body("gameData")
    .optional()
    .isObject()
    .withMessage("GameData obyekt bo'lishi kerak"),
];

// Game start validation
export const validateGameStart = [
  body("level")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Daraja 1-100 orasida bo'lishi kerak"),

  body("settings")
    .optional()
    .isObject()
    .withMessage("Settings obyekt bo'lishi kerak"),

  body("settings.difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Qiyinlik easy, medium yoki hard bo'lishi kerak"),

  body("settings.timeLimit")
    .optional()
    .isInt({ min: 5, max: 3600 })
    .withMessage("Vaqt chegarasi 5-3600 soniya orasida bo'lishi kerak"),
];

// Admin user update validation
export const validateAdminUserUpdate = [
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

  body("level")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Daraja 1-1000 orasida bo'lishi kerak"),

  body("totalScore")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Umumiy ball manfiy bo'lmasligi kerak"),
];

// Search and pagination validation
export const validateSearchParams = [
  body("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Sahifa raqami 1 dan katta bo'lishi kerak"),

  body("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit 1-100 orasida bo'lishi kerak"),

  body("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Qidiruv so'zi 100 belgidan ko'p bo'lmasligi kerak"),

  body("sortBy")
    .optional()
    .isIn(["name", "email", "createdAt", "totalScore", "level"])
    .withMessage("Noto'g'ri saralash parametri"),

  body("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Saralash tartibi asc yoki desc bo'lishi kerak"),
];

// File upload validation
export const validateFileUpload = [
  body("file").custom((value, { req }) => {
    if (!req.file) {
      throw new Error("Fayl kiritish majburiy");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error(
        "Faqat JPEG, PNG va GIF formatdagi rasmlar ruxsat etilgan"
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new Error("Fayl hajmi 5MB dan ko'p bo'lmasligi kerak");
    }

    return true;
  }),
];

// Game type validation
export const validateGameType = (gameType) => {
  const validGameTypes = [
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
  ];

  return validGameTypes.includes(gameType);
};

// Date range validation
export const validateDateRange = [
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Boshlang'ich sana to'g'ri formatda bo'lishi kerak"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("Tugash sanasi to'g'ri formatda bo'lishi kerak")
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        const start = new Date(req.body.startDate);
        const end = new Date(value);

        if (end <= start) {
          throw new Error(
            "Tugash sanasi boshlang'ich sanadan katta bo'lishi kerak"
          );
        }

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
          throw new Error("Sana oralig'i 365 kundan ko'p bo'lmasligi kerak");
        }
      }

      return true;
    }),
];

// Sanitize HTML content
export const sanitizeHtml = (content) => {
  if (typeof content !== "string") return content;

  // Remove potentially dangerous HTML tags and attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .trim();
};

// Custom validation for MongoDB ObjectId
export const validateObjectId = (value) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(value);
};

// Rate limiting validation
export const createRateLimitMessage = (windowMs, max) => {
  const minutes = Math.floor(windowMs / 60000);
  return `Juda ko'p so'rov yuborildi. ${minutes} daqiqa ichida maksimal ${max} ta so'rov yuborish mumkin.`;
};

export default {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateGameResult,
  validateGameStart,
  validateAdminUserUpdate,
  validateSearchParams,
  validateFileUpload,
  validateGameType,
  validateDateRange,
  sanitizeHtml,
  validateObjectId,
  createRateLimitMessage,
};
