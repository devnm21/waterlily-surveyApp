"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Input } from "@/components/ui";
import { loginUser, registerUser } from "@/lib/api";

export const MIN_PASSWORD_LENGTH = 8;

type FormValues = {
  email: string;
  password: string;
};

type CredentialsFormProps = {
  mode: "login" | "signup";
};

export function CredentialsForm({ mode }: CredentialsFormProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      if (isSignup) {
        await registerUser(values.email, values.password);
      } else {
        await loginUser(values.email, values.password);
      }
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isSignup
            ? "Could not sign up"
            : "Could not log in",
      );
    }
  }

  return (
    <form
      className="auth-form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <label className="auth-field">
        Email
        <Input
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email", { required: "Enter your email" })}
        />
        {errors.email && (
          <span className="auth-error" id="email-error" role="alert">
            {errors.email.message}
          </span>
        )}
      </label>
      <label className="auth-field">
        Password
        <Input
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={
            errors.password
              ? "password-error"
              : isSignup
                ? "password-hint"
                : undefined
          }
          {...register(
            "password",
            isSignup
              ? {
                  required: "Enter a password",
                  minLength: {
                    value: MIN_PASSWORD_LENGTH,
                    message: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
                  },
                }
              : { required: "Enter your password" },
          )}
        />
        {errors.password ? (
          <span className="auth-error" id="password-error" role="alert">
            {errors.password.message}
          </span>
        ) : isSignup ? (
          <span className="auth-hint" id="password-hint">
            At least {MIN_PASSWORD_LENGTH} characters
          </span>
        ) : null}
      </label>
      {submitError && (
        <p className="auth-error" role="alert">
          {submitError}
        </p>
      )}
      <Button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSignup
          ? isSubmitting
            ? "Signing up…"
            : "Sign up"
          : "Log in"}
      </Button>
      <p className="auth-alt">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            Need an account? <Link href="/signup">Sign up</Link>
          </>
        )}
      </p>
    </form>
  );
}
