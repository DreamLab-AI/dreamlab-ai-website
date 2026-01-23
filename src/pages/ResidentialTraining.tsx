import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Home, Zap, Users, Award, Calendar, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { CourseCard } from "@/components/CourseCard";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

/**
 * Residential Training page showcasing DreamLab's immersive training programs
 * combining creative technology with engineering precision
 */
const ResidentialTraining = () => {
  // Set OG meta tags for residential training page
  useOGMeta(PAGE_OG_CONFIGS.residentialTraining);

  const navigate = useNavigate();

  const images = [
    "/data/media/aerial.jpeg",
    "/data/media/fairfield-front.jpg",
    "/data/media/fairfield-back.jpeg",
    "/data/media/view.jpeg",
    "/data/media/view2.jpeg",
    "/data/media/view3.jpeg",
    "/data/media/bedroom.jpeg",
    "/data/media/bedroom-two.jpeg",
    "/data/media/main-bedroom.jpeg",
    "/data/media/labview2.webp",
    "/data/media/labview3.webp",
    "/data/media/wine.webp",
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds
    return () => clearInterval(timer);
  }, []);

  // Confluence Training Packs - Multi-instructor delivery with premium residential experience
  // Q1 2025 Special: ~50% of market median pricing (Imperial £5,950+, VP Bootcamps £4,500+)
  // Per-person pricing with 15% team discount for groups of 4 - includes full-board accommodation & meals
  const trainingPrograms = [
    {
      id: "ai-commander-week",
      title: "AI Commander Week",
      duration: "5 Days",
      pricePerPerson: "£2,750",
      teamPrice: "£9,350",
      teamSaving: "Save £650",
      capacity: "Up to 4",
      category: "AI/ML",
      featured: true,
      description: "Master agentic engineering from protocol level to production. Learn to orchestrate AI agents, multi-model architectures, and autonomous systems from practitioners who build at the cutting edge.",
      modules: [
        "Agentic Architecture & Protocol Design",
        "Multi-Agent Orchestration & Swarm Intelligence",
        "LLM Integration & Fine-Tuning Workflows",
        "Production Deployment & Scaling",
        "Human-AI Collaboration Interfaces"
      ],
      instructors: "Pete Woodbridge (CTO), Dr John O'Hare (CHO), Jing Li, Kriss Dunk"
    },
    {
      id: "virtual-production-master",
      title: "Virtual Production Master",
      duration: "5 Days",
      pricePerPerson: "£2,950",
      teamPrice: "£9,995",
      teamSaving: "Save £805",
      capacity: "Up to 4",
      category: "Creative Tech",
      featured: true,
      description: "Complete LED volume workflow mastery. From camera tracking to real-time compositing, learn from Emmy-nominated professionals with credits spanning Star Wars to Formula 1.",
      modules: [
        "LED Volume Operations & ICVFX Fundamentals",
        "Unreal Engine for Real-Time Production",
        "Motion Control & Camera Tracking Systems",
        "Real-Time Compositing & Colour Science",
        "Virtual Production Pipeline Integration"
      ],
      instructors: "Pete Woodbridge, Roger McKinley, Thadeous Letitia, Bradley Harris (Emmy-nom)"
    },
    {
      id: "xr-innovation-intensive",
      title: "XR Innovation Intensive",
      duration: "5 Days",
      pricePerPerson: "£2,750",
      teamPrice: "£9,350",
      teamSaving: "Save £650",
      capacity: "Up to 4",
      category: "XR/VR",
      featured: true,
      description: "Immersive experience development from concept to deployment. Apple Vision Pro, Meta Quest, and industrial applications with PhD-level guidance.",
      modules: [
        "Unity & Unreal for XR Development",
        "Apple Vision Pro & Spatial Computing",
        "Industrial XR Training Systems",
        "Mixed Reality Interface Design",
        "Healthcare & Engineering XR Applications"
      ],
      instructors: "Dr Arpana Sherpa (PhD), Christian Frost, Dr David Tully, Lewis Hackett"
    },
    {
      id: "digital-human-mocap",
      title: "Digital Human & MoCap",
      duration: "3 Days",
      pricePerPerson: "£1,695",
      teamPrice: "£5,750",
      teamSaving: "Save £530",
      capacity: "Up to 4",
      category: "Creative Tech",
      description: "Professional motion capture and digital human creation. Learn from Emmy-nominated specialists with credits on Star Wars, Marvel, and major game titles.",
      modules: [
        "Motion Capture System Operation",
        "Performance Capture & Retargeting",
        "Digital Human Creation Pipeline",
        "Real-Time Character Animation",
        "MetaHuman & Facial Capture"
      ],
      instructors: "Bradley Harris (Emmy-nom), Garth Williams, Christian Frost"
    },
    {
      id: "spatial-audio-production",
      title: "Spatial Audio Production",
      duration: "5 Days",
      pricePerPerson: "£2,750",
      teamPrice: "£9,350",
      teamSaving: "Save £650",
      capacity: "Up to 4",
      category: "Audio",
      description: "Master immersive audio for XR, cinema, and installations. Dolby Atmos certification preparation with industry-leading audio professionals.",
      modules: [
        "Dolby Atmos Mixing & Mastering",
        "Binaural Audio for VR/AR",
        "Spatial Audio Engine Implementation",
        "Field Recording for Immersive Media",
        "Game Audio & Procedural Sound Design"
      ],
      instructors: "Bernard Steer (Dolby Atmos), Noelle Nurdin, Dr Sean Hill"
    },
    {
      id: "engineering-visualisation",
      title: "Engineering Visualisation",
      duration: "5 Days",
      pricePerPerson: "£2,750",
      teamPrice: "£9,350",
      teamSaving: "Save £650",
      capacity: "Up to 4",
      category: "Engineering",
      description: "Transform CAE/CFD data into real-time interactive visualisations. Bridge engineering simulation and creative technology with PhD-level expertise.",
      modules: [
        "CAE/CFD Data Import & Optimisation",
        "Real-Time Scientific Visualisation",
        "Unreal Engine for Engineering Viz",
        "Interactive Simulation Interfaces",
        "Nuclear & Energy Sector Applications"
      ],
      instructors: "Marco Ghilardi (PhD Nuclear), Dr Sean Hill, Daniel Maktabi"
    },
    {
      id: "neural-content-creation",
      title: "Neural Content Creation",
      duration: "3 Days",
      pricePerPerson: "£1,695",
      teamPrice: "£5,750",
      teamSaving: "Save £530",
      capacity: "Up to 4",
      category: "Emerging Tech",
      description: "Cutting-edge 3D reconstruction from photogrammetry to neural radiance fields. Gaussian splatting capture and real-time neural rendering.",
      modules: [
        "Gaussian Splatting Capture Pipeline",
        "NeRF Implementation & Optimisation",
        "Photogrammetry for Production",
        "Real-Time Neural Rendering",
        "Asset Integration & Deployment"
      ],
      instructors: "Will Sheridan, Zack Lewis, James Berry"
    },
    {
      id: "cyber-infrastructure",
      title: "Cyber Infrastructure",
      duration: "3 Days",
      pricePerPerson: "£1,695",
      teamPrice: "£5,750",
      teamSaving: "Save £530",
      capacity: "Up to 4",
      category: "Engineering",
      description: "Industrial-grade network architecture and cybersecurity. Design secure infrastructure for creative and engineering environments.",
      modules: [
        "Enterprise Network Architecture",
        "Zero-Trust Security Implementation",
        "Cloud & Hybrid Infrastructure",
        "Industrial Control System Security",
        "Secure Remote Production Workflows"
      ],
      instructors: "Ste Moyler (CCO), David Sherpa, Pete Woodbridge"
    },
    {
      id: "decentralised-agents",
      title: "Decentralised Agent Infrastructure",
      duration: "4 Days",
      pricePerPerson: "£2,195",
      teamPrice: "£7,450",
      teamSaving: "Save £580",
      capacity: "Up to 4",
      category: "Web3 Tech",
      description: "Build sovereign, cryptographically-secured agent systems using Bitcoin, Lightning, RGB protocols and decentralised identity.",
      modules: [
        "Bitcoin & Lightning for Agent Payments",
        "RGB Protocol & Smart Contracts",
        "Nostr Protocol & Decentralised Identity",
        "Private Contract Negotiation",
        "Agent-First Architecture Design"
      ],
      instructors: "Pete Woodbridge, Kriss Dunk, Jing Li",
      partnership: "Partnering with GlobalBlock liquidity provider for secure API endpoints"
    },
    {
      id: "creative-technology-fundamentals",
      title: "Creative Technology Fundamentals",
      duration: "5 Days",
      pricePerPerson: "£2,495",
      teamPrice: "£8,495",
      teamSaving: "Save £685",
      capacity: "Up to 4",
      category: "Foundation",
      description: "Comprehensive introduction to creative technology for career changers and newcomers. From version control to AI-assisted workflows.",
      modules: [
        "Development Environment Setup",
        "Git & Collaborative Workflows",
        "AI-Assisted Development (Claude, Copilot)",
        "Project Structure & Best Practices",
        "Publishing & Deployment"
      ],
      instructors: "Pete Woodbridge, Dr Arpana Sherpa, Marcus Sherpa"
    },
    {
      id: "corporate-immersive",
      title: "Corporate Immersive Retreat",
      duration: "3 Days",
      pricePerPerson: "£3,995",
      teamPrice: "£13,595",
      teamSaving: "Save £985",
      capacity: "Up to 4",
      category: "Enterprise",
      featured: true,
      description: "Bespoke executive experience combining strategic AI briefings, hands-on technology demos, and Lake District hospitality. Tailored for C-suite and senior leadership.",
      modules: [
        "AI Strategy for Enterprise",
        "Hands-On Technology Demonstrations",
        "Innovation Workshop Facilitation",
        "Team Building & Networking",
        "Strategic Roadmap Development"
      ],
      instructors: "Pete Woodbridge, Dr John O'Hare, Stephen Moyler"
    },
    {
      id: "visionflow-power-user",
      title: "VisionFlow Power User",
      duration: "4 Days",
      pricePerPerson: "£2,195",
      teamPrice: "£7,450",
      teamSaving: "Save £580",
      capacity: "Up to 4",
      category: "AI/ML",
      featured: true,
      description: "Master self-sovereign knowledge management with VisionFlow. Deploy autonomous AI agent teams that research, analyse, and visualise your data corpus in stunning 3D—all on your own infrastructure.",
      modules: [
        "Self-Sovereign Data Architecture & Privacy",
        "Multi-Agent Orchestration with MCP Protocol",
        "GraphRAG & Knowledge Graph Construction",
        "3D Visualisation with Three.js & Neo4j",
        "On-Premise Deployment & Security Hardening"
      ],
      instructors: "Pete Woodbridge (CTO), Kriss Dunk, Jing Li"
    }
  ];

  const facilityFeatures = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "The Dream Team",
      description: "43+ specialists: Emmy nominees, PhDs, BAFTA talent on every programme"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Enterprise Tech Stack",
      description: "LED volume, motion capture, 8×RTX GPU cluster, Dolby Atmos studio"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "6.3kW Solar + 10G Network",
      description: "Sustainable infrastructure with enterprise-grade connectivity"
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Lake District Residential",
      description: "5-bedroom luxury accommodation with stunning mountain views"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Availability Banner */}
      <section className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-b border-amber-500/20">
        <div className="container py-3 px-4">
          <p className="text-center text-sm text-amber-200/90">
            <span className="font-semibold">Q1 2025 fully booked</span> — Q2 sessions available at reduced rates during facility upgrades
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-purple-950/20" />
        <div className="container relative z-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm" variant="secondary">Residential Training</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-500 inline-block text-transparent bg-clip-text px-4">
              Deep learning with no distractions
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Train with the DreamLab collective — 43+ specialists including Emmy nominees, PhD researchers,
              and BAFTA-recognised talent. Multi-instructor delivery at our Lake District residential facility.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button size="lg" onClick={() => navigate("/contact")} className="min-h-[44px] touch-manipulation w-full sm:w-auto">
                Book Your Training
              </Button>
              <a href="/data/media/" download className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="min-h-[44px] touch-manipulation w-full">
                  Download Brochure
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 bg-secondary/50">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {facilityFeatures.map((feature, index) => (
              <Card key={index} className="border-muted">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Training Programs */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Immersive Training Programs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Multi-instructor delivery from our 43+ specialist collective. Each programme combines
              complementary expertise for comprehensive, hands-on skill transfer.
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full px-4">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 sm:grid-cols-8 mb-6 sm:mb-8 h-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">All</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">AI/ML</TabsTrigger>
              <TabsTrigger value="creative" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">VP</TabsTrigger>
              <TabsTrigger value="xr" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">XR</TabsTrigger>
              <TabsTrigger value="audio" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">Audio</TabsTrigger>
              <TabsTrigger value="engineering" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">Eng</TabsTrigger>
              <TabsTrigger value="web3" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">Web3</TabsTrigger>
              <TabsTrigger value="enterprise" className="text-xs sm:text-sm min-h-[44px] touch-manipulation">Corp</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {trainingPrograms.map((program, index) => (
                  <CourseCard
                    key={program.id}
                    id={program.id}
                    title={program.title}
                    duration={program.duration}
                    pricePerPerson={program.pricePerPerson}
                    teamPrice={program.teamPrice}
                    teamSaving={program.teamSaving}
                    capacity={program.capacity}
                    category={program.category}
                    description={program.description}
                    modules={program.modules}
                    instructors={program.instructors}
                    featured={program.featured}
                    partnership={program.partnership}
                    index={index}
                  />
                ))}
              </div>
            </TabsContent>

            {["ai", "creative", "xr", "audio", "engineering", "web3", "enterprise"].map(tab => {
              const categoryMap: Record<string, string[]> = {
                ai: ["AI/ML"],
                creative: ["Creative Tech"],
                xr: ["XR/VR"],
                audio: ["Audio"],
                engineering: ["Engineering", "Emerging Tech"],
                web3: ["Web3 Tech"],
                enterprise: ["Enterprise", "Foundation"]
              };
              const filteredPrograms = trainingPrograms.filter(p => categoryMap[tab].includes(p.category));
              return (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {filteredPrograms.map((program, index) => (
                      <CourseCard
                        key={program.id}
                        id={program.id}
                        title={program.title}
                        duration={program.duration}
                        pricePerPerson={program.pricePerPerson}
                        teamPrice={program.teamPrice}
                        teamSaving={program.teamSaving}
                        capacity={program.capacity}
                        category={program.category}
                        description={program.description}
                        modules={program.modules}
                        instructors={program.instructors}
                        featured={program.featured}
                        partnership={program.partnership}
                        index={index}
                      />
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </section>

      {/* Accommodation Section */}
      <section className="py-16 bg-secondary/50">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Premium Lake District Accommodation
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Experience the perfect blend of focused learning and natural inspiration.
                Our 5-bedroom luxury facility provides an ideal environment for intensive
                training, networking, and creative breakthroughs.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Prime Location</h3>
                    <p className="text-muted-foreground">
                      Nestled in the Lake District, offering stunning views and a peaceful
                      environment for focused learning
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Home className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Luxury Amenities</h3>
                    <p className="text-muted-foreground">
                      Private bedrooms, professional kitchen, dedicated training spaces,
                      and social areas for networking
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Flexible Booking</h3>
                    <p className="text-muted-foreground">
                      Available for training programs or corporate retreats,
                      with weekend and peak season rates
                    </p>
                  </div>
                </div>
              </div>

              <Button size="lg" onClick={() => navigate("/contact")}>
                Check Availability
              </Button>
            </div>

            <div className="relative aspect-video rounded-lg overflow-hidden">
              {images.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt="DreamLab Residential Training Facility"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Skills?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Join industry leaders and innovators at our residential training facility.
              Limited spaces available for upcoming programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate("/contact")}>
                Book Your Training
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                Schedule a Tour
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResidentialTraining;