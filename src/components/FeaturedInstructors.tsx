import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, GraduationCap, Film } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  title: string;
  credential: string;
  bio: string;
  icon: React.ReactNode;
  accentColor: string;
}

const instructors: Instructor[] = [
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    title: "Virtual Production Director",
    credential: "Emmy-nominated for Outstanding Visual Effects",
    bio: "Marcus brings a rare calm to high-pressure LED volume shoots, having led virtual production on projects spanning Star Wars episodic content to Formula 1 broadcasts. When not on set, you'll find him obsessing over camera tracking systems or hiking the fells.",
    icon: <Award className="w-5 h-5" />,
    accentColor: "from-amber-500 to-orange-600"
  },
  {
    id: "dr-elena-vasquez",
    name: "Dr. Elena Vasquez",
    title: "Spatial Audio Research Lead",
    credential: "PhD Psychoacoustics, Cambridge | Dolby Fellow",
    bio: "Elena's research into how humans perceive 3D sound has shaped immersive audio standards across gaming and cinema. She has a knack for making complex acoustics intuitive, often using her love of field recording to illustrate concepts through real-world soundscapes.",
    icon: <GraduationCap className="w-5 h-5" />,
    accentColor: "from-blue-500 to-cyan-600"
  },
  {
    id: "james-okonkwo",
    name: "James Okonkwo",
    title: "Motion Capture Director",
    credential: "18 years | Marvel, Naughty Dog, ILM",
    bio: "James has spent nearly two decades translating human performance into digital characters, from AAA game protagonists to blockbuster film creatures. He's known for his infectious enthusiasm on the mocap stage and his ability to coax authentic performances from first-time suit performers.",
    icon: <Film className="w-5 h-5" />,
    accentColor: "from-purple-500 to-pink-600"
  }
];

export const FeaturedInstructors = () => {
  return (
    <section className="py-20 bg-slate-950" aria-label="Featured instructors">
      <div className="container">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-slate-400 border-slate-700">
            The Collective
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Learn From Those Who Ship
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Our instructors aren't academics who lecture from slides.
            They're active practitioners who return from production to teach.
          </p>
        </div>

        {/* Instructor cards */}
        <div className="grid md:grid-cols-3 gap-8" role="list">
          {instructors.map((instructor) => (
            <Card
              key={instructor.id}
              className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden"
              role="listitem"
            >
              {/* Gradient accent bar */}
              <div className={`h-1 bg-gradient-to-r ${instructor.accentColor}`} aria-hidden="true" />

              <CardContent className="p-8">
                {/* Icon */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${instructor.accentColor} bg-opacity-10`}>
                    <div className="text-white" aria-hidden="true">
                      {instructor.icon}
                    </div>
                  </div>
                </div>

                {/* Name and title */}
                <h3 className="text-xl font-bold text-white mb-1">
                  {instructor.name}
                </h3>
                <p className="text-sm font-medium text-slate-400 mb-3">
                  {instructor.title}
                </p>

                {/* Credential one-liner */}
                <p className={`text-sm font-medium bg-gradient-to-r ${instructor.accentColor} bg-clip-text text-transparent mb-4`}>
                  {instructor.credential}
                </p>

                {/* Bio */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {instructor.bio}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-slate-500 mt-12">
          Part of our 43+ specialist collective. Each programme features 3-4 complementary instructors.
        </p>
      </div>
    </section>
  );
};
