import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const imgDir = join(process.cwd(), 'public', 'assets', 'img');
const screenDir = join(process.cwd(), 'public', 'assets', 'screenshots');
if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
if (!existsSync(screenDir)) mkdirSync(screenDir, { recursive: true });

// Generate SVG based WebP image
async function createSvgImage(svgStr, outPath, width, height) {
  await sharp(Buffer.from(svgStr))
    .resize(width, height)
    .webp({ quality: 85 })
    .toFile(outPath);
  console.log(`Created ${outPath}`);
}

// 1. Hero Human (Warm ember / amber silhouette portrait)
const humanSvg = `
<svg width="1480" height="1837" viewBox="0 0 1480 1837" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="hGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#ff7a2e" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#ff5a1f" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a1f1a"/>
      <stop offset="50%" stop-color="#181310"/>
      <stop offset="100%" stop-color="#0b0a09"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="none"/>
  <ellipse cx="740" cy="850" rx="450" ry="600" fill="url(#hGlow)"/>
  <!-- Head & Shoulders Silhouette -->
  <path d="M 520 1837 C 520 1450, 560 1200, 590 1080 C 560 1020, 550 940, 570 820 C 600 660, 680 560, 740 560 C 800 560, 880 660, 910 820 C 930 940, 920 1020, 890 1080 C 920 1200, 960 1450, 960 1837 Z" fill="url(#bodyGrad)"/>
  <!-- Head -->
  <ellipse cx="740" cy="740" rx="150" ry="190" fill="#241a15"/>
  <!-- Shoulders contour -->
  <path d="M 340 1837 C 360 1350, 480 1150, 620 1050 L 860 1050 C 1000 1150, 1120 1350, 1140 1837 Z" fill="url(#bodyGrad)"/>
  <!-- Collar / chest line -->
  <path d="M 670 1050 L 740 1200 L 810 1050" fill="none" stroke="#ff7a2e" stroke-width="3" stroke-opacity="0.5"/>
</svg>
`;

// 2. Hero Machine (Cyan tech / augmented cybernetic suit silhouette)
const machineSvg = `
<svg width="1480" height="1837" viewBox="0 0 1480 1837" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="mGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#45e6ff" stop-opacity="0.45"/>
      <stop offset="60%" stop-color="#0aa5c9" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="armorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#14222b"/>
      <stop offset="50%" stop-color="#0b1318"/>
      <stop offset="100%" stop-color="#05090c"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="none"/>
  <ellipse cx="740" cy="850" rx="450" ry="600" fill="url(#mGlow)"/>
  <!-- Cyber Shoulders -->
  <path d="M 340 1837 C 360 1350, 480 1150, 620 1050 L 860 1050 C 1000 1150, 1120 1350, 1140 1837 Z" fill="url(#armorGrad)"/>
  <!-- Tech plates -->
  <polygon points="560,1180 640,1140 640,1380 560,1340" fill="#1b2e3a" stroke="#45e6ff" stroke-width="2" stroke-opacity="0.8"/>
  <polygon points="920,1180 840,1140 840,1380 920,1340" fill="#1b2e3a" stroke="#45e6ff" stroke-width="2" stroke-opacity="0.8"/>
  <polygon points="680,1120 740,1080 800,1120 740,1320" fill="#0d1b22" stroke="#45e6ff" stroke-width="3" stroke-opacity="0.9"/>
  <!-- Head & Visor -->
  <ellipse cx="740" cy="740" rx="150" ry="190" fill="#111d24"/>
  <path d="M 640 730 Q 740 700 840 730 L 830 760 Q 740 740 650 760 Z" fill="#45e6ff" filter="drop-shadow(0 0 12px #45e6ff)"/>
  <!-- Neon Circuit Lines -->
  <path d="M 450 1400 L 520 1300 L 520 1180 L 610 1100" fill="none" stroke="#45e6ff" stroke-width="3" stroke-opacity="0.7"/>
  <path d="M 1030 1400 L 960 1300 L 960 1180 L 870 1100" fill="none" stroke="#45e6ff" stroke-width="3" stroke-opacity="0.7"/>
  <circle cx="520" cy="1180" r="5" fill="#45e6ff"/>
  <circle cx="960" cy="1180" r="5" fill="#45e6ff"/>
</svg>
`;

// 3. Role cards
const createRoleSvg = (title, accent, iconPath) => `
<svg width="1100" height="1366" viewBox="0 0 1100 1366" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#05060a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#rGrad)"/>
  <rect x="50" y="50" width="1000" height="1266" rx="30" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>
  <g transform="translate(550, 600) scale(4)" stroke="${accent}" fill="none" stroke-width="2">
    ${iconPath}
  </g>
  <text x="550" y="850" font-family="'Big Shoulders Display', sans-serif" font-size="72" font-weight="900" fill="#f4f1ea" text-anchor="middle" letter-spacing="2">${title.toUpperCase()}</text>
  <text x="550" y="900" font-family="'Geist Mono Variable', monospace" font-size="20" fill="${accent}" text-anchor="middle" letter-spacing="4">VENKATESH // CRAFT</text>
</svg>
`;

// 4. Project screenshot
const createScreenSvg = (title, url, accent) => `
<svg width="720" height="1560" viewBox="0 0 720 1560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#12131d"/>
      <stop offset="100%" stop-color="#07080d"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#scGrad)" rx="48"/>
  <rect x="24" y="24" width="672" height="1512" rx="36" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.4"/>
  <circle cx="360" cy="70" r="14" fill="#1e202c"/>
  <rect x="80" y="160" width="220" height="12" rx="6" fill="${accent}" fill-opacity="0.8"/>
  <rect x="80" y="200" width="560" height="80" rx="12" fill="#1b1c28"/>
  <rect x="80" y="320" width="560" height="340" rx="20" fill="#151622" stroke="${accent}" stroke-width="1" stroke-opacity="0.2"/>
  <circle cx="360" cy="490" r="70" fill="none" stroke="${accent}" stroke-width="3"/>
  <text x="360" y="920" font-family="'Big Shoulders Display', sans-serif" font-size="54" font-weight="900" fill="#f4f1ea" text-anchor="middle">${title.toUpperCase()}</text>
  <text x="360" y="980" font-family="'Geist Mono Variable', monospace" font-size="18" fill="${accent}" text-anchor="middle">${url}</text>
  <rect x="180" y="1040" width="360" height="54" rx="27" fill="${accent}"/>
  <text x="360" y="1075" font-family="'Geist Mono Variable', monospace" font-size="18" font-weight="bold" fill="#05060a" text-anchor="middle">EXPLORE EXPERIENCE</text>
</svg>
`;

async function main() {
  // Hero portraits (1480x1837 and 860x1068)
  await createSvgImage(humanSvg, join(imgDir, 'hero-human.webp'), 1480, 1837);
  await createSvgImage(humanSvg, join(imgDir, 'hero-human-sm.webp'), 860, 1068);
  await createSvgImage(machineSvg, join(imgDir, 'hero-machine.webp'), 1480, 1837);
  await createSvgImage(machineSvg, join(imgDir, 'hero-machine-sm.webp'), 860, 1068);

  // Role images
  await createSvgImage(createRoleSvg('Web Design', '#ff5a1f', '<rect x="-24" y="-24" width="48" height="48" rx="6"/><circle cx="0" cy="0" r="14"/><line x1="-24" y1="-8" x2="24" y2="-8"/>'), join(imgDir, 'role-design.webp'), 1100, 1366);
  await createSvgImage(createRoleSvg('AI Building', '#45e6ff', '<circle cx="0" cy="0" r="22"/><circle cx="0" cy="0" r="10" fill="#45e6ff"/><line x1="-30" y1="0" x2="30" y2="0"/><line x1="0" y1="-30" x2="0" y2="30"/>'), join(imgDir, 'role-agents.webp'), 1100, 1366);
  await createSvgImage(createRoleSvg('3D and Motion', '#8f7bff', '<polygon points="0,-26 24,16 -24,16"/><circle cx="0" cy="3" r="8"/>'), join(imgDir, 'role-data.webp'), 1100, 1366);

  // Screenshots for drone website
  await createSvgImage(createScreenSvg('3D Drone Experience', 'venky-drone-website.vercel.app', '#7dffb0'), join(screenDir, 'drone-1.webp'), 720, 1560);
  await createSvgImage(createScreenSvg('Cinematic View', 'venky-drone-website.vercel.app', '#45e6ff'), join(screenDir, 'drone-2.webp'), 720, 1560);
  await createSvgImage(createScreenSvg('Propulsion and Controls', 'venky-drone-website.vercel.app', '#ff5a1f'), join(screenDir, 'drone-3.webp'), 720, 1560);

  console.log('All image assets created successfully!');
}

main().catch(console.error);
