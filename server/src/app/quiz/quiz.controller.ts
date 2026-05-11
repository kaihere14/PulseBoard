import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { createQuizSchema, getQuizBySlugSchema } from "./quiz.dto";
import type { CreateQuizResult } from "./quiz.service";
import * as quizService from "./quiz.service";


export const createQuiz = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }


  try {
    const parsedBody = createQuizSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        error: "Invalid quiz payload",
        details: parsedBody.error.flatten(),
      });
    }

    const result: CreateQuizResult = await quizService.createQuizForUser(
      userId,
      parsedBody.data
    );
    return res.status(201).json(result);
  } catch (error: unknown) {
    console.error(
      `[Quiz] Error creating quiz: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to create quiz" });
  }
};

export const getUserQuizzes = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const quizzes = await quizService.getQuizzesByUser(userId);
    return res.status(200).json({ quizzes });
  } catch (error: unknown) {
    console.error(
      `[Quiz] Error fetching quizzes for user: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to fetch quizzes" });
  }
};

export const getQuizBySlug = async (req: Request, res: Response) => {
  const parsedParams = getQuizBySlugSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid slug",
      details: parsedParams.error.flatten(),
    });
  }

  const { slug } = parsedParams.data;

  try {
    // Step 1 — fetch poll only to decide auth requirement before loading questions
    const poll = await quizService.getPollBySlug(slug);
    if (!poll) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Step 2 — enforce auth for non-anonymous quizzes
    if (!poll.isAnonymousPoll) {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({
          error: "Login required to access this quiz",
          code: "LOGIN_REQUIRED",
        });
      }
    }

    // Step 3 — fetch full quiz (poll + questions)
    const result = await quizService.getQuizBySlug(slug);
    if (!result) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error(
      `[Quiz] Error fetching quiz by slug: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to fetch quiz" });
  }
};
