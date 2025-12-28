import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useOGMeta } from "@/hooks/useOGMeta";
import { PAGE_OG_CONFIGS } from "@/lib/og-meta";

// --- Constants ---
const SUCCESS_MESSAGE = "Message sent! We'll get back to you as soon as possible.";
const ERROR_MESSAGE_SUBMISSION = "There was a problem sending your message. Please try again.";

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  projectType: z.string().min(1, { message: "Please select a project type" }),
  teamMembers: z.string().optional(),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

type FormValues = z.infer<typeof formSchema>;

const Contact = () => {
  // Set OG meta tags for contact page
  useOGMeta(PAGE_OG_CONFIGS.contact);

  const location = useLocation();
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse query params to get selected team members
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const team = params.get("team");
    if (team) {
      setSelectedTeam(team);
    }
  }, [location]);

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      projectType: "",
      teamMembers: selectedTeam,
      message: ""
    }
  });

  // Update team members field when selectedTeam changes
  useEffect(() => {
    form.setValue("teamMembers", selectedTeam);
  }, [selectedTeam, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      console.log("Submitting contact form:", data);

      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          name: data.name,
          email: data.email,
          project_type: data.projectType,
          team_members: data.teamMembers || null,
          message: data.message,
          submitted_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Also add email to subscribers list if not already there
      await supabase
        .from('email_subscribers')
        .upsert([{ email: data.email }], {
          onConflict: 'email',
          ignoreDuplicates: true
        });

      // Show success message
      toast({
        title: "Success!",
        description: SUCCESS_MESSAGE,
        duration: 5000
      });

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: ERROR_MESSAGE_SUBMISSION,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>
      <Header />

      {/* Contact header */}
      <section id="main-content" className="pt-24 pb-8 bg-secondary/20">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Have a project in mind? Fill out the form below and we'll get back to you.
          </p>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-12" aria-label="Contact form">
        <div className="container max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Contact us form">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                        {...field}
                        disabled={isSubmitting}
                      >
                        <option value="" disabled>Select a project type</option>
                        <option value="consultation">Consultation</option>
                        <option value="development">Development</option>
                        <option value="training">Training</option>
                        <option value="research">Research</option>
                        <option value="other">Other</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTeam && (
                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selected Team Members</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={selectedTeam}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your project or inquiry..."
                        className="min-h-32"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background" role="contentinfo">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-muted pt-8">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DreamLab AI Consulting Ltd. All rights reserved.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <nav aria-label="Social media links">
                <ul className="flex space-x-6">
                  <li>
                    <a href="https://bsky.app/profile/thedreamlab.bsky.social" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      Bluesky<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram (coming soon)">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/company/dreamlab-ai-consulting/?" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                      LinkedIn<span className="sr-only"> (opens in new window)</span>
                    </a>
                  </li>
                </ul>
              </nav>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;