import { forwardRef, type KeyboardEvent } from "react";
import { Input } from "@/components/ui";
import type { SurveyQuestionType } from "@/lib/api";
import styles from "./survey.module.css";

export type AnswerProps = {
  id: string;
  type: Extract<SurveyQuestionType, "short_text" | "long_text">;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export const Answer = forwardRef<HTMLInputElement | HTMLTextAreaElement, AnswerProps>(
  function Answer(
    { id, type, value, onChange, onKeyDown, required = true, invalid = false, describedBy },
    ref,
  ) {
    const shared = {
      id,
      name: id,
      value,
      required,
      "aria-invalid": invalid,
      "aria-describedby": describedBy,
      onKeyDown,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(event.target.value),
    };

    if (type === "long_text") {
      return (
        <textarea
          {...shared}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={`${styles.answer} ${styles.textarea}`}
          rows={3}
          placeholder="Write your answer here…"
        />
      );
    }

    return (
      <Input
        {...shared}
        ref={ref as React.Ref<HTMLInputElement>}
        className={styles.answer}
        type="text"
        placeholder="Type your answer here…"
        autoComplete="off"
      />
    );
  },
);
