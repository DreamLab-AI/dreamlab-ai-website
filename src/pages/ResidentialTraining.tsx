import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, MapPin, Home, Zap, Users, Award, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Residential Training page showcasing DreamLab's immersive training programs
 * combining creative technology with engineering precision
 */
const ResidentialTraining = () => {
  const navigate = useNavigate();

  const trainingPrograms = [
    {
      id: "virtual-production",
      title: "Virtual Production & Engineering Viz",
      duration: "5 Days",
      price: "£4,995",
      capacity: "6-8 Participants",
      category: "Creative Tech",
      featured: true,
      description: "Master LED volume workflows and real-time visualization for engineering simulation data.",
      modules: [
        "LED Volume Operations & ICVFX",
        "Real-time Rendering for CAE/CFD Data",
        "Unreal Engine for Engineering Viz",
        "Motion Control & Camera Tracking",
        "Virtual Production Pipeline Integration"
      ]
    },
    {
      id: "gaussian-splatting",
      title: "Gaussian Splatting & Neural Rendering",
      duration: "3 Days",
      price: "£2,995",
      capacity: "4-6 Participants",
      category: "Emerging Tech",
      description: "Learn cutting-edge 3D reconstruction techniques from photogrammetry to neural radiance fields.",
      modules: [
        "Photogrammetry Fundamentals",
        "Neural Radiance Fields (NeRF)",
        "Gaussian Splatting Techniques",
        "3D Reconstruction for Engineering",
        "Real-time Neural Rendering"
      ]
    },
    {
      id: "telepresence-xr",
      title: "Telepresence & Remote Collaboration",
      duration: "3 Days",
      price: "£2,495",
      capacity: "4-6 Participants",
      category: "Communication Tech",
      description: "Build holographic communication systems and XR collaboration platforms for distributed teams.",
      modules: [
        "Holographic Display Technologies",
        "XR Collaboration Platforms",
        "Remote Presence Systems",
        "Spatial Audio Integration",
        "Enterprise Telepresence Solutions"
      ]
    },
    {
      id: "ai-creative",
      title: "AI for Creative Production",
      duration: "4 Days",
      price: "£3,495",
      capacity: "8-10 Participants",
      category: "AI/ML",
      featured: true,
      description: "Integrate generative AI and ML into production pipelines for automated workflows.",
      modules: [
        "Generative AI in Production",
        "ML for Automated VFX",
        "AI-Powered Compositing",
        "Neural Style Transfer",
        "Ethical AI in Creative Industries"
      ]
    },
    {
      id: "agentic-engineering",
      title: "Agentic Engineering Systems",
      duration: "3 Days",
      price: "£2,795",
      capacity: "6-8 Participants",
      category: "Advanced Engineering",
      description: "Design and deploy autonomous agent systems for engineering and creative applications.",
      modules: [
        "Agent Architecture Design",
        "Multi-Agent Coordination",
        "Autonomous Creative Systems",
        "Engineering Process Automation",
        "Human-Agent Collaboration"
      ]
    }
  ];

  const facilityFeatures = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "6m × 2.5m LED Volume",
      description: "State-of-the-art virtual production screen for immersive training scenarios"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Motion Capture Studio",
      description: "Professional Vicon/OptiTrack system for performance capture training"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Gaussian Splatting Lab",
      description: "Multi-camera array for cutting-edge 3D reconstruction techniques"
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "5-Bedroom Accommodation",
      description: "Luxury residential facility with dedicated training wing"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-purple-950/20" />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">Residential Training</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-500 inline-block text-transparent bg-clip-text">
              Where Creative Vision Meets Engineering Precision
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Transform your skills at the UK's premier facility combining virtual production, 
              engineering simulation, and cutting-edge AI technologies in an immersive residential setting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/contact")}>
                Book Your Training
              </Button>
              <Button size="lg" variant="outline">
                Download Brochure
              </Button>
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
              Hands-on courses designed for professionals ready to master the intersection 
              of creative technology and engineering excellence.
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-8">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="creative">Creative</TabsTrigger>
              <TabsTrigger value="engineering">Engineering</TabsTrigger>
              <TabsTrigger value="ai">AI/ML</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingPrograms.map((program) => (
                  <Card key={program.id} className={program.featured ? "border-primary" : ""}>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={program.featured ? "default" : "secondary"}>
                          {program.category}
                        </Badge>
                        {program.featured && (
                          <Badge variant="outline">Featured</Badge>
                        )}
                      </div>
                      <CardTitle>{program.title}</CardTitle>
                      <CardDescription>{program.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{program.duration}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{program.price}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Group Size</span>
                          <span className="font-medium">{program.capacity}</span>
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Key Modules:</p>
                          <ul className="space-y-1">
                            {program.modules.slice(0, 3).map((module, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <span>{module}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant={program.featured ? "default" : "outline"}
                        onClick={() => navigate("/contact")}
                      >
                        Learn More
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="creative">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingPrograms
                  .filter(p => p.category === "Creative Tech")
                  .map((program) => (
                    <Card key={program.id} className={program.featured ? "border-primary" : ""}>
                      {/* Same card content as above */}
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="engineering">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingPrograms
                  .filter(p => p.category === "Advanced Engineering" || p.category === "Emerging Tech")
                  .map((program) => (
                    <Card key={program.id} className={program.featured ? "border-primary" : ""}>
                      {/* Same card content as above */}
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="ai">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingPrograms
                  .filter(p => p.category === "AI/ML")
                  .map((program) => (
                    <Card key={program.id} className={program.featured ? "border-primary" : ""}>
                      {/* Same card content as above */}
                    </Card>
                  ))}
              </div>
            </TabsContent>
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
                      En-suite rooms, professional kitchen, dedicated training spaces, 
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
            
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Accommodation Gallery Coming Soon</p>
              </div>
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