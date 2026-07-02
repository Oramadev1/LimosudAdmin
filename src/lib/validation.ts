import type { ApiValidationError } from "@/types/api";

export function mapValidationErrors(
  errors: ApiValidationError["errors"],
): Record<string, string> {
  const mapped: Record<string, string> = {};

  for (const [key, messages] of Object.entries(errors)) {
    if (messages[0]) {
      mapped[key] = messages[0];
    }
  }

  return mapped;
}

export function summarizeValidationErrors(
  body: ApiValidationError,
  fieldLabels: Record<string, string> = {},
): string {
  const lines = Object.entries(body.errors).map(([field, messages]) => {
    const label = fieldLabels[field] ?? field.replace(/_/g, " ");
    return `${label}: ${messages[0]}`;
  });

  return lines.length > 0 ? lines.join(" · ") : body.message;
}
