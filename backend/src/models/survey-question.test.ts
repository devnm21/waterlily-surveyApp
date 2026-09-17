import { describe, expect, it } from "vitest";
import { models } from "./index.js";

async function createSurvey() {
  const owner = await models.users.create({
    email: `owner-${crypto.randomUUID()}@example.com`,
    password: "password1",
  });
  return models.surveys.create({
    title: "Intake",
    userId: owner.id,
  });
}

describe("SurveyQuestionModel", () => {
  it("defaults sortOrder to 1 then 2 for questions on the same survey", async () => {
    const survey = await createSurvey();

    const first = await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "Full name",
      type: "short_text",
    });
    const second = await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "Notes",
      type: "long_text",
    });

    expect(first.sortOrder).toBe(1);
    expect(second.sortOrder).toBe(2);
  });

  it("defaults sortOrder to MAX(sort_order)+1 when a gap exists", async () => {
    const survey = await createSurvey();

    await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "Pinned last",
      type: "select",
      sortOrder: 5,
    });
    const next = await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "After the gap",
      type: "multi-select",
    });

    expect(next.sortOrder).toBe(6);
  });

  it("stores options on a select question", async () => {
    const survey = await createSurvey();
    const question = await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "Preferred contact",
      type: "select",
      options: ["Email", "Phone"],
    });

    expect(question.options).toEqual(["Email", "Phone"]);
  });

  it("leaves options unset when omitted", async () => {
    const survey = await createSurvey();
    const question = await models.surveyQuestions.create({
      surveyId: survey.id,
      title: "Full name",
      type: "short_text",
    });

    expect(question.options).toBeNull();
  });
});
