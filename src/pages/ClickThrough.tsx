import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SITE_FACTS } from "@/data/site-facts";
import { useOGMeta } from "@/hooks/useOGMeta";
import {
  generateEphemeralIdentity,
  buildEnquiryRumor,
  wrapDm,
  publishGiftWrap,
  publishMonitorCopy,
} from "@/lib/nostr";

/**
 * Click Through × DreamLab — residential AI training, sold through Click Through.
 *
 * Unlinked, noindex landing page reached from the printed flyer's QR code
 * (marketing/clickthrough-residential/). It wears Click Through's branding
 * (cream, navy, orange full-stop, Poppins, pill buttons) with one DreamLab
 * "lab" band in our dark glass motif. Pricing comes from SITE_FACTS so it can
 * never drift from the rest of the site; the enquiry travels over the same
 * NIP-17 gift-wrap ingress as /contact, tagged so the inbox watch can tell a
 * Click Through lead from a direct one.
 */

/** Read at submit time, not module load, so a build without the ingress degrades per request. */
const ingress = () => ({
  relayUrl: import.meta.env.VITE_RELAY_URL || "",
  adminPubkey: import.meta.env.VITE_ADMIN_PUBKEY || "",
  monitorPubkey: import.meta.env.VITE_MONITOR_PUBKEY || "",
});

export const CLICKTHROUGH_ENQUIRY_SUBJECT = "Click Through × DreamLab residential enquiry";
export const CLICKTHROUGH_ENGAGEMENT_TYPE = "clickthrough-residential";
export const CLICKTHROUGH_SOURCE = "clickthrough_landing_page";

const SUCCESS_MESSAGE = "Thanks — your enquiry is on its way. Stephen or John will be in touch.";
const ERROR_MESSAGE_SUBMISSION = "There was a problem sending your enquiry. Please try again.";
const ERROR_MESSAGE_UNAVAILABLE = "Service temporarily unavailable. Please email hello@clickthrough.digital instead.";

const PARTNER = {
  name: "Click Through",
  url: "https://www.clickthrough.digital/",
  phone: "01609 590035",
  phoneHref: "tel:01609590035",
  email: "hello@clickthrough.digital",
  address: "Crabtree Hall, Little Holtby, Northallerton, North Yorkshire DL7 9NY",
} as const;

const TEAM_SIZES = ["1–2", "3–4", "5–8", "More than 8"] as const;

const formSchema = z.object({
  name: z.string().min(2, { message: "Please tell us your name" }),
  company: z.string().min(2, { message: "Please tell us your company" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  teamSize: z.string().min(1, { message: "Roughly how many people?" }),
  message: z.string().min(10, { message: "A sentence or two on what you want AI to do for you" }),
});

type FormValues = z.infer<typeof formSchema>;

/** Click Through's signature: a navy headline that ends in an orange full stop. */
const Stop = () => <span className="text-ct-orange">.</span>;

const Logos = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <a href={PARTNER.url} target="_blank" rel="noopener noreferrer" aria-label="Click Through (opens in new window)">
      <img src="/images/partners/clickthrough.svg" alt="Click Through" width={166} height={25} className="h-6 w-auto" />
    </a>
    <span className="text-ct-navy/40 text-lg font-light select-none" aria-hidden="true">×</span>
    <a href="/" aria-label="DreamLab AI home" className="flex items-center gap-2">
      <img src="/brand/mark-animated.svg" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
      <span className="text-[13px] font-semibold tracking-[0.14em] text-ct-navy">DREAMLAB AI</span>
    </a>
  </div>
);

const Pill = ({
  href,
  tone,
  children,
}: {
  href: string;
  tone: "orange" | "teal" | "ghost";
  children: React.ReactNode;
}) => {
  const tones = {
    // Navy and teal-ink fills keep white button text above 4.5:1; the brand
    // orange is reserved for the headline, the full stop and decoration.
    orange: "bg-ct-navy text-white hover:bg-ct-orange-deep shadow-[0_8px_24px_-8px_rgba(24,64,108,0.5)]",
    teal: "bg-ct-teal-ink text-white hover:bg-ct-teal-deep",
    ghost: "border border-ct-navy/20 text-ct-navy hover:border-ct-navy/50",
  };
  return (
    <a
      href={href}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-[15px] font-semibold transition-colors duration-200 ${tones[tone]}`}
    >
      {children}
    </a>
  );
};

const inputClass =
  "w-full rounded-xl border border-ct-line bg-white px-4 py-3 text-[15px] text-ct-navy placeholder:text-ct-navy/40 focus:border-ct-orange focus:outline-none focus:ring-2 focus:ring-ct-orange/30 disabled:opacity-60";

const ClickThrough = () => {
  useOGMeta({
    title: "Residential AI training with Click Through | DreamLab",
    description:
      "AI training that pays for itself: 1–3 day residential programmes at DreamLab's Lake District lab, scoped and sold through Click Through. Pricing and enquiry.",
    url: "https://dreamlab-ai.com/clickthrough/",
    image: "https://dreamlab-ai.com/images/heroes/lake-district-dawn.webp",
    imageAlt: "Dawn over a Lake District valley",
  });

  // Reached by QR code only: keep it out of search results and the sitemap.
  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "robots";
      document.head.append(tag);
    }
    const previous = tag.content;
    tag.content = "noindex, nofollow";
    return () => {
      if (created) tag?.remove();
      else if (tag) tag.content = previous;
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", company: "", email: "", teamSize: "", message: "" },
  });
  const { register, handleSubmit, formState: { errors }, reset } = form;

  const onSubmit = async (data: FormValues) => {
    const { relayUrl, adminPubkey, monitorPubkey } = ingress();
    if (!relayUrl || !adminPubkey) {
      toast.error(ERROR_MESSAGE_UNAVAILABLE, { duration: 6000 });
      return;
    }
    setIsSubmitting(true);
    // Mirrors /contact (ADR-041): ephemeral sender, success gated on the relay
    // OK-true, nothing logged. The company and team size ride in the message so
    // the rumor shape stays identical to every other enquiry.
    try {
      const identity = generateEphemeralIdentity();
      const rumor = buildEnquiryRumor({
        name: data.name,
        email: data.email,
        engagementType: CLICKTHROUGH_ENGAGEMENT_TYPE,
        teamMembers: `Partner: Click Through (Stephen Prince) · Company: ${data.company.trim()} · Team size: ${data.teamSize}`,
        hasConsent: true,
        message: data.message,
        source: CLICKTHROUGH_SOURCE,
        pageUrl: window.location.href,
      });
      const wrap = wrapDm(rumor.content, identity.sk, adminPubkey, CLICKTHROUGH_ENQUIRY_SUBJECT);
      const result = await publishGiftWrap(relayUrl, wrap, { authSk: identity.sk });
      if (!result.ok) {
        toast.error(ERROR_MESSAGE_SUBMISSION, { duration: 5000 });
        return;
      }
      void publishMonitorCopy(relayUrl, rumor.content, identity.sk, monitorPubkey, adminPubkey, CLICKTHROUGH_ENQUIRY_SUBJECT);
      toast.success(SUCCESS_MESSAGE, { duration: 6000 });
      reset();
    } catch {
      toast.error(ERROR_MESSAGE_SUBMISSION, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ct-page min-h-screen bg-ct-cream text-ct-navy font-poppins antialiased">
      {/* Partner bar */}
      <header className="sticky top-0 z-20 border-b border-ct-line/70 bg-ct-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logos />
          <a
            href="#enquire"
            className="hidden rounded-full bg-ct-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ct-orange-deep sm:inline-flex"
          >
            Enquire
          </a>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden" aria-labelledby="hero-title">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] rounded-full bg-ct-bone/60 md:-right-24"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-ct-teal-ink">
                A Click Through × DreamLab programme
              </p>
              <h1 id="hero-title" className="text-[2.6rem] font-bold leading-[1.05] tracking-tight md:text-[3.6rem]">
                <span className="text-ct-orange-deep">AI training</span>
                <br />
                that pays for itself<Stop />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ct-navy/80">
                Take your team to DreamLab's lab in the Lake District for one to three days. You arrive with a
                business problem and leave with a working AI prototype, a plan, and the people who can keep it
                going. Click Through scopes it with you and carries it on afterwards.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Pill href="#enquire" tone="orange">Let's talk</Pill>
                <Pill href="#pricing" tone="teal">See pricing</Pill>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ct-navy/70">
                <li>{SITE_FACTS.residentialDays}, full-board</li>
                <li>Teams of up to 8</li>
                <li>{SITE_FACTS.specialists} specialists on call</li>
              </ul>
            </div>
            <figure className="relative md:self-start">
              <img
                src="/images/heroes/lake-district-dawn.webp"
                alt="Dawn light over a Lake District valley and lake"
                width={1920}
                height={1080}
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_30px_60px_-30px_rgba(24,64,108,0.5)]"
                loading="eager"
              />
              <figcaption className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-ct-navy shadow">
                The Lake District, Cumbria
              </figcaption>
            </figure>
          </div>
        </section>

        {/* What you get */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20" aria-labelledby="value-title">
          <h2 id="value-title" className="text-3xl font-bold md:text-4xl">
            What you're left with<Stop />
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "A prototype that works",
                body: "Not slides. Your team builds a real AI workflow on your real data, with specialists beside them.",
              },
              {
                title: "A plan you can cost",
                body: "What to automate first, what to leave alone, what it will take. Written down before you leave.",
              },
              {
                title: "People who can carry it",
                body: "Your staff come home able to run and extend what they built. Click Through stays on hand after.",
              },
            ].map((card) => (
              <article key={card.title} className="rounded-2xl border border-ct-line bg-white p-7">
                <h3 className="text-lg font-semibold">
                  {card.title}
                  <Stop />
                </h3>
                <p className="mt-3 leading-relaxed text-ct-navy/75">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* The lab — DreamLab's dark motif, one band only */}
        <section className="dl-band relative overflow-hidden bg-[#0E0E11] text-[#FAFAFA]" aria-labelledby="lab-title">
          <div aria-hidden="true" className="dl-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#22D3EE]">The lab</p>
              <h2 id="lab-title" className="text-3xl font-bold md:text-4xl">
                A working studio, not a hotel conference room
              </h2>
              <p className="mt-5 leading-relaxed text-white/75">
                DreamLab is an applied innovation lab in a Lake District village: a production studio, a robotics
                and XR floor, GPU compute, and {SITE_FACTS.accommodation} so the team eats, sleeps and builds in
                one place. Phones go quiet, the work gets done.
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Format", `${SITE_FACTS.residentialDays} residential`],
                  ["Group", "Up to 8 people"],
                  ["Board", "Full-board, on site"],
                  ["Led by", `${SITE_FACTS.specialists} resident specialists`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                    <dt className="text-white/50">{k}</dt>
                    <dd className="mt-1 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid gap-4">
              <img
                src="/images/venue/labview2.webp"
                alt="DreamLab studio with LED wall, robot arm and camera rigs"
                width={1680}
                height={945}
                loading="lazy"
                className="aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover"
              />
              <img
                src="/images/venue/aerial.webp"
                alt="Aerial view of the DreamLab building and the fells behind it"
                width={1024}
                height={576}
                loading="lazy"
                className="aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20" aria-labelledby="how-title">
          <h2 id="how-title" className="text-3xl font-bold md:text-4xl">
            How it works<Stop />
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                who: "Click Through",
                title: "Scope the problem",
                body: "A free call with Stephen to find the one process where AI would move the needle for you.",
              },
              {
                who: "DreamLab",
                title: "Design the residential",
                body: "We pick the specialists, the modules and the length to match your team and your challenge.",
              },
              {
                who: "Together",
                title: "Build it, then keep it running",
                body: "Your team builds at the lab. Click Through carries the result into your marketing and operations.",
              },
            ].map((step, i) => (
              <li key={step.title} className="relative rounded-2xl bg-white p-7 border border-ct-line">
                <span className="text-4xl font-bold text-ct-orange-deep">0{i + 1}</span>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ct-teal-ink">{step.who}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-ct-navy/75">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-white border-y border-ct-line" aria-labelledby="pricing-title">
          <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
            <h2 id="pricing-title" className="text-3xl font-bold md:text-4xl">
              Pricing<Stop />
            </h2>
            <p className="mt-3 max-w-2xl text-ct-navy/75">{SITE_FACTS.pricingNote}</p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-ct-line p-7">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ct-teal-ink">Discovery call</h3>
                <p className="mt-3 text-4xl font-bold">Free</p>
                <p className="mt-1 text-sm text-ct-navy/60">45 minutes with Click Through</p>
                <p className="mt-4 text-ct-navy/75">Where AI genuinely helps your business, where it doesn't, and what to do first.</p>
              </article>
              <article className="rounded-2xl border-2 border-ct-orange p-7 shadow-[0_24px_48px_-24px_rgba(239,122,82,0.45)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ct-orange-ink">Residential programme</h3>
                <p className="mt-3 text-4xl font-bold">
                  From {SITE_FACTS.priceResidentialFrom}
                </p>
                <p className="mt-1 text-sm text-ct-navy/60">{SITE_FACTS.priceResidentialUnit}</p>
                <p className="mt-4 text-ct-navy/75">
                  {SITE_FACTS.residentialDays} at the lab for teams of up to 8. Accommodation, meals, studio time and
                  specialists included.
                </p>
              </article>
              <article className="rounded-2xl border border-ct-line p-7">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ct-teal-ink">One-day build sprint</h3>
                <p className="mt-3 text-4xl font-bold">From {SITE_FACTS.priceSprintFrom}</p>
                <p className="mt-1 text-sm text-ct-navy/60">per team, at the lab or at yours</p>
                <p className="mt-4 text-ct-navy/75">One day, one process, one working prototype. The fastest way to find out if a residential is worth it.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Enquiry */}
        <section id="enquire" className="mx-auto max-w-6xl px-5 py-14 md:py-20" aria-labelledby="enquire-title">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 id="enquire-title" className="text-3xl font-bold md:text-4xl">
                Tell us the problem<Stop />
              </h2>
              <p className="mt-4 leading-relaxed text-ct-navy/75">
                We'll tell you honestly whether a residential is the right answer. Either way you'll leave the
                conversation knowing more than you came in with.
              </p>
              <address className="mt-8 not-italic text-sm leading-relaxed text-ct-navy/75">
                <strong className="block text-ct-navy">Click Through</strong>
                Stephen Prince's multi-award-winning Yorkshire digital agency
                <br />
                <a className="hover:text-ct-orange" href={PARTNER.phoneHref}>{PARTNER.phone}</a>
                <br />
                <a className="hover:text-ct-orange" href={`mailto:${PARTNER.email}`}>{PARTNER.email}</a>
                <br />
                {PARTNER.address}
              </address>
              <address className="mt-6 not-italic text-sm leading-relaxed text-ct-navy/75">
                <strong className="block text-ct-navy">DreamLab AI Consulting Ltd</strong>
                Lake District, Cumbria ·{" "}
                <a className="hover:text-ct-orange" href="/">dreamlab-ai.com</a>
              </address>
              <a
                href="/downloads/clickthrough-dreamlab-residential-a4.pdf"
                className="mt-8 inline-flex min-h-[44px] items-center rounded-full border border-ct-navy/20 px-5 text-sm font-semibold text-ct-navy transition-colors hover:border-ct-navy/50"
              >
                Download the one-pager (PDF, A4)
              </a>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-2xl border border-ct-line bg-white p-6 md:p-8">
              <p className="mb-5 text-sm text-ct-navy/60">
                Enquiry about the <strong className="text-ct-navy">Click Through × DreamLab residential</strong>.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ct-name" className="mb-1.5 block text-sm font-medium">Your name</label>
                  <input id="ct-name" className={inputClass} autoComplete="name" disabled={isSubmitting} {...register("name")} />
                  {errors.name && <p role="alert" className="mt-1 text-xs text-ct-orange-ink">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="ct-company" className="mb-1.5 block text-sm font-medium">Company</label>
                  <input id="ct-company" className={inputClass} autoComplete="organization" disabled={isSubmitting} {...register("company")} />
                  {errors.company && <p role="alert" className="mt-1 text-xs text-ct-orange-ink">{errors.company.message}</p>}
                </div>
                <div>
                  <label htmlFor="ct-email" className="mb-1.5 block text-sm font-medium">Work email</label>
                  <input id="ct-email" type="email" className={inputClass} autoComplete="email" disabled={isSubmitting} {...register("email")} />
                  {errors.email && <p role="alert" className="mt-1 text-xs text-ct-orange-ink">{errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="ct-team" className="mb-1.5 block text-sm font-medium">How many people?</label>
                  <select id="ct-team" className={inputClass} disabled={isSubmitting} {...register("teamSize")}>
                    <option value="">Choose…</option>
                    {TEAM_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.teamSize && <p role="alert" className="mt-1 text-xs text-ct-orange-ink">{errors.teamSize.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ct-message" className="mb-1.5 block text-sm font-medium">What should AI do for your business?</label>
                  <textarea id="ct-message" rows={5} className={inputClass} disabled={isSubmitting} {...register("message")} />
                  {errors.message && <p role="alert" className="mt-1 text-xs text-ct-orange-ink">{errors.message.message}</p>}
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-ct-navy px-7 text-[15px] font-semibold text-white transition-colors hover:bg-ct-orange-deep disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? "Sending…" : "Send enquiry"}
              </button>
              <p className="mt-4 text-xs leading-relaxed text-ct-navy/55">
                Sent end-to-end encrypted to DreamLab and shared with Click Through to arrange your call. Nothing is
                stored in a database. <a className="underline hover:text-ct-orange" href="/privacy/">Privacy</a>.
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-ct-line" role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-ct-navy/60 md:flex-row md:items-center md:justify-between">
          <Logos />
          <p>
            © {new Date().getFullYear()} Click Through Digital and DreamLab AI Consulting Ltd. Delivered at DreamLab,
            Lake District.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClickThrough;
