import type { Metadata } from "next";
import { RequireAuth } from "@/components/AuthGate";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";

export const metadata: Metadata = {
  title: "Submission details",
};

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <SubmissionDetail key={id} submissionId={id} />
    </RequireAuth>
  );
}
