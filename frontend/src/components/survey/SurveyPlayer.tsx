"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  ApiError,
  getSurveySubmission,
  submitSurvey,
  type Survey,
  type SurveySubmissionResult,
} from "@/lib/api";
import { EmailStep } from "./EmailStep";
import { Question } from "./Question";
import type { TextSurveyQuestion } from "./types";
import styles from "./survey.module.css";

export type SurveyPlayerProps = {
  survey: Survey;
  questions: TextSurveyQuestion[];
  /** Questions are required by default; override individual IDs when needed. */
  requiredByQuestionId?: Record<string, boolean>;
};

type Phase = "checking" | "email" | "questions" | "complete";

function emailStorageKey(surveyId: string) {
  return `waterlily:survey:${surveyId}:email`;
}

function readStoredEmail(surveyId: string) {
  try {
    return window.localStorage.getItem(emailStorageKey(surveyId));
  } catch {
    return null;
  }
}

function storeEmail(surveyId: string, email: string) {
  try {
    window.localStorage.setItem(emailStorageKey(surveyId), email);
  } catch {
    // The survey still works when browser storage is unavailable.
  }
}

function clearStoredEmail(surveyId: string) {
  try {
    window.localStorage.removeItem(emailStorageKey(surveyId));
  } catch {
    // The respondent can still enter another email in this session.
  }
}

export function SurveyPlayer({
  survey,
  questions,
  requiredByQuestionId = {},
}: SurveyPlayerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [submission, setSubmission] = useState<SurveySubmissionResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const question = questions[index];
  const progress = phase === "complete" ? 100 : phase === "questions" ? (index / questions.length) * 100 : 0;

  useEffect(() => {
    let active = true;

    async function restoreSubmission() {
      const savedEmail = readStoredEmail(survey.id);
      if (!savedEmail) {
        if (active) setPhase("email");
        return;
      }

      if (active) setEmail(savedEmail);
      try {
        const result = await getSurveySubmission(survey.id, savedEmail);
        if (active) {
          setSubmission(result);
          setPhase("complete");
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          setPhase("questions");
        } else {
          setLookupError("We couldn’t check your response. Please try again.");
          setPhase("email");
        }
      }
    }

    void restoreSubmission();
    return () => { active = false; };
  }, [survey.id]);

  async function continueWithEmail(nextEmail: string) {
    if (isCheckingEmail) return;
    setEmail(nextEmail);
    setLookupError(null);
    setIsCheckingEmail(true);

    try {
      const result = await getSurveySubmission(survey.id, nextEmail);
      storeEmail(survey.id, nextEmail);
      setSubmission(result);
      setPhase("complete");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        storeEmail(survey.id, nextEmail);
        setPhase("questions");
      } else {
        setLookupError("We couldn’t check your response. Please try again.");
      }
    } finally {
      setIsCheckingEmail(false);
    }
  }

  async function goNext() {
    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await submitSurvey(
        survey.id,
        email,
        questions.map((item) => ({
          questionId: item.id,
          value: answers[item.id] ?? "",
        })),
      );
      setSubmission(result);
      setPhase("complete");
    } catch {
      // A lost response can follow a successful POST. Check before offering a retry.
      try {
        const existing = await getSurveySubmission(survey.id, email);
        setSubmission(existing);
        setPhase("complete");
      } catch {
        setSubmissionError("Your answers couldn’t be sent. Please try again.");
      }
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function goPrevious() {
    setIndex((current) => Math.max(0, current - 1));
  }

  function changeEmail() {
    clearStoredEmail(survey.id);
    setEmail("");
    setAnswers({});
    setSubmission(null);
    setSubmissionError(null);
    setLookupError(null);
    setIndex(0);
    setPhase("email");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>waterlily<span className={styles.brandDot}>.</span></span>
        <span className={styles.surveyName}>{survey.title}</span>
      </header>

      {phase === "complete" && submission ? (
        <section className={styles.complete} aria-live="polite">
          <p className={styles.eyebrow}>Response submitted</p>
          <h1 className={styles.completeTitle}>Thanks for sharing your thoughts.</h1>
          <p className={styles.completeCopy}>
            Your response for <strong>{submission.submission.email}</strong> was received on{" "}
            {new Date(submission.submission.createdAt).toLocaleDateString()}.
          </p>
          <div className={styles.responseSummary}>
            <h2 className={styles.responseHeading}>Your answers</h2>
            {questions.map((item) => {
              const answer = submission.answers.find(
                (entry) => entry.surveyQuestionId === item.id,
              );
              return (
                <div className={styles.responseItem} key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{typeof answer?.value === "string" && answer.value.trim() ? answer.value : "No answer"}</p>
                </div>
              );
            })}
          </div>
          <Button variant="secondary" onClick={changeEmail}>
            Use a different email
          </Button>
        </section>
      ) : phase === "checking" ? (
        <div className={styles.stage}>
          <p className={styles.answerHint} role="status">Checking for an existing response…</p>
        </div>
      ) : phase === "email" ? (
        <div className={styles.stage}>
          <EmailStep
            email={email}
            onChange={(value) => {
              setEmail(value);
              setLookupError(null);
            }}
            onContinue={continueWithEmail}
            isChecking={isCheckingEmail}
            lookupError={lookupError}
          />
        </div>
      ) : (
        <div className={styles.stage}>
          <Question
            key={question.id}
            question={question}
            number={index + 1}
            value={answers[question.id] ?? ""}
            onChange={(value) => {
              setAnswers((current) => ({ ...current, [question.id]: value }));
              setSubmissionError(null);
            }}
            onNext={goNext}
            onPrevious={index > 0 && !isSubmitting ? goPrevious : undefined}
            isLast={index === questions.length - 1}
            required={requiredByQuestionId[question.id] ?? true}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
          />
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.footerContent}>
          <div className={styles.footerStart}>
            <span className={styles.progressLabel}>
              {phase === "complete"
                ? "Submitted"
                : phase === "questions"
                  ? `${index + 1} of ${questions.length} · Not submitted`
                  : phase === "checking"
                    ? "Checking response"
                    : "Your email"}
            </span>
            {phase === "questions" && (
              <Button
                variant="quiet"
                className={styles.changeEmailButton}
                onClick={changeEmail}
                disabled={isSubmitting}
              >
                Change email
              </Button>
            )}
          </div>
          {phase === "questions" && (
            <nav className={styles.footerNav} aria-label="Question navigation">
              <Button
                className={styles.navButton}
                variant="quiet"
                onClick={goPrevious}
                disabled={index === 0 || isSubmitting}
                aria-label="Previous question"
                title="Previous question (up arrow)"
              >
                ↑
              </Button>
              <Button
                className={styles.navButton}
                variant="quiet"
                type="submit"
                form={`question-form-${question.id}`}
                disabled={isSubmitting}
                aria-label="Next question"
                title="Next question (down arrow)"
              >
                ↓
              </Button>
            </nav>
          )}
        </div>
      </footer>
    </main>
  );
}
