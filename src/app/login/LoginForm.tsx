"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/api/auth";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { ApiError, isValidationError } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { siteConfig } from "@/config/site";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { runOnce, busy } = useSubmitLock();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runOnce(async () => {
      setError(null);
      setFieldErrors({});

      try {
        const response = await login(email, password);
        setSession(response.access_token, response.user);
        router.replace("/dashboard");
      } catch (err) {
        const body = err instanceof ApiError ? err.body : err;

        if (isValidationError(body)) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(body.errors)) {
            mapped[key] = messages[0];
          }
          setFieldErrors(mapped);
          setError("Please correct the validation errors.");
        } else {
          setError("Invalid credentials or server error.");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="admin-input mt-1"
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="admin-input mt-1"
        />
        {fieldErrors.password ? (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button type="submit" disabled={busy} className="admin-btn-primary w-full">
        {busy ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-xs text-gray-400">
        {siteConfig.brand} admin · API {siteConfig.apiUrl}
      </p>
    </form>
  );
}
