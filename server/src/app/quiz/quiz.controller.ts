import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  createQuizSchema,
  getQuizBySlugSchema,
  submitQuizResponseSchema,
  updatePollSchema,
} from "./quiz.dto";
import type { CreateQuizResult, SubmitQuizResult } from "./quiz.service";
import * as quizService from "./quiz.service";
import { getOrCreateUser } from "../authentication/auth.services";
import { notifyAnalyticsChanged } from "../realtime/analyticsRealtime";


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
    notifyAnalyticsChanged(poll.slug, "response_submitted");
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

    // Step 2 — non-anonymous + unpublished quizzes are only visible to signed-in users.
    // Published polls are public to view; voting still requires login in submitAnswer.
    if (!poll.isAnonymousPoll && !poll.isPublished) {
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

export const getQuizAnalytics = async (req: Request, res: Response) => {
  const parsedParams = getQuizBySlugSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid slug",
      details: parsedParams.error.flatten(),
    });
  }

  const { slug } = parsedParams.data;

  try {
    const poll = await quizService.getPollBySlug(slug);
    if (!poll) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Resolve creator status up-front so we can both gate access and tell the
    // client whether to render management controls.
    const { userId } = getAuth(req);
    let isCreator = false;
    if (userId) {
      const { user } = await getOrCreateUser(userId);
      isCreator = poll.creatorId.toString() === user._id.toString();
    }

    // Unpublished quizzes are private — only the creator can view analytics.
    if (!poll.isPublished) {
      if (!userId) {
        return res.status(401).json({
          error: "Login required to view analytics for this quiz",
          code: "LOGIN_REQUIRED",
        });
      }
      if (!isCreator) {
        return res.status(403).json({
          error: "Only the creator can view analytics for this quiz",
        });
      }
    }

    const analytics = await quizService.getQuizAnalytics(poll);
    return res.status(200).json({ ...analytics, isCreator });
  } catch (error: unknown) {
    console.error(
      `[Quiz] Error fetching quiz analytics: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to fetch quiz analytics" });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedParams = getQuizBySlugSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid slug",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedBody = updatePollSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: "Invalid update payload",
      details: parsedBody.error.flatten(),
    });
  }

  try {
    const poll = await quizService.updatePollBySlug(
      userId,
      parsedParams.data.slug,
      parsedBody.data
    );
    notifyAnalyticsChanged(parsedParams.data.slug, "poll_updated");
    return res.status(200).json({ poll });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const serviceCode = (error as Error & { serviceCode?: string }).serviceCode;
      if (serviceCode === "NOT_FOUND") {
        return res.status(404).json({ error: error.message });
      }
      if (serviceCode === "FORBIDDEN") {
        return res.status(403).json({ error: error.message });
      }
    }

    console.error(
      `[Quiz] Error updating quiz: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to update quiz" });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedParams = getQuizBySlugSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: "Invalid slug",
      details: parsedParams.error.flatten(),
    });
  }

  try {
    const slug = parsedParams.data.slug;
    await quizService.deletePollBySlug(userId, slug);
    notifyAnalyticsChanged(slug, "poll_deleted");
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const serviceCode = (error as Error & { serviceCode?: string }).serviceCode;
      if (serviceCode === "NOT_FOUND") {
        return res.status(404).json({ error: error.message });
      }
      if (serviceCode === "FORBIDDEN") {
        return res.status(403).json({ error: error.message });
      }
    }

    console.error(
      `[Quiz] Error deleting quiz: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: "Failed to delete quiz" });
  }
};


