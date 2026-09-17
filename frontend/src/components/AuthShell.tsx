import Link from "next/link";
import type { ReactNode } from "react";
import { GuestOnly } from "@/components/AuthGate";

type AuthShellProps = {
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <GuestOnly>
      <main className="auth-pond">
        <div className="auth-column">
          <Link className="auth-brand" href="/">
            Waterlily Survey
          </Link>
          <h1 className="auth-subtitle">{subtitle}</h1>
          {children}
        </div>
      </main>
    </GuestOnly>
  );
}
