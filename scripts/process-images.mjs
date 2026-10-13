// Converts the raw portrait PNGs into the WebP files the site ships.
//   node scripts/process-images.mjs <dir-with-raw-pngs>
// Expects: front_cut.png, back_cut.png (RGBA cutouts), role_design.png, role_agents2.png, role_data.png
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/process-images.mjs <raw-dir>'); process.exit(1); }
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'img');

const jobs = [
  // hero layers: alpha kept, both resized identically so they stay pixel-aligned
  { in: 'front_cut.png', out: 'hero-human.webp', width: 1480, opts: { quality: 86, alphaQuality: 92 } },
  { in: 'back_cut.png', out: 'hero-machine.webp', width: 1480, opts: { quality: 86, alphaQuality: 92 } },
  { in: 'front_cut.png', out: 'hero-human-sm.webp', width: 860, opts: { quality: 82, alphaQuality: 88 } },
  { in: 'back_cut.png', out: 'hero-machine-sm.webp', width: 860, opts: { quality: 82, alphaQuality: 88 } },
  { in: 'role_design.png', out: 'role-design.webp', width: 1100, opts: { quality: 82 } },
  { in: 'role_agents2.png', out: 'role-agents.webp', width: 1100, opts: { quality: 82 } },
  { in: 'role_data.png', out: 'role-data.webp', width: 1100, opts: { quality: 82 } },
];

for (const job of jobs) {
  const file = join(src, job.in);
  if (!existsSync(file)) { console.warn(`skip  ${job.in} (not found)`); continue; }
  const info = await sharp(file).resize({ width: job.width }).webp(job.opts).toFile(join(out, job.out));
  console.log(`${job.in.padEnd(18)} -> ${job.out.padEnd(22)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
