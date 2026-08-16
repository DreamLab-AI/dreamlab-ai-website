import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";
import { useIsMobileSync } from "@/hooks/use-mobile";

// --- Constants ---
const SUCCESS_MESSAGE = "Message sent! We'll get back to you as soon as possible.";
const ERROR_MESSAGE_SUBMISSION = "There was a problem sending your message. Please try again.";

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  projectType: z.string().min(1, { message: "Please select a project type" }),
  teamMembers: z.string().optional(),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

type FormValues = z.infer<typeof formSchema>;

interface ContactViewProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (data: FormValues) => void | Promise<void>;
  isSubmitting: boolean;
  selectedTeam: string;
}

/* ============================================================
   MOBILE ENQUIRE (≤767px) — SCREENS.md §10
   Presentation only. Submission is the existing Supabase path,
   unchanged — so the reassurance copy stays truthful (this form
   stores to Supabase; it is not the NIP-17 e2e path).
   ============================================================ */

const ENGAGEMENTS = [
  { value: "enterprise", label: "Enterprise" },
  { value: "sme", label: "SME" },
  { value: "ktp", label: "KTP" },
];

const fieldClass =
  "w-full h-[52px] rounded-[10px] border border-white/[0.14] bg-white/[0.03] px-4 text-[16px] text-[#FAFAFA] placeholder-white/30 focus:border-dlm-bright focus:outline-none transition-colors";
const labelClass = "block text-[14px] text-white/75 mb-2";
const errClass = "text-[13px] text-red-400 mt-1.5";

const ContactMobile = ({ form, onSubmit, isSubmitting, selectedTeam }: ContactViewProps) => {
  const [hasConsent, setHasConsent] = useState(false);
  const { errors } = form.formState;
  const projectType = form.watch("projectType");

  // Engagement defaults to Enterprise (§10) without touching the shared form
  // defaults the desktop view relies on.
  useEffect(() => {
    if (!form.getValues("projectType")) form.setValue("projectType", "enterprise");
  }, [form]);

  return (
    <>
      <section id="main-content" className="pt-11 px-6 pb-6" aria-label="Enquire">
        <h1 className="text-[28px] font-semibold leading-[1.18] tracking-[-0.02em] text-[#FAFAFA] [text-wrap:pretty]">
          Tell us what you're working on.
        </h1>
        <p className="text-m-body text-white/[0.62] mt-3">
          We'll come back with dates and a shaped outline — usually within two working days.
        </p>
      </section>

      <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-16" aria-label="Enquiry form">
        <div className="space-y-5">
          <div>
            <label htmlFor="m-name" className={labelClass}>Your name</label>
            <input id="m-name" type="text" autoComplete="name" className={fieldClass}
              disabled={isSubmitting} {...form.register("name")} />
            {errors.name && <p className={errClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="m-email" className={labelClass}>Email</label>
            <input id="m-email" type="email" inputMode="email" autoComplete="email" className={fieldClass}
              disabled={isSubmitting} {...form.register("email")} />
            {errors.email && <p className={errClass}>{errors.email.message}</p>}
          </div>

          {selectedTeam && (
            <div>
              <label htmlFor="m-team" className={labelClass}>Selected specialists</label>
              <input id="m-team" readOnly value={selectedTeam}
                className={`${fieldClass} text-white/70`} {...form.register("teamMembers")} />
            </div>
          )}

          <div>
            <label htmlFor="m-message" className={labelClass}>What's the challenge?</label>
            <textarea id="m-message" rows={4}
              className="w-full rounded-[10px] border border-white/[0.14] bg-white/[0.03] p-[14px] text-[16px] leading-[1.5] text-[#FAFAFA] placeholder-white/30 focus:border-dlm-bright focus:outline-none transition-colors resize-none"
              placeholder="A sentence or two is plenty."
              disabled={isSubmitting} {...form.register("message")} />
            {errors.message && <p className={errClass}>{errors.message.message}</p>}
          </div>

          {/* Engagement chips — single select */}
          <div>
            <span className={labelClass}>Engagement</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Engagement type">
              {ENGAGEMENTS.map((e) => {
                const on = projectType === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => form.setValue("projectType", e.value, { shouldValidate: true })}
                    className={`inline-flex items-center min-h-[40px] px-[14px] py-[9px] rounded-full text-[14px] transition-colors ${
                      on
                        ? "border border-dlm-bright bg-[rgba(34,211,238,0.12)] text-[#FAFAFA]"
                        : "border border-dlm-hairline2 text-white/70"
                    }`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
            {errors.projectType && <p className={errClass}>{errors.projectType.message}</p>}
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 min-h-[44px]">
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="w-[22px] h-[22px] mt-0.5 shrink-0 accent-[#06B6D4]"
            />
            <span className="text-[14px] leading-[1.5] text-white/65">
              I'm happy for DreamLab to use these details to reply to my enquiry. See our{" "}
              <Link to="/privacy" className="text-dlm-bright underline">privacy policy</Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !hasConsent}
            className="flex items-center justify-center w-full h-[52px] rounded-[10px] bg-dlm-action text-dlm-ink text-[16px] font-semibold transition-colors active:bg-[#0891B2] disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSubmitting ? "Sending…" : "Send enquiry"}
          </button>

          <p className="text-[13px] leading-[1.5] text-white/[0.42]">
            We'll only use your details to reply about your enquiry. See our privacy policy for how
            we handle your data.
          </p>
        </div>
      </form>
    </>
  );
};

/* ============================================================
   DESKTOP CONTACT (md and up) — unchanged from the shipped site
   ============================================================ */

const ContactDesktop = ({ form, onSubmit, isSubmitting, selectedTeam }: ContactViewProps) => (
  <>
    {/* Contact header */}
    <section id="main-content" className="pt-24 pb-8 bg-secondary/20">
      <div className="container">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Have a project in mind? Fill out the form below and we'll get back to you.
        </p>
      </div>
    </section>

    {/* Contact form */}
    <section className="py-12" aria-label="Contact form">
      <div className="container max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Contact us form">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <FormControl>
                    <select
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      {...field}
                      disabled={isSubmitting}
                    >
                      <option value="" disabled>Select a project type</option>
                      <option value="consultation">Consultation</option>
                      <option value="development">Development</option>
                      <option value="training">Training</option>
                      <option value="research">Research</option>
                      <option value="other">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTeam && (
              <FormField
                control={form.control}
                name="teamMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selected Team Members</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={selectedTeam}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your project or inquiry..."
                      className="min-h-32"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Form>
      </div>
    </section>

    {/* Footer */}
    <footer className="py-8 bg-background" role="contentinfo">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-muted pt-8">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <nav aria-label="Social media links">
              <ul className="flex space-x-6">
                <li>
                  <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    Bluesky<span className="sr-only"> (opens in new window)</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    LinkedIn<span className="sr-only"> (opens in new window)</span>
                  </a>
                </li>
              </ul>
            </nav>
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  </>
);

const Contact = () => {
  // Set OG meta tags for contact page
  useOGMeta(PAGE_OG_CONFIGS.contact);

  const location = useLocation();
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobileSync();

  // Parse query params to get selected team members
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const team = params.get("team");
    if (team) {
      setSelectedTeam(team);
    }
  }, [location]);

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      projectType: "",
      teamMembers: selectedTeam,
      message: ""
    }
  });

  // Update team members field when selectedTeam changes
  useEffect(() => {
    form.setValue("teamMembers", selectedTeam);
  }, [selectedTeam, form]);

  const onSubmit = async (data: FormValues) => {
    if (!supabase) {
      toast.error("Service temporarily unavailable. Please try again later.", {
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    // Sprint v9 D4: do NOT log submitted form data (PII) or Supabase error
    // bodies (which can leak schema hints / project IDs). Show a generic
    // toast on failure; rely on Supabase server-side logs for diagnosis.
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          name: data.name,
          email: data.email,
          project_type: data.projectType,
          team_members: data.teamMembers || null,
          message: data.message,
          submitted_at: new Date().toISOString()
        }]);

      if (error) {
        throw error;
      }

      // Also add email to subscribers list if not already there
      await supabase
        .from('email_subscribers')
        .upsert([{ email: data.email }], {
          onConflict: 'email',
          ignoreDuplicates: true
        });

      // Show success message
      toast.success(SUCCESS_MESSAGE, { duration: 5000 });

      // Reset form
      form.reset();
    } catch {
      toast.error(ERROR_MESSAGE_SUBMISSION, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewProps: ContactViewProps = { form, onSubmit, isSubmitting, selectedTeam };

  return (
    <div className="min-h-screen bg-background text-foreground pt-14 md:pt-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />
      {isMobile ? <ContactMobile {...viewProps} /> : <ContactDesktop {...viewProps} />}
    </div>
  );
};

export default Contact;
