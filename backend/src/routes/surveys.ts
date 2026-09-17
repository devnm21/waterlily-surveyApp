import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../middleware/error.js";
import { requireAuth } from "../middleware/require-auth.js";
import { models } from "../models/index.js";
import { validateAnswerValue } from "../models/survey-question.js";

export const surveysRouter = Router();

async function requireOwnedSurvey(surveyId: string, userId: string) {
  const survey = await models.surveys.getById(surveyId);
  if (!survey) {
    throw new HttpError(404, "Survey not found");
  }
  if (survey.userId !== userId) {
    throw new HttpError(403, "Forbidden");
  }
  return survey;
}

async function requirePublishedSurvey(surveyId: string) {
  const survey = await models.surveys.getById(surveyId);
  if (!survey || survey.status !== "published") {
    throw new HttpError(404, "Survey not found");
  }
  return survey;
}

async function submissionWithAnswers(submissionId: string) {
  const submission = await models.surveySubmissions.getById(submissionId);
  if (!submission) {
    throw new HttpError(404, "Submission not found");
  }
  const answers = await models.surveyAnswers.listBySubmissionId(submission.id);
  return { submission, answers };
}

surveysRouter.get(
  "/api/surveys",
  requireAuth,
  asyncHandler(async (req, res) => {
    const surveys = await models.surveys.listByUserId(req.user!.id);
    res.json({ surveys });
  }),
);

surveysRouter.post(
  "/api/survey",
  requireAuth,
  asyncHandler(async (req, res) => {
    const survey = await models.surveys.create({
      title: String(req.body?.title ?? ""),
      userId: req.user!.id,
    });
    res.status(201).json({ survey });
  }),
);

surveysRouter.patch(
  "/api/survey/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireOwnedSurvey(req.params.id, req.user!.id);
    const body = req.body ?? {};
    const survey = await models.surveys.update(req.params.id, {
      title: body.title !== undefined ? String(body.title) : undefined,
      status: body.status !== undefined ? String(body.status) : undefined,
    });
    res.json({ survey });
  }),
);

surveysRouter.delete(
  "/api/question/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await models.surveyQuestions.getById(req.params.id);
    if (!question) {
      throw new HttpError(404, "Question not found");
    }
    await requireOwnedSurvey(question.surveyId, req.user!.id);
    await models.surveyAnswers.deleteByQuestionId(question.id);
    await models.surveyQuestions.deleteById(question.id);
    res.json({ ok: true });
  }),
);

surveysRouter.get(
  "/api/survey/:id/submissions",
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireOwnedSurvey(req.params.id, req.user!.id);
    const submissions = await models.surveySubmissions.listBySurveyId(
      req.params.id,
    );
    res.json({ submissions });
  }),
);

surveysRouter.get(
  "/api/survey/:id/submission",
  asyncHandler(async (req, res) => {
    const survey = await requirePublishedSurvey(req.params.id);
    const submission = await models.surveySubmissions.findBySurveyIdAndEmail(
      survey.id,
      String(req.query.email ?? ""),
    );
    if (!submission) {
      throw new HttpError(404, "Submission not found");
    }
    const payload = await submissionWithAnswers(submission.id);
    res.json(payload);
  }),
);

surveysRouter.post(
  "/api/survey/:id/submission",
  asyncHandler(async (req, res) => {
    const survey = await requirePublishedSurvey(req.params.id);

    const rawAnswers = req.body?.answers;
    if (!Array.isArray(rawAnswers)) {
      throw new HttpError(400, "Answers are required");
    }

    const questions = await models.surveyQuestions.listBySurveyId(survey.id);
    if (rawAnswers.length !== questions.length) {
      throw new HttpError(400, "All questions must be answered");
    }

    const questionsById = new Map(questions.map((question) => [question.id, question]));
    const seen = new Set<string>();
    const answers: { surveyQuestionId: string; value: unknown }[] = [];

    for (const item of rawAnswers) {
      const questionId = String(item?.questionId ?? "");
      if (!questionId || seen.has(questionId)) {
        throw new HttpError(400, "Each question must be answered once");
      }
      seen.add(questionId);
      const question = questionsById.get(questionId);
      if (!question) {
        throw new HttpError(400, "Question does not belong to this survey");
      }
      validateAnswerValue(question, item?.value);
      answers.push({ surveyQuestionId: questionId, value: item.value });
    }

    const payload = await models.surveySubmissions.createWithAnswers({
      surveyId: survey.id,
      email: String(req.body?.email ?? ""),
      answers,
    });
    res.status(201).json(payload);
  }),
);

surveysRouter.post(
  "/api/survey/:id/question",
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireOwnedSurvey(req.params.id, req.user!.id);
    const question = await models.surveyQuestions.create({
      surveyId: req.params.id,
      title: String(req.body?.title ?? ""),
      type: req.body?.type,
      sortOrder: req.body?.sortOrder,
      options: req.body?.options,
      description: req.body?.description,
    });
    res.status(201).json({ question });
  }),
);

surveysRouter.patch(
  "/api/survey/:id/question/:questionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireOwnedSurvey(req.params.id, req.user!.id);
    const body = req.body ?? {};
    const question = await models.surveyQuestions.update({
      id: req.params.questionId,
      surveyId: req.params.id,
      title: body.title !== undefined ? String(body.title) : undefined,
      description: body.description,
      type: body.type !== undefined ? String(body.type) : undefined,
      sortOrder: body.sortOrder,
      options: body.options,
    });
    res.json({ question });
  }),
);

surveysRouter.get(
  "/api/survey/:id",
  asyncHandler(async (req, res) => {
    const survey = await models.surveys.getById(req.params.id);
    if (!survey) {
      throw new HttpError(404, "Survey not found");
    }
    const isOwner = survey.userId === req.session.userId;
    if (survey.status !== "published" && !isOwner) {
      throw new HttpError(404, "Survey not found");
    }
    const questions = await models.surveyQuestions.listBySurveyId(survey.id);
    res.json({ survey, questions });
  }),
);

surveysRouter.get(
  "/api/submission/:id",
  asyncHandler(async (req, res) => {
    const payload = await submissionWithAnswers(req.params.id);
    res.json(payload);
  }),
);
