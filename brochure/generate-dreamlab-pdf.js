import { generatePDF } from './generate-pdf.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateDreamLabBrochure() {
  console.log('🚀 Generating DreamLab AI Brochure...');
  
  try {
    const templatePath = join(__dirname, 'templates', 'dreamlab-brochure.html');
    const outputPath = join(__dirname, 'output', 'DreamLab-AI-Brochure.pdf');
    
    // Generate the PDF with A4 settings
    await generatePDF({
      templatePath,
      outputPath,
      data: {}, // No dynamic data needed for this static brochure
      pdfOptions: {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        preferCSSPageSize: true
      }
    });
    
    console.log('✅ Brochure generated successfully!');
    console.log(`📄 PDF saved to: ${outputPath}`);
    
    // Return the path for use in other scripts
    return outputPath;
  } catch (error) {
    console.error('❌ Error generating brochure:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDreamLabBrochure()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { generateDreamLabBrochure };