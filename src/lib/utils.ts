import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class values using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Basic email format regex for lightweight client-side validation.
 * Shared by non-RHF forms (EmailSignupForm, DataErasureRequest).
 * Forms using React Hook Form should prefer `z.string().email()` instead.
 */
export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
