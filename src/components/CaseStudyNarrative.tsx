import { Card, CardContent } from "@/components/ui/card";
import { Quote, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CaseStudyNarrative - A narrative-driven case study component
 * showcasing transformation through DreamLab's residential training.
 *
 * This is not a metrics-driven corporate case study, but a story
 * that shows the journey of a creative professional finding clarity.
 */
export const CaseStudyNarrative = () => {
  return (
    <section
      className="py-20 bg-gradient-to-b from-slate-950 to-background"
      aria-label="Case study narrative"
    >
      <div className="container max-w-4xl">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-sm font-medium text-purple-400 tracking-wider uppercase mb-2 block">
            A Story of Transformation
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            When the Technology Finally Made Sense
          </h2>
        </div>

        {/* Main narrative card */}
        <Card className="bg-background/40 backdrop-blur-xl border-purple-500/20 shadow-2xl shadow-purple-500/10">
          <CardContent className="p-8 md:p-12 space-y-6">
            {/* Opening scene */}
            <p className="text-lg text-foreground/90 leading-relaxed">
              Sarah arrived with 15 years in post-production but had never touched an LED volume.
              She'd watched the industry shift beneath her feet, seen junior artists land jobs she
              couldn't even apply for because "virtual production experience required" had become
              the gatekeeping phrase of the decade. The drive up to the Lake District felt like
              admitting defeat.
            </p>

            {/* The journey */}
            <p className="text-foreground/80 leading-relaxed">
              The first two days were humbling. Unreal Engine's node graphs looked like conspiracy
              theory boards. The camera tracking system spoke a language that made her decades of
              After Effects mastery feel suddenly irrelevant. She stayed up late in the converted
              barn studio, rain drumming on the slate roof, trying to make a virtual sunset
              behave the way sunsets actually behave.
            </p>

            {/* Pull quote */}
            <blockquote className="relative my-8 pl-6 py-4 border-l-4 border-purple-500/50 bg-purple-500/5 rounded-r-lg">
              <Quote
                className="absolute -top-2 -left-3 w-6 h-6 text-purple-500/40"
                aria-hidden="true"
              />
              <p className="text-xl md:text-2xl font-medium text-foreground/95 italic">
                "On day three, standing in front of that virtual sunset that finally responded
                to my camera moves in real-time, I understood why my traditional compositing
                workflow suddenly felt like archaeology."
              </p>
              <footer className="mt-3 text-sm text-purple-400">
                Sarah M., Senior Colourist turned VP Supervisor
              </footer>
            </blockquote>

            {/* The shift */}
            <p className="text-foreground/80 leading-relaxed">
              The breakthrough came not in a classroom but during a morning walk along
              Derwentwater. Something about watching fog lift off the water while mentally
              replaying the volumetric lighting tutorial from the night before. The real
              and the virtual stopped feeling like opposing forces. By the final session,
              she wasn't just operating the LED wall—she was choreographing light the way
              she'd always wanted to, just with tools that hadn't existed when she started
              her career.
            </p>

            {/* The result */}
            <p className="text-foreground/80 leading-relaxed">
              Six months later, Sarah leads virtual production integration at a mid-sized
              commercial house in Manchester. Her first VP job was a car commercial where
              the "location" was generated entirely from HDRI data she captured in the Lake
              District on that last morning—the same mountains she'd walked past, now wrapped
              around an LED volume, responding to camera moves she was calling.
            </p>
          </CardContent>
        </Card>

        {/* CTA link */}
        <div className="mt-10 text-center">
          <Link
            to="/residential-training"
            className="group inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors duration-300"
          >
            <span className="font-medium">Explore our residential training programmes</span>
            <ArrowRight
              className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
              aria-hidden="true"
            />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Limited to 4 participants per cohort for genuine transformation
          </p>
        </div>
      </div>
    </section>
  );
};

export default CaseStudyNarrative;
