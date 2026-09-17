import { describe, expect, it } from "vitest";
import { models } from "./index.js";

async function createQuestion() {
  const owner = await models.users.create({
    email: `owner-${crypto.randomUUID()}@example.com`,
    password: "password1",
  });
  const survey = await models.surveys.create({
    title: "Intake",
    userId: owner.id,
  });
  const question = await models.surveyQuestions.create({
    surveyId: survey.id,
    title: "Full name",
    type: "short_text",
  });
  return { survey, question };
}

describe("SurveySubmissionModel", () => {
  it("creates a submission for a survey", async () => {
    const { survey } = await createQuestion();
    const submission = await models.surveySubmissions.create({
      surveyId: survey.id,
      email: "  Responder@Example.com ",
    });

    expect(submission.surveyId).toBe(survey.id);
    expect(submission.email).toBe("responder@example.com");
    expect(submission.createdAt).toEqual(submission.updatedAt);
  });
});

describe("SurveyAnswerModel", () => {
  it("stores a JSON value on a submission", async () => {
    const { question } = await createQuestion();
    const submission = await models.surveySubmissions.create({
      surveyId: question.surveyId,
      email: "a@b.co",
    });

    const answer = await models.surveyAnswers.create({
      surveyQuestionId: question.id,
      submissionId: submission.id,
      value: "Ada",
    });

    expect(answer.value).toBe("Ada");
    expect(answer.surveyQuestionId).toBe(question.id);
    expect(answer.submissionId).toBe(submission.id);
  });

  it("rejects a second answer for the same question and submission", async () => {
    const { question } = await createQuestion();
    const submission = await models.surveySubmissions.create({
      surveyId: question.surveyId,
      email: "a@b.co",
    });

    await models.surveyAnswers.create({
      surveyQuestionId: question.id,
      submissionId: submission.id,
      value: "first",
    });

    await expect(
      models.surveyAnswers.create({
        surveyQuestionId: question.id,
        submissionId: submission.id,
        value: "second",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
