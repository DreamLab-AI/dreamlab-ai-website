// scripts/generate-workshop-list.mjs
import fs from 'fs/promises';
import path from 'path';

const workshopsBaseDir = path.resolve('public/data/workshops');
const mainListOutputFile = path.resolve('src/data/workshop-list.json');

// Function to extract title from markdown (simple version: first H1)
async function extractTitleFromMd(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.*)/m);
    // Fallback to filename if no H1 is found
    let extractedTitle = path.basename(filePath, '.md').replace(/_/g, ' ');
    // Capitalize first letter of each word
    extractedTitle = extractedTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return titleMatch ? titleMatch[1] : extractedTitle;
  } catch (e) {
    // Log error but still return a default title
    console.warn(`Warning: Could not read ${filePath} to extract title: ${e.message}`);
    let fallbackTitle = path.basename(filePath, '.md').replace(/_/g, ' ');
    fallbackTitle = fallbackTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return fallbackTitle;
  }
}

async function generateWorkshopData() {
  const mainWorkshopList = [];

  try {
    await fs.access(workshopsBaseDir); // Check if base directory exists
    const workshopDirs = await fs.readdir(workshopsBaseDir, { withFileTypes: true });

    for (const dirEntry of workshopDirs) {
      if (dirEntry.isDirectory()) {
        const workshopId = dirEntry.name;
        const workshopDirPath = path.join(workshopsBaseDir, workshopId);
        
        const formattedName = workshopId
          .replace(/^workshop-/, '')
          .replace(/-/g, ' ')
          .replace(/(\d+)\s*(.*)/, '$1 - $2')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        mainWorkshopList.push({
          id: workshopId,
          name: formattedName,
          path: `/workshops/${workshopId}`
        });

        // Create manifest.json for this workshop
        const workshopFiles = await fs.readdir(workshopDirPath);
        const pageItems = [];
        let workshopTitle = formattedName; // Default workshop title

        for (const file of workshopFiles) {
          if (file.endsWith('.md')) {
            const filePath = path.join(workshopDirPath, file);
            const title = await extractTitleFromMd(filePath);
            if (file.toLowerCase() === 'readme.md') {
                workshopTitle = title; 
            }
            pageItems.push({
              slug: file, // e.g., 00_introduction.md
              title: title // e.g., "Introduction & Workshop Overview"
            });
          }
        }
        
        pageItems.sort((a, b) => {
            if (a.slug.toLowerCase() === 'readme.md') return -1;
            if (b.slug.toLowerCase() === 'readme.md') return 1;
            const aNumMatch = a.slug.match(/^(\d+)[_.]/); // Match number followed by _ or .
            const bNumMatch = b.slug.match(/^(\d+)[_.]/);
            if (aNumMatch && bNumMatch) {
                const aNum = parseInt(aNumMatch[1]);
                const bNum = parseInt(bNumMatch[1]);
                if (aNum !== bNum) return aNum - bNum;
            }
            return a.slug.localeCompare(b.slug);
        });

        const workshopManifest = {
            title: workshopTitle,
            pages: pageItems
        };
        const manifestOutputPath = path.join(workshopDirPath, 'manifest.json');
        await fs.writeFile(manifestOutputPath, JSON.stringify(workshopManifest, null, 2));
        console.log(`Manifest generated for ${workshopId}: ${manifestOutputPath}`);
      }
    }

    // Ensure src/data directory exists
    await fs.mkdir(path.dirname(mainListOutputFile), { recursive: true });
    await fs.writeFile(mainListOutputFile, JSON.stringify(mainWorkshopList, null, 2));
    console.log('Main workshop list generated successfully:', mainListOutputFile);
  } catch (error) {
    if (error.code === 'ENOENT' && error.path === workshopsBaseDir) {
        console.warn(`Workshops directory not found at ${workshopsBaseDir}. Creating empty workshop list.`);
        await fs.mkdir(path.dirname(mainListOutputFile), { recursive: true }); // Ensure src/data exists
        await fs.writeFile(mainListOutputFile, JSON.stringify([], null, 2)); // Create empty list
    } else {
        console.error('Error generating workshop data:', error);
        // To prevent build failures, ensure an empty list is created if other errors occur
        try {
            await fs.mkdir(path.dirname(mainListOutputFile), { recursive: true });
            await fs.writeFile(mainListOutputFile, JSON.stringify([], null, 2));
            console.log('Created empty main workshop list due to an error during generation.');
        } catch (writeError) {
            console.error('Failed to write empty workshop list:', writeError);
        }
    }
  }
}

generateWorkshopData();