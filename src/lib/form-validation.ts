import {
  EMAIL_PATTERN,
  INPUT_LIMITS,
  PERSON_NAME_PATTERN,
} from "@/lib/input-limits";

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

export function validateLoginInput(
  email: string,
  password: string,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim().toLowerCase().slice(0, INPUT_LIMITS.email);

  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length > INPUT_LIMITS.password) {
    errors.password = "Password is too long.";
  }

  return errors;
}

export function validatePersonName(value: string): boolean {
  const trimmed = value.trim().slice(0, INPUT_LIMITS.name);
  return trimmed.length >= 2 && PERSON_NAME_PATTERN.test(trimmed);
}

export function validateOptionalPhone(value: string): boolean {
  const trimmed = value.trim().slice(0, INPUT_LIMITS.phone);
  return trimmed === "" || /^\+?[\d\s\-]{7,20}$/.test(trimmed);
}
