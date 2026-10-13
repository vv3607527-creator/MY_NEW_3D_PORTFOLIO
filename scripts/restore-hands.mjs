import { readFileSync } from 'node:fs';
import sharp from 'sharp';

async function restoreArmAndHand() {
  const compBuf = readFileSync('Generating_image_prompts_for_web…_2K_20261013202546.jpg');

  // ==========================================
  // 1. HERO HUMAN
  // ==========================================
  // Crop col 1: left 0 to 684 (full width up to divider at 684)
  const humanCrop = await sharp(compBuf)
    .extract({ left: 0, top: 0, width: 684, height: 1536 })
    .toBuffer();

  const humanRaw = await sharp(humanCrop).raw().toBuffer({ resolveWithObject: true });
  const humanWebp = await sharp(readFileSync('public/assets/img/hero-human.webp'))
    .resize(684, 1536)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hOut = Buffer.alloc(684 * 1536 * 4);

  for (let y = 0; y < 1536; y++) {
    for (let x = 0; x < 684; x++) {
      const srcIdx = (y * 684 + x) * 3;
      const outIdx = (y * 684 + x) * 4;

      const r = humanRaw.data[srcIdx];
      const g = humanRaw.data[srcIdx + 1];
      const b = humanRaw.data[srcIdx + 2];
      let a = humanWebp.data[outIdx + 3];

      // Restore left arm & hand:
      // On viewer's right (x >= 400), for y >= 750 (from shoulder down to bottom):
      // The person's sleeve, jacket, and hand are present wherever pixel is not pure background.
      // Notice the hand at y >= 1350, x >= 550 has warm skin/jacket tones.
      if (y >= 750 && x >= 380) {
        // As long as it's not the top background gradient (which is y < 750 anyway),
        // any pixel on the right below shoulder belongs to his left arm / torso / hand!
        if (r > 3 || g > 3 || b > 3) {
          a = 255;
        }
      }

      // Also restore viewer's left arm/jacket (x <= 300, y >= 750):
      // Keep outer background transparent:
      // His right arm starts around x=10 at y=1300..1536
      if (y >= 850 && x < 380) {
        // If rembg kept it, or if it's clearly part of the jacket/sleeve
        if (a > 30) a = 255;
      }

      // Soft feather at outer boundary of restored hand
      hOut[outIdx] = r;
      hOut[outIdx + 1] = g;
      hOut[outIdx + 2] = b;
      hOut[outIdx + 3] = a;
    }
  }

  // ==========================================
  // 2. HERO MACHINE
  // ==========================================
  // Crop col 2: left 694 to 1370 (width 676, height 1536)
  const machineCrop = await sharp(compBuf)
    .extract({ left: 694, top: 0, width: 676, height: 1536 })
    .toBuffer();

  const machineRaw = await sharp(machineCrop).raw().toBuffer({ resolveWithObject: true });
  const machineWebp = await sharp(readFileSync('public/assets/img/hero-machine.webp'))
    .resize(676, 1536)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mOut = Buffer.alloc(676 * 1536 * 4);

  for (let y = 0; y < 1536; y++) {
    for (let x = 0; x < 676; x++) {
      const srcIdx = (y * 676 + x) * 3;
      const outIdx = (y * 676 + x) * 4;

      const r = machineRaw.data[srcIdx];
      const g = machineRaw.data[srcIdx + 1];
      const b = machineRaw.data[srcIdx + 2];
      let a = machineWebp.data[outIdx + 3];

      // Restore machine left arm & hand:
      // On viewer's right (x >= 400), for y >= 700:
      // The armor bicep, elbow, forearm, wrist, and hand are all present!
      if (y >= 700 && x >= 420) {
        // His left arm occupies this area down to bottom
        if (r > 3 || g > 3 || b > 3) {
          a = 255;
        }
      }

      // Also restore viewer's right arm (x <= 300, y >= 750)
      if (y >= 750 && x < 420) {
        if (a > 30) a = 255;
      }

      mOut[outIdx] = r;
      mOut[outIdx + 1] = g;
      mOut[outIdx + 2] = b;
      mOut[outIdx + 3] = a;
    }
  }

  // Target dimensions: both MUST have identical dimensions for pixel alignment!
  // Use 1480 width
  const W_DESK = 1480;
  const H_DESK = 3326; // 1480 * 1536 / 684
  const W_MOB = 860;
  const H_MOB = 1932;

  // Save Human
  await sharp(hOut, { raw: { width: 684, height: 1536, channels: 4 } })
    .resize(W_DESK, H_DESK)
    .webp({ quality: 90, alphaQuality: 92 })
    .toFile('public/assets/img/hero-human.webp');

  await sharp(hOut, { raw: { width: 684, height: 1536, channels: 4 } })
    .resize(W_MOB, H_MOB)
    .webp({ quality: 85, alphaQuality: 88 })
    .toFile('public/assets/img/hero-human-sm.webp');

  // Save Machine
  await sharp(mOut, { raw: { width: 676, height: 1536, channels: 4 } })
    .resize(W_DESK, H_DESK)
    .webp({ quality: 90, alphaQuality: 92 })
    .toFile('public/assets/img/hero-machine.webp');

  await sharp(mOut, { raw: { width: 676, height: 1536, channels: 4 } })
    .resize(W_MOB, H_MOB)
    .webp({ quality: 85, alphaQuality: 88 })
    .toFile('public/assets/img/hero-machine-sm.webp');

  console.log('Restored both arms and hands for both portraits!');
}

restoreArmAndHand().catch(console.error);
