export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type PublicUser = {
  id: string;
  email: string;
};

type ErrorBody = {
  error?: string;
  status?: number;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return body;
}

export function registerUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/users", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser() {
  return jsonFetch<{ user: PublicUser }>("/auth/me", { method: "GET" });
}

export function logoutUser() {
  return jsonFetch<{ ok: true }>("/auth/logout", { method: "POST" });
}

export type SurveyStatus = "draft" | "published";

export type SurveyQuestionType =
  | "select"
  | "multi-select"
  | "short_text"
  | "long_text";

export type Survey = {
  id: string;
  title: string;
  userId: string;
  status: SurveyStatus;
  createdAt: number;
  updatedAt: number;
};

export type SurveyQuestion = {
  id: string;
  surveyId: string;
  title: string;
  description: string | null;
  type: SurveyQuestionType;
  sortOrder: number;
  options: string[] | null;
  createdAt: number;
  updatedAt: number;
};

export type SurveySubmission = {
  id: string;
  email: string;
  surveyId: string;
  createdAt: number;
  updatedAt: number;
};

export type SurveyAnswer = {
  id: string;
  surveyQuestionId: string;
  submissionId: string;
  value: unknown;
  createdAt: number;
  updatedAt: number;
};

export type SurveySubmissionResult = {
  submission: SurveySubmission;
  answers: SurveyAnswer[];
};

export type CreateQuestionInput = {
  title: string;
  type: SurveyQuestionType;
  sortOrder?: number;
  options?: string[] | null;
  description?: string | null;
};

export type UpdateQuestionInput = {
  title?: string;
  type?: SurveyQuestionType;
  sortOrder?: number;
  options?: string[] | null;
  description?: string | null;
};

export function listSurveys() {
  return jsonFetch<{ surveys: Survey[] }>("/api/surveys", { method: "GET" });
}

export function createSurvey(title: string) {
  return jsonFetch<{ survey: Survey }>("/api/survey", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function getSurvey(id: string) {
  return jsonFetch<{ survey: Survey; questions: SurveyQuestion[] }>(
    `/api/survey/${id}`,
    { method: "GET" },
  );
}

export function getSurveySubmission(surveyId: string, email: string) {
  return jsonFetch<SurveySubmissionResult>(
    `/api/survey/${encodeURIComponent(surveyId)}/submission?email=${encodeURIComponent(email)}`,
    { method: "GET" },
  );
}

export function listSurveySubmissions(surveyId: string) {
  return jsonFetch<{ submissions: SurveySubmission[] }>(
    `/api/survey/${encodeURIComponent(surveyId)}/submissions`,
    { method: "GET" },
  );
}

export function getSubmissionById(submissionId: string) {
  return jsonFetch<SurveySubmissionResult>(
    `/api/submission/${encodeURIComponent(submissionId)}`,
    { method: "GET" },
  );
}

export function submitSurvey(
  surveyId: string,
  email: string,
  answers: { questionId: string; value: string }[],
) {
  return jsonFetch<SurveySubmissionResult>(
    `/api/survey/${encodeURIComponent(surveyId)}/submission`,
    {
      method: "POST",
      body: JSON.stringify({ email, answers }),
    },
  );
}

export function createQuestion(surveyId: string, input: CreateQuestionInput) {
  return jsonFetch<{ question: SurveyQuestion }>(
    `/api/survey/${surveyId}/question`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  return jsonFetch<{ question: SurveyQuestion }>(
    `/api/survey/${surveyId}/question/${questionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function updateSurvey(
  id: string,
  input: { title?: string; status?: SurveyStatus },
) {
  return jsonFetch<{ survey: Survey }>(`/api/survey/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteQuestion(id: string) {
  return jsonFetch<{ ok: true }>(`/api/question/${id}`, { method: "DELETE" });
}
