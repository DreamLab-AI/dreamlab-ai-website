import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteLoader } from "@/components/RouteLoader";
import { AIChatFab } from "@/components/AIChatFab";

// Lazy load all route components for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Team = lazy(() => import("./pages/Team"));
const Contact = lazy(() => import("./pages/Contact"));
const WorkshopPage = lazy(() => import("./pages/WorkshopPage"));
const WorkshopIndex = lazy(() => import("./pages/WorkshopIndex"));
const Programmes = lazy(() => import("./pages/Programmes"));
const CoCreate = lazy(() => import("./pages/CoCreate"));
const Research = lazy(() => import("./pages/Research"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const Ventures = lazy(() => import("./pages/Ventures"));

// Initialize React Query client
const queryClient = new QueryClient();

/**
 * The root application component.
 * Sets up essential context providers (React Query, Tooltip, Toasters)
 * and defines the main application routing using React Router.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/programmes" element={<Programmes />} />
            <Route path="/co-create" element={<CoCreate />} />
            <Route path="/research" element={<Research />} />
            <Route path="/team" element={<Team />} />

            {/* Workshop Routes */}
            <Route path="/workshops" element={<WorkshopIndex />} />
            <Route path="/workshops/:workshopId" element={<WorkshopPage />} />
            <Route path="/workshops/:workshopId/:pageSlug" element={<WorkshopPage />} />

            {/* Impact Stories (formerly Testimonials) */}
            <Route path="/testimonials" element={<Testimonials />} />

            {/* Venture Lab — unlinked, direct URL only */}
            <Route path="/ventures" element={<Ventures />} />

            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Legacy redirects — old routes point to new equivalents */}
            <Route path="/residential-training" element={<Navigate to="/programmes" replace />} />
            <Route path="/masterclass" element={<Navigate to="/programmes" replace />} />
            <Route path="/system-design" element={<Navigate to="/research" replace />} />
            <Route path="/research-paper" element={<Navigate to="/research" replace />} />
            <Route path="/work" element={<Navigate to="/research" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <AIChatFab />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
