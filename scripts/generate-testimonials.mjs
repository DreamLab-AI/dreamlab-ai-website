// scripts/generate-testimonials.mjs
import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';

const yamlFile = path.resolve('content/site-content.yaml');
const outputFile = path.resolve('src/data/testimonials.json');

async function generateTestimonials() {
  try {
    const yamlContent = await fs.readFile(yamlFile, 'utf-8');
    const data = parseYaml(yamlContent);

    const testimonials = data.pages?.testimonials?.items || [];

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(testimonials, null, 2));

    console.log(`Generated ${testimonials.length} testimonials: ${outputFile}`);
  } catch (error) {
    console.error('Error generating testimonials:', error);
    // Create empty array on error
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify([], null, 2));
  }
}

generateTestimonials();
