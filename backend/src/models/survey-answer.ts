import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { surveyAnswers } from "../db/schema.js";
import { isUniqueConstraintError } from "../lib/sqlite-errors.js";
import { HttpError } from "../middleware/error.js";

export type SurveyAnswer = {
  id: string;
  surveyQuestionId: string;
  submissionId: string;
  value: unknown;
  createdAt: number;
  updatedAt: number;
};

export function buildSurveyAnswer(input: {
  surveyQuestionId: string;
  submissionId: string;
  value: unknown;
}): SurveyAnswer {
  const surveyQuestionId = input.surveyQuestionId.trim();
  const submissionId = input.submissionId.trim();
  if (!surveyQuestionId) {
    throw new HttpError(400, "Question is required");
  }
  if (!submissionId) {
    throw new HttpError(400, "Submission is required");
  }
  if (input.value === undefined) {
    throw new HttpError(400, "Value is required");
  }

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    surveyQuestionId,
    submissionId,
    value: input.value,
    createdAt: now,
    updatedAt: now,
  };
}

export class SurveyAnswerModel {
  constructor(private db: Db) {}

  async create(input: {
    surveyQuestionId: string;
    submissionId: string;
    value: unknown;
  }): Promise<SurveyAnswer> {
    const row = buildSurveyAnswer(input);

    try {
      await this.db.insert(surveyAnswers).values(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new HttpError(409, "Answer already exists for this question");
      }
      throw err;
    }

    return row;
  }

  async listBySubmissionId(submissionId: string): Promise<SurveyAnswer[]> {
    return this.db
      .select()
      .from(surveyAnswers)
      .where(eq(surveyAnswers.submissionId, submissionId));
  }

  async deleteByQuestionId(questionId: string): Promise<void> {
    await this.db
      .delete(surveyAnswers)
      .where(eq(surveyAnswers.surveyQuestionId, questionId));
  }
}
