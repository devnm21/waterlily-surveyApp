import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes to a scrypt string that is not the plaintext", async () => {
    const stored = await hashPassword("secret-ok");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(stored).not.toContain("secret-ok");
  });

  it("verifies the matching password", async () => {
    const stored = await hashPassword("secret-ok");
    await expect(verifyPassword("secret-ok", stored)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("secret-ok");
    await expect(verifyPassword("nope-nope", stored)).resolves.toBe(false);
  });

  it("rejects a malformed stored value", async () => {
    await expect(verifyPassword("secret-ok", "not-a-hash")).resolves.toBe(false);
  });
});
