import { Header } from "@/components/Header";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container py-20 mt-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Collection and Processing</h2>
            <p>
              We collect and process your email address when you subscribe to our updates. This is done on the basis of your explicit consent, which you provide when submitting your email address through our signup form.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Purpose of Data Collection</h2>
            <p>
              We collect your email address solely for the purpose of sending you updates about our projects, opportunities, and services. We do not share your email address with third parties or use it for any other purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
            <p>
              Your email address is stored securely in our Supabase database. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p>
              Under GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to withdraw consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p>
              We retain your email address only for as long as necessary to fulfill the purpose for which it was collected, or until you request its deletion. You can unsubscribe from our updates at any time by clicking the unsubscribe link in any email we send you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our data practices, please contact us at{" "}
              <a href="mailto:info@thedreamlab.uk" className="text-primary hover:underline">
                info@thedreamlab.uk
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacy; 