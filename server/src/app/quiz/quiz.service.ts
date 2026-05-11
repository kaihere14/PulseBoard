import mongoose from "mongoose";
import { getOrCreateUser } from "../authentication/auth.services";
import type { CreateQuizDto } from "./quiz.dto";
import { Poll, Question } from "./quiz.schema";
import type { PollDocument, QuestionDocument } from "./quiz.schema";

export interface QuizSummary {
  _id: string;
  title: string;
  slug: string;
  status: string;
  isPublished: boolean;
  isAnonymousPoll: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizDetail {
  poll: PollDocument;
  questions: QuestionDocument[];
}

const MAX_SLUG_ATTEMPTS = 10;

export interface CreateQuizResult {
  poll: PollDocument;
  questions: QuestionDocument[];
}

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "quiz"
  );
}

async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugifyTitle(title);
  let candidate = baseSlug;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const existing = await Poll.exists({ slug: candidate });
    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  }

  throw new Error("Unable to generate a unique slug");
}

export async function getQuizzesByUser(userId: string): Promise<QuizSummary[]> {
  const { user } = await getOrCreateUser(userId);

  const polls = await Poll.find({ creatorId: user._id })
    .select("_id title slug status isPublished isAnonymousPoll expiresAt createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean<QuizSummary[]>();

  return polls;
}

export async function getPollBySlug(slug: string): Promise<PollDocument | null> {
  return Poll.findOne({ slug });
}

export async function getQuizBySlug(slug: string): Promise<QuizDetail | null> {
  const poll = await Poll.findOne({ slug });
  if (!poll) return null;

  const questions = await Question.find({ pollId: poll._id }).sort({ order: 1 });

  return { poll, questions };
}

export async function createQuizForUser(
  userId: string,
  data: CreateQuizDto
): Promise<CreateQuizResult> {
  const { user } = await getOrCreateUser(userId);
  const slug = await generateUniqueSlug(data.poll.title);

  const session = await mongoose.startSession();
  try {
    const transactionResult = await session.withTransaction(async () => {
      const poll = new Poll({
        title: data.poll.title,
        creatorId: user._id,
        slug,
        isAnonymousPoll: data.poll.isAnonymousPoll ?? false,
        isPublished: data.poll.isPublished ?? false,
        status: data.poll.status ?? "draft",
        expiresAt: data.poll.expiresAt,
      });
      await poll.save({ session });

      const pollId = poll?._id;
      if (!pollId) {
        throw new Error("Failed to create quiz");
      }

      const questionDocs = data.poll.questions.map((question, index) => ({
        pollId,
        question: question.question,
        isRequired: question.isRequired ?? false,
        options: question.options,
        order: question.order ?? index + 1,
      }));

      const questions = await Question.insertMany(questionDocs, { session });
      return {
        poll,
        questions,
      } satisfies CreateQuizResult;
    });

    if (!transactionResult) {
      throw new Error("Quiz creation transaction failed");
    }

    return transactionResult;
  } finally {
    await session.endSession();
  }
}
