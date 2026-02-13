import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Clock, Users } from "lucide-react";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const ExclusivityBanner = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !EMAIL_REGEX.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('email_subscribers')
        .upsert({
          email: email.trim().toLowerCase(),
          source: 'waitlist_exclusivity_banner',
          has_consent: true
        }, {
          onConflict: 'email'
        });

      if (error) throw error;

      setEmail("");
      toast.success("You're on the list. We'll be in touch when Q2 opens.");
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative py-20 overflow-hidden" aria-label="Waitlist signup">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {/* Status badges */}
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="text-sm font-medium text-amber-200">Limited Availability</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Users className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span className="text-sm font-medium text-purple-200">Max 4 per cohort</span>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Curated Cohorts. Limited Seats.
          </h2>

          {/* Subheadline */}
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            Our residential programmes operate at intimate scale by design.
            Each cohort is carefully assembled to maximise peer learning and
            instructor access. Join the waitlist for upcoming sessions.
          </p>

          {/* Simple email signup */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-purple-500/50 focus:ring-purple-500/20"
              disabled={isSubmitting}
              required
              aria-label="Email address for waitlist"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-100 font-medium"
            >
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>

          <p className="text-xs text-slate-500 mt-4">
            No spam. Priority notification when spaces open.
          </p>
        </div>
      </div>
    </section>
  );
};
