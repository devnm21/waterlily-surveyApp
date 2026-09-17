import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { CredentialsForm } from "@/components/CredentialsForm";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <AuthShell subtitle="Sign up">
      <CredentialsForm mode="signup" />
    </AuthShell>
  );
}
