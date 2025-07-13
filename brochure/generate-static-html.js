import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateStaticHTML() {
  console.log('📄 Generating static HTML for DreamLab AI Brochure...');
  
  try {
    // Read the template
    const templatePath = join(__dirname, 'templates', 'dreamlab-brochure.html');
    const html = await readFile(templatePath, 'utf-8');
    
    // Add print-friendly CSS and instructions
    const enhancedHTML = html.replace('</head>', `
    <style>
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
      }
      
      .print-instructions {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3B82F6;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }
      
      .print-instructions:hover {
        background: #2563EB;
        transform: translateY(-2px);
        box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
      }
      
      @media print {
        .print-instructions {
          display: none !important;
        }
      }
    </style>
    <script>
      function printBrochure() {
        window.print();
      }
    </script>
  </head>`);
    
    // Add print button after body tag
    const finalHTML = enhancedHTML.replace('<body>', `<body>
    <button class="print-instructions no-print" onclick="printBrochure()">
      📄 Print as PDF
    </button>`);
    
    // Save the enhanced HTML
    const outputPath = join(__dirname, 'output', 'dreamlab-brochure-printable.html');
    await writeFile(outputPath, finalHTML);
    
    console.log('✅ Static HTML generated successfully!');
    console.log(`📄 HTML saved to: ${outputPath}`);
    console.log('\n📌 To create a PDF:');
    console.log('   1. Open the HTML file in a browser');
    console.log('   2. Click the "Print as PDF" button');
    console.log('   3. Save as PDF with background graphics enabled');
    
    return outputPath;
  } catch (error) {
    console.error('❌ Error generating static HTML:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateStaticHTML()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { generateStaticHTML };