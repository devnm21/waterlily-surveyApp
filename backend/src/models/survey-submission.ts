import type { Db } from "../db/index.js";
import { surveySubmissions } from "../db/schema.js";
import { HttpError } from "../middleware/error.js";

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
    const surveyId = input.surveyId.trim();
    const email = input.email.trim().toLowerCase();
    if (!surveyId) {
      throw new HttpError(400, "Survey is required");
    }
    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const now = Date.now();
    const row: SurveySubmission = {
      id: crypto.randomUUID(),
      email,
      surveyId,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(surveySubmissions).values(row);
    return row;
  }
}
