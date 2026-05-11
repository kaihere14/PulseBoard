import mongoose, { Types } from "mongoose";
import { getOrCreateUser } from "../authentication/auth.services";
import type { CreateQuizDto, SubmitQuizResponseDto, UpdatePollDto } from "./quiz.dto";
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

export interface OptionAnalytics {
  optionIndex: number;
  optionText: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: string;
  question: string;
  isRequired: boolean;
  order: number;
  totalAnswers: number;
  options: OptionAnalytics[];
}

export interface QuizAnalytics {
  poll: {
    _id: string;
    title: string;
    slug: string;
    status: string;
    isPublished: boolean;
    isAnonymousPoll: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  totalResponses: number;
  questions: QuestionAnalytics[];
}

function shouldMarkPollExpired(poll: Pick<PollDocument, "status" | "expiresAt">): boolean {
  return (
    poll.status !== "expired" &&
    poll.expiresAt !== null &&
    poll.expiresAt.getTime() <= Date.now()
  );
}

async function ensurePollExpiryState(poll: PollDocument): Promise<PollDocument> {
  if (!shouldMarkPollExpired(poll)) {
    return poll;
  }

  poll.status = "expired";
  await poll.save();
  return poll;
}

function toQuizSummary(poll: PollDocument): QuizSummary {
  return {
    _id: poll._id.toString(),
    title: poll.title,
    slug: poll.slug,
    status: poll.status,
    isPublished: poll.isPublished,
    isAnonymousPoll: poll.isAnonymousPoll,
    expiresAt: poll.expiresAt,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
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
    .sort({ createdAt: -1 });

  const normalizedPolls = await Promise.all(polls.map((poll) => ensurePollExpiryState(poll)));
  return normalizedPolls.map((poll) => toQuizSummary(poll));
}

export async function getPollBySlug(slug: string): Promise<PollDocument | null> {
  const poll = await Poll.findOne({ slug });
  if (!poll) {
    return null;
  }

  return ensurePollExpiryState(poll);
}

export async function getPollById(pollId: string): Promise<PollDocument | null> {
  const poll = await Poll.findById(pollId);
  if (!poll) {
    return null;
  }

  return ensurePollExpiryState(poll);
}

export async function getQuizBySlug(slug: string): Promise<QuizDetail | null> {
  const poll = await getPollBySlug(slug);
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
  const poll = await getPollById(dto.pollId);
  if (!poll) {
    throw makeError("Quiz not found", "NOT_FOUND");
  }
  if (poll.status === "draft") {
    throw makeError("Quiz is not yet open for responses", "NOT_ACCEPTING");
  }
  if (poll.isPublished) {
    throw makeError("Quiz is closed — results are public", "NOT_ACCEPTING");
  }
  if (poll.status === "expired") {
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

export async function getQuizAnalytics(poll: PollDocument): Promise<QuizAnalytics> {
  const normalizedPoll = await ensurePollExpiryState(poll);
  const pollId = normalizedPoll._id;

  const [questions, totalResponses, responseDocs] = await Promise.all([
    Question.find({ pollId }).sort({ order: 1 }).lean(),
    Response.countDocuments({ pollId }),
    Response.find({ pollId }).select("_id").lean(),
  ]);

  const responseIds = responseDocs.map((r) => r._id);

  type OptionCountRow = {
    _id: { questionId: Types.ObjectId; selectedOptionIndex: number };
    count: number;
  };

  // Skip the aggregation pipeline entirely when nobody has responded yet
  const counts: OptionCountRow[] =
    responseIds.length > 0
      ? await Answer.aggregate<OptionCountRow>([
          { $match: { responseId: { $in: responseIds } } },
          {
            $group: {
              _id: {
                questionId: "$questionId",
                selectedOptionIndex: "$selectedOptionIndex",
              },
              count: { $sum: 1 },
            },
          },
        ])
      : [];

  // questionId -> (optionIndex -> count)
  const countMap = new Map<string, Map<number, number>>();
  for (const row of counts) {
    const qid = row._id.questionId.toString();
    const inner = countMap.get(qid) ?? new Map<number, number>();
    inner.set(row._id.selectedOptionIndex, row.count);
    countMap.set(qid, inner);
  }

  const questionsAnalytics: QuestionAnalytics[] = questions.map((q) => {
    const optionCounts = countMap.get(q._id.toString()) ?? new Map<number, number>();
    let totalAnswers = 0;
    for (const v of optionCounts.values()) totalAnswers += v;

    const options: OptionAnalytics[] = q.options.map((opt, idx) => {
      const c = optionCounts.get(idx) ?? 0;
      const pct = totalAnswers > 0 ? (c / totalAnswers) * 100 : 0;
      return {
        optionIndex: idx,
        optionText: opt,
        count: c,
        percentage: Math.round(pct * 100) / 100,
      };
    });

    return {
      questionId: q._id.toString(),
      question: q.question,
      isRequired: q.isRequired,
      order: q.order,
      totalAnswers,
      options,
    };
  });

  return {
    poll: {
      _id: normalizedPoll._id.toString(),
      title: normalizedPoll.title,
      slug: normalizedPoll.slug,
      status: normalizedPoll.status,
      isPublished: normalizedPoll.isPublished,
      isAnonymousPoll: normalizedPoll.isAnonymousPoll,
      expiresAt: normalizedPoll.expiresAt,
      createdAt: normalizedPoll.createdAt,
      updatedAt: normalizedPoll.updatedAt,
    },
    totalResponses,
    questions: questionsAnalytics,
  };
}

export async function isPollCreator(
  userId: string,
  poll: PollDocument
): Promise<boolean> {
  const { user } = await getOrCreateUser(userId);
  return poll.creatorId.toString() === user._id.toString();
}

export async function updatePollBySlug(
  userId: string,
  slug: string,
  data: UpdatePollDto
): Promise<PollDocument> {
  const { user } = await getOrCreateUser(userId);
  const poll = await Poll.findOne({ slug });
  if (!poll) {
    throw makeError("Quiz not found", "NOT_FOUND");
  }
  if (poll.creatorId.toString() !== user._id.toString()) {
    throw makeError("Only the creator can modify this quiz", "FORBIDDEN");
  }

  if (data.title !== undefined) poll.title = data.title;
  if (data.status !== undefined) poll.status = data.status;
  if (data.isPublished !== undefined) poll.isPublished = data.isPublished;
  if (data.isAnonymousPoll !== undefined) poll.isAnonymousPoll = data.isAnonymousPoll;
  if (data.expiresAt !== undefined) poll.expiresAt = data.expiresAt;

  if (poll.isPublished) {
    poll.status = "expired";
  }

  await poll.save();
  return ensurePollExpiryState(poll);
}

export async function deletePollBySlug(userId: string, slug: string): Promise<void> {
  const { user } = await getOrCreateUser(userId);
  const poll = await Poll.findOne({ slug });
  if (!poll) {
    throw makeError("Quiz not found", "NOT_FOUND");
  }
  if (poll.creatorId.toString() !== user._id.toString()) {
    throw makeError("Only the creator can delete this quiz", "FORBIDDEN");
  }

  const pollId = poll._id;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Wipe answers first (they're scoped by responseId), then responses,
      // then questions, then the poll itself.
      const responseIds = await Response.find({ pollId })
        .select("_id")
        .session(session)
        .lean<{ _id: Types.ObjectId }[]>();

      if (responseIds.length > 0) {
        await Answer.deleteMany(
          { responseId: { $in: responseIds.map((r) => r._id) } },
          { session }
        );
      }

      await Response.deleteMany({ pollId }, { session });
      await Question.deleteMany({ pollId }, { session });
      await Poll.deleteOne({ _id: pollId }, { session });
    });
  } finally {
    await session.endSession();
  }
}
