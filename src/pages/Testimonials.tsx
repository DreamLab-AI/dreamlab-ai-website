import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Quote, MapPin, Star, ArrowRight } from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";
import testimonials from "@/data/testimonials.json";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  location_detail: string;
  programme?: string;
  featured?: boolean;
}

const Testimonials = () => {
  useOGMeta({
    ...PAGE_OG_CONFIGS.home,
    title: "Success Stories | DreamLab AI",
    description: "Hear from business leaders and creatives who've transformed their work through our AI training programmes."
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-background to-background" />

        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Success Stories
            </h1>
            <p className="text-xl text-foreground/85 leading-relaxed">
              When the setting and the learning align, something shifts.
              Our alumni speak of breakthroughs that happened between sessions as much as during them.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials grid */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.id}
                className="group bg-background/60 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10"
                role="listitem"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8 relative">
                  {/* Quote icon */}
                  <Quote
                    className="absolute top-6 right-6 w-8 h-8 text-purple-500/20 group-hover:text-purple-500/40 transition-colors"
                    aria-hidden="true"
                  />

                  {/* Programme badge */}
                  {testimonial.programme && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium mb-4">
                      <Star className="w-3 h-3" aria-hidden="true" />
                      {testimonial.programme}
                    </div>
                  )}

                  {/* Quote text */}
                  <blockquote className="text-foreground/90 leading-relaxed mb-6 text-lg italic">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Attribution */}
                  <div className="border-t border-purple-500/20 pt-4">
                    <p className="font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {testimonial.role}
                    </p>

                    {/* Location detail */}
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      <span>{testimonial.location_detail}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />

        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Write Your Success Story?
          </h2>
          <p className="text-lg text-foreground/85 max-w-2xl mx-auto mb-8">
            Join our next cohort and leave with working AI solutions, not just theory.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/masterclass#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/30 transition-all hover:scale-105"
            >
              1-Day Workshop
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a
              href="/residential-training"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:scale-105"
            >
              Advanced Residential
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-purple-500/20">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Testimonials;
