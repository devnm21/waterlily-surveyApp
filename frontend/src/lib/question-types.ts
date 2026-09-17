import type { SurveyQuestionType } from "@/lib/api";

/** Labels match the admin wireframe (text / multi-text / select / multi-select). */
export const QUESTION_TYPE_OPTIONS: {
  value: SurveyQuestionType;
  label: string;
}[] = [
  { value: "short_text", label: "text" },
  { value: "long_text", label: "multi-text" },
  { value: "select", label: "select" },
  { value: "multi-select", label: "multi-select" },
];

export function questionTypeLabel(type: SurveyQuestionType): string {
  return (
    QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}
