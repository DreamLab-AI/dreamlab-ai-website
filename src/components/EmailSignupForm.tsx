import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { isValidEmail, MAX_EMAIL_LEN, MAX_NAME_LEN } from "@/lib/utils";
import {
  generateEphemeralIdentity,
  buildContactRumor,
  wrapDm,
  publishGiftWrap,
} from "@/lib/nostr";

// --- Constants ---
const SUCCESS_MESSAGE = "Thanks for signing up! We'll be in touch soon.";
const ERROR_MESSAGE_INVALID_EMAIL = "Please enter a valid email address";
const ERROR_MESSAGE_CONSENT = "Please accept our privacy policy to sign up";
const ERROR_MESSAGE_SUBMISSION = "Failed to sign up. Please try again later.";
const ERROR_MESSAGE_UNAVAILABLE = "Service temporarily unavailable. Please try again later.";
const SUBMITTING_TEXT = "Submitting...";
const SUBMIT_TEXT = "Sign Up";

// Signup submissions are delivered to the site operator as an anonymous,
// end-to-end-encrypted NIP-17 gift-wrapped DM (ADR-041). No Supabase row is
// written. Relay + admin recipient are read from the build env, mirroring the
// old module-level env pattern; if either is unset the form degrades gracefully.
const RELAY_URL = import.meta.env.VITE_RELAY_URL || "";
const ADMIN_PUBKEY = import.meta.env.VITE_ADMIN_PUBKEY || "";
const SIGNUP_SUBJECT = "DreamLab website signup";

/**
 * Renders an enhanced email signup form with name field and consent checkbox.
 * On submit it wraps the details as a client-side, end-to-end-encrypted DM to
 * the site operator and publishes it to the Nostr relay (ADR-041). Success is
 * reported only when the relay confirms the event with OK-true; an OK-false
 * (e.g. recipient not yet whitelisted) or timeout surfaces as a failure rather
 * than a false positive.
 */
export const EmailSignupForm = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email format
    if (!isValidEmail(email)) {
      toast.error(ERROR_MESSAGE_INVALID_EMAIL);
      return;
    }

    // Validate consent
    if (!hasConsent) {
      toast.error(ERROR_MESSAGE_CONSENT);
      return;
    }

    // Degrade gracefully if the ingress isn't configured for this build.
    if (!RELAY_URL || !ADMIN_PUBKEY) {
      toast.error(ERROR_MESSAGE_UNAVAILABLE);
      return;
    }

    setIsSubmitting(true);

    try {
      // One-shot ephemeral sender key: minted, used once, then discarded. The
      // sender is anonymous and unlinkable across submissions (ADR-041 D2).
      const identity = generateEphemeralIdentity();
      const rumor = buildContactRumor({
        name: name.trim() || undefined,
        email: email.trim().toLowerCase(),
        hasConsent,
        source: "website_signup_form",
        pageUrl: window.location.href,
      });
      const wrap = wrapDm(rumor.content, identity.sk, ADMIN_PUBKEY, SIGNUP_SUBJECT);
      const result = await publishGiftWrap(RELAY_URL, wrap);

      // Do not log the raw relay message client-side — an OK-false reason can
      // leak internal relay / whitelist detail (matches the Contact form's
      // no-raw-error policy). Success is gated strictly on the relay OK-true so
      // a rejected publish never shows a false success (ADR-041 D4).
      if (!result.ok) {
        toast.error(ERROR_MESSAGE_SUBMISSION);
        return;
      }

      setEmail("");
      setName("");
      setHasConsent(false);
      toast.success(SUCCESS_MESSAGE);
    } catch {
      toast.error(ERROR_MESSAGE_SUBMISSION);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div className="space-y-3">
        <div className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
          <Label htmlFor="name-signup" className="text-sm mb-1 block text-muted-foreground/90">
            Name (optional)
          </Label>
          <Input
            id="name-signup"
            type="text"
            placeholder="Your name"
            value={name}
            maxLength={MAX_NAME_LEN}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg bg-background/60 backdrop-blur-sm border-purple-500/30 placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>

        <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
          <Label htmlFor="email-signup" className="text-sm mb-1 block text-muted-foreground/90">
            Email Address
          </Label>
          <Input
            id="email-signup"
            type="email"
            placeholder="Your email address"
            value={email}
            maxLength={MAX_EMAIL_LEN}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg bg-background/60 backdrop-blur-sm border-purple-500/30 placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-start gap-2 mt-2 animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <Checkbox
            id="consent"
            checked={hasConsent}
            onCheckedChange={(checked) => setHasConsent(checked === true)}
            disabled={isSubmitting}
            className="mt-1 border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
          <Label
            htmlFor="consent"
            className="text-xs text-muted-foreground/80 leading-tight cursor-pointer hover:text-muted-foreground transition-colors"
          >
            I agree to receive emails from DreamLab about projects, opportunities, and news. You can unsubscribe at any time. See our <a href="/privacy" className="underline hover:text-purple-400 transition-colors">Privacy Policy</a> for more information.
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none animate-scale-in"
        style={{ animationDelay: '0.4s' }}
      >
        {isSubmitting ? SUBMITTING_TEXT : SUBMIT_TEXT}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Stay updated on our projects & opportunities
      </p>
    </form>
  );
};
