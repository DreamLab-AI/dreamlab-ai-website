// Simple script to test our build process
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Run the build
console.log('Running build...');
execSync('npm run build', { stdio: 'inherit' });

// Check if special files were copied
console.log('\nChecking for special files in dist:');
const distFiles = fs.readdirSync('dist', { withFileTypes: true })
  .map(entry => entry.name);

// Check for .nojekyll
if (distFiles.includes('.nojekyll')) {
  console.log('✅ .nojekyll file was successfully copied');
} else {
  console.log('❌ .nojekyll file is missing');
}

// Check for CNAME
if (distFiles.includes('CNAME')) {
  console.log('✅ CNAME file was successfully copied');
} else {
  console.log('❌ CNAME file is missing');
}

// Check for 404.html
if (distFiles.includes('404.html')) {
  console.log('✅ 404.html file was successfully copied');
} else {
  console.log('❌ 404.html file is missing');
}
