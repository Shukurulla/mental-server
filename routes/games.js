import express from "express";
import { body, validationResult } from "express-validator";
import auth from "../middleware/auth.js";
import {
  getAllGames,
  getGame,
  startGame,
  submitGameResult,
} from "../controllers/gameController.js";

const router = express.Router();

// @route   GET /api/games
// @desc    Get all available games
// @access  Public
router.get("/", getAllGames);

// @route   GET /api/games/:gameType
// @desc    Get specific game info
// @access  Public
router.get("/:gameType", getGame);

// @route   POST /api/games/:gameType/start
// @desc    Start a game session
// @access  Private
router.post("/:gameType/start", auth, startGame);

// @route   POST /api/games/:gameType/submit
// @desc    Submit game result
// @access  Private
router.post(
  "/:gameType/submit",
  [
    auth,
    body("score").isNumeric().withMessage("Ball raqam bo'lishi kerak"),
    body("level")
      .isInt({ min: 1 })
      .withMessage("Daraja 1 dan katta bo'lishi kerak"),
    body("duration").isNumeric().withMessage("Vaqt raqam bo'lishi kerak"),
  ],
  submitGameResult
);

export default router;
