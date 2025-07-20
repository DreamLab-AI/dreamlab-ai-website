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
              Example: Nuclear decommissioning planning reduced from 8 hours (traditional) to 2 hours (our approach),
              with better outcomes and less fatigue.
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
              <p className="text-lg font-bold text-green-300 mb-4">Outcomes:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">10x</span>
                  <span className="text-green-200">faster planning</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">90%</span>
                  <span className="text-green-200">fewer translation errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">50%</span>
                  <span className="text-green-200">less training time</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">£1bn+</span>
                  <span className="text-green-200">savings</span>
                </div>
              </div>
              <p className="text-green-200 mt-4">Improved safety across all operations</p>
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
                Addresses £100bn nuclear challenge, complex legacy systems, and critical infrastructure.
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

        {/* See Octave 2007 - 2023 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-cyan-300">See Octave 2007 - 2023</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/eV6_J_rAVs4"
                  title="Octave System Overview"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/vlV1vRD4jrY"
                  title="Collaborative Environment Demo"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
            <Card className="overflow-hidden bg-black/30 backdrop-blur-md border-blue-500/30">
              <div className="aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/Y-DZLTY6Hok"
                  title="Technical Architecture"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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