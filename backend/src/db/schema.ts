import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const surveyStatuses = ["draft", "published"] as const;
export type SurveyStatus = (typeof surveyStatuses)[number];

export const surveyQuestionTypes = [
  "select",
  "multi-select",
  "short_text",
  "long_text",
] as const;
export type SurveyQuestionType = (typeof surveyQuestionTypes)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const surveys = sqliteTable("surveys", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: surveyStatuses }).notNull().default("draft"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const surveyQuestions = sqliteTable(
  "survey_questions",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id),
    title: text("title").notNull(),
    type: text("type", { enum: surveyQuestionTypes }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    options: text("options", { mode: "json" }).$type<string[]>(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [unique("survey_questions_survey_sort").on(t.surveyId, t.sortOrder)],
);

export const surveySubmissions = sqliteTable("survey_submissions", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  surveyId: text("survey_id")
    .notNull()
    .references(() => surveys.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const surveyAnswers = sqliteTable(
  "survey_answers",
  {
    id: text("id").primaryKey(),
    surveyQuestionId: text("survey_question_id")
      .notNull()
      .references(() => surveyQuestions.id),
    submissionId: text("submission_id")
      .notNull()
      .references(() => surveySubmissions.id),
    value: text("value", { mode: "json" }).notNull().$type<unknown>(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    unique("survey_answers_question_submission").on(
      t.surveyQuestionId,
      t.submissionId,
    ),
  ],
);
