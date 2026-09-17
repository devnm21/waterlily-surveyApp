import type { Db } from "../db/index.js";
import { surveys, type SurveyStatus } from "../db/schema.js";
import { HttpError } from "../middleware/error.js";

export type Survey = {
  id: string;
  title: string;
  userId: string;
  status: SurveyStatus;
  createdAt: number;
  updatedAt: number;
};

export class SurveyModel {
  constructor(private db: Db) {}

  async create(input: { title: string; userId: string }): Promise<Survey> {
    const title = input.title.trim();
    const userId = input.userId.trim();
    if (!title) {
      throw new HttpError(400, "Title is required");
    }
    if (!userId) {
      throw new HttpError(400, "User is required");
    }

    const now = Date.now();
    const row: Survey = {
      id: crypto.randomUUID(),
      title,
      userId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(surveys).values(row);
    return row;
  }
}
