import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Users,
  Volume2,
  Eye,
  Zap,
  Globe,
  Clock,
  TrendingUp,
  Shield,
  Lightbulb,
  Play,
  ArrowRight,
} from "lucide-react";
import { useOGMeta } from "@/hooks/useOGMeta";

const systemImages = [
  { src: "/showcase/image (9).webp", title: "Multi-Viewpoint Immersive AI Research Platform" },
  { src: "/showcase/image (6).webp", title: "Narrative Fusion" },
  { src: "/showcase/image (1).webp", title: "Immersive Collaboration" },
  { src: "/showcase/image (2).webp", title: "Flow State Optimisation" },
  { src: "/showcase/image.webp", title: "AI Learning System" },
  { src: "/showcase/image (3).webp", title: "Knowledge Graph" },
  { src: "/showcase/image (7).webp", title: "Real-World Applications" },
];

const technicalSpecs = [
  { component: "Multi-viewpoint stereo", enables: "Individual flow states", learns: "Peak performance patterns" },
  { component: "Wave Field Synthesis", enables: "Natural communication", learns: "Consensus acoustics" },
  { component: "Neural telepresence", enables: "Distributed expertise", learns: "Full team dynamics" },
  { component: "Gesture/gaze tracking", enables: "Spatial grounding", learns: "Embodied concepts" },
  { component: "Domain-specific views", enables: "Cognitive load reduction", learns: "Efficient narratives" },
];

const Research = () => {
  useOGMeta({
    title: "Research Lineage | DreamLab Applied Innovation Lab",
    description: "16 years of deep tech research (Octave 2007-2023) powering applied innovation. Multi-viewpoint immersive AI, nuclear decommissioning, collaborative intelligence.",
    url: "https://dreamlab-ai.com/research",
  });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentImageIndex((prev) => (prev + 1) % systemImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <Header />

      {/* Hero */}
      <div className="container mx-auto px-4 pt-24 sm:pt-28 pb-12">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent px-4">
            16 Years of Deep Tech Research
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-blue-200 max-w-4xl mx-auto leading-relaxed px-4">
            The Octave laboratory (2007-2023) produced world-first collaborative immersive systems worth over £8M in research value. That research heritage now forms the foundation of our Applied Innovation Lab — commercialising deep tech for real-world impact.
          </p>
        </div>

        {/* Image Carousel */}
        <div className="relative mb-16 md:mb-20 max-w-5xl mx-auto">
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30">
            <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px]">
              <img
                src={systemImages[currentImageIndex].src}
                alt={systemImages[currentImageIndex].title}
                className="w-full h-full object-cover transition-all duration-1000"
                onError={(e) => { (e.target as HTMLImageElement).src = "/showcase/image.webp"; }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1">{systemImages[currentImageIndex].title}</h3>
              </div>
            </div>
          </Card>
          <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
            {systemImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-3 rounded-full transition-all min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-3 touch-manipulation ${
                  index === currentImageIndex ? "bg-cyan-400 w-8" : "bg-blue-600 w-3"
                }`}
                aria-label={`View image ${index + 1} of ${systemImages.length}`}
              />
            ))}
          </div>
        </div>

        {/* Core Innovation */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-300">Core Innovation</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-blue-800/40 to-indigo-800/40 backdrop-blur-md border-blue-500/30">
              <Users className="w-12 h-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Collaborative Immersion</h3>
              <p className="text-blue-200">Multiple specialists work together in a single immersive space with individual stereoscopic viewpoints — a world first in collaborative VR.</p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30">
              <Brain className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">AI-Assisted Telepresence</h3>
              <p className="text-purple-200">Remote collaborators are brought into the space with full body presence and spatial audio. AI observes all communication channels in real-time.</p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-purple-800/40 to-pink-800/40 backdrop-blur-md border-purple-500/30">
              <Volume2 className="w-12 h-12 text-pink-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Wave Field Synthesis</h3>
              <p className="text-pink-200">Spatial audio and volumetric telepresence enable natural, trust-based interaction — critical for multi-disciplinary problem solving.</p>
            </Card>
          </div>
        </div>

        {/* Flow State Advantage */}
        <div className="mb-20 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-300">The Flow State Advantage</h2>
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-green-800/40 to-emerald-800/40 backdrop-blur-md border-green-500/30">
              <div className="flex items-start gap-4">
                <Eye className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Focused Data Presentation</h3>
                  <p className="text-green-200">Each expert sees only their relevant data — no overload, no context switching. Domain-specific views reduce cognitive load.</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-emerald-800/40 to-teal-800/40 backdrop-blur-md border-emerald-500/30">
              <div className="flex items-start gap-4">
                <Zap className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Natural Interaction</h3>
                  <p className="text-emerald-200">Spatial interaction and communication are preserved. Professionals reach peak performance rapidly because the technology gets out of the way.</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-r from-teal-800/40 to-cyan-800/40 backdrop-blur-md border-teal-500/30">
              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-teal-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">AI Learns from the Best</h3>
                  <p className="text-teal-200">AI captures what each expert sees, says, and does — building a multi-viewpoint knowledge graph richer than any single perspective. It learns from the best, not the confused.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Real-World Impact */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-300">Real-World Impact</h2>
          <Card className="p-8 md:p-12 bg-gradient-to-br from-orange-800/40 to-red-800/40 backdrop-blur-md border-orange-500/30 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Clock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Nuclear Decommissioning Case Study</h3>
              <p className="text-xl text-orange-200">Planning time reduced from 8 hours to 2 hours</p>
              <p className="text-lg text-orange-300 mt-2">With improved safety outcomes and reduced specialist fatigue</p>
            </div>
            <div className="border-t border-orange-500/30 pt-8">
              <p className="text-lg text-orange-200">
                AI learned and propagated emergent protocols — including 3D gesture languages and risk communication systems — across teams and domains. This is the kind of applied innovation that our lab now commercialises for industry.
              </p>
            </div>
          </Card>
        </div>

        {/* Technical Summary Table */}
        <div className="mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-cyan-300">Technical Summary</h2>
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30 max-w-6xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gradient-to-r from-blue-800 to-indigo-800">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">Component</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">Enables</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">AI Learns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {technicalSpecs.map((spec, index) => (
                    <tr key={index} className="hover:bg-blue-800/20 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-cyan-300 text-xs sm:text-sm md:text-base">{spec.component}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-blue-200 text-xs sm:text-sm md:text-base">{spec.enables}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-green-300 text-xs sm:text-sm md:text-base">{spec.learns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Research Programme & Timeline */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-300">From Research to Applied Innovation</h2>
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { years: "2007-2015", focus: "Foundation research: multi-viewpoint stereo, wave field synthesis, gesture tracking. Building the core immersive collaboration platform." },
              { years: "2015-2019", focus: "AI observation and mediation. Nuclear decommissioning case study. Team ontology emergence mapping." },
              { years: "2019-2023", focus: "Expansion to larger teams and new domains. Standards development. Commercialisation groundwork." },
              { years: "2024+", focus: "Applied Innovation Lab. Research heritage deployed as co-creation capability for enterprises and SMEs." },
            ].map((phase) => (
              <Card key={phase.years} className="p-6 bg-gradient-to-br from-blue-800/40 to-purple-800/40 backdrop-blur-md border-blue-500/30">
                <h3 className="text-lg font-bold mb-3 text-cyan-300">{phase.years}</h3>
                <p className="text-blue-200 text-sm">{phase.focus}</p>
              </Card>
            ))}
          </div>

          {/* Outcomes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, label: "Faster Planning", detail: "8 hours to 2 hours" },
              { icon: Shield, label: "Improved Safety", detail: "Fewer translation errors" },
              { icon: Clock, label: "Reduced Fatigue", detail: "Better specialist outcomes" },
              { icon: Globe, label: "Cross-Domain Transfer", detail: "Emergent protocol propagation" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-6 text-center bg-gradient-to-br from-green-800/40 to-emerald-800/40 backdrop-blur-md border-green-500/30">
                  <Icon className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <div className="font-bold text-green-300 mb-1">{item.label}</div>
                  <div className="text-sm text-green-200">{item.detail}</div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Research Demonstrations */}
        <div className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-cyan-300">Research Demonstrations</h2>
          <p className="text-center text-blue-200 mb-12 max-w-2xl mx-auto">Capability demonstrations from the Octave laboratory, spanning VR collaboration, nuclear robotics, spatial interaction, and large-scale data visualisation.</p>

          {/* Featured Videos */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video relative group">
                <video controls className="w-full h-full object-cover" poster="/data/media/unity-vr-thumb.jpg" preload="none">
                  <source src="/data/media/videos/unity-vr.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-bold text-cyan-300">Immersive VR Collaboration</h3>
                </div>
                <p className="text-blue-200 mb-4">Multi-viewpoint virtual reality system enabling natural spatial collaboration between specialists in a shared immersive environment.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded">Multi-user VR</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">Spatial Audio</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Telepresence</span>
                </div>
              </div>
            </Card>
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video relative group">
                <video controls className="w-full h-full object-cover" poster="/data/media/nuclear-robot-thumb.jpg" preload="none">
                  <source src="/data/media/videos/nuclear-robot.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-bold text-orange-300">Nuclear Decommissioning</h3>
                </div>
                <p className="text-orange-200 mb-4">Real-world application that reduced planning time from 8 hours to 2 hours with improved safety outcomes for specialist teams.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">Safety Critical</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">Risk Assessment</span>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">Planning</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Interactive Technologies */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">Interactive Technologies</h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { file: "hand-interact", title: "Hand Tracking", desc: "Natural gesture recognition and spatial manipulation", color: "green" },
                { file: "box-interact", title: "Object Manipulation", desc: "3D object placement and spatial reasoning", color: "blue" },
                { file: "fisheye-test", title: "Multi-Perspective", desc: "Advanced camera systems and viewpoint control", color: "purple" },
                { file: "robot-arm", title: "Robotic Control", desc: "Precise manipulation and automation systems", color: "pink" },
              ].map((item) => (
                <Card key={item.file} className={`overflow-hidden bg-black/30 backdrop-blur-md border-${item.color}-500/30`}>
                  <div className="aspect-video">
                    <video controls className="w-full h-full object-cover" poster={`/data/media/${item.file}-thumb.jpg`} preload="none">
                      <source src={`/data/media/videos/${item.file}.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="p-4">
                    <h4 className={`font-bold text-${item.color}-300 mb-2`}>{item.title}</h4>
                    <p className={`text-xs text-${item.color}-200`}>{item.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Large-Scale Applications */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">Large-Scale Applications</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { file: "motorway-sim", title: "Traffic & Infrastructure", desc: "Large-scale traffic simulation and urban planning systems", tags: ["Urban Planning", "Simulation"], color: "cyan" },
                { file: "bigdata-viz", title: "Data Visualisation", desc: "Immersive big data analysis and pattern recognition", tags: ["Big Data", "Analytics"], color: "emerald" },
                { file: "pit-room", title: "Facility Design", desc: "Virtual facility layout and collaborative planning", tags: ["Architecture", "Planning"], color: "indigo" },
              ].map((item) => (
                <Card key={item.file} className={`overflow-hidden bg-black/30 backdrop-blur-md border-${item.color}-500/30`}>
                  <div className="aspect-video">
                    <video controls className="w-full h-full object-cover" poster={`/data/media/${item.file}-thumb.jpg`} preload="none">
                      <source src={`/data/media/videos/${item.file}.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="p-6">
                    <h4 className={`text-lg font-bold text-${item.color}-300 mb-2`}>{item.title}</h4>
                    <p className={`text-sm text-${item.color}-200 mb-3`}>{item.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className={`px-2 py-1 bg-${item.color}-500/20 text-${item.color}-300 text-xs rounded`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 16 Years Legacy */}
          <Card className="p-8 bg-gradient-to-br from-slate-800/40 to-gray-800/40 backdrop-blur-md border-slate-500/30">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-bold mb-4 text-cyan-300">From Octave to the Applied Innovation Lab</h3>
                <p className="text-lg text-slate-200 mb-6">
                  The Octave project represents one of the longest-running collaborative VR research programmes in the UK, continuously evolving from 2007 to 2023. That 16-year body of work — multi-user systems, real-world nuclear applications, and AI-mediated teamwork — now forms the research foundation of the DreamLab Applied Innovation Lab.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-cyan-300 text-sm">World Firsts</div>
                      <div className="text-xs text-cyan-200">Multi-viewpoint collaboration</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-green-300 text-sm">Proven Impact</div>
                      <div className="text-xs text-green-200">Nuclear, infrastructure, urban planning</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="aspect-video">
                <video controls className="w-full h-full object-cover rounded-lg" poster="/data/media/student-2015-thumb.jpg" preload="none">
                  <source src="/data/media/videos/student-2015.mp4" type="video/mp4" />
                </video>
                <p className="text-sm text-slate-300 mt-2 text-center">Research presentation (2015)</p>
              </div>
            </div>
          </Card>
        </div>

        {/* UK Leadership */}
        <div className="mb-20">
          <Card className="p-8 md:p-12 bg-gradient-to-br from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-cyan-300">Why the UK Must Lead</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
                <p className="text-indigo-200 text-lg">Unique convergence of technical, human factors, and research excellence positions the UK to lead in collaborative intelligence.</p>
              </div>
              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                <p className="text-purple-200 text-lg">Addresses critical national challenges: nuclear legacy, complex infrastructure, and safety-critical systems that demand multi-disciplinary collaboration.</p>
              </div>
              <div className="flex items-start gap-4">
                <Globe className="w-8 h-8 text-pink-400 flex-shrink-0 mt-1" />
                <p className="text-pink-200 text-lg">Leverages the UK's collaborative culture, world-class AI research, and Responsible Innovation frameworks to set global standards.</p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <p className="text-center text-lg font-bold text-cyan-300">
                The technology is ready. The need is critical. The potential is transformative.
              </p>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center pb-12">
          <Card className="p-8 md:p-12 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Apply Our Research to Your Challenge</h2>
            <p className="text-lg text-cyan-100 mb-8 max-w-2xl mx-auto">
              The research heritage of the Octave laboratory is now available through our Applied Innovation Lab. Bring your team to co-create with deep tech.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8" asChild>
                <Link to="/co-create">Co-Create With Us</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8" asChild>
                <Link to="/programmes">View Programme Tracks</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Research;
