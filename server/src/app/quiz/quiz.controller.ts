import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { createQuizSchema, getQuizBySlugSchema, submitQuizResponseSchema } from "./quiz.dto";
import type { CreateQuizResult, SubmitQuizResult } from "./quiz.service";
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

export const submitAnswer = async (req: Request, res: Response) => {
  const parsedBody = submitQuizResponseSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid submission payload",
      details: parsedBody.error.flatten(),
    });
  }

  const dto = parsedBody.data;

  try {
    const poll = await quizService.getPollById(dto.pollId);
    if (!poll) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Non-anonymous polls: enforce auth and use the Clerk userId as the voter identity
    let resolvedVoterId: string;
    if (!poll.isAnonymousPoll) {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({
          error: "Login required to submit this quiz",
          code: "LOGIN_REQUIRED",
        });
      }
      resolvedVoterId = userId;
    } else {
      resolvedVoterId = dto.voterId;
    }

    const result: SubmitQuizResult = await quizService.submitQuizResponse(dto, resolvedVoterId);
    return res.status(201).json(result);
  } catch (error: unknown) {
    // Duplicate submission — MongoDB unique index violation (code 11000)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return res
        .status(409)
        .json({ error: "You have already submitted a response to this quiz" });
    }

    if (error instanceof Error) {
      const serviceCode = (error as Error & { serviceCode?: string }).serviceCode;
      if (serviceCode === "NOT_FOUND") {
        return res.status(404).json({ error: error.message });
      }
      if (serviceCode === "NOT_ACCEPTING" || serviceCode === "EXPIRED") {
        return res.status(409).json({ error: error.message });
      }
      if (
        serviceCode === "MISSING_REQUIRED" ||
        serviceCode === "INVALID_QUESTION" ||
        serviceCode === "INVALID_OPTION"
      ) {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error(
      `[Quiz] Error submitting answer: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to submit quiz response" });
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
