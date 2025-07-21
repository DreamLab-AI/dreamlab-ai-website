import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const ResearchPaper = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Back Button */}
        <Link to="/system-design">
          <Button variant="ghost" className="mb-8 text-cyan-300 hover:text-cyan-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to System Design
          </Button>
        </Link>

        {/* Header Image */}
        <div className="mb-12 text-center">
          <img
            src="/showcase/image (9).png"
            alt="Multi-Viewpoint Immersive AI Research Platform"
            className="mx-auto rounded-lg shadow-2xl max-w-2xl w-full"
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-12 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Multi-Viewpoint Immersive AI Research Platform
        </h1>

        {/* Core Innovation Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Core Innovation</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <p className="text-lg text-blue-200">
              World-first: Multiple specialists collaborate in a single immersive space, each with their own stereoscopic viewpoint.
            </p>
            <p className="text-lg text-blue-200">
              AI assisted Telepresent brings remote collaborators truly into the space with full body and audio
            </p>

            {/* First row of images */}
            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div>
                <img
                  src="/showcase/image (6).png"
                  alt="Narrative Fusion"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-cyan-300 mt-2 text-center">Narrative Fusion</p>
              </div>
              <div>
                <img
                  src="/showcase/image (1).png"
                  alt="Immersive Collaboration"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-cyan-300 mt-2 text-center">Immersive Collaboration</p>
              </div>
              <div className="md:col-span-1">
                {/* Placeholder for third image in row */}
              </div>
            </div>

            <p className="text-lg text-blue-200">
              Real-time AI observes all communication channels (verbal, spatial, visual, gestural, conceptual, temporal).
            </p>
            <p className="text-lg text-blue-200">
              Wave Field Synthesis spatial audio and volumetric telepresence enable natural, trust-based interaction.
            </p>
          </Card>
        </section>

        {/* The Flow State Advantage */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">The Flow State Advantage</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <ul className="space-y-4">
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Each expert sees only their relevant data—no overload, no context switching.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Natural spatial interaction and communication are preserved.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Professionals reach peak performance rapidly; AI learns from the best, not the confused.
              </li>
            </ul>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div>
                <img
                  src="/showcase/image (2).png"
                  alt="Flow State"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-cyan-300 mt-2 text-center">Flow State</p>
              </div>
              <div className="md:col-span-2">
                {/* Placeholder for additional images */}
              </div>
            </div>
          </Card>
        </section>

        {/* How AI Learns from Experts */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">How AI Learns from Experts</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <ul className="space-y-4">
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                AI captures what each expert sees, says, and does—building a complete, multi-viewpoint picture.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Observes how shared understanding and new concepts emerge, not just translating between domains.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Builds a living ontology: a knowledge graph richer than any single perspective.
              </li>
            </ul>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div>
                <img
                  src="/showcase/image.png"
                  alt="AI Learning System"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                {/* Placeholder for additional images */}
              </div>
            </div>
          </Card>
        </section>

        {/* Real-World Impact */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Real-World Impact</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <p className="text-lg text-blue-200">
              Example: Nuclear decommissioning planning significantly streamlined with our collaborative approach,
              delivering better outcomes and reduced fatigue for specialist teams.
            </p>

            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div>
                <img
                  src="/showcase/image (3).png"
                  alt="Knowledge Graph"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-cyan-300 mt-2 text-center">Knowledge Graph</p>
              </div>
              <div>
                <img
                  src="/showcase/image (7).png"
                  alt="Real-World Applications"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="md:col-span-1">
                {/* Placeholder for third image */}
              </div>
            </div>

            <p className="text-lg text-blue-200">
              AI learns and propagates emergent protocols (e.g., 3D gesture language, risk communication systems)
              across teams and domains.
            </p>
          </Card>
        </section>

        {/* Technical Summary */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Technical Summary</h2>
          <Card className="overflow-hidden shadow-2xl bg-black/30 backdrop-blur-md border-blue-500/30">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-800 to-indigo-800">
                  <tr>
                    <th className="px-6 py-4 text-left">Component</th>
                    <th className="px-6 py-4 text-left">Enables</th>
                    <th className="px-6 py-4 text-left">AI Learns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  <tr className="hover:bg-blue-800/20">
                    <td className="px-6 py-4 font-semibold text-cyan-300">Multi-viewpoint stereo</td>
                    <td className="px-6 py-4 text-blue-200">Individual flow states</td>
                    <td className="px-6 py-4 text-green-300">Peak performance patterns</td>
                  </tr>
                  <tr className="hover:bg-blue-800/20">
                    <td className="px-6 py-4 font-semibold text-cyan-300">Wave Field Synthesis</td>
                    <td className="px-6 py-4 text-blue-200">Natural communication</td>
                    <td className="px-6 py-4 text-green-300">Consensus acoustics</td>
                  </tr>
                  <tr className="hover:bg-blue-800/20">
                    <td className="px-6 py-4 font-semibold text-cyan-300">Neural telepresence</td>
                    <td className="px-6 py-4 text-blue-200">Distributed expertise</td>
                    <td className="px-6 py-4 text-green-300">Full team dynamics</td>
                  </tr>
                  <tr className="hover:bg-blue-800/20">
                    <td className="px-6 py-4 font-semibold text-cyan-300">Gesture/gaze tracking</td>
                    <td className="px-6 py-4 text-blue-200">Spatial grounding</td>
                    <td className="px-6 py-4 text-green-300">Embodied concepts</td>
                  </tr>
                  <tr className="hover:bg-blue-800/20">
                    <td className="px-6 py-4 font-semibold text-cyan-300">Domain-specific views</td>
                    <td className="px-6 py-4 text-blue-200">Cognitive load reduction</td>
                    <td className="px-6 py-4 text-green-300">Efficient narratives</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-3 gap-4 p-6">
              <div>
                <img
                  src="/showcase/image (10).png"
                  alt="Ontology Engine"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-cyan-300 mt-2 text-center">Ontology Engine</p>
              </div>
              <div>
                <img
                  src="/showcase/image (1).png"
                  alt="System Architecture"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="md:col-span-1">
                {/* Placeholder */}
              </div>
            </div>
          </Card>
        </section>

        {/* Research Programme & Outcomes */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Research Programme & Outcomes</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <div className="space-y-4">
              <p className="text-lg text-blue-200">
                <span className="font-bold text-cyan-300">Years 1-2:</span> Study team ontology emergence, map collaborative protocols, build AI observation.
              </p>
              <p className="text-lg text-blue-200">
                <span className="font-bold text-cyan-300">Years 3-4:</span> AI mediates, tests interventions, expands to larger teams.
              </p>
              <p className="text-lg text-blue-200">
                <span className="font-bold text-cyan-300">Year 5+:</span> Export to new domains, set standards, commercialise.
              </p>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-green-800/30 to-emerald-800/30 rounded-lg">
              <p className="text-lg font-bold text-green-300 mb-4">Expected Outcomes:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">⚡</span>
                  <span className="text-green-200">Faster planning processes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">🎯</span>
                  <span className="text-green-200">Fewer translation errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">⏱️</span>
                  <span className="text-green-200">Reduced training time</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">💰</span>
                  <span className="text-green-200">Significant cost savings</span>
                </div>
              </div>
              <p className="text-green-200 mt-4">Enhanced safety across all operations</p>
            </div>
          </Card>
        </section>

        {/* Why the UK Must Lead */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Why the UK Must Lead</h2>
          <Card className="p-8 bg-black/30 backdrop-blur-md border-blue-500/30 space-y-6">
            <ul className="space-y-4">
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Unique convergence of technical, human, and research excellence.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Addresses significant nuclear challenges, complex legacy systems, and critical infrastructure.
              </li>
              <li className="text-lg text-blue-200 flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                Leverages UK's collaborative culture and world-class AI/human factors research.
              </li>
            </ul>

            <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <p className="text-lg text-cyan-200">
                This facility will transform expert teamwork, create adaptive AI, and make the UK a global leader in collaborative intelligence.
              </p>
            </div>

            <p className="text-2xl font-bold text-center mt-8 text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">
              The technology is ready. The need is critical. The potential is transformative.
            </p>
          </Card>
        </section>

        {/* Research Demonstrations - Octave 2007 - 2023 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">Research Demonstrations - Octave 2007 - 2023</h2>

          {/* Main Featured Videos */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video">
                <video
                  controls
                  className="w-full h-full object-cover"
                  poster="/data/media/unity-vr-thumb.jpg"
                >
                  <source src="/data/media/videos/unity-vr.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-cyan-300 mb-2">Immersive VR Collaboration</h3>
                <p className="text-sm text-blue-200">Multi-viewpoint virtual reality system enabling natural collaboration</p>
              </div>
            </Card>
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video">
                <video
                  controls
                  className="w-full h-full object-cover"
                  poster="/data/media/nuclear-robot-thumb.jpg"
                >
                  <source src="/data/media/videos/nuclear-robot.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-cyan-300 mb-2">Nuclear Decommissioning Robot</h3>
                <p className="text-sm text-blue-200">Collaborative planning for complex nuclear operations</p>
              </div>
            </Card>
          </div>

          {/* Interactive Systems Gallery */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-6 text-cyan-400">Interactive Systems & Interfaces</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Hand Gesture Interface</h4>
                  <p className="text-xs text-blue-200">Natural hand tracking and spatial interaction</p>
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Spatial Object Manipulation</h4>
                  <p className="text-xs text-blue-200">3D interaction and object placement systems</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Multi-Perspective Views</h4>
                  <p className="text-xs text-blue-200">Advanced camera systems and viewpoint control</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Real-World Applications */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-6 text-cyan-400">Real-World Applications</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Data Visualization</h4>
                  <p className="text-xs text-blue-200">Large-scale data analysis and visualization</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Robotic Control</h4>
                  <p className="text-xs text-blue-200">Precise robotic manipulation and control</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Facility Planning</h4>
                  <p className="text-xs text-blue-200">Virtual facility layout and planning</p>
                </div>
              </Card>
              <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
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
                <div className="p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">Traffic Simulation</h4>
                  <p className="text-xs text-blue-200">Large-scale traffic and infrastructure modeling</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Historical Context */}
          <div className="mt-12">
            <Card className="p-8 bg-gradient-to-r from-indigo-800/40 to-purple-800/40 backdrop-blur-md border-indigo-500/30">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-cyan-300">16 Years of Research Excellence</h3>
                  <p className="text-lg text-indigo-200 mb-4">
                    From 2007 to 2023, the Octave project has continuously pushed the boundaries of collaborative immersive systems.
                  </p>
                  <ul className="space-y-2 text-indigo-200">
                    <li className="flex items-start">
                      <span className="text-cyan-400 mr-2">•</span>
                      Early pioneering work in multi-user VR collaboration
                    </li>
                    <li className="flex items-start">
                      <span className="text-cyan-400 mr-2">•</span>
                      Development of specialized hardware and software systems
                    </li>
                    <li className="flex items-start">
                      <span className="text-cyan-400 mr-2">•</span>
                      Real-world applications in nuclear, robotics, and urban planning
                    </li>
                  </ul>
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
                  <p className="text-sm text-cyan-300 mt-2 text-center">Student research presentation (2015)</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Back to System Design */}
        <div className="text-center">
          <Link to="/system-design">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to System Design
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResearchPaper;