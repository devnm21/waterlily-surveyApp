import type { Metadata } from "next";
import { RequireAuth } from "@/components/AuthGate";
import { SurveySubmissions } from "@/components/admin/SurveySubmissions";

export const metadata: Metadata = {
  title: "Survey submissions",
};

export default async function SurveySubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <SurveySubmissions key={id} surveyId={id} />
    </RequireAuth>
  );
}
