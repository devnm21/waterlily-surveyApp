import { desc, eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { surveys, surveyStatuses, type SurveyStatus } from "../db/schema.js";
import { HttpError } from "../middleware/error.js";

export type Survey = {
  id: string;
  title: string;
  userId: string;
  status: SurveyStatus;
  createdAt: number;
  updatedAt: number;
};

function isSurveyStatus(value: string): value is SurveyStatus {
  return (surveyStatuses as readonly string[]).includes(value);
}

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

  async getById(id: string): Promise<Survey | undefined> {
    const rows = await this.db
      .select()
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1);
    return rows[0];
  }

  async listByUserId(userId: string): Promise<Survey[]> {
    return this.db
      .select()
      .from(surveys)
      .where(eq(surveys.userId, userId))
      .orderBy(desc(surveys.createdAt));
  }

  async update(
    id: string,
    input: { title?: string; status?: string },
  ): Promise<Survey> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new HttpError(404, "Survey not found");
    }
    if (input.title === undefined && input.status === undefined) {
      throw new HttpError(400, "Nothing to update");
    }

    const patch: Partial<Survey> = { updatedAt: Date.now() };
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new HttpError(400, "Title is required");
      }
      patch.title = title;
    }
    if (input.status !== undefined) {
      if (!isSurveyStatus(input.status)) {
        throw new HttpError(400, "Invalid status");
      }
      patch.status = input.status;
    }

    const [row] = await this.db
      .update(surveys)
      .set(patch)
      .where(eq(surveys.id, id))
      .returning();
    return row ?? { ...existing, ...patch };
  }
}
