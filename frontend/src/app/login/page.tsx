import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { CredentialsForm } from "@/components/CredentialsForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <AuthShell subtitle="Log in">
      <CredentialsForm mode="login" />
    </AuthShell>
  );
}
