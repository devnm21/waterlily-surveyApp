import { describe, expect, it } from "vitest";
import { HttpError } from "../middleware/error.js";
import { models } from "./index.js";

describe("UserModel", () => {
  it("creates a public user and can look up the row by email", async () => {
    const created = await models.users.create({
      email: "  Ada@Example.com ",
      password: "password1",
    });
    expect(created.email).toBe("ada@example.com");
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created).not.toHaveProperty("passwordHash");

    const row = await models.users.findByEmail("ada@example.com");
    expect(row?.email).toBe("ada@example.com");
    expect(row?.passwordHash).toMatch(/^scrypt\$/);
    expect(row?.passwordHash).not.toContain("password1");
  });

  it("rejects a short password", async () => {
    await expect(
      models.users.create({ email: "a@b.co", password: "short" }),
    ).rejects.toMatchObject({ status: 400 } satisfies Partial<HttpError>);
  });
});
