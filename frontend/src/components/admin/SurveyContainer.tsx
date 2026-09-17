"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { SurveyQuestionContainer } from "@/components/admin/SurveyQuestionContainer";
import { useAdminSurvey } from "@/contexts/admin/SurveyContext";
import type { SurveyQuestion } from "@/lib/api";

type SurveyContainerProps = {
  questions: SurveyQuestion[];
};

export function SurveyContainer({ questions }: SurveyContainerProps) {
  const { addQuestion } = useAdminSurvey();
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAddQuestion() {
    setAddError(null);
    setIsAdding(true);
    try {
      await addQuestion({
        title: `Question ${questions.length + 1}`,
        type: "short_text",
      });
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Could not add question",
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="survey-container" aria-label="Survey questions">
      {questions.length === 0 ? (
        <p className="survey-container__empty">
          No questions yet. Add one to start this form.
        </p>
      ) : (
        <div className="survey-container__list">
          {questions.map((question) => (
            <SurveyQuestionContainer key={question.id} question={question} />
          ))}
        </div>
      )}
      {addError && (
        <p className="survey-container__error" role="alert">
          {addError}
        </p>
      )}
      <Button
        className="survey-container__add"
        variant="secondary"
        onClick={handleAddQuestion}
        disabled={isAdding}
      >
        {isAdding ? "Adding…" : "Add New Question"}
      </Button>
    </section>
  );
}
