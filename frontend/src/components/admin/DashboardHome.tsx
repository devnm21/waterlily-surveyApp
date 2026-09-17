"use client";

import { SurveyWorkspace } from "@/components/admin/SurveyWorkspace";
import { Button } from "@/components/ui";
import { AdminSurveyProvider } from "@/contexts/admin/SurveyContext";
import { useAdminSidebar } from "@/contexts/admin/SidebarContext";
import { useState } from "react";

export function DashboardHome() {
  const { selectedSurveyId, surveys, createSurvey } = useAdminSidebar();
  const [isCreating, setIsCreating] = useState(false);

  if (!selectedSurveyId) {
    return (
      <div className="survey-workspace survey-workspace--empty">
        <h1 className="survey-workspace__title">No survey selected</h1>
        <p className="admin-stage__hint">
          {surveys.length === 0
            ? "Create a survey to start writing questions."
            : "Choose a survey from the sidebar."}
        </p>
        <Button
          variant="primary"
          onClick={async () => {
            setIsCreating(true);
            try {
              await createSurvey();
            } finally {
              setIsCreating(false);
            }
          }}
          disabled={isCreating}
        >
          {isCreating ? "Adding…" : "Add survey"}
        </Button>
      </div>
    );
  }

  return (
    <AdminSurveyProvider key={selectedSurveyId} surveyId={selectedSurveyId}>
      <SurveyWorkspace />
    </AdminSurveyProvider>
  );
}
