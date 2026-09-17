import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/password.js";
import { isUniqueConstraintError } from "../lib/sqlite-errors.js";
import { HttpError } from "../middleware/error.js";

export type PublicUser = {
  id: string;
  email: string;
  createdAt: number;
  updatedAt: number;
};

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
};

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class UserModel {
  constructor(private db: Db) {}

  async create(input: { email: string; password: string }): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const password = input.password ?? "";
    if (!email) {
      throw new HttpError(400, "Email is required");
    }
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters");
    }

    const now = Date.now();
    const row: UserRow = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.db.insert(users).values(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new HttpError(409, "Email already registered");
      }
      throw err;
    }

    return toPublic(row);
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const normalized = email.trim().toLowerCase();
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0];
  }
}
