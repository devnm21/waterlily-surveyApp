import type { SurveyQuestion } from "@/lib/api";

export type TextSurveyQuestion = SurveyQuestion & {
  type: "short_text" | "long_text";
};

export function isTextQuestion(question: SurveyQuestion): question is TextSurveyQuestion {
  return question.type === "short_text" || question.type === "long_text";
}
