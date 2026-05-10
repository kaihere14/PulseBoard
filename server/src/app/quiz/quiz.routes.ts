import { Router } from "express";
import * as quizController from "./quiz.controller";

const router = Router();

router.post("/", quizController.createQuiz);

export default router;