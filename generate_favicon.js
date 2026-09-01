import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('Generating high-resolution "The Oligarchy" favicon package from official logo...');

  // Setup directories
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  const srcImg = fs.existsSync('src/assets/images/the_oligarchy_logo_1788286956314.jpg')
    ? 'src/assets/images/the_oligarchy_logo_1788286956314.jpg'
    : 'public/logo_highres.png';

  // Generate master high-resolution versions
  execSync(`convert "${srcImg}" -resize 512x512 public/logo_highres.png`);
  execSync(`convert "${srcImg}" -resize 512x512 public/favicon-512x512.png`);
  execSync(`convert "${srcImg}" -resize 512x512 public/favicon.png`);

  // Generate standard multi-platform favicon sizes
  console.log('Generating standard favicon sizes...');
  execSync(`convert "${srcImg}" -resize 192x192 public/favicon-192x192.png`);
  execSync(`convert "${srcImg}" -resize 180x180 public/apple-touch-icon.png`);
  execSync(`convert "${srcImg}" -resize 180x180 public/apple-touch-icon-180x180.png`);
  execSync(`convert "${srcImg}" -resize 144x144 public/favicon-144x144.png`);
  execSync(`convert "${srcImg}" -resize 96x96 public/favicon-96x96.png`);
  execSync(`convert "${srcImg}" -resize 48x48 public/favicon-48x48.png`);
  execSync(`convert "${srcImg}" -resize 32x32 public/favicon-32x32.png`);
  execSync(`convert "${srcImg}" -resize 16x16 public/favicon-16x16.png`);
  
  // Package multiple sizes into a single standard favicon.ico
  console.log('Packaging favicon.ico...');
  execSync('convert public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon.ico');
  
  // Also copy to root for legacy/direct favicon requests
  execSync('cp public/favicon.ico favicon.ico');
  execSync('cp public/favicon.png favicon.png');

  console.log('Favicon generation completed successfully!');
} catch (error) {
  console.error('Error during favicon generation:', error);
  process.exit(1);
}
