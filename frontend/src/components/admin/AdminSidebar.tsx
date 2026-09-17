"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAdminSidebar } from "@/contexts/admin/SidebarContext";
import { logoutUser } from "@/lib/api";

export function AdminSidebar() {
  const {
    surveys,
    selectedSurveyId,
    isLoading,
    error,
    selectSurvey,
    createSurvey,
  } = useAdminSidebar();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleAddSurvey() {
    setCreateError(null);
    setIsCreating(true);
    try {
      await createSurvey();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create survey",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await logoutUser();
      router.replace("/login");
    } catch (err) {
      setSignOutError(
        err instanceof Error ? err.message : "Could not sign out",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <aside className="admin-sidebar" aria-label="Surveys">
      <p className="admin-sidebar__label">Surveys</p>
      <Button
        className="admin-sidebar__add"
        variant="secondary"
        onClick={handleAddSurvey}
        disabled={isCreating}
      >
        {isCreating ? "Adding…" : "Add survey"}
      </Button>
      {createError && (
        <p className="admin-sidebar__error" role="alert">
          {createError}
        </p>
      )}
      {error && (
        <p className="admin-sidebar__error" role="alert">
          {error}
        </p>
      )}
      <nav className="admin-sidebar__list" aria-label="Your surveys">
        {isLoading ? null : surveys.length === 0 ? (
          <p className="admin-sidebar__hint">No surveys yet.</p>
        ) : (
          <ul>
            {surveys.map((survey, index) => {
              const selected = survey.id === selectedSurveyId;
              return (
                <li key={survey.id}>
                  <button
                    type="button"
                    className={[
                      "admin-sidebar__item",
                      selected ? "admin-sidebar__item--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => selectSurvey(survey.id)}
                  >
                    {survey.title.trim() || `Survey ${index + 1}`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
      <div className="admin-sidebar__footer">
        {signOutError && (
          <p className="admin-sidebar__error" role="alert">
            {signOutError}
          </p>
        )}
        <Button
          className="admin-sidebar__signout"
          variant="quiet"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
