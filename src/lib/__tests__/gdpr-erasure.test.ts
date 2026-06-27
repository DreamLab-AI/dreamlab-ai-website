import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase with per-table pre/post counts so we can exercise the
// re-query-after-delete logic (a delete that affects 0 rows does not error
// under RLS, so the report must verify rows are actually gone).
const h = vi.hoisted(() => ({
  state: {
    contact_submissions: { pre: 0, post: 0, deleteError: null as { message: string } | null },
    email_subscribers: { pre: 0, post: 0, deleteError: null as { message: string } | null },
  } as Record<string, { pre: number; post: number; deleteError: { message: string } | null }>,
  selectCalls: {} as Record<string, number>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from(table: string) {
      return {
        select: () => ({
          eq: () => {
            h.selectCalls[table] = (h.selectCalls[table] || 0) + 1;
            const st = h.state[table];
            const count = h.selectCalls[table] === 1 ? st.pre : st.post;
            return Promise.resolve({ count, error: null });
          },
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: h.state[table].deleteError }),
        }),
      };
    },
  },
}));

import { requestDataErasure } from "../gdpr-erasure";

describe("requestDataErasure", () => {
  beforeEach(() => {
    h.selectCalls.contact_submissions = 0;
    h.selectCalls.email_subscribers = 0;
  });

  it("normalises the email and reports rows actually removed", async () => {
    h.state.contact_submissions = { pre: 3, post: 0, deleteError: null };
    h.state.email_subscribers = { pre: 1, post: 0, deleteError: null };

    const report = await requestDataErasure("  Foo@Bar.COM ");

    expect(report.email).toBe("foo@bar.com");
    expect(report.success).toBe(true);
    const contact = report.results.find((r) => r.table === "contact_submissions");
    expect(contact).toMatchObject({ deleted: 3, error: null });
  });

  it("flags an incomplete deletion when rows remain (RLS blocked)", async () => {
    h.state.contact_submissions = { pre: 2, post: 2, deleteError: null };
    h.state.email_subscribers = { pre: 0, post: 0, deleteError: null };

    const report = await requestDataErasure("x@y.com");

    expect(report.success).toBe(false);
    const contact = report.results.find((r) => r.table === "contact_submissions");
    expect(contact?.deleted).toBe(0);
    expect(contact?.error).toMatch(/incomplete/i);
  });

  it("surfaces a delete error directly", async () => {
    h.state.contact_submissions = { pre: 1, post: 1, deleteError: { message: "permission denied" } };
    h.state.email_subscribers = { pre: 0, post: 0, deleteError: null };

    const report = await requestDataErasure("z@y.com");

    expect(report.success).toBe(false);
    const contact = report.results.find((r) => r.table === "contact_submissions");
    expect(contact?.error).toBe("permission denied");
  });
});
