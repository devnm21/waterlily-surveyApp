"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createQuestion,
  deleteQuestion,
  getSurvey,
  updateQuestion,
  updateSurvey,
  type CreateQuestionInput,
  type Survey,
  type SurveyQuestion,
  type SurveyStatus,
  type UpdateQuestionInput,
} from "@/lib/api";
import { useAdminSidebar } from "@/contexts/admin/SidebarContext";

type AdminSurveyContextValue = {
  survey: Survey | null;
  questions: SurveyQuestion[];
  isLoading: boolean;
  error: string | null;
  addQuestion: (input?: Partial<CreateQuestionInput>) => Promise<SurveyQuestion>;
  updateQuestion: (
    questionId: string,
    input: UpdateQuestionInput,
  ) => Promise<SurveyQuestion>;
  deleteQuestion: (questionId: string) => Promise<void>;
  updateTitle: (title: string) => Promise<Survey>;
  updateStatus: (status: SurveyStatus) => Promise<Survey>;
  refreshSurvey: () => Promise<void>;
};

const AdminSurveyContext = createContext<AdminSurveyContextValue | null>(null);

type AdminSurveyProviderProps = {
  surveyId: string;
  children: ReactNode;
};

export function AdminSurveyProvider({
  surveyId,
  children,
}: AdminSurveyProviderProps) {
  const { syncSurvey } = useAdminSidebar();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSurvey = useCallback(async () => {
    const data = await getSurvey(surveyId);
    setSurvey(data.survey);
    setQuestions(data.questions);
  }, [surveyId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSurvey(null);
    setQuestions([]);
    getSurvey(surveyId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setSurvey(data.survey);
        setQuestions(data.questions);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load survey");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const addQuestion = useCallback(
    async (input: Partial<CreateQuestionInput> = {}) => {
      const { question } = await createQuestion(surveyId, {
        title: input.title?.trim() || `Question ${questions.length + 1}`,
        type: input.type ?? "short_text",
        sortOrder: input.sortOrder,
        options: input.options,
      });
      setQuestions((current) =>
        [...current, question].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setError(null);
      return question;
    },
    [questions.length, surveyId],
  );

  const patchQuestion = useCallback(
    async (questionId: string, input: UpdateQuestionInput) => {
      const { question } = await updateQuestion(surveyId, questionId, input);
      setQuestions((current) =>
        current.map((item) => (item.id === question.id ? question : item)),
      );
      return question;
    },
    [surveyId],
  );

  const removeQuestion = useCallback(
    async (questionId: string) => {
      await deleteQuestion(questionId);
      setQuestions((current) =>
        current.filter((item) => item.id !== questionId),
      );
    },
    [],
  );

  const updateTitle = useCallback(
    async (title: string) => {
      const { survey: next } = await updateSurvey(surveyId, { title });
      setSurvey(next);
      syncSurvey(next);
      return next;
    },
    [surveyId, syncSurvey],
  );

  const updateStatus = useCallback(
    async (status: SurveyStatus) => {
      const { survey: next } = await updateSurvey(surveyId, { status });
      setSurvey(next);
      syncSurvey(next);
      return next;
    },
    [surveyId, syncSurvey],
  );

  const value = useMemo(
    () => ({
      survey,
      questions,
      isLoading,
      error,
      addQuestion,
      updateQuestion: patchQuestion,
      deleteQuestion: removeQuestion,
      updateTitle,
      updateStatus,
      refreshSurvey,
    }),
    [
      survey,
      questions,
      isLoading,
      error,
      addQuestion,
      patchQuestion,
      removeQuestion,
      updateTitle,
      updateStatus,
      refreshSurvey,
    ],
  );

  return (
    <AdminSurveyContext.Provider value={value}>
      {children}
    </AdminSurveyContext.Provider>
  );
}

export function useAdminSurvey() {
  const context = useContext(AdminSurveyContext);
  if (!context) {
    throw new Error("useAdminSurvey must be used within AdminSurveyProvider");
  }
  return context;
}
