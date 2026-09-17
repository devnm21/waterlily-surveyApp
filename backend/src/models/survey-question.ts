import { and, asc, eq, max } from "drizzle-orm";
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
  description: string | null;
  type: SurveyQuestionType;
  sortOrder: number;
  options: string[] | null;
  createdAt: number;
  updatedAt: number;
};

function isQuestionType(value: string): value is SurveyQuestionType {
  return (surveyQuestionTypes as readonly string[]).includes(value);
}

export function validateAnswerValue(
  question: SurveyQuestion,
  value: unknown,
): void {
  switch (question.type) {
    case "short_text":
    case "long_text":
      if (typeof value !== "string") {
        throw new HttpError(400, "Answer must be a string");
      }
      return;
    case "select":
      if (typeof value !== "string") {
        throw new HttpError(400, "Answer must be a string");
      }
      if (question.options && !question.options.includes(value)) {
        throw new HttpError(400, "Answer is not a valid option");
      }
      return;
    case "multi-select":
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      ) {
        throw new HttpError(400, "Answer must be an array of strings");
      }
      if (
        question.options &&
        value.some((item) => !question.options!.includes(item))
      ) {
        throw new HttpError(400, "Answer is not a valid option");
      }
      return;
  }
}

function normalizeDescription(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text.length === 0 ? null : text;
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
    description?: string | null;
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
    const description = normalizeDescription(input.description);

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.insertQuestion({
          surveyId,
          title,
          type: input.type,
          sortOrder: input.sortOrder,
          options,
          description,
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
    description: string | null;
  }): Promise<SurveyQuestion> {
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder(input.surveyId));
    const now = Date.now();
    const row: SurveyQuestion = {
      id: crypto.randomUUID(),
      surveyId: input.surveyId,
      title: input.title,
      description: input.description,
      type: input.type,
      sortOrder,
      options: input.options,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(surveyQuestions).values(row);
    return row;
  }

  async getById(id: string): Promise<SurveyQuestion | undefined> {
    const rows = await this.db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.id, id))
      .limit(1);
    return rows[0];
  }

  async listBySurveyId(surveyId: string): Promise<SurveyQuestion[]> {
    return this.db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.sortOrder));
  }

  async update(input: {
    id: string;
    surveyId: string;
    title?: string;
    description?: unknown;
    type?: string;
    sortOrder?: number;
    options?: unknown;
  }): Promise<SurveyQuestion> {
    const existing = await this.getById(input.id);
    if (!existing || existing.surveyId !== input.surveyId) {
      throw new HttpError(404, "Question not found");
    }

    const patch: Partial<SurveyQuestion> = { updatedAt: Date.now() };
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new HttpError(400, "Title is required");
      }
      patch.title = title;
    }
    if (input.description !== undefined) {
      patch.description = normalizeDescription(input.description);
    }
    if (input.type !== undefined) {
      if (!isQuestionType(input.type)) {
        throw new HttpError(400, "Invalid question type");
      }
      patch.type = input.type;
    }
    if (input.sortOrder !== undefined) {
      if (!Number.isInteger(input.sortOrder) || input.sortOrder < 1) {
        throw new HttpError(400, "Invalid sort order");
      }
      patch.sortOrder = input.sortOrder;
    }
    if (input.options !== undefined) {
      patch.options = normalizeOptions(input.options);
    }

    try {
      const [row] = await this.db
        .update(surveyQuestions)
        .set(patch)
        .where(
          and(
            eq(surveyQuestions.id, input.id),
            eq(surveyQuestions.surveyId, input.surveyId),
          ),
        )
        .returning();
      return row ?? { ...existing, ...patch };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new HttpError(409, "Question order already in use");
      }
      throw err;
    }
  }

  async deleteById(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new HttpError(404, "Question not found");
    }
    await this.db.delete(surveyQuestions).where(eq(surveyQuestions.id, id));
  }

  private async nextSortOrder(surveyId: string): Promise<number> {
    const [row] = await this.db
      .select({ maxOrder: max(surveyQuestions.sortOrder) })
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId));
    return (row?.maxOrder ?? 0) + 1;
  }
}
