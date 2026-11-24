import { z } from "zod";

/** Contact page form schema. User-facing messages are pinned by tests. */
export const contactFormSchema = z.object({
  name: z.string().min(2, { error: "Name must be at least 2 characters" }),
  email: z.email({ error: "Please enter a valid email address" }),
  projectType: z.string().min(1, { error: "Please choose what this is about" }),
  teamMembers: z.string().optional(),
  message: z.string().min(10, { error: "Message must be at least 10 characters" })
});

/** Click Through enquiry form schema. */
export const clickThroughFormSchema = z.object({
  name: z.string().min(2, { error: "Please tell us your name" }),
  company: z.string().min(2, { error: "Please tell us your company" }),
  email: z.email({ error: "Please enter a valid email address" }),
  teamSize: z.string().min(1, { error: "Roughly how many people?" }),
  message: z.string().min(10, { error: "A sentence or two on what you want AI to do for you" }),
  consent: z.literal(true, { error: "Please tick the box so we can pass your enquiry to Click Through" }),
});
