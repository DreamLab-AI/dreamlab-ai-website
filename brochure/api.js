import express from 'express';
import { generateBrochure } from './generate-pdf.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * POST /api/brochure/generate
 * Generate a PDF brochure with provided data
 */
router.post('/generate', async (req, res) => {
  try {
    const data = req.body;
    
    // Validate required fields
    const requiredFields = ['companyName', 'tagline', 'introduction'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }

    // Generate PDF
    const pdfPath = await generateBrochure(data);
    
    // Send PDF file
    res.download(pdfPath, 'dreamlab-brochure.pdf', (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
        res.status(500).json({ error: 'Failed to send PDF' });
      }
    });

  } catch (error) {
    console.error('Error generating brochure:', error);
    res.status(500).json({ 
      error: 'Failed to generate brochure',
      message: error.message 
    });
  }
});

/**
 * GET /api/brochure/download/:filename
 * Download a previously generated brochure
 */
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = join(__dirname, 'output', filename);
  
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

export default router;