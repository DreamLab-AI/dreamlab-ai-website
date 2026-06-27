import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class values using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Email format regex for lightweight client-side validation. Disallows
 * whitespace and stray `@` (the previous `\S+@\S+\.\S+` accepted multiple `@`).
 * Shared by non-RHF forms (EmailSignupForm, DataErasureRequest).
 * Forms using React Hook Form should prefer `z.string().email()` instead.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field length caps for client-side forms (also enforce server-side/RLS). */
export const MAX_EMAIL_LEN = 254;
export const MAX_NAME_LEN = 100;
export const MAX_MESSAGE_LEN = 5000;

/** Validate an email: non-empty, within length cap, and well-formed. */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= MAX_EMAIL_LEN && EMAIL_REGEX.test(email);
}
