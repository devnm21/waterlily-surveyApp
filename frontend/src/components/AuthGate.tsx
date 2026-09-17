"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BrandLoader } from "@/components/BrandLoader";
import { useSession } from "@/hooks/useSession";

type GateProps = {
  children: ReactNode;
};

/** Renders children only with a valid session; otherwise sends the user to log in. */
export function RequireAuth({ children }: GateProps) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return <BrandLoader />;
  }

  return children;
}

/** Shows the loader while the session is checked, then sends the user onward. */
export function SessionRedirect() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  return <BrandLoader />;
}

/** Renders children only for guests; a valid session goes to the dashboard. */
export function GuestOnly({ children }: GateProps) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status !== "unauthenticated") {
    return <BrandLoader />;
  }

  return children;
}
