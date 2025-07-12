import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RouteLoader } from "@/components/RouteLoader";

// Lazy load all route components for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Team = lazy(() => import("./pages/Team"));
const Work = lazy(() => import("./pages/Work"));
const Contact = lazy(() => import("./pages/Contact"));
const WorkshopPage = lazy(() => import("./pages/WorkshopPage"));
const WorkshopIndex = lazy(() => import("./pages/WorkshopIndex"));
const ResidentialTraining = lazy(() => import("./pages/ResidentialTraining"));

// Initialize React Query client
const queryClient = new QueryClient();

/**
 * The root application component.
 * Sets up essential context providers (React Query, Tooltip, Toasters)
 * and defines the main application routing using React Router.
 */
const App = () => (
  // Provide React Query client to the app
  <QueryClientProvider client={queryClient}>
    {/* Provide tooltip functionality */}
    <TooltipProvider>
      {/* Toaster components for displaying notifications */}
      <Toaster />
      <Sonner />
      {/* Set up client-side routing */}
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            {/* Main index route */}
            <Route path="/" element={<Index />} />
            {/* Team page route */}
            <Route path="/team" element={<Team />} />
            {/* Previous Work route */}
            <Route path="/work" element={<Work />} />

            {/* Workshop Routes */}
            <Route path="/workshops" element={<WorkshopIndex />} />
            <Route path="/workshops/:workshopId" element={<WorkshopPage />} />
            <Route path="/workshops/:workshopId/:pageSlug" element={<WorkshopPage />} />

            {/* Residential Training route */}
            <Route path="/residential-training" element={<ResidentialTraining />} />

            {/* Contact form route */}
            <Route path="/contact" element={<Contact />} />
            {/* Privacy Policy route */}
            <Route path="/privacy" element={<Privacy />} />
            {/* --- Add Custom Routes Above This Line --- */}
            {/* Catch-all route for pages not found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
