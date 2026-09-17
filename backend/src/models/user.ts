import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/password.js";
import { HttpError } from "../middleware/error.js";

export type PublicUser = {
  id: string;
  email: string;
};

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
};

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email };
}

function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.message.includes("UNIQUE") || err.message.includes("unique")) {
      return true;
    }
  }
  const code = (err as { code?: string }).code;
  return code === "SQLITE_CONSTRAINT_UNIQUE";
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

    const row: UserRow = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await hashPassword(password),
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
}
