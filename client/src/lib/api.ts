export function apiOrigin(): string {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return url && url.length > 0 ? url : "http://localhost:3000";
}

export type QuizStatus = "draft" | "active" | "expired";

export interface CreateQuizQuestionPayload {
  question: string;
  options: string[];
  isRequired?: boolean;
  order?: number;
}

export interface CreateQuizPayload {
  poll: {
    title: string;
    isAnonymousPoll?: boolean;
    isPublished?: boolean;
    status?: QuizStatus;
    expiresAt?: string | null;
    questions: CreateQuizQuestionPayload[];
  };
}

export interface CreateQuizResult {
  poll: {
    _id: string;
    title: string;
    slug: string;
    isAnonymousPoll: boolean;
    isPublished: boolean;
    status: QuizStatus;
    expiresAt: string | null;
  };
  questions: Array<{
    _id: string;
    pollId: string;
    question: string;
    options: string[];
    isRequired: boolean;
    order: number;
  }>;
}

export interface QuizSummary {
  _id: string;
  title: string;
  slug: string;
  status: QuizStatus;
  isPublished: boolean;
  isAnonymousPoll: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class LoginRequiredError extends Error {
  readonly code = "LOGIN_REQUIRED" as const;
  constructor() {
    super("Login required to access this quiz");
    this.name = "LoginRequiredError";
  }
}

export class AlreadyVotedError extends Error {
  readonly code = "ALREADY_VOTED" as const;
  constructor() {
    super("You have already submitted a response to this quiz");
    this.name = "AlreadyVotedError";
  }
}

export class QuizNotActiveError extends Error {
  readonly code = "NOT_ACTIVE" as const;
  constructor(message: string) {
    super(message);
    this.name = "QuizNotActiveError";
  }
}

export interface QuizDetail {
  poll: {
    _id: string;
    title: string;
    slug: string;
    isAnonymousPoll: boolean;
    isPublished: boolean;
    status: QuizStatus;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  questions: Array<{
    _id: string;
    pollId: string;
    question: string;
    options: string[];
    isRequired: boolean;
    order: number;
  }>;
}

export async function getQuizBySlug(
  slug: string,
  token: string | null
): Promise<QuizDetail> {
  const response = await fetch(`${apiOrigin()}/api/quiz/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (response.status === 401) {
    const code =
      data && typeof data === "object" && "code" in data
        ? (data as { code: unknown }).code
        : null;
    if (code === "LOGIN_REQUIRED") throw new LoginRequiredError();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Failed to fetch quiz (${response.status})`;
    throw new Error(message);
  }

  return data as QuizDetail;
}

export async function getUserQuizzes(token: string | null): Promise<QuizSummary[]> {
  const response = await fetch(`${apiOrigin()}/api/quiz`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Failed to fetch quizzes (${response.status})`;
    throw new Error(message);
  }

  return (data as { quizzes: QuizSummary[] }).quizzes;
}

export interface SubmitAnswerPayload {
  pollId: string;
  voterId: string;
  answers: Array<{ questionId: string; selectedOptionIndex: number }>;
}

export interface SubmitAnswerResult {
  response: { _id: string; pollId: string; voterId: string };
  answers: Array<{
    _id: string;
    responseId: string;
    questionId: string;
    selectedOptionIndex: number;
  }>;
}

export async function submitQuizResponse(
  token: string | null,
  payload: SubmitAnswerPayload
): Promise<SubmitAnswerResult> {
  const response = await fetch(`${apiOrigin()}/api/quiz/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  const errorMessage =
    data && typeof data === "object" && "error" in data
      ? String((data as { error: unknown }).error)
      : null;

  if (response.status === 409) {
    if (errorMessage?.toLowerCase().includes("already submitted")) {
      throw new AlreadyVotedError();
    }
    throw new QuizNotActiveError(errorMessage ?? "Quiz is not accepting responses");
  }

  if (!response.ok) {
    throw new Error(errorMessage ?? `Failed to submit (${response.status})`);
  }

  return data as SubmitAnswerResult;
}

export async function createQuiz(
  token: string | null,
  payload: CreateQuizPayload
): Promise<CreateQuizResult> {
  const response = await fetch(`${apiOrigin()}/api/quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Failed to create quiz (${response.status})`;
    throw new Error(message);
  }

  return data as CreateQuizResult;
}
