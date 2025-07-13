import { generateBrochure } from './generate-pdf.js';

// Test data for brochure generation
const testData = {
  companyName: 'DreamLab AI',
  tagline: 'Transforming Ideas into Digital Reality',
  date: new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  introduction: `DreamLab AI is a cutting-edge AI service laboratory that bridges the gap between innovative ideas and practical solutions. We specialize in crafting custom AI-powered applications, automation tools, and intelligent systems that transform how businesses operate in the digital age.`,
  vision: `To be the leading partner for businesses seeking to harness the transformative power of artificial intelligence, making advanced AI technology accessible and practical for organizations of all sizes.`,
  mission: `We empower businesses with custom AI solutions that drive innovation, efficiency, and growth. Through collaborative partnerships, we turn complex challenges into elegant, intelligent solutions that deliver real-world results.`,
  servicesIntro: `Our comprehensive suite of AI services is designed to meet the diverse needs of modern businesses:`,
  services: `
    <div class="feature-card">
      <h4>AI Consulting & Strategy</h4>
      <p>Expert guidance to identify AI opportunities and develop implementation roadmaps tailored to your business goals.</p>
    </div>
    <div class="feature-card">
      <h4>Custom AI Development</h4>
      <p>Bespoke AI solutions built from the ground up to address your specific challenges and requirements.</p>
    </div>
    <div class="feature-card">
      <h4>Machine Learning Models</h4>
      <p>Advanced ML models for prediction, classification, and optimization across various business domains.</p>
    </div>
    <div class="feature-card">
      <h4>Natural Language Processing</h4>
      <p>Intelligent text analysis, chatbots, and language understanding systems for enhanced communication.</p>
    </div>
  `,
  whyChooseUs: `
    <ul>
      <li><strong>Expertise:</strong> Our team consists of AI researchers, engineers, and domain experts with proven track records.</li>
      <li><strong>Custom Solutions:</strong> We don't believe in one-size-fits-all. Every solution is tailored to your unique needs.</li>
      <li><strong>Ethical AI:</strong> We prioritize responsible AI development with transparency, fairness, and privacy at the core.</li>
      <li><strong>Partnership Approach:</strong> We work as an extension of your team, ensuring knowledge transfer and long-term success.</li>
      <li><strong>Cutting-Edge Technology:</strong> We stay at the forefront of AI research to bring you the latest innovations.</li>
    </ul>
  `,
  process: `
    <ol>
      <li><strong>Discovery:</strong> We begin by understanding your business, challenges, and objectives.</li>
      <li><strong>Strategy:</strong> Our experts develop a comprehensive AI strategy aligned with your goals.</li>
      <li><strong>Development:</strong> We build and train custom AI models using state-of-the-art techniques.</li>
      <li><strong>Integration:</strong> Seamless integration with your existing systems and workflows.</li>
      <li><strong>Optimization:</strong> Continuous monitoring and improvement to ensure optimal performance.</li>
      <li><strong>Support:</strong> Ongoing support and maintenance to adapt to your evolving needs.</li>
    </ol>
  `,
  contactIntro: `Ready to transform your business with AI? Let's start a conversation about how DreamLab AI can help you achieve your goals.`,
  address: `Innovation Hub, Suite 300<br>1234 Tech Boulevard<br>San Francisco, CA 94105`,
  email: `hello@dreamlab.ai`,
  phone: `+1 (555) 123-4567`,
  website: `www.dreamlab.ai`,
  closingStatement: `Let's build the future together with AI.`
};

// Generate the brochure
console.log('🚀 Starting brochure generation...');
generateBrochure(testData)
  .then((outputPath) => {
    console.log('✅ Brochure generated successfully!');
    console.log(`📄 Output file: ${outputPath}`);
  })
  .catch((error) => {
    console.error('❌ Failed to generate brochure:', error);
    process.exit(1);
  });