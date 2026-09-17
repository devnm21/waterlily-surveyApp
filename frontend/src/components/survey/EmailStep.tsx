"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import styles from "./survey.module.css";

type EmailStepProps = {
  email: string;
  onChange: (email: string) => void;
  onContinue: (email: string) => void;
  isChecking: boolean;
  lookupError: string | null;
};

export function EmailStep({
  email,
  onChange,
  onContinue,
  isChecking,
  lookupError,
}: EmailStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const error = validationError ?? lookupError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setValidationError("Enter a valid email address to continue.");
      inputRef.current?.focus();
      return;
    }
    setValidationError(null);
    onContinue(normalized);
  }

  return (
    <form className={styles.question} onSubmit={handleSubmit} noValidate>
      <div className={styles.questionNumber} aria-hidden="true">
        00 <span>↘</span>
      </div>
      <div className={styles.questionBody}>
        <label className={styles.questionTitle} htmlFor="respondent-email">
          First, what’s your email? <span className={styles.requiredMark} aria-label="required">*</span>
        </label>
        <Input
          ref={inputRef}
          className={styles.answer}
          id="respondent-email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => {
            onChange(event.target.value);
            setValidationError(null);
          }}
          autoComplete="email"
          placeholder="name@example.com"
          required
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-hint email-error" : "email-hint"}
          disabled={isChecking}
        />
        <p className={styles.answerHint} id="email-hint">
          We’ll use your email to find your response if you come back.
        </p>
        {error && (
          <p className={styles.answerError} id="email-error" role="alert">
            {error}
          </p>
        )}
        <div className={styles.actionRow}>
          <Button type="submit" className={styles.continueButton} disabled={isChecking}>
            {isChecking ? "Checking…" : "Continue"} <span aria-hidden="true">→</span>
          </Button>
          <span className={styles.enterHint}>press Enter ↵</span>
        </div>
      </div>
    </form>
  );
}
