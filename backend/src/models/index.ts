import { db } from "../db/index.js";
import { SurveyAnswerModel } from "./survey-answer.js";
import { SurveyQuestionModel } from "./survey-question.js";
import { SurveySubmissionModel } from "./survey-submission.js";
import { SurveyModel } from "./survey.js";
import { UserModel } from "./user.js";

export const models = {
  users: new UserModel(db),
  surveys: new SurveyModel(db),
  surveyQuestions: new SurveyQuestionModel(db),
  surveySubmissions: new SurveySubmissionModel(db),
  surveyAnswers: new SurveyAnswerModel(db),
};
