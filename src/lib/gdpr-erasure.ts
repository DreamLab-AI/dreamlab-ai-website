/**
 * GDPR Article 17 — Right to Erasure ("Right to be Forgotten")
 *
 * Provides a data erasure pipeline that deletes all PII associated with
 * a given email address from every Supabase table that stores user data.
 *
 * Known PII tables:
 *   - contact_submissions  (name, email, message)
 *   - email_subscribers    (email, name)
 *
 * This module is consumed by the DataErasureRequest component which
 * provides the user-facing "Delete my data" form.
 */

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErasureResult {
  table: string;
  deleted: number;
  error: string | null;
}

export interface ErasureReport {
  email: string;
  results: ErasureResult[];
  success: boolean;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// PII table registry — add new tables here as the schema grows
// ---------------------------------------------------------------------------

/**
 * Each entry defines a Supabase table that stores PII and the column
 * name that holds the user's email address (the erasure key).
 */
const PII_TABLES: ReadonlyArray<{ table: string; emailColumn: string }> = [
  { table: "contact_submissions", emailColumn: "email" },
  { table: "email_subscribers", emailColumn: "email" },
];

// ---------------------------------------------------------------------------
// Core erasure function
// ---------------------------------------------------------------------------

/**
 * Delete all rows matching `email` from every known PII table.
 *
 * Returns a report detailing per-table outcomes. The overall `success`
 * flag is true only when every table deletion succeeded.
 *
 * @param email - The email address whose data should be erased.
 */
export async function requestDataErasure(
  email: string,
): Promise<ErasureReport> {
  const client = supabase;

  if (!client) {
    return {
      email,
      results: [],
      success: false,
      timestamp: new Date().toISOString(),
    };
  }

  const normalised = email.trim().toLowerCase();

  const results: ErasureResult[] = await Promise.all(
    PII_TABLES.map(async ({ table, emailColumn }): Promise<ErasureResult> => {
      try {
        // First count the rows that will be deleted so we can report it.
        const { count, error: countError } = await client
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(emailColumn, normalised);

        if (countError) {
          return { table, deleted: 0, error: countError.message };
        }

        const before = count ?? 0;

        // Perform the deletion.
        const { error: deleteError } = await client
          .from(table)
          .delete()
          .eq(emailColumn, normalised);

        if (deleteError) {
          return { table, deleted: 0, error: deleteError.message };
        }

        // Re-count after deleting. A delete that affects 0 rows does not error
        // under RLS, so we must verify the rows are actually gone rather than
        // trusting the pre-count (which would report a false success).
        const { count: remaining, error: verifyError } = await client
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(emailColumn, normalised);

        if (verifyError) {
          return { table, deleted: 0, error: verifyError.message };
        }

        const left = remaining ?? 0;
        if (left > 0) {
          return {
            table,
            deleted: Math.max(0, before - left),
            error: `deletion incomplete: ${left} row(s) remain (check RLS delete policy)`,
          };
        }

        return { table, deleted: before, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { table, deleted: 0, error: message };
      }
    }),
  );

  return {
    email: normalised,
    results,
    success: results.every((r) => r.error === null),
    timestamp: new Date().toISOString(),
  };
}
