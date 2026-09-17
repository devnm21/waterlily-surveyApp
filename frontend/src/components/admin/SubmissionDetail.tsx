"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  getSubmissionById,
  getSurvey,
  type Survey,
  type SurveyQuestion,
  type SurveySubmissionResult,
} from "@/lib/api";
import { formatAnswer, formatSubmittedAt } from "@/lib/format-submission";
import styles from "./submissions.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      survey: Survey;
      questions: SurveyQuestion[];
      result: SurveySubmissionResult;
    };

export function SubmissionDetail({ submissionId }: { submissionId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSubmission() {
      try {
        const result = await getSubmissionById(submissionId);
        const surveyResult = await getSurvey(result.submission.surveyId);
        if (!active) return;
        setState({
          status: "ready",
          result,
          survey: surveyResult.survey,
          questions: [...surveyResult.questions].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
        });
      } catch (error) {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load submission",
        });
      }
    }

    void loadSubmission();
    return () => { active = false; };
  }, [submissionId, reload]);

  const listHref = state.status === "ready"
    ? `/survey/${encodeURIComponent(state.result.submission.surveyId)}/submissions`
    : null;

  return (
    <main className={styles.page}>
      <div className={`${styles.container} ${styles.detailContainer}`}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard">SouperSurveyForm<span>.</span></Link>
          <Link className={styles.backLink} href={listHref ?? "/dashboard"}>
            ← {listHref ? "All submissions" : "Dashboard"}
          </Link>
        </header>

        {state.status === "loading" ? (
          <p className={styles.message} role="status">Loading response…</p>
        ) : state.status === "error" ? (
          <section className={styles.messagePanel}>
            <h1>Couldn’t open this submission</h1>
            <p role="alert">{state.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: "loading" });
                setReload((current) => current + 1);
              }}
            >
              Try again
            </Button>
          </section>
        ) : (
          <>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>Submission</p>
              <h1>{state.result.submission.email}</h1>
              <p className={styles.subtitle}>{state.survey.title}</p>
              <time
                className={styles.count}
                dateTime={new Date(state.result.submission.createdAt).toISOString()}
              >
                Submitted {formatSubmittedAt(state.result.submission.createdAt)}
              </time>
            </div>

            <ol className={styles.answers}>
              {state.questions.map((question, index) => {
                const answer = state.result.answers.find(
                  (item) => item.surveyQuestionId === question.id,
                );
                return (
                  <li className={styles.answerItem} key={question.id}>
                    <span className={styles.questionNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h2 className={styles.questionTitle}>{question.title}</h2>
                      {question.description?.trim() && (
                        <p className={styles.questionDescription}>{question.description}</p>
                      )}
                      <p className={styles.answerValue}>{formatAnswer(answer?.value)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </main>
  );
}
