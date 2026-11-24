import { describe, it, expect } from "vitest";
import { contactFormSchema, clickThroughFormSchema } from "../formSchemas";

/** Map of top-level field -> first error message. */
function messages(schema: typeof contactFormSchema | typeof clickThroughFormSchema, input: unknown) {
  const r = schema.safeParse(input);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0]);
    if (!(k in out)) out[k] = i.message;
  }
  return out;
}

describe("contactFormSchema messages", () => {
  it("accepts a valid payload (teamMembers optional)", () => {
    expect(contactFormSchema.safeParse({ name: "Ab", email: "a@b.co", projectType: "x", message: "0123456789" }).success).toBe(true);
  });
  it("reports pinned messages for invalid values", () => {
    expect(messages(contactFormSchema, { name: "A", email: "nope", projectType: "", message: "short" })).toEqual({
      name: "Name must be at least 2 characters",
      email: "Please enter a valid email address",
      projectType: "Please choose what this is about",
      message: "Message must be at least 10 characters",
    });
  });
});

describe("clickThroughFormSchema messages", () => {
  const good = { name: "Ab", company: "Co", email: "a@b.co", teamSize: "1–2", message: "0123456789", consent: true };
  it("accepts a valid payload", () => {
    expect(clickThroughFormSchema.safeParse(good).success).toBe(true);
  });
  it("reports pinned messages for invalid values", () => {
    expect(messages(clickThroughFormSchema, { name: "A", company: "C", email: "x", teamSize: "", message: "s", consent: false })).toEqual({
      name: "Please tell us your name",
      company: "Please tell us your company",
      email: "Please enter a valid email address",
      teamSize: "Roughly how many people?",
      message: "A sentence or two on what you want AI to do for you",
      consent: "Please tick the box so we can pass your enquiry to Click Through",
    });
  });
  it("uses the consent message when consent is missing", () => {
    expect(messages(clickThroughFormSchema, { ...good, consent: undefined }).consent).toBe(
      "Please tick the box so we can pass your enquiry to Click Through");
  });
});
