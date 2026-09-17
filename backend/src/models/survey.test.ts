import { describe, expect, it } from "vitest";
import { models } from "./index.js";

async function createOwner() {
  return models.users.create({
    email: `owner-${crypto.randomUUID()}@example.com`,
    password: "password1",
  });
}

describe("SurveyModel", () => {
  it("creates a draft survey owned by a user", async () => {
    const owner = await createOwner();
    const survey = await models.surveys.create({
      title: "Care preferences",
      userId: owner.id,
    });

    expect(survey.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(survey.title).toBe("Care preferences");
    expect(survey.userId).toBe(owner.id);
    expect(survey.status).toBe("draft");
    expect(survey.createdAt).toEqual(survey.updatedAt);
  });
});
