import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface IPoll {
  title: string;
  creatorId: Types.ObjectId;
  slug: string;
  isAnonymousPoll: boolean;
  isPublished: boolean;
  status: "draft" | "active" | "expired";
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestion {
  pollId: Types.ObjectId;
  question: string;
  isRequired: boolean;
  options: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResponse {
  pollId: Types.ObjectId;
  voterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswer {
  responseId: Types.ObjectId;
  questionId: Types.ObjectId;
  selectedOptionIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PollDocument = HydratedDocument<IPoll>;
export type QuestionDocument = HydratedDocument<IQuestion>;
export type ResponseDocument = HydratedDocument<IResponse>;
export type AnswerDocument = HydratedDocument<IAnswer>;

const pollSchema = new Schema<IPoll>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,   // enforced at DB level, not just app level
      index: true,
    },
    isAnonymousPoll: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "active", "expired"],
      default: "draft",
    },
    expiresAt: {
      type: Date,
      default: null,  // null = no expiry
    },
  },
  { timestamps: true }
);

pollSchema.index({ expiresAt: 1 }, { sparse: true });



const questionSchema = new Schema<IQuestion>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length >= 2,
        message: "A question needs at least 2 options",
      },
    },
    order: {
      type: Number,
      required: true,
    },
    // answerIndex removed — answers live in the Response collection
  },
  { timestamps: true }
);



const responseSchema = new Schema<IResponse>(
    {
      pollId: {
        type: Schema.Types.ObjectId,
        ref: "Poll",
        required: true,
        index: true,
      },
      // voterId stores BOTH auth and anonymous identities
      voterId: {
        type:String,
        default: undefined,
        required: true,
      },
    },
    { timestamps: true }
  );
  
  // Prevent double submission in authenticated mode.
  responseSchema.index(
    { pollId: 1, voterId: 1 },
    { unique: true, sparse: true }
  );
  

  
const answerSchema = new Schema<IAnswer>({
    responseId: {
      type: Schema.Types.ObjectId,
      ref: "Response",
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },

    selectedOptionIndex: {
      type: Number,
      required: true,
    },
  },{timestamps: true});
  
export const Response = model<IResponse>("Response", responseSchema);
export const Answer = model<IAnswer>("Answer", answerSchema);

export const Poll = model<IPoll>("Poll", pollSchema);
export const Question = model<IQuestion>("Question", questionSchema);