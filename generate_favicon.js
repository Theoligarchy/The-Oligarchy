import { execSync } from 'child_process';
import fs from 'fs';

try {
  console.log('Generating high-resolution "The Oligarchy" logo...');

  // Setup directories
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }

  // Define ImageMagick drawing elements
  const width = 512;
  const height = 512;
  const fontPath = 'UnifrakturMaguntia.ttf';

  // We build a single powerful ImageMagick command to render the complete logo.
  // It has:
  // - Pitch black background
  // - Background subtle gothic circle (with opacity)
  // - Top gothic cross/spear
  // - "THE" text
  // - "OLIGARCHY" text
  // - Bottom dagger/spear with horizontal crossguard
  // - Left & Right ornamental side spikes with diamond stars
  const cmd = `convert -size ${width}x${height} xc:black \\
    -font "${fontPath}" -fill white \\
    \\
    -draw "stroke rgba(255,255,255,0.06) stroke-width 1 fill none circle 256,256 256,30" \\
    -draw "stroke rgba(255,255,255,0.04) stroke-width 0.5 fill none circle 256,256 256,45" \\
    \\
    -draw "stroke white stroke-width 2 line 256,40 256,110" \\
    -draw "stroke white stroke-width 1.5 line 235,75 277,75" \\
    -draw "stroke none fill white polygon 256,35 251,50 261,50" \\
    -draw "stroke none fill white polygon 230,75 240,71 240,79" \\
    -draw "stroke none fill white polygon 282,75 272,71 272,79" \\
    \\
    -pointsize 26 -gravity center -draw "text 0,-115 'THE'" \\
    -pointsize 54 -gravity center -draw "text 0,0 'OLIGARCHY'" \\
    \\
    -draw "stroke white stroke-width 2 line 256,355 256,475" \\
    -draw "stroke white stroke-width 1.5 line 170,365 342,365" \\
    -draw "stroke none fill white polygon 256,482 250,467 262,467" \\
    -draw "stroke none fill white polygon 162,365 174,360 174,370" \\
    -draw "stroke none fill white polygon 350,365 338,360 338,370" \\
    \\
    -draw "stroke white stroke-width 1 line 50,256 100,256" \\
    -draw "stroke none fill white polygon 42,256 52,252 52,260" \\
    -draw "stroke white stroke-width 1 line 412,256 462,256" \\
    -draw "stroke none fill white polygon 470,256 460,252 460,260" \\
    \\
    public/logo_highres.png`;

  execSync(cmd);
  console.log('Successfully generated public/logo_highres.png!');

  // Now, create the various favicon sizes from the high-res image
  console.log('Generating standard favicon sizes...');
  execSync('convert public/logo_highres.png -resize 16x16 public/favicon-16x16.png');
  execSync('convert public/logo_highres.png -resize 32x32 public/favicon-32x32.png');
  execSync('convert public/logo_highres.png -resize 180x180 public/apple-touch-icon.png');
  
  // Package multiple sizes into a single standard favicon.ico
  console.log('Packaging favicon.ico...');
  execSync('convert public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico');
  
  // Also save a standard favicon.png
  execSync('cp public/logo_highres.png public/favicon.png');

  console.log('Favicon generation completed successfully!');
} catch (error) {
  console.error('Error during favicon generation:', error);
  process.exit(1);
}
