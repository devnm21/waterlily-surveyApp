"use client";

import { useEffect, useState } from "react";
import { Button, TrashIcon } from "@/components/ui";
import { QUESTION_TYPE_OPTIONS } from "@/lib/question-types";
import type { SurveyQuestion, SurveyQuestionType } from "@/lib/api";
import { useAdminSurvey } from "@/contexts/admin/SurveyContext";

type SurveyQuestionContainerProps = {
  question: SurveyQuestion;
};

export function SurveyQuestionContainer({
  question,
}: SurveyQuestionContainerProps) {
  const { updateQuestion, deleteQuestion } = useAdminSurvey();
  const [typeError, setTypeError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftDescription, setDraftDescription] = useState(
    question.description ?? "",
  );

  useEffect(() => {
    setDraftDescription(question.description ?? "");
  }, [question.id, question.description]);

  async function handleTypeChange(type: SurveyQuestionType) {
    if (type === question.type) {
      return;
    }
    setTypeError(null);
    try {
      await updateQuestion(question.id, { type });
    } catch (err) {
      setTypeError(
        err instanceof Error ? err.message : "Could not update question type",
      );
    }
  }

  async function handleDescriptionBlur() {
    const next = draftDescription.trim() || null;
    if (next === (question.description ?? null)) {
      setDraftDescription(question.description ?? "");
      return;
    }
    setTypeError(null);
    try {
      await updateQuestion(question.id, { description: next });
    } catch (err) {
      setDraftDescription(question.description ?? "");
      setTypeError(
        err instanceof Error ? err.message : "Could not save description",
      );
    }
  }

  async function handleDelete() {
    setTypeError(null);
    setIsDeleting(true);
    try {
      await deleteQuestion(question.id);
    } catch (err) {
      setTypeError(
        err instanceof Error ? err.message : "Could not delete question",
      );
      setIsDeleting(false);
    }
  }

  return (
    <article className="survey-question">
      <div className="survey-question__copy">
        <h3 className="survey-question__title">
          {question.title.trim() || `Question ${question.sortOrder}`}
        </h3>
        <label
          className="survey-question__description-label"
          htmlFor={`question-description-${question.id}`}
        >
          Description
        </label>
        <textarea
          id={`question-description-${question.id}`}
          className="survey-question__description"
          value={draftDescription}
          rows={1}
          placeholder="Add a description"
          onChange={(event) => setDraftDescription(event.target.value)}
          onBlur={() => {
            void handleDescriptionBlur();
          }}
          aria-label={`Description for ${question.title || `question ${question.sortOrder}`}`}
        />
        {typeError && (
          <p className="survey-question__error" role="alert">
            {typeError}
          </p>
        )}
      </div>
      <div className="survey-question__actions">
        <label className="survey-question__type">
          <span className="survey-question__type-label">type</span>
          <select
            className="survey-question__select"
            value={question.type}
            aria-label={`Question type for ${question.title || `question ${question.sortOrder}`}`}
            onChange={(event) =>
              handleTypeChange(event.target.value as SurveyQuestionType)
            }
          >
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="ui-button--icon survey-question__delete"
          variant="quiet"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${question.title || `question ${question.sortOrder}`}`}
          title="Delete question"
        >
          <TrashIcon />
        </Button>
      </div>
    </article>
  );
}
