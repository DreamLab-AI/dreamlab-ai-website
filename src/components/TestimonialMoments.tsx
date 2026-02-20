import { Card, CardContent } from "@/components/ui/card";
import { Quote, MapPin } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  locationDetail: string;
}

const testimonials: Testimonial[] = [
  {
    id: "ste-moyler",
    name: "Ste Moyler",
    role: "THG - Ingenuity",
    quote: "Never mind OpenClaw. This is Gryffindoooor!",
    locationDetail: "Roof terrace DJ sessions"
  },
  {
    id: "jess-symons",
    name: "Dr Jessica Symons",
    role: "Visioning Lab",
    quote: "I just used Claude Code to create an new version of a Unity project that had been gathering dust for years. Is was so satisfying to see it rise again. Thank you thank you John for setting me up. I am having so much fun 🙏 thanks 🙏.",
    locationDetail: "Walking through that bog!"
  },
  {
    id: "samira-velasco",
    name: "Samira Velasco",
    role: "Motion Graphics Designer",
    quote: "Real-time rendering clicked while rain drummed on the roof. I stopped overthinking everything and started making work that moves.",
    locationDetail: "Converted mill with waterwheel views"
  }
];

export const TestimonialMoments = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-slate-950" aria-label="Testimonials">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Moments of Clarity
          </h2>
          <p className="text-lg text-foreground/85 max-w-2xl mx-auto">
            When the setting and the learning align, something shifts.
            Our alumni speak of breakthroughs that happened between sessions as much as during them.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-8" role="list">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className="group bg-background/60 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1"
              role="listitem"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-8 relative">
                {/* Quote icon */}
                <Quote
                  className="absolute top-6 right-6 w-8 h-8 text-purple-500/20 group-hover:text-purple-500/40 transition-colors"
                  aria-hidden="true"
                />

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
                    <span>{testimonial.locationDetail}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
