// Splits the composite image into individual portraits and processes them
// into all the assets the portfolio needs.
import sharp from 'sharp';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const src = 'c:/Users/venkatesh/temp_img.jpg';
const imgDir = 'c:/Users/venkatesh/temp_output';
if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

const meta = await sharp(src).metadata();
console.log(`Source: ${meta.width}x${meta.height}`);

// The composite is laid out as a grid:
// Row 1: [human portrait] [machine portrait] [role-design] [role-agents]
// Row 2:                                     [    role-data (wide)     ]
// 
// Approximate proportions from the image:
const W = meta.width;   // full width
const H = meta.height;  // full height

// Row 1 takes roughly top 55% of height
const row1H = Math.round(H * 0.55);
// Row 2 takes bottom 45%
const row2Top = row1H;
const row2H = H - row1H;

// Row 1 has 4 columns. The first two are larger (hero portraits), 
// the next two are smaller (role cards)
// Approximate column splits: ~25%, ~25%, ~25%, ~25% 
// But looking closer at the image, human is ~25%, machine is ~27%, 
// design is ~24%, agents is ~24%
const col1W = Math.round(W * 0.245);  // human
const col2W = Math.round(W * 0.27);   // machine  
const col3W = Math.round(W * 0.245);  // design
const col4W = W - col1W - col2W - col3W; // agents

// Row 2: role-data spans the right half
const row2Left = Math.round(W * 0.5);
const row2Width = W - row2Left;

const crops = [
  // Hero portraits - need to be cropped as tall portraits
  { name: 'hero-human-raw.png', left: 0, top: 0, width: col1W, height: row1H },
  { name: 'hero-machine-raw.png', left: col1W, top: 0, width: col2W, height: row1H },
  // Role images  
  { name: 'role-design-raw.png', left: col1W + col2W, top: 0, width: col3W, height: row1H },
  { name: 'role-agents-raw.png', left: col1W + col2W + col3W, top: 0, width: col4W, height: row1H },
  { name: 'role-data-raw.png', left: row2Left, top: row2Top, width: row2Width, height: row2H },
];

for (const crop of crops) {
  const outPath = join(imgDir, crop.name);
  await sharp(src)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .toFile(outPath);
  console.log(`Cropped: ${crop.name} (${crop.width}x${crop.height})`);
}

// Now process into final assets
const finalDir = 'c:/Users/venkatesh/temp_output';

// Hero portraits - resize both to same dimensions for pixel alignment
const heroW = 1480;
for (const [src2, out] of [
  ['hero-human-raw.png', 'hero-human.webp'],
  ['hero-machine-raw.png', 'hero-machine.webp'],
]) {
  const m = await sharp(join(finalDir, src2)).metadata();
  const aspect = m.width / m.height;
  const h = Math.round(heroW / aspect);
  await sharp(join(finalDir, src2))
    .resize(heroW, h)
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(join(finalDir, out));
  console.log(`Hero: ${out} (${heroW}x${h})`);
}

const heroSmW = 860;
for (const [src2, out] of [
  ['hero-human-raw.png', 'hero-human-sm.webp'],
  ['hero-machine-raw.png', 'hero-machine-sm.webp'],
]) {
  const m = await sharp(join(finalDir, src2)).metadata();
  const aspect = m.width / m.height;
  const h = Math.round(heroSmW / aspect);
  await sharp(join(finalDir, src2))
    .resize(heroSmW, h)
    .webp({ quality: 84, alphaQuality: 88 })
    .toFile(join(finalDir, out));
  console.log(`Hero small: ${out} (${heroSmW}x${h})`);
}

// Role images - resize to 1100 wide
for (const [src2, out] of [
  ['role-design-raw.png', 'role-design.webp'],
  ['role-agents-raw.png', 'role-agents.webp'],
  ['role-data-raw.png', 'role-data.webp'],
]) {
  await sharp(join(finalDir, src2))
    .resize(1100)
    .webp({ quality: 84 })
    .toFile(join(finalDir, out));
  const m = await sharp(join(finalDir, out)).metadata();
  console.log(`Role: ${out} (${m.width}x${m.height})`);
}

console.log('\n✅ All crops done! Files in:', finalDir);
