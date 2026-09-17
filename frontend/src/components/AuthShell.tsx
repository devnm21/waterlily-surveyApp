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
          <a
            className="auth-sample-link"
            href="https://waterlily-survey-app-ten.vercel.app/survey/eebba956-4821-4033-b52e-4b27c2a8f6e7"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore a sample survey
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
              <path d="M7 4H16V13M16 4L8 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 11V15.5C15 15.7761 14.7761 16 14.5 16H4.5C4.22386 16 4 15.7761 4 15.5V5.5C4 5.22386 4.22386 5 4.5 5H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
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
