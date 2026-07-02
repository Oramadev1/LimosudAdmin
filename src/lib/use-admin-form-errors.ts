import { useCallback, useState } from "react";

import { ApiError, isValidationError } from "@/lib/api/client";
import { mapValidationErrors } from "@/lib/validation";

export function parseFormSubmissionError(
  err: unknown,
  fallbackMessage = "Save failed.",
): { globalError: string | null; fieldErrors: Record<string, string> } {
  const body = err instanceof ApiError ? err.body : err;

  if (isValidationError(body)) {
    return {
      globalError: null,
      fieldErrors: mapValidationErrors(body.errors),
    };
  }

  return {
    globalError: err instanceof ApiError ? err.message : fallbackMessage,
    fieldErrors: {},
  };
}

export function useAdminFormErrors() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetErrors = useCallback(() => {
    setGlobalError(null);
    setFieldErrors({});
  }, []);

  const applySubmissionError = useCallback((err: unknown, fallbackMessage = "Save failed.") => {
    const parsed = parseFormSubmissionError(err, fallbackMessage);
    setGlobalError(parsed.globalError);
    setFieldErrors(parsed.fieldErrors);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  return {
    globalError,
    fieldErrors,
    resetErrors,
    applySubmissionError,
    clearFieldError,
    setFieldErrors,
    setGlobalError,
  };
}
