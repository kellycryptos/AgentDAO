const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Vector SVG definition for AgentDAO Logo
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
  </defs>
  <!-- Background rounded rectangle -->
  <rect width="200" height="200" rx="44" fill="url(#logo-bg)"/>
  
  <!-- Connecting lines from center (100,100) to 4 nodes -->
  <line x1="100" y1="100" x2="65" y2="65" stroke="#E9D5FF" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  <line x1="100" y1="100" x2="135" y2="65" stroke="#E9D5FF" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  <line x1="100" y1="100" x2="65" y2="135" stroke="#E9D5FF" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
  <line x1="100" y1="100" x2="135" y2="135" stroke="#E9D5FF" stroke-width="8" stroke-linecap="round" opacity="0.85"/>

  <!-- Top-left node circle -->
  <circle cx="65" cy="65" r="14" fill="#FFFFFF"/>
  <!-- Top-right node circle -->
  <circle cx="135" cy="65" r="14" fill="#FFFFFF"/>
  <!-- Bottom-left node circle -->
  <circle cx="65" cy="135" r="14" fill="#FFFFFF"/>

  <!-- Center Sparkle / 4-pointed Star -->
  <path d="M 100,60 Q 100,100 60,100 Q 100,100 100,140 Q 100,100 140,100 Q 100,100 100,60 Z" fill="#FFFFFF"/>

  <!-- Bottom-right mint checkmark node circle -->
  <circle cx="135" cy="135" r="15" fill="#00E5C7"/>
  <!-- Black checkmark inside mint circle -->
  <path d="M 127,135 L 133,141 L 143,129" fill="none" stroke="#090D16" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// 2. OpenGraph Image SVG (1200x630)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="og-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F0D24"/>
      <stop offset="50%" stop-color="#1B1647"/>
      <stop offset="100%" stop-color="#0A0818"/>
    </linearGradient>
    <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#6D28D9"/>
    </linearGradient>
  </defs>
  
  <!-- Backdrop -->
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  
  <!-- Decorative Glow Circles -->
  <circle cx="600" cy="220" r="300" fill="#7B4FF2" opacity="0.18" filter="blur(80px)"/>
  <circle cx="900" cy="450" r="250" fill="#00E5C7" opacity="0.12" filter="blur(80px)"/>
  
  <!-- Centered Logo Group (shifted to x=510, y=100 for 180x180 logo) -->
  <g transform="translate(510, 80)">
    <rect width="180" height="180" rx="40" fill="url(#logo-bg)"/>
    <line x1="90" y1="90" x2="58" y2="58" stroke="#E9D5FF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
    <line x1="90" y1="90" x2="122" y2="58" stroke="#E9D5FF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
    <line x1="90" y1="90" x2="58" y2="122" stroke="#E9D5FF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
    <line x1="90" y1="90" x2="122" y2="122" stroke="#E9D5FF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>

    <circle cx="58" cy="58" r="13" fill="#FFFFFF"/>
    <circle cx="122" cy="58" r="13" fill="#FFFFFF"/>
    <circle cx="58" cy="122" r="13" fill="#FFFFFF"/>

    <path d="M 90,54 Q 90,90 54,90 Q 90,90 90,126 Q 90,90 126,90 Q 90,90 90,54 Z" fill="#FFFFFF"/>
    <circle cx="122" cy="122" r="14" fill="#00E5C7"/>
    <path d="M 115,122 L 120,127 L 129,117" fill="none" stroke="#090D16" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  
  <!-- Main Title -->
  <text x="600" y="330" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="58" letter-spacing="-1">AgentDAO</text>
  
  <!-- Tagline -->
  <text x="600" y="390" text-anchor="middle" fill="#00E5C7" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="26">AI Governance Assistant on GIWA Sepolia</text>

  <!-- Sub-description -->
  <text x="600" y="440" text-anchor="middle" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="20">Turn natural language ideas into structured onchain proposals &amp; votes</text>
  
  <!-- Bottom Pill Badge -->
  <rect x="470" y="490" width="260" height="42" rx="21" fill="#7B4FF2" fill-opacity="0.2" stroke="#7B4FF2" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="600" y="517" text-anchor="middle" fill="#C084FC" font-family="monospace" font-weight="700" font-size="15" letter-spacing="1">GIWA SEPOLIA TESTNET</text>
</svg>`;

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), logoSvg, 'utf8');
  console.log('Saved logo.svg');

  const logoBuffer = Buffer.from(logoSvg);

  // Generate PNGs
  await sharp(logoBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  console.log('Generated favicon-32.png');

  await sharp(logoBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'favicon-64.png'));
  console.log('Generated favicon-64.png');

  await sharp(logoBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  const ogBuffer = Buffer.from(ogSvg);
  await sharp(ogBuffer).resize(1200, 630).png().toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png');
}

main().catch(console.error);
