"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/api/auth";
import { validateLoginInput } from "@/lib/form-validation";
import { INPUT_LIMITS } from "@/lib/input-limits";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAuth } from "@/contexts/AuthContext";
import { AdminFormField, FormGlobalError, inputErrorClass } from "@/components/ui/AdminUi";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError, setFieldErrors } =
    useAdminFormErrors();
  const { runOnce, busy } = useSubmitLock();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runOnce(async () => {
      resetErrors();

      const validationErrors = validateLoginInput(email, password);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      try {
        const response = await login(
          email.trim().toLowerCase().slice(0, INPUT_LIMITS.email),
          password.slice(0, INPUT_LIMITS.password),
        );
        setSession(response.user);
        router.replace("/dashboard");
      } catch (err) {
        applySubmissionError(err, "Invalid credentials or server error.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6" noValidate>
      <FormGlobalError message={globalError} />

      <AdminFormField label="Email" error={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          maxLength={INPUT_LIMITS.email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError("email");
          }}
          required
          className={`admin-input ${inputErrorClass(fieldErrors.email)}`}
        />
      </AdminFormField>

      <AdminFormField label="Password" error={fieldErrors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          maxLength={INPUT_LIMITS.password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearFieldError("password");
          }}
          required
          className={`admin-input ${inputErrorClass(fieldErrors.password)}`}
        />
      </AdminFormField>

      <button type="submit" disabled={busy} className="admin-btn-primary w-full">
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
