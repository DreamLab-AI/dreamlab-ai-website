import puppeteer from 'puppeteer';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate a PDF from an HTML template
 * @param {Object} options - Generation options
 * @param {string} options.templatePath - Path to HTML template
 * @param {string} options.outputPath - Path for output PDF
 * @param {Object} options.data - Data to inject into template
 * @param {Object} options.pdfOptions - Puppeteer PDF options
 */
export async function generatePDF({
  templatePath,
  outputPath,
  data = {},
  pdfOptions = {}
}) {
  let browser;
  
  try {
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Read HTML template
    let html = await readFile(templatePath, 'utf-8');

    // Replace placeholders in template with data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, value);
    });

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });

    // Load HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for any custom fonts or images to load
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF with default options
    const defaultPdfOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: true
    };

    const finalPdfOptions = { ...defaultPdfOptions, ...pdfOptions };
    const pdfBuffer = await page.pdf(finalPdfOptions);

    // Save PDF
    await writeFile(outputPath, pdfBuffer);

    console.log(`✅ PDF generated successfully: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate a brochure PDF with specific styling
 */
export async function generateBrochure(data) {
  const templatePath = join(__dirname, 'templates', 'brochure-template.html');
  const outputPath = join(__dirname, 'output', `dreamlab-brochure-${Date.now()}.pdf`);

  return generatePDF({
    templatePath,
    outputPath,
    data,
    pdfOptions: {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    }
  });
}

// Export for use in other modules
export default {
  generatePDF,
  generateBrochure
};