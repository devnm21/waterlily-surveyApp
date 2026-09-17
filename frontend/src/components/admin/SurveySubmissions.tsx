"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  getSurvey,
  listSurveySubmissions,
  type Survey,
  type SurveySubmission,
} from "@/lib/api";
import { formatSubmittedAt } from "@/lib/format-submission";
import styles from "./submissions.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; survey: Survey; submissions: SurveySubmission[] };

export function SurveySubmissions({ surveyId }: { surveyId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([getSurvey(surveyId), listSurveySubmissions(surveyId)])
      .then(([surveyResult, listResult]) => {
        if (!active) return;
        setState({
          status: "ready",
          survey: surveyResult.survey,
          submissions: [...listResult.submissions].sort(
            (a, b) => b.createdAt - a.createdAt,
          ),
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load submissions",
        });
      });

    return () => { active = false; };
  }, [surveyId, reload]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard">SouperSurveyForm<span>.</span></Link>
          <Link className={styles.backLink} href="/dashboard">← Dashboard</Link>
        </header>

        {state.status === "loading" ? (
          <p className={styles.message} role="status">Loading submissions…</p>
        ) : state.status === "error" ? (
          <section className={styles.messagePanel}>
            <h1>Couldn’t load submissions</h1>
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
              <p className={styles.eyebrow}>Survey responses</p>
              <h1>Submissions</h1>
              <p className={styles.subtitle}>{state.survey.title}</p>
              <p className={styles.count}>
                {state.submissions.length} {state.submissions.length === 1 ? "response" : "responses"}
              </p>
            </div>

            {state.submissions.length === 0 ? (
              <div className={styles.empty}>
                <h2>No submissions yet.</h2>
                <p>Responses will appear here as people complete your survey.</p>
              </div>
            ) : (
              <ul className={styles.list} aria-label="Survey submissions">
                {state.submissions.map((submission) => (
                  <li key={submission.id}>
                    <Link className={styles.row} href={`/submission/${encodeURIComponent(submission.id)}`}>
                      <span className={styles.rowMain}>
                        <span className={styles.email}>{submission.email}</span>
                        <time
                          className={styles.timestamp}
                          dateTime={new Date(submission.createdAt).toISOString()}
                        >
                          Submitted {formatSubmittedAt(submission.createdAt)}
                        </time>
                      </span>
                      <span className={styles.rowArrow} aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
