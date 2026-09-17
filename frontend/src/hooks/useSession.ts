"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser, type PublicUser } from "@/lib/api";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export function useSession() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, status };
}
