import mongoose from "mongoose";
import { getOrCreateUser } from "../authentication/auth.services";
import type { CreateQuizDto, SubmitQuizResponseDto } from "./quiz.dto";
import { Poll, Question, Response, Answer } from "./quiz.schema";
import type { PollDocument, QuestionDocument, ResponseDocument, AnswerDocument } from "./quiz.schema";

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

export interface SubmitQuizResult {
  response: ResponseDocument;
  answers: AnswerDocument[];
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

export async function getPollById(pollId: string): Promise<PollDocument | null> {
  return Poll.findById(pollId);
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

function makeError(message: string, code: string): Error {
  return Object.assign(new Error(message), { serviceCode: code });
}

export async function submitQuizResponse(
  dto: SubmitQuizResponseDto,
  resolvedVoterId: string
): Promise<SubmitQuizResult> {
  const poll = await Poll.findById(dto.pollId);
  if (!poll) {
    throw makeError("Quiz not found", "NOT_FOUND");
  }
  if (poll.status === "draft") {
    throw makeError("Quiz is not yet open for responses", "NOT_ACCEPTING");
  }
  if (poll.status === "expired" || (poll.expiresAt && poll.expiresAt < new Date())) {
    throw makeError("Quiz has expired", "EXPIRED");
  }

  const questions = await Question.find({ pollId: poll._id }).lean();
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  // Ensure all required questions have a corresponding answer
  const answeredIds = new Set(dto.answers.map((a) => a.questionId));
  for (const q of questions) {
    if (q.isRequired && !answeredIds.has(q._id.toString())) {
      throw makeError(`Question "${q.question}" is required`, "MISSING_REQUIRED");
    }
  }

  // Validate every submitted answer references a real question and a valid option index
  for (const answer of dto.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw makeError(
        `Question ${answer.questionId} does not belong to this quiz`,
        "INVALID_QUESTION"
      );
    }
    if (answer.selectedOptionIndex >= question.options.length) {
      throw makeError(
        `Option index ${answer.selectedOptionIndex} is out of range for question "${question.question}"`,
        "INVALID_OPTION"
      );
    }
  }

  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const response = new Response({ pollId: poll._id, voterId: resolvedVoterId });
      await response.save({ session });

      const answerDocs = dto.answers.map((a) => ({
        responseId: response._id,
        questionId: a.questionId,
        selectedOptionIndex: a.selectedOptionIndex,
      }));

      const answers = await Answer.insertMany(answerDocs, { session });
      return { response, answers } satisfies SubmitQuizResult;
    });

    if (!result) throw new Error("Submit transaction failed");
    return result;
  } finally {
    await session.endSession();
  }
}
