"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSurvey, listSurveys, type Survey } from "@/lib/api";

type AdminSidebarContextValue = {
  surveys: Survey[];
  selectedSurveyId: string | null;
  justCreatedSurveyId: string | null;
  isLoading: boolean;
  error: string | null;
  selectSurvey: (id: string) => void;
  createSurvey: (title?: string) => Promise<Survey>;
  syncSurvey: (survey: Survey) => void;
  refreshSurveys: () => Promise<void>;
};

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(
  null,
);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [justCreatedSurveyId, setJustCreatedSurveyId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSurveys = useCallback(async () => {
    const data = await listSurveys();
    setSurveys(data.surveys);
    setSelectedSurveyId((current) => {
      if (current && data.surveys.some((survey) => survey.id === current)) {
        return current;
      }
      return data.surveys[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    refreshSurveys()
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Could not load surveys";
        if (message === "Unauthorized") {
          router.replace("/login");
          return;
        }
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSurveys, router]);

  const selectSurvey = useCallback((id: string) => {
    setSelectedSurveyId(id);
    setJustCreatedSurveyId(null);
  }, []);

  const syncSurvey = useCallback((survey: Survey) => {
    setSurveys((current) =>
      current.map((item) => (item.id === survey.id ? survey : item)),
    );
  }, []);

  const createAndSelectSurvey = useCallback(async (title?: string) => {
    const nextTitle =
      title?.trim() || `Survey ${surveys.length + 1}`;
    const { survey } = await createSurvey(nextTitle);
    setSurveys((current) => [survey, ...current]);
    setSelectedSurveyId(survey.id);
    setJustCreatedSurveyId(survey.id);
    setError(null);
    return survey;
  }, [surveys.length]);

  const value = useMemo(
    () => ({
      surveys,
      selectedSurveyId,
      justCreatedSurveyId,
      isLoading,
      error,
      selectSurvey,
      createSurvey: createAndSelectSurvey,
      syncSurvey,
      refreshSurveys,
    }),
    [
      surveys,
      selectedSurveyId,
      justCreatedSurveyId,
      isLoading,
      error,
      selectSurvey,
      createAndSelectSurvey,
      syncSurvey,
      refreshSurveys,
    ],
  );

  return (
    <AdminSidebarContext.Provider value={value}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar must be used within AdminSidebarProvider");
  }
  return context;
}
