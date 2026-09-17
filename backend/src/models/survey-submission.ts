import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { surveyAnswers, surveySubmissions } from "../db/schema.js";
import { isUniqueConstraintError } from "../lib/sqlite-errors.js";
import { HttpError } from "../middleware/error.js";
import { buildSurveyAnswer, type SurveyAnswer } from "./survey-answer.js";

export type SurveySubmission = {
  id: string;
  email: string;
  surveyId: string;
  createdAt: number;
  updatedAt: number;
};

export class SurveySubmissionModel {
  constructor(private db: Db) {}

  async create(input: {
    surveyId: string;
    email: string;
  }): Promise<SurveySubmission> {
    const row = this.buildRow(input);
    await this.db.insert(surveySubmissions).values(row);
    return row;
  }

  async createWithAnswers(input: {
    surveyId: string;
    email: string;
    answers: { surveyQuestionId: string; value: unknown }[];
  }): Promise<{ submission: SurveySubmission; answers: SurveyAnswer[] }> {
    const submission = this.buildRow(input);
    const answers = input.answers.map((answer) =>
      buildSurveyAnswer({
        ...answer,
        submissionId: submission.id,
      }),
    );

    await this.db.insert(surveySubmissions).values(submission);
    try {
      if (answers.length > 0) {
        await this.db.insert(surveyAnswers).values(answers);
      }
    } catch (err) {
      await this.db
        .delete(surveySubmissions)
        .where(eq(surveySubmissions.id, submission.id));
      if (isUniqueConstraintError(err)) {
        throw new HttpError(409, "Answer already exists for this question");
      }
      throw err;
    }

    return { submission, answers };
  }

  async getById(id: string): Promise<SurveySubmission | undefined> {
    const rows = await this.db
      .select()
      .from(surveySubmissions)
      .where(eq(surveySubmissions.id, id))
      .limit(1);
    return rows[0];
  }

  async listBySurveyId(surveyId: string): Promise<SurveySubmission[]> {
    return this.db
      .select()
      .from(surveySubmissions)
      .where(eq(surveySubmissions.surveyId, surveyId))
      .orderBy(desc(surveySubmissions.createdAt));
  }

  async findBySurveyIdAndEmail(
    surveyId: string,
    email: string,
  ): Promise<SurveySubmission | undefined> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new HttpError(400, "Email is required");
    }
    const rows = await this.db
      .select()
      .from(surveySubmissions)
      .where(
        and(
          eq(surveySubmissions.surveyId, surveyId),
          eq(surveySubmissions.email, normalized),
        ),
      )
      .orderBy(desc(surveySubmissions.createdAt))
      .limit(1);
    return rows[0];
  }

  private buildRow(input: {
    surveyId: string;
    email: string;
  }): SurveySubmission {
    const surveyId = input.surveyId.trim();
    const email = input.email.trim().toLowerCase();
    if (!surveyId) {
      throw new HttpError(400, "Survey is required");
    }
    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const now = Date.now();
    return {
      id: crypto.randomUUID(),
      email,
      surveyId,
      createdAt: now,
      updatedAt: now,
    };
  }
}
