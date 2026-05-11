import { z } from "zod";

const quizStatusSchema = z.enum(["draft", "active", "expired"]);

export const createQuizQuestionSchema = z.object({
  question: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(z.string().trim().min(1, "Option text is required"))
    .min(2, "A question needs at least 2 options"),
  isRequired: z.boolean().optional(),
  order: z.number().optional(),
});

const expiresAtSchema = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return null;
}, z.date().nullable());

export const createPollSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  isAnonymousPoll: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  status: quizStatusSchema.optional(),
  expiresAt: expiresAtSchema.optional(),
});

export const createQuizSchema = z.object({
  poll: createPollSchema.extend({
    questions: z
      .array(createQuizQuestionSchema)
      .min(1, "At least one question is required"),
  }),
});

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const createResponseSchema = z.object({
  pollId: objectIdSchema,
  voterId: z.string().trim().min(1, "voterId is required"),
});

export const createAnswerSchema = z.object({
  responseId: objectIdSchema,
  questionId: objectIdSchema,
  selectedOptionIndex: z.number().int().min(0),
});

export const submitQuizResponseSchema = z.object({
  pollId: objectIdSchema,
  voterId: z.string().trim().min(1, "voterId is required"),
  answers: z
    .array(
      z.object({
        questionId: objectIdSchema,
        selectedOptionIndex: z.number().int().min(0),
      })
    )
    .min(1, "At least one answer is required"),
});

export const getQuizBySlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
});

export type CreateQuizDto = z.infer<typeof createQuizSchema>;
export type CreateResponseDto = z.infer<typeof createResponseSchema>;
export type CreateAnswerDto = z.infer<typeof createAnswerSchema>;
export type SubmitQuizResponseDto = z.infer<typeof submitQuizResponseSchema>;
export type GetQuizBySlugDto = z.infer<typeof getQuizBySlugSchema>;
