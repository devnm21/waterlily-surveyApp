import { eq, max } from "drizzle-orm";
import type { Db } from "../db/index.js";
import {
  surveyQuestionTypes,
  surveyQuestions,
  type SurveyQuestionType,
} from "../db/schema.js";
import { isUniqueConstraintError } from "../lib/sqlite-errors.js";
import { HttpError } from "../middleware/error.js";

export type SurveyQuestion = {
  id: string;
  surveyId: string;
  title: string;
  type: SurveyQuestionType;
  sortOrder: number;
  options: string[] | null;
  createdAt: number;
  updatedAt: number;
};

function isQuestionType(value: string): value is SurveyQuestionType {
  return (surveyQuestionTypes as readonly string[]).includes(value);
}

function normalizeOptions(options: unknown): string[] | null {
  if (options === undefined || options === null) {
    return null;
  }
  if (
    !Array.isArray(options) ||
    options.some((item) => typeof item !== "string")
  ) {
    throw new HttpError(400, "Options must be an array of strings");
  }
  return options;
}

export class SurveyQuestionModel {
  constructor(private db: Db) {}

  async create(input: {
    surveyId: string;
    title: string;
    type: SurveyQuestionType;
    sortOrder?: number;
    options?: string[] | null;
  }): Promise<SurveyQuestion> {
    const surveyId = input.surveyId.trim();
    const title = input.title.trim();
    if (!surveyId) {
      throw new HttpError(400, "Survey is required");
    }
    if (!title) {
      throw new HttpError(400, "Title is required");
    }
    if (!isQuestionType(input.type)) {
      throw new HttpError(400, "Invalid question type");
    }
    const options = normalizeOptions(input.options);

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.insertQuestion({
          surveyId,
          title,
          type: input.type,
          sortOrder: input.sortOrder,
          options,
        });
      } catch (err) {
        if (
          input.sortOrder === undefined &&
          isUniqueConstraintError(err) &&
          attempt < maxAttempts - 1
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new HttpError(409, "Could not assign question order");
  }

  private async insertQuestion(input: {
    surveyId: string;
    title: string;
    type: SurveyQuestionType;
    sortOrder?: number;
    options: string[] | null;
  }): Promise<SurveyQuestion> {
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder(input.surveyId));
    const now = Date.now();
    const row: SurveyQuestion = {
      id: crypto.randomUUID(),
      surveyId: input.surveyId,
      title: input.title,
      type: input.type,
      sortOrder,
      options: input.options,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(surveyQuestions).values(row);
    return row;
  }

  private async nextSortOrder(surveyId: string): Promise<number> {
    const [row] = await this.db
      .select({ maxOrder: max(surveyQuestions.sortOrder) })
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId));
    return (row?.maxOrder ?? 0) + 1;
  }
}
