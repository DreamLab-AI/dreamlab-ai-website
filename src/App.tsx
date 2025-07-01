import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Team from "./pages/Team";
import Work from "./pages/Work";
import Contact from "./pages/Contact";
import WorkshopPage from "./pages/WorkshopPage"; // New import for workshop pages

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
        <Routes>
          {/* Main index route */}
          <Route path="/" element={<Index />} />
          {/* Team page route */}
          <Route path="/team" element={<Team />} />
          {/* Previous Work route */}
          <Route path="/work" element={<Work />} />
          
          {/* Workshop Routes */}
          <Route path="/workshops/:workshopId" element={<WorkshopPage />} />
          <Route path="/workshops/:workshopId/:pageSlug" element={<WorkshopPage />} />

          {/* Contact form route */}
          <Route path="/contact" element={<Contact />} />
          {/* Privacy Policy route */}
          <Route path="/privacy" element={<Privacy />} />
          {/* --- Add Custom Routes Above This Line --- */}
          {/* Catch-all route for pages not found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
