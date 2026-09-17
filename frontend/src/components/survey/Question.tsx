"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui";
import { Answer } from "./Answer";
import type { TextSurveyQuestion } from "./types";
import styles from "./survey.module.css";

export type QuestionProps = {
  question: TextSurveyQuestion;
  number: number;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrevious?: () => void;
  isLast?: boolean;
  required?: boolean;
  isSubmitting?: boolean;
  submissionError?: string | null;
};

export function Question({
  question,
  number,
  value,
  onChange,
  onNext,
  onPrevious,
  isLast = false,
  required = true,
  isSubmitting = false,
  submissionError,
}: QuestionProps) {
  const [showError, setShowError] = useState(false);
  const answerRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const answerId = `answer-${question.id}`;
  const descriptionId = `${answerId}-description`;
  const errorId = `${answerId}-error`;
  const hintId = `${answerId}-hint`;
  const description = question.description?.trim();
  const describedBy = [description && descriptionId, hintId, showError && errorId]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    answerRef.current?.focus();
  }, []);

  function continueToNext() {
    if (isSubmitting) return;
    if (required && !value.trim()) {
      setShowError(true);
      answerRef.current?.focus();
      return;
    }
    setShowError(false);
    onNext();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      continueToNext();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      continueToNext();
    } else if (event.key === "ArrowUp" && onPrevious) {
      event.preventDefault();
      onPrevious();
    }
  }

  return (
    <form
      id={`question-form-${question.id}`}
      className={styles.question}
      onSubmit={(event) => {
        event.preventDefault();
        continueToNext();
      }}
      noValidate
    >
      <div className={styles.questionNumber} aria-hidden="true">
        {String(number).padStart(2, "0")} <span>↘</span>
      </div>
      <div className={styles.questionBody}>
        <label
          className={`${styles.questionTitle} ${description ? styles.questionTitleWithDescription : ""}`}
          htmlFor={answerId}
        >
          {question.title}
          {required && <span className={styles.requiredMark} aria-label="required"> *</span>}
        </label>
        {description && (
          <p className={styles.questionDescription} id={descriptionId}>
            {description}
          </p>
        )}
        <Answer
          ref={answerRef}
          id={answerId}
          type={question.type}
          value={value}
          onChange={(nextValue) => {
            onChange(nextValue);
            if (nextValue.trim()) setShowError(false);
          }}
          onKeyDown={handleKeyDown}
          required={required}
          invalid={showError}
          describedBy={describedBy}
        />
        <p className={styles.answerHint} id={hintId}>
          {question.type === "long_text"
            ? "Press Enter to continue · Shift + Enter for a new line"
            : "Press Enter to continue"}
        </p>
        {showError && (
          <p className={styles.answerError} id={errorId} role="alert">
            Please answer this question before continuing.
          </p>
        )}
        {submissionError && (
          <p className={styles.answerError} role="alert">
            {submissionError}
          </p>
        )}
        <div className={styles.actionRow}>
          <Button type="submit" className={styles.continueButton} disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : isLast ? "Submit" : "OK"} <span aria-hidden="true">→</span>
          </Button>
          {!isLast && <span className={styles.enterHint}>press Enter ↵</span>}
        </div>
      </div>
    </form>
  );
}
