export const INPUT_LIMITS = {
  name: 255,
  email: 255,
  phone: 50,
  message: 5000,
  notes: 2000,
  password: 128,
  reference: 255,
} as const;

export const PHONE_PATTERN = /^\+?[\d\s\-]{7,20}$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PERSON_NAME_PATTERN = /^[\p{L}\s'\-.]+$/u;
