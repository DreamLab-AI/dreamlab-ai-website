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
      src: '/showcase/image (9).webp',
      title: 'Multi-Viewpoint Immersive AI Research Platform',
      description: 'Revolutionary collaborative intelligence system'
    },
    {
      src: '/showcase/image (6).webp',
      title: 'Narrative Fusion',
      description: 'AI observes all communication channels in real-time'
    },
    {
      src: '/showcase/image (1).webp',
      title: 'Immersive Collaboration',
      description: 'Natural spatial interaction preserved'
    },
    {
      src: '/showcase/image (2).webp',
      title: 'Flow State',
      description: 'Peak performance through optimized data presentation'
    },
    {
      src: '/showcase/image.webp',
      title: 'AI Learning System',
      description: 'Building multi-viewpoint knowledge graphs'
    },
    {
      src: '/showcase/image (3).webp',
      title: 'Knowledge Graph',
      description: 'Living ontology richer than any single perspective'
    },
    {
      src: '/showcase/image (7).webp',
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

  // Local video demonstrations showcasing the research evolution
  const videoCategories = {
    featured: ['unity-vr.mp4', 'nuclear-robot.mp4'],
    interactive: ['hand-interact.mp4', 'box-interact.mp4', 'fisheye-test.mp4', 'robot-arm.mp4'],
    applications: ['motorway-sim.mp4', 'bigdata-viz.mp4', 'pit-room.mp4'],
    historical: ['student-2015.mp4', 'heaton-park.mp4']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent px-4">
            Multi-Viewpoint Immersive AI Research Platform
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-200 max-w-4xl mx-auto leading-relaxed px-4">
            World-first: Multiple specialists collaborate in a single immersive space,
            each with their own stereoscopic viewpoint
          </p>
        </div>

        {/* Image Carousel */}
        <div className="relative mb-12 sm:mb-16 md:mb-20 max-w-5xl mx-auto">
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30">
            <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px]">
              <img
                src={currentImage.src}
                alt={currentImage.title}
                className="w-full h-full object-cover transition-all duration-1000"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/showcase/image.webp';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-6 md:p-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">{currentImage.title}</h3>
                <p className="text-blue-200 text-sm sm:text-base md:text-lg">{currentImage.description}</p>
              </div>
            </div>
          </Card>
          {/* Image indicators */}
          <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
            {systemImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-3 rounded-full transition-all min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-3 touch-manipulation ${
                  index === currentImageIndex ? 'bg-cyan-400 w-8' : 'bg-blue-600 w-3'
                }`}
                aria-label={`View image ${index + 1} of ${systemImages.length}`}
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
              <h3 className="text-3xl font-bold mb-4">Significant Time Reduction</h3>
              <p className="text-xl text-orange-200">Nuclear decommissioning planning significantly streamlined</p>
              <p className="text-lg text-orange-300 mt-2">With better outcomes and reduced fatigue</p>
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
        <div className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-cyan-300 px-4">Technical Summary</h2>
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30 max-w-6xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gradient-to-r from-blue-800 to-indigo-800">
                  <tr>
                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">Component</th>
                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">Enables</th>
                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-sm sm:text-base md:text-lg">AI Learns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {technicalSpecs.map((spec, index) => (
                    <tr key={index} className="hover:bg-blue-800/20 transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-semibold text-cyan-300 text-xs sm:text-sm md:text-base">{spec.component}</td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-blue-200 text-xs sm:text-sm md:text-base">{spec.enables}</td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-green-300 text-xs sm:text-sm md:text-base">{spec.learns}</td>
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
              <div className="text-3xl font-bold text-green-400 mb-2">⚡</div>
              <div className="text-green-200">Faster Planning</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-emerald-800/40 to-teal-800/40 backdrop-blur-md border-emerald-500/30">
              <div className="text-3xl font-bold text-emerald-400 mb-2">🎯</div>
              <div className="text-emerald-200">Fewer Translation Errors</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-teal-800/40 to-cyan-800/40 backdrop-blur-md border-teal-500/30">
              <div className="text-3xl font-bold text-teal-400 mb-2">⏱️</div>
              <div className="text-teal-200">Reduced Training Time</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-cyan-800/40 to-blue-800/40 backdrop-blur-md border-cyan-500/30">
              <div className="text-3xl font-bold text-cyan-400 mb-2">💰</div>
              <div className="text-cyan-200">Significant Savings</div>
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
                <p className="text-purple-200 text-lg">Addresses significant nuclear challenges, complex legacy systems, and critical infrastructure</p>
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

        {/* Research Demonstrations Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 text-cyan-300">Research Demonstrations - Octave 2007-2023</h2>

          {/* Hero Videos */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video relative group">
                <video
                  controls
                  className="w-full h-full object-cover"
                  poster="/data/media/unity-vr-thumb.jpg"
                >
                  <source src="/data/media/videos/unity-vr.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-bold text-cyan-300">Immersive VR Collaboration</h3>
                </div>
                <p className="text-blue-200 mb-4">Revolutionary multi-viewpoint virtual reality system enabling natural spatial collaboration between specialists.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded">Multi-user VR</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">Spatial Audio</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Telepresence</span>
                </div>
              </div>
            </Card>
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video relative group">
                <video
                  controls
                  className="w-full h-full object-cover"
                  poster="/data/media/nuclear-robot-thumb.jpg"
                >
                  <source src="/data/media/videos/nuclear-robot.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-bold text-orange-300">Nuclear Decommissioning</h3>
                </div>
                <p className="text-orange-200 mb-4">Real-world application reducing planning time from 8 hours to 2 hours with improved safety outcomes.</p>
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
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-green-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/hand-interact-thumb.jpg"
                  >
                    <source src="/data/media/videos/hand-interact.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-green-300 mb-2">Hand Tracking</h4>
                  <p className="text-xs text-green-200">Natural gesture recognition and spatial manipulation</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/box-interact-thumb.jpg"
                  >
                    <source src="/data/media/videos/box-interact.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-blue-300 mb-2">Object Manipulation</h4>
                  <p className="text-xs text-blue-200">3D object placement and spatial reasoning</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-purple-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/fisheye-test-thumb.jpg"
                  >
                    <source src="/data/media/videos/fisheye-test.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-purple-300 mb-2">Multi-Perspective</h4>
                  <p className="text-xs text-purple-200">Advanced camera systems and viewpoint control</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-pink-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/robot-arm-thumb.jpg"
                  >
                    <source src="/data/media/videos/robot-arm.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-pink-300 mb-2">Robotic Control</h4>
                  <p className="text-xs text-pink-200">Precise manipulation and automation systems</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Large-Scale Applications */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8 text-cyan-400">Large-Scale Applications</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-cyan-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/motorway-sim-thumb.jpg"
                  >
                    <source src="/data/media/videos/motorway-sim.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-bold text-cyan-300 mb-2">Traffic & Infrastructure</h4>
                  <p className="text-sm text-cyan-200 mb-3">Large-scale traffic simulation and urban planning systems</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded">Urban Planning</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">Simulation</span>
                  </div>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-emerald-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/bigdata-viz-thumb.jpg"
                  >
                    <source src="/data/media/videos/bigdata-viz.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-bold text-emerald-300 mb-2">Data Visualization</h4>
                  <p className="text-sm text-emerald-200 mb-3">Immersive big data analysis and pattern recognition</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded">Big Data</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">Analytics</span>
                  </div>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-indigo-500/30">
                <div className="aspect-video">
                  <video
                    controls
                    className="w-full h-full object-cover"
                    poster="/data/media/pit-room-thumb.jpg"
                  >
                    <source src="/data/media/videos/pit-room.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="p-6">
                  <h4 className="text-lg font-bold text-indigo-300 mb-2">Facility Design</h4>
                  <p className="text-sm text-indigo-200 mb-3">Virtual facility layout and collaborative planning</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded">Architecture</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Planning</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Legacy and Evolution */}
          <Card className="p-8 bg-gradient-to-br from-slate-800/40 to-gray-800/40 backdrop-blur-md border-slate-500/30">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-bold mb-4 text-cyan-300">16 Years of Innovation</h3>
                <p className="text-lg text-slate-200 mb-6">
                  The Octave project represents one of the longest-running collaborative VR research programs,
                  continuously evolving from 2007 to 2023 with real-world applications and breakthrough technologies.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-cyan-300">Multi-User Systems</div>
                      <div className="text-sm text-cyan-200">Multiple simultaneous users</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-bold text-green-300">Real Impact</div>
                      <div className="text-sm text-green-200">Significant time reduction</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="aspect-video">
                <video
                  controls
                  className="w-full h-full object-cover rounded-lg"
                  poster="/data/media/student-2015-thumb.jpg"
                >
                  <source src="/data/media/videos/student-2015.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p className="text-sm text-slate-300 mt-2 text-center">Research presentation from 2015</p>
              </div>
            </div>
          </Card>

          {/* Additional Context */}
          <div className="mt-8 text-center">
            <Card className="p-6 bg-gradient-to-r from-blue-800/20 to-purple-800/20 backdrop-blur-md border-blue-500/20">
              <p className="text-lg text-blue-200 mb-2">
                <span className="font-bold text-cyan-300">Historical Note:</span> The Heaton Park demonstration showcased
                early outdoor augmented reality capabilities, bridging virtual collaboration with real-world environments.
              </p>
              <div className="mt-4">
                <video
                  controls
                  className="mx-auto max-w-md h-48 object-cover rounded-lg"
                  poster="/data/media/heaton-park-thumb.jpg"
                >
                  <source src="/data/media/videos/heaton-park.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p className="text-sm text-blue-300 mt-2">Heaton Park AR demonstration</p>
              </div>
            </Card>
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