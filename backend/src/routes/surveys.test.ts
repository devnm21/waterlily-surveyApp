import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";

const password = "password1";

async function registerAndLogin(email = `${crypto.randomUUID()}@example.com`) {
  const agent = request.agent(app);
  await agent.post("/users").send({ email, password });
  await agent.post("/auth/login").send({ email, password });
  return { agent, email };
}

async function createSurveyWithQuestion(agent: ReturnType<typeof request.agent>) {
  const created = await agent.post("/api/survey").send({ title: "Intake" });
  const surveyId = created.body.survey.id as string;
  const question = await agent.post(`/api/survey/${surveyId}/question`).send({
    title: "Full name",
    type: "short_text",
  });
  return {
    surveyId,
    questionId: question.body.question.id as string,
  };
}

async function publishSurvey(
  agent: ReturnType<typeof request.agent>,
  surveyId: string,
) {
  const res = await agent
    .patch(`/api/survey/${surveyId}`)
    .send({ status: "published" });
  expect(res.status).toBe(200);
}

describe("survey creator routes", () => {
  it("rejects creating a survey without a session", async () => {
    const res = await request(app).post("/api/survey").send({ title: "Intake" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized", status: 401 });
  });

  it("creates a draft survey for the logged-in user", async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.post("/api/survey").send({ title: "  Care preferences " });

    expect(res.status).toBe(201);
    expect(res.body.survey.title).toBe("Care preferences");
    expect(res.body.survey.status).toBe("draft");
    expect(res.body.survey.id).toBeTruthy();
    expect(res.body.survey.userId).toBeTruthy();
  });

  it("lists only surveys owned by the current user", async () => {
    const alice = await registerAndLogin("alice@example.com");
    const bob = await registerAndLogin("bob@example.com");

    await alice.agent.post("/api/survey").send({ title: "Alice survey" });
    await bob.agent.post("/api/survey").send({ title: "Bob survey" });

    const res = await alice.agent.get("/api/surveys");
    expect(res.status).toBe(200);
    expect(res.body.surveys).toHaveLength(1);
    expect(res.body.surveys[0].title).toBe("Alice survey");
  });

  it("creates a question on an owned survey", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;

    const res = await agent.post(`/api/survey/${surveyId}/question`).send({
      title: "Full name",
      type: "short_text",
    });

    expect(res.status).toBe(201);
    expect(res.body.question.title).toBe("Full name");
    expect(res.body.question.type).toBe("short_text");
    expect(res.body.question.surveyId).toBe(surveyId);
    expect(res.body.question.sortOrder).toBe(1);
  });

  it("updates the title of an owned survey", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;

    const res = await agent
      .patch(`/api/survey/${surveyId}`)
      .send({ title: "  Care preferences " });

    expect(res.status).toBe(200);
    expect(res.body.survey.title).toBe("Care preferences");
    expect(res.body.survey.status).toBe("draft");
  });

  it("publishes and unpublishes an owned survey", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;
    expect(created.body.survey.status).toBe("draft");

    const published = await agent
      .patch(`/api/survey/${surveyId}`)
      .send({ status: "published" });
    expect(published.status).toBe(200);
    expect(published.body.survey.status).toBe("published");
    expect(published.body.survey.title).toBe("Intake");

    const drafted = await agent
      .patch(`/api/survey/${surveyId}`)
      .send({ status: "draft" });
    expect(drafted.status).toBe(200);
    expect(drafted.body.survey.status).toBe("draft");
  });

  it("rejects an invalid survey status", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;

    const res = await agent
      .patch(`/api/survey/${surveyId}`)
      .send({ status: "live" });
    expect(res.status).toBe(400);
  });

  it("deletes an owned question", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);

    const res = await agent.delete(`/api/question/${questionId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const survey = await agent.get(`/api/survey/${surveyId}`);
    expect(survey.body.questions).toEqual([]);
  });

  it("deletes a question even if it already has answers", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);
    await publishSurvey(agent, surveyId);

    await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "responder@example.com",
        answers: [{ questionId, value: "Ada" }],
      });

    const res = await agent.delete(`/api/question/${questionId}`);
    expect(res.status).toBe(200);

    const survey = await agent.get(`/api/survey/${surveyId}`);
    expect(survey.body.questions).toEqual([]);
  });

  it("forbids deleting another user's question", async () => {
    const owner = await registerAndLogin();
    const other = await registerAndLogin();
    const created = await owner.agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;
    const question = await owner.agent.post(`/api/survey/${surveyId}/question`).send({
      title: "Full name",
      type: "short_text",
    });
    const questionId = question.body.question.id as string;

    const res = await other.agent.delete(`/api/question/${questionId}`);
    expect(res.status).toBe(403);
  });

  it("updates a question on an owned survey", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;
    const question = await agent.post(`/api/survey/${surveyId}/question`).send({
      title: "Full name",
      type: "short_text",
    });
    const questionId = question.body.question.id as string;

    const res = await agent
      .patch(`/api/survey/${surveyId}/question/${questionId}`)
      .send({ title: "Preferred name" });

    expect(res.status).toBe(200);
    expect(res.body.question.title).toBe("Preferred name");
    expect(res.body.question.type).toBe("short_text");
  });

  it("updates a question description", async () => {
    const { agent } = await registerAndLogin();
    const created = await agent.post("/api/survey").send({ title: "Intake" });
    const surveyId = created.body.survey.id as string;
    const question = await agent.post(`/api/survey/${surveyId}/question`).send({
      title: "Full name",
      type: "short_text",
    });
    const questionId = question.body.question.id as string;
    expect(question.body.question.description).toBeNull();

    const res = await agent
      .patch(`/api/survey/${surveyId}/question/${questionId}`)
      .send({ description: "  Legal name as on ID " });

    expect(res.status).toBe(200);
    expect(res.body.question.description).toBe("Legal name as on ID");
  });

  it("lists submissions for an owned survey and forbids other users", async () => {
    const owner = await registerAndLogin();
    const other = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(owner.agent);
    await publishSurvey(owner.agent, surveyId);

    await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "responder@example.com",
        answers: [{ questionId, value: "Ada" }],
      });

    const allowed = await owner.agent.get(`/api/survey/${surveyId}/submissions`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.submissions).toHaveLength(1);
    expect(allowed.body.submissions[0].email).toBe("responder@example.com");

    const forbidden = await other.agent.get(`/api/survey/${surveyId}/submissions`);
    expect(forbidden.status).toBe(403);
  });
});

describe("survey respondent routes", () => {
  it("hides a draft survey from the public", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId } = await createSurveyWithQuestion(agent);

    const res = await request(app).get(`/api/survey/${surveyId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Survey not found", status: 404 });
  });

  it("lets the owner read a draft survey", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId } = await createSurveyWithQuestion(agent);

    const res = await agent.get(`/api/survey/${surveyId}`);
    expect(res.status).toBe(200);
    expect(res.body.survey.status).toBe("draft");
    expect(res.body.questions).toHaveLength(1);
  });

  it("rejects public submissions on a draft survey", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);

    const res = await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "responder@example.com",
        answers: [{ questionId, value: "Ada" }],
      });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Survey not found", status: 404 });
  });

  it("returns a published survey with questions without auth", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId } = await createSurveyWithQuestion(agent);
    await publishSurvey(agent, surveyId);

    const res = await request(app).get(`/api/survey/${surveyId}`);
    expect(res.status).toBe(200);
    expect(res.body.survey.title).toBe("Intake");
    expect(res.body.survey.status).toBe("published");
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].title).toBe("Full name");
  });

  it("accepts a public submission with all answers", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);
    await publishSurvey(agent, surveyId);

    const res = await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "  Responder@Example.com ",
        answers: [{ questionId, value: "Ada" }],
      });

    expect(res.status).toBe(201);
    expect(res.body.submission.email).toBe("responder@example.com");
    expect(res.body.answers).toHaveLength(1);
    expect(res.body.answers[0].value).toBe("Ada");
  });

  it("returns a respondent's submission by email without auth", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);
    await publishSurvey(agent, surveyId);

    await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "responder@example.com",
        answers: [{ questionId, value: "Ada" }],
      });

    const res = await request(app)
      .get(`/api/survey/${surveyId}/submission`)
      .query({ email: "responder@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.submission.email).toBe("responder@example.com");
    expect(res.body.answers[0].value).toBe("Ada");
  });

  it("hides draft submission lookup from the public", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId } = await createSurveyWithQuestion(agent);

    const res = await request(app)
      .get(`/api/survey/${surveyId}/submission`)
      .query({ email: "responder@example.com" });
    expect(res.status).toBe(404);
  });

  it("returns a submission with answers by id without auth", async () => {
    const { agent } = await registerAndLogin();
    const { surveyId, questionId } = await createSurveyWithQuestion(agent);
    await publishSurvey(agent, surveyId);

    const posted = await request(app)
      .post(`/api/survey/${surveyId}/submission`)
      .send({
        email: "responder@example.com",
        answers: [{ questionId, value: "Ada" }],
      });
    const submissionId = posted.body.submission.id as string;

    const res = await request(app).get(`/api/submission/${submissionId}`);
    expect(res.status).toBe(200);
    expect(res.body.submission.id).toBe(submissionId);
    expect(res.body.answers).toEqual([
      expect.objectContaining({
        surveyQuestionId: questionId,
        value: "Ada",
      }),
    ]);
  });
});
