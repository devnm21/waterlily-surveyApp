"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginUser, registerUser, type PublicUser } from "@/lib/api";

type FormValues = {
  email: string;
  password: string;
};

export function AuthForm() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onRegister(values: FormValues) {
    setSubmitError(null);
    try {
      const data = await registerUser(values.email, values.password);
      setUser(data.user);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Register failed");
    }
  }

  async function onLogin(values: FormValues) {
    setSubmitError(null);
    try {
      const data = await loginUser(values.email, values.password);
      setUser(data.user);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <form className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            type="email"
            autoComplete="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && (
            <span className="text-red-600">{errors.email.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            type="password"
            autoComplete="current-password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            })}
          />
          {errors.password && (
            <span className="text-red-600">{errors.password.message}</span>
          )}
        </label>
        <div className="flex gap-2">
          <button
            className="rounded bg-zinc-900 px-3 py-2 text-white"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onRegister)}
          >
            Register
          </button>
          <button
            className="rounded border border-zinc-300 px-3 py-2"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onLogin)}
          >
            Login
          </button>
        </div>
      </form>
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
      {user && (
        <p className="text-sm">
          Signed in as {user.email} ({user.id})
        </p>
      )}
    </div>
  );
}
