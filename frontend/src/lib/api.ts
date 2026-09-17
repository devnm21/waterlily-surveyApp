export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type PublicUser = {
  id: string;
  email: string;
};

type ErrorBody = {
  error?: string;
  status?: number;
};

async function jsonFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & ErrorBody;
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export function registerUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/users", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email: string, password: string) {
  return jsonFetch<{ user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
