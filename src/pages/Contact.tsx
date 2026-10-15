import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "@/components/SlashLink";
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
import {
  generateEphemeralIdentity,
  buildEnquiryRumor,
  wrapDm,
  publishGiftWrap,
  publishMonitorCopy,
} from "@/lib/nostr";
import { npubEncode } from "nostr-tools/nip19";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";
import { useIsMobileSync } from "@/hooks/use-mobile";

// --- Constants ---
const SUCCESS_MESSAGE = "Message sent! We'll get back to you as soon as possible.";
const ERROR_MESSAGE_SUBMISSION = "There was a problem sending your message. Please try again.";
const ERROR_MESSAGE_UNAVAILABLE = "Service temporarily unavailable. Please try again later.";

// Enquiries are delivered to the site operator as an anonymous, end-to-end
// encrypted NIP-17 gift-wrapped DM (ADR-041) — the same ingress the signup form
// uses. No database row is written; success is gated on the relay OK-true so a
// rejected publish never shows a false success.
const RELAY_URL = import.meta.env.VITE_RELAY_URL || "";
const ADMIN_PUBKEY = import.meta.env.VITE_ADMIN_PUBKEY || "";
const MONITOR_PUBKEY = import.meta.env.VITE_MONITOR_PUBKEY || "";
const ENQUIRY_SUBJECT = "DreamLab website enquiry";

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  projectType: z.string().min(1, { message: "Please choose what this is about" }),
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
   Submits over the NIP-17 end-to-end-encrypted gift-wrap ingress
   (shared onSubmit), so the "end-to-end encrypted" reassurance
   line below is now literally true.
   ============================================================ */

/**
 * What an enquiry is about, shared by both layouts. These are the services the
 * site sells (Programmes, Co-Create, Ventures) plus a privacy route; the value
 * travels in the encrypted DM as `engagement_type` and is read by a person.
 * Links can pre-select one with `/contact?type=<value>`.
 */
const ENQUIRY_TYPES = [
  { value: "residential", label: "Residential programme" },
  { value: "sme-sprint", label: "SME sprint" },
  { value: "ktp", label: "KTP partnership" },
  { value: "lab-visit", label: "Lab visit" },
  { value: "venture-lab", label: "Venture Lab" },
  { value: "privacy", label: "Privacy or data request" },
  { value: "other", label: "Something else" },
] as const;

const REPLY_TIME = "We usually reply within two working days.";

/** DreamLab's public Nostr identity: the key the form already encrypts to. */
const ADMIN_NPUB = (() => {
  try {
    return import.meta.env.VITE_ADMIN_PUBKEY ? npubEncode(import.meta.env.VITE_ADMIN_PUBKEY) : "";
  } catch {
    return "";
  }
})();

/**
 * Every contact route runs over Nostr: the form above (a one-off encrypted
 * DM), a direct message from the visitor's own Nostr client, or the
 * community forum. Nothing is stored in a database.
 */
const OtherChannels = ({ variant }: { variant: "mobile" | "desktop" }) => {
  const [copied, setCopied] = useState(false);
  const mobile = variant === "mobile";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_NPUB);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the npub stays visible to select by hand */
    }
  };
  return (
    <section
      aria-labelledby={`channels-${variant}`}
      className={mobile ? "px-6 pb-16" : "pb-16"}
    >
      <div className={mobile ? "" : "container max-w-2xl"}>
        <h2
          id={`channels-${variant}`}
          className={mobile ? "text-m-h2 text-[#FAFAFA] mb-4" : "text-xl font-semibold mb-4"}
        >
          Other ways to reach us
        </h2>
        <ul className={mobile ? "space-y-4 text-[15px] text-white/75" : "space-y-4 text-muted-foreground"}>
          {ADMIN_NPUB && (
            <li>
              <span className={mobile ? "block text-[#FAFAFA] font-medium" : "block text-foreground font-medium"}>
                Message us on Nostr
              </span>
              Send an encrypted direct message from any Nostr app (Amethyst, Damus, Primal and others) to:
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-white/[0.06] px-2 py-1 text-[13px]">{ADMIN_NPUB}</code>
                <button
                  type="button"
                  onClick={copy}
                  className={mobile ? "min-h-[40px] px-3 rounded-[10px] border border-dlm-hairline2 text-[14px] text-dlm-bright" : "text-sm text-primary hover:underline"}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <a href={`nostr:${ADMIN_NPUB}`} className={mobile ? "text-[14px] text-dlm-bright underline" : "text-sm text-primary hover:underline"}>
                  Open in your Nostr app
                </a>
              </span>
            </li>
          )}
          <li>
            <span className={mobile ? "block text-[#FAFAFA] font-medium" : "block text-foreground font-medium"}>
              Join the community
            </span>
            Ask in the open on the <a href="/community/" className={mobile ? "text-dlm-bright underline" : "text-primary hover:underline"}>DreamLab community forum</a>, which also runs on Nostr.
          </li>
        </ul>
      </div>
    </section>
  );
};

const fieldClass =
  "w-full h-[52px] rounded-[10px] border border-white/[0.14] bg-white/[0.03] px-4 text-[16px] text-[#FAFAFA] placeholder-white/30 focus:border-dlm-bright focus:outline-none transition-colors";
const labelClass = "block text-[14px] text-white/75 mb-2";
const errClass = "text-[13px] text-red-400 mt-1.5";

const ContactMobile = ({ form, onSubmit, isSubmitting, selectedTeam }: ContactViewProps) => {
  const [hasConsent, setHasConsent] = useState(false);
  const { errors } = form.formState;
  const projectType = form.watch("projectType");

  // Engagement defaults to a residential programme (§10) unless a link
  // pre-selected one, without touching the shared form defaults.
  useEffect(() => {
    if (!form.getValues("projectType")) form.setValue("projectType", "residential");
  }, [form]);

  return (
    <>
      <section id="main-content" className="pt-11 px-6 pb-6" aria-label="Enquire">
        <h1 className="text-[28px] font-semibold leading-[1.18] tracking-[-0.02em] text-[#FAFAFA] [text-wrap:pretty]">
          Tell us what you're working on.
        </h1>
        <p className="text-m-body text-white/[0.62] mt-3">
          We'll come back with dates and a shaped outline. {REPLY_TIME}
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
              {ENQUIRY_TYPES.map((e) => {
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

          <p className="text-[13px] leading-[1.5] text-white/55">
            Sent end-to-end encrypted. Only we can read it, and we don't store it anywhere else.
          </p>
        </div>
      </form>
      <OtherChannels variant="mobile" />
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
          Tell us what you're working on and we'll come back with dates and a shaped outline. {REPLY_TIME}
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
                  <FormLabel>What is this about?</FormLabel>
                  <FormControl>
                    <select
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      {...field}
                      disabled={isSubmitting}
                    >
                      <option value="" disabled>Select what this is about</option>
                      {ENQUIRY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
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
            <p className="text-sm text-muted-foreground">
              Sent end-to-end encrypted over Nostr. Only we can read it, and we don't store it anywhere else.
            </p>
          </form>
        </Form>
      </div>
    </section>

    <OtherChannels variant="desktop" />

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
            <a href="/privacy/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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

  // Pre-select the enquiry type a link asked for (e.g. "Schedule a lab visit").
  useEffect(() => {
    const type = new URLSearchParams(location.search).get("type");
    if (type && ENQUIRY_TYPES.some((t) => t.value === type)) {
      form.setValue("projectType", type, { shouldValidate: false });
    }
  }, [location, form]);

  // Update team members field when selectedTeam changes
  useEffect(() => {
    form.setValue("teamMembers", selectedTeam);
  }, [selectedTeam, form]);

  const onSubmit = async (data: FormValues) => {
    // Degrade gracefully if the ingress isn't configured for this build.
    if (!RELAY_URL || !ADMIN_PUBKEY) {
      toast.error(ERROR_MESSAGE_UNAVAILABLE, { duration: 5000 });
      return;
    }

    setIsSubmitting(true);

    // Do NOT log submitted form data (PII) or the raw relay message (an OK-false
    // reason can leak internal relay/whitelist detail). Success is gated strictly
    // on the relay OK-true, mirroring EmailSignupForm (ADR-041 D4).
    try {
      // One-shot ephemeral sender key: minted, used once, then discarded — the
      // sender is anonymous and unlinkable across submissions.
      const identity = generateEphemeralIdentity();
      const rumor = buildEnquiryRumor({
        name: data.name,
        email: data.email,
        engagementType: data.projectType,
        teamMembers: data.teamMembers,
        // Submitting the form is the consent action (mobile gates on an explicit
        // checkbox; the desktop form's submit is the implicit agreement).
        hasConsent: true,
        message: data.message,
        source: "website_contact_form",
        pageUrl: window.location.href,
      });
      const wrap = wrapDm(rumor.content, identity.sk, ADMIN_PUBKEY, ENQUIRY_SUBJECT);
      const result = await publishGiftWrap(RELAY_URL, wrap, { authSk: identity.sk });

      if (!result.ok) {
        toast.error(ERROR_MESSAGE_SUBMISSION, { duration: 5000 });
        return;
      }

      void publishMonitorCopy(RELAY_URL, rumor.content, identity.sk, MONITOR_PUBKEY, ADMIN_PUBKEY, ENQUIRY_SUBJECT);
      toast.success(SUCCESS_MESSAGE, { duration: 5000 });
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
      <Header />
      {isMobile ? <ContactMobile {...viewProps} /> : <ContactDesktop {...viewProps} />}
    </div>
  );
};

export default Contact;
