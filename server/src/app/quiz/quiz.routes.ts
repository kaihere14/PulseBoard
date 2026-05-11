import { Router } from "express";
import * as quizController from "./quiz.controller";


const router = Router();

router.post("/", quizController.createQuiz);
router.get("/", quizController.getUserQuizzes);
router.post("/submit", quizController.submitAnswer);
router.get("/:slug/analytics", quizController.getQuizAnalytics);
router.get("/:slug", quizController.getQuizBySlug);
router.patch("/:slug", quizController.updateQuiz);
router.delete("/:slug", quizController.deleteQuiz);

export default router;