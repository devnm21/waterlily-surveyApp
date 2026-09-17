"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, CopyLinkIcon } from "@/components/ui";
import { SurveyContainer } from "@/components/admin/SurveyContainer";
import { BrandLoader } from "@/components/BrandLoader";
import { useAdminSidebar } from "@/contexts/admin/SidebarContext";
import { useAdminSurvey } from "@/contexts/admin/SurveyContext";

async function copyText(text: string) {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("clipboard timeout")), 400);
      }),
    ]);
    return;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "0";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    if (!ok) {
      throw new Error("Could not copy");
    }
  }
}

export function SurveyWorkspace() {
  const { createSurvey, justCreatedSurveyId } = useAdminSidebar();
  const { survey, questions, isLoading, error, updateTitle, updateStatus } =
    useAdminSurvey();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const shouldFocusTitle = Boolean(
    survey && justCreatedSurveyId === survey.id,
  );
  const title = draftTitle ?? survey?.title ?? "";

  useEffect(() => {
    if (!shouldFocusTitle) {
      return;
    }
    const field = titleRef.current;
    if (!field) {
      return;
    }
    field.focus();
    field.select();
  }, [shouldFocusTitle]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }
    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function handleCreateSurvey() {
    setIsCreating(true);
    try {
      await createSurvey();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!survey) {
      return;
    }
    const url = `${window.location.origin}/survey/${survey.id}`;
    try {
      await copyText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function handleToggleStatus() {
    if (!survey) {
      return;
    }
    const nextStatus = survey.status === "published" ? "draft" : "published";
    setStatusError(null);
    setIsUpdatingStatus(true);
    try {
      await updateStatus(nextStatus);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Could not update status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleTitleBlur() {
    if (!survey) {
      return;
    }
    const nextTitle = title.trim();
    if (!nextTitle) {
      setDraftTitle(survey.title);
      setTitleError("Title is required");
      return;
    }
    if (nextTitle === survey.title) {
      setTitleError(null);
      return;
    }
    try {
      await updateTitle(nextTitle);
      setDraftTitle(null);
      setTitleError(null);
    } catch (err) {
      setDraftTitle(survey.title);
      setTitleError(
        err instanceof Error ? err.message : "Could not save title",
      );
    }
  }

  if (isLoading) {
    return <BrandLoader cover="area" />;
  }

  if (error || !survey) {
    return (
      <p className="admin-stage__error" role="alert">
        {error ?? "Survey not found"}
      </p>
    );
  }

  const isPublished = survey.status === "published";
  const publishIssue =
    questions.length === 0
      ? isPublished
        ? "This published survey has no questions yet."
        : "Add a question before publishing."
      : questions.some(
            (question) =>
              question.type !== "short_text" && question.type !== "long_text",
          )
        ? isPublished
          ? "The respondent view cannot show every question in this survey yet."
          : "Only text and multi-text questions can be published right now."
        : null;

  return (
    <div className="survey-workspace">
      <div className="survey-workspace__heading">
        <div className="survey-workspace__title-wrap">
          <label className="survey-workspace__title-label" htmlFor="survey-title">
            Survey title
          </label>
          <input
            id="survey-title"
            ref={titleRef}
            className="survey-workspace__title"
            value={title}
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
            <p className="admin-stage__error" role="alert">
              {titleError}
            </p>
          )}
          <div className="survey-workspace__state" aria-live="polite">
            <span
              className={`survey-workspace__badge ${
                isPublished
                  ? "survey-workspace__badge--published"
                  : "survey-workspace__badge--draft"
              }`}
            >
              <span className="survey-workspace__badge-dot" aria-hidden="true" />
              {isPublished ? "Published" : "Draft"}
            </span>
            <span
              className={`survey-workspace__state-hint ${
                publishIssue ? "survey-workspace__state-hint--warning" : ""
              }`}
            >
              {publishIssue ??
                (isPublished
                  ? "Your survey link is ready to share."
                  : "Preview your survey, then publish when ready.")}
            </span>
          </div>
        </div>
        <div className="survey-workspace__toolbar">
          <div className="survey-workspace__actions">
            <Button
              className="survey-workspace__link-action"
              variant={isPublished ? "primary" : "secondary"}
              onClick={handleCopyLink}
            >
              <CopyLinkIcon />
              <span aria-live="polite">
                {copyState === "copied" ? "Copied" : "Copy link"}
              </span>
            </Button>
            <Button
              className="survey-workspace__status-action"
              variant={isPublished ? "quiet" : "primary"}
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus || (!isPublished && Boolean(publishIssue))}
            >
              {isUpdatingStatus
                ? isPublished
                  ? "Moving to draft…"
                  : "Publishing…"
                : isPublished
                  ? "Move to draft"
                  : "Publish survey"}
            </Button>
            <Link
              className="ui-button ui-button--secondary survey-workspace__submissions-action"
              href={`/survey/${encodeURIComponent(survey.id)}/submissions`}
            >
              Show submissions
            </Link>
            <span className="survey-workspace__action-divider" aria-hidden="true" />
            <Button
              className="ui-button--icon"
              variant="secondary"
              aria-label="Add survey"
              title="Add survey"
              onClick={handleCreateSurvey}
              disabled={isCreating}
            >
              +
            </Button>
          </div>
          {copyState === "failed" && (
            <p className="survey-workspace__action-error" role="alert">
              Could not copy the link. Please try again.
            </p>
          )}
          {statusError && (
            <p className="survey-workspace__action-error" role="alert">
              {statusError}
            </p>
          )}
        </div>
      </div>
      <SurveyContainer questions={questions} />
    </div>
  );
}
