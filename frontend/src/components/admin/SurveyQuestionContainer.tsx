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
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState(
    question.description ?? "",
  );
  const title = draftTitle ?? question.title;

  useEffect(() => {
    setDraftDescription(question.description ?? "");
  }, [question.id, question.description]);

  async function handleTitleBlur() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setDraftTitle(question.title);
      setTitleError("Title is required");
      return;
    }
    if (nextTitle === question.title) {
      setDraftTitle(null);
      setTitleError(null);
      return;
    }
    try {
      await updateQuestion(question.id, { title: nextTitle });
      setDraftTitle(null);
      setTitleError(null);
    } catch (err) {
      setDraftTitle(question.title);
      setTitleError(err instanceof Error ? err.message : "Could not save title");
    }
  }

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
        <label
          className="survey-question__title-label"
          htmlFor={`question-title-${question.id}`}
        >
          Question title
        </label>
        <input
          id={`question-title-${question.id}`}
          className="survey-question__title"
          value={title}
          placeholder={`Question ${question.sortOrder}`}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={() => {
            void handleTitleBlur();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          aria-invalid={titleError ? "true" : "false"}
        />
        {titleError && (
          <p className="survey-question__error" role="alert">
            {titleError}
          </p>
        )}
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
