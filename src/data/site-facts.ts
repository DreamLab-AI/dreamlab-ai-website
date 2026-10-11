/**
 * The figures the site states about DreamLab, in one place. Pages import from
 * here instead of typing numbers by hand; the static files that cannot import
 * (index.html, public/llms.txt) are checked against this file by
 * src/data/__tests__/site-facts.test.ts.
 *
 * Change a figure here and the build, the FAQ and its structured data follow.
 */
export const SITE_FACTS = {
  /** Size of the specialist network, as a display figure. */
  specialists: "40+",
  /** Residential accommodation at the Lake District facility. */
  bedrooms: 3,
  beds: 4,
  accommodation: "3 bedrooms, 4 beds",
  /** Residential programmes run one to three days; longer is draining. */
  residentialDays: "1–3 days",
  residentialMaxDays: 3,
  /** Indicative prices; every engagement is scoped and priced per client. */
  priceResidentialFrom: "£995",
  priceResidentialUnit: "per person per day, full-board",
  priceSprintFrom: "£2,500",
  pricingNote:
    "Every engagement is scoped and priced for your team. As a guide, residential programmes start from £995 per person per day, full-board, and one-day build sprints from £2,500.",
} as const;

export type SiteFacts = typeof SITE_FACTS;
