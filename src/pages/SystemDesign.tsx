import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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
  ExternalLink,
  FileText
} from 'lucide-react';

const SystemDesign = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Images based on the critical text
  const systemImages = [
    {
      src: '/showcase/image (9).png',
      title: 'Multi-Viewpoint Immersive AI Research Platform',
      description: 'Revolutionary collaborative intelligence system'
    },
    {
      src: '/showcase/image (6).png',
      title: 'Narrative Fusion',
      description: 'AI observes all communication channels in real-time'
    },
    {
      src: '/showcase/image (1).png',
      title: 'Immersive Collaboration',
      description: 'Natural spatial interaction preserved'
    },
    {
      src: '/showcase/image (2).png',
      title: 'Flow State',
      description: 'Peak performance through optimized data presentation'
    },
    {
      src: '/showcase/image.png',
      title: 'AI Learning System',
      description: 'Building multi-viewpoint knowledge graphs'
    },
    {
      src: '/showcase/image (3).png',
      title: 'Knowledge Graph',
      description: 'Living ontology richer than any single perspective'
    },
    {
      src: '/showcase/image (7).png',
      title: 'Real-World Applications',
      description: 'Transforming complex planning and collaboration'
    }
  ];

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % systemImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [systemImages.length]);

  const currentImage = systemImages[currentImageIndex];

  // Technical specifications table data
  const technicalSpecs = [
    { component: "Multi-viewpoint stereo", enables: "Individual flow states", learns: "Peak performance patterns" },
    { component: "Wave Field Synthesis", enables: "Natural communication", learns: "Consensus acoustics" },
    { component: "Neural telepresence", enables: "Distributed expertise", learns: "Full team dynamics" },
    { component: "Gesture/gaze tracking", enables: "Spatial grounding", learns: "Embodied concepts" },
    { component: "Domain-specific views", enables: "Cognitive load reduction", learns: "Efficient narratives" }
  ];

  // Research timeline
  const researchTimeline = [
    { years: "Years 1-2", focus: "Study team ontology emergence, map collaborative protocols, build AI observation" },
    { years: "Years 3-4", focus: "AI mediates, tests interventions, expands to larger teams" },
    { years: "Year 5+", focus: "Export to new domains, set standards, commercialise" }
  ];

  // YouTube videos
  const octaveVideos = [
    { id: "eV6_J_rAVs4", title: "Octave System Overview" },
    { id: "vlV1vRD4jrY", title: "Collaborative Environment Demo" },
    { id: "Y-DZLTY6Hok", title: "Technical Architecture" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Multi-Viewpoint Immersive AI Research Platform
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 max-w-4xl mx-auto leading-relaxed">
            World-first: Multiple specialists collaborate in a single immersive space,
            each with their own stereoscopic viewpoint
          </p>
        </div>

        {/* Image Carousel */}
        <div className="relative mb-20 max-w-5xl mx-auto">
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30">
            <div className="relative h-[500px]">
              <img
                src={currentImage.src}
                alt={currentImage.title}
                className="w-full h-full object-cover transition-all duration-1000"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/showcase/image.png';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-8">
                <h3 className="text-2xl font-bold mb-2">{currentImage.title}</h3>
                <p className="text-blue-200 text-lg">{currentImage.description}</p>
              </div>
            </div>
          </Card>
          {/* Image indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {systemImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentImageIndex ? 'bg-cyan-400 w-8' : 'bg-blue-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Core Innovation Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">Core Innovation</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-blue-800/40 to-indigo-800/40 backdrop-blur-md border-blue-500/30">
              <Users className="w-12 h-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Collaborative Immersion</h3>
              <p className="text-blue-200">Multiple specialists work together in a single immersive space with individual stereoscopic viewpoints</p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30">
              <Brain className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">AI-Assisted Telepresence</h3>
              <p className="text-purple-200">Remote collaborators are brought truly into the space with full body presence and spatial audio</p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-purple-800/40 to-pink-800/40 backdrop-blur-md border-purple-500/30">
              <Volume2 className="w-12 h-12 text-pink-400 mb-4" />
              <h3 className="text-xl font-bold mb-3">Wave Field Synthesis</h3>
              <p className="text-pink-200">Spatial audio and volumetric telepresence enable natural, trust-based interaction</p>
            </Card>
          </div>
        </div>

        {/* Flow State Advantage */}
        <div className="mb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">The Flow State Advantage</h2>
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-r from-green-800/40 to-emerald-800/40 backdrop-blur-md border-green-500/30">
                <div className="flex items-start gap-4">
                  <Eye className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Focused Data Presentation</h3>
                    <p className="text-green-200">Each expert sees only their relevant data—no overload, no context switching</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-r from-emerald-800/40 to-teal-800/40 backdrop-blur-md border-emerald-500/30">
                <div className="flex items-start gap-4">
                  <Zap className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Natural Interaction</h3>
                    <p className="text-emerald-200">Natural spatial interaction and communication are preserved</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-r from-teal-800/40 to-cyan-800/40 backdrop-blur-md border-teal-500/30">
                <div className="flex items-start gap-4">
                  <TrendingUp className="w-8 h-8 text-teal-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Peak Performance</h3>
                    <p className="text-teal-200">Professionals reach peak performance rapidly; AI learns from the best, not the confused</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* How AI Learns */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">How AI Learns from Experts</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-md border-purple-500/30">
              <Lightbulb className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Multi-Viewpoint Capture</h3>
              <p className="text-purple-200 mb-4">AI captures what each expert sees, says, and does—building a complete, multi-viewpoint picture</p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-blue-800/40 to-cyan-800/40 backdrop-blur-md border-blue-500/30">
              <Brain className="w-10 h-10 text-cyan-400 mb-4" />
              <h3 className="text-2xl font-bold mb-4">Emergent Understanding</h3>
              <p className="text-cyan-200 mb-4">Observes how shared understanding and new concepts emerge, not just translating between domains</p>
            </Card>
          </div>
          <Card className="mt-8 p-8 max-w-5xl mx-auto bg-gradient-to-r from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30">
            <Globe className="w-10 h-10 text-indigo-400 mb-4 mx-auto" />
            <h3 className="text-2xl font-bold mb-4 text-center">Living Ontology</h3>
            <p className="text-indigo-200 text-center text-lg">Builds a living ontology: a knowledge graph richer than any single perspective</p>
          </Card>
        </div>

        {/* Real-World Impact */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">Real-World Impact</h2>
          <Card className="p-12 bg-gradient-to-br from-orange-800/40 to-red-800/40 backdrop-blur-md border-orange-500/30 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Clock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold mb-4">75% Time Reduction</h3>
              <p className="text-xl text-orange-200">Nuclear decommissioning planning reduced from 8 hours to 2 hours</p>
              <p className="text-lg text-orange-300 mt-2">With better outcomes and less fatigue</p>
            </div>
            <div className="border-t border-orange-500/30 pt-8">
              <p className="text-lg text-orange-200">
                AI learns and propagates emergent protocols (e.g., 3D gesture language, risk communication systems)
                across teams and domains
              </p>
            </div>
          </Card>
        </div>

        {/* Technical Summary Table */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">Technical Summary</h2>
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30 max-w-6xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-800 to-indigo-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-lg">Component</th>
                    <th className="px-6 py-4 text-left text-lg">Enables</th>
                    <th className="px-6 py-4 text-left text-lg">AI Learns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {technicalSpecs.map((spec, index) => (
                    <tr key={index} className="hover:bg-blue-800/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-cyan-300">{spec.component}</td>
                      <td className="px-6 py-4 text-blue-200">{spec.enables}</td>
                      <td className="px-6 py-4 text-green-300">{spec.learns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Research Programme */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">Research Programme & Outcomes</h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {researchTimeline.map((phase, index) => (
              <Card key={index} className="p-6 bg-gradient-to-br from-blue-800/40 to-purple-800/40 backdrop-blur-md border-blue-500/30">
                <h3 className="text-xl font-bold mb-3 text-cyan-300">{phase.years}</h3>
                <p className="text-blue-200">{phase.focus}</p>
              </Card>
            ))}
          </div>

          {/* Outcomes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center bg-gradient-to-br from-green-800/40 to-emerald-800/40 backdrop-blur-md border-green-500/30">
              <div className="text-3xl font-bold text-green-400 mb-2">10x</div>
              <div className="text-green-200">Faster Planning</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-emerald-800/40 to-teal-800/40 backdrop-blur-md border-emerald-500/30">
              <div className="text-3xl font-bold text-emerald-400 mb-2">90%</div>
              <div className="text-emerald-200">Fewer Translation Errors</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-teal-800/40 to-cyan-800/40 backdrop-blur-md border-teal-500/30">
              <div className="text-3xl font-bold text-teal-400 mb-2">50%</div>
              <div className="text-teal-200">Less Training Time</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-cyan-800/40 to-blue-800/40 backdrop-blur-md border-cyan-500/30">
              <div className="text-3xl font-bold text-cyan-400 mb-2">£1bn+</div>
              <div className="text-cyan-200">Potential Savings</div>
            </Card>
          </div>
        </div>

        {/* Why the UK Must Lead */}
        <div className="mb-20">
          <Card className="p-12 bg-gradient-to-br from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8 text-cyan-300">Why the UK Must Lead</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-1" />
                <p className="text-indigo-200 text-lg">Unique convergence of technical, human, and research excellence</p>
              </div>
              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                <p className="text-purple-200 text-lg">Addresses £100bn nuclear challenge, complex legacy systems, and critical infrastructure</p>
              </div>
              <div className="flex items-start gap-4">
                <Globe className="w-8 h-8 text-pink-400 flex-shrink-0 mt-1" />
                <p className="text-pink-200 text-lg">Leverages UK's collaborative culture and world-class AI/human factors research</p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <p className="text-center text-xl font-bold text-cyan-300">
                This facility will transform expert teamwork, create adaptive AI, and make the UK a global leader in collaborative intelligence.
              </p>
            </div>
            <p className="text-center text-2xl font-bold mt-8 text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">
              The technology is ready. The need is critical. The potential is transformative.
            </p>
          </Card>
        </div>

        {/* Octave Videos Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">See Octave 2007 - 2023</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {octaveVideos.map((video, index) => (
              <Card key={index} className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
                <div className="aspect-video relative group cursor-pointer">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Play className="w-5 h-5" />
                      <span className="font-semibold">{video.title}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="p-12 bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Collaboration?</h2>
            <p className="text-xl text-cyan-100 mb-8 max-w-2xl mx-auto">
              Join us in creating the future of collaborative intelligence and immersive research
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Schedule Demonstration
              </Button>
              <Link to="/research-paper">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-3"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Research Paper
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemDesign;