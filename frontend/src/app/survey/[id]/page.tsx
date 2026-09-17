import type { Metadata } from "next";
import { getSurvey } from "@/lib/api";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { isTextQuestion } from "@/components/survey/types";
import styles from "@/components/survey/survey.module.css";

export const metadata: Metadata = {
  title: "Take survey",
};

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSurvey(id).catch(() => null);

  if (!data || data.survey.status !== "published") {
    return (
      <main className={styles.statePage}>
        <p className={styles.eyebrow}>Waterlily Survey</p>
        <h1 className={styles.stateTitle}>We couldn’t open this survey.</h1>
        <p className={styles.stateCopy}>
          Check the link or try again in a moment.
        </p>
      </main>
    );
  }

  const { survey, questions } = data;
  if (questions.length === 0) {
    return (
      <main className={styles.statePage}>
        <p className={styles.eyebrow}>Waterlily Survey</p>
        <h1 className={styles.stateTitle}>Nothing to answer yet.</h1>
        <p className={styles.stateCopy}>
          This survey has no questions right now.
        </p>
      </main>
    );
  }

  const orderedQuestions = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!orderedQuestions.every(isTextQuestion)) {
    return (
      <main className={styles.statePage}>
        <p className={styles.eyebrow}>Waterlily Survey</p>
        <h1 className={styles.stateTitle}>This survey isn’t ready to take.</h1>
        <p className={styles.stateCopy}>
          It includes a question type that this survey view doesn’t support yet.
        </p>
      </main>
    );
  }

  return <SurveyPlayer key={survey.id} survey={survey} questions={orderedQuestions} />;
}
