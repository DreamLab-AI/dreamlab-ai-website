// API endpoints for PDF generation
import express from 'express';
import { generatePDF } from './generate-pdf.js';
import { generateDreamLabBrochure } from './generate-dreamlab-pdf.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DreamLab AI Brochure API',
    endpoints: {
      'POST /generate': 'Generate PDF from template and data',
      'GET /generate-dreamlab': 'Generate the official DreamLab AI brochure',
      'GET /download/:filename': 'Download generated PDF',
      'GET /download-brochure': 'Download the official DreamLab AI brochure'
    }
  });
});

// Generate PDF endpoint
app.post('/generate', async (req, res) => {
  try {
    const { templatePath, data, outputFilename } = req.body;
    
    if (!templatePath || !outputFilename) {
      return res.status(400).json({ 
        success: false, 
        error: 'templatePath and outputFilename are required' 
      });
    }

    const outputPath = join(__dirname, 'output', outputFilename);
    
    await generatePDF({
      templatePath: join(__dirname, templatePath),
      outputPath,
      data: data || {},
      pdfOptions: {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'PDF generated successfully',
      filename: outputFilename,
      downloadUrl: `/download/${outputFilename}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Generate DreamLab brochure endpoint
app.get('/generate-dreamlab', async (req, res) => {
  try {
    const outputPath = await generateDreamLabBrochure();
    res.json({ 
      success: true, 
      message: 'DreamLab AI brochure generated successfully',
      filename: 'DreamLab-AI-Brochure.pdf',
      downloadUrl: '/download-brochure'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Download DreamLab brochure endpoint
app.get('/download-brochure', async (req, res) => {
  try {
    const filepath = join(__dirname, 'output', 'DreamLab-AI-Brochure.pdf');
    
    // Check if file exists
    try {
      await access(filepath, constants.F_OK);
    } catch {
      // Generate it if it doesn't exist
      await generateDreamLabBrochure();
    }
    
    res.download(filepath, 'DreamLab-AI-Brochure.pdf');
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download brochure' 
    });
  }
});

// Download endpoint
app.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(__dirname, 'output', filename);
    
    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid filename' 
      });
    }
    
    res.download(filepath);
  } catch (error) {
    res.status(404).json({ 
      success: false, 
      error: 'File not found' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Brochure API server running on http://localhost:${PORT}`);
});