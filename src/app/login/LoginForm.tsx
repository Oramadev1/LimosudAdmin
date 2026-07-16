"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/api/auth";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAuth } from "@/contexts/AuthContext";
import { AdminFormField, FormGlobalError, inputErrorClass } from "@/components/ui/AdminUi";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } =
    useAdminFormErrors();
  const { runOnce, busy } = useSubmitLock();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runOnce(async () => {
      resetErrors();

      try {
        const response = await login(email, password);
        setSession(response.user);
        router.replace("/dashboard");
      } catch (err) {
        applySubmissionError(err, "Invalid credentials or server error.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
      <FormGlobalError message={globalError} />

      <AdminFormField label="Email" error={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
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
          value={password}
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
