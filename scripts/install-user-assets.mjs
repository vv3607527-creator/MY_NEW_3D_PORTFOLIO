import sharp from 'sharp';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const srcImg = 'c:/Users/venkatesh/temp_img.jpg';
const srcVideo = 'c:/Users/venkatesh/temp_video.mp4';
const srcFrame = 'c:/Users/venkatesh/video_frame.jpg';

const targetImgDir = join(process.cwd(), 'public', 'assets', 'img');
const targetVideoDir = join(process.cwd(), 'public', 'assets', 'video');

if (!existsSync(targetImgDir)) mkdirSync(targetImgDir, { recursive: true });
if (!existsSync(targetVideoDir)) mkdirSync(targetVideoDir, { recursive: true });

async function processAll() {
  console.log('--- 1. Hero Portraits (Human & Machine) ---');
  // Crop coordinates determined from divider analysis:
  // Col 1 (Human): left 6, top 0, width 672, height 1536
  // Col 2 (Machine): left 696, top 0, width 672, height 1536
  // Target width 1480 for desktop, 860 for mobile

  const humanRaw = await sharp(srcImg)
    .extract({ left: 6, top: 0, width: 672, height: 1536 })
    .toBuffer();

  const machineRaw = await sharp(srcImg)
    .extract({ left: 696, top: 0, width: 672, height: 1536 })
    .toBuffer();

  const H_RATIO = 1536 / 672; // ~2.2857
  const desktopH = Math.round(1480 * H_RATIO);
  const mobileH = Math.round(860 * H_RATIO);

  // Desktop WebP
  await sharp(humanRaw)
    .resize(1480, desktopH)
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(join(targetImgDir, 'hero-human.webp'));
  console.log(`Saved hero-human.webp (1480x${desktopH})`);

  await sharp(machineRaw)
    .resize(1480, desktopH)
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(join(targetImgDir, 'hero-machine.webp'));
  console.log(`Saved hero-machine.webp (1480x${desktopH})`);

  // Mobile WebP
  await sharp(humanRaw)
    .resize(860, mobileH)
    .webp({ quality: 84, alphaQuality: 88 })
    .toFile(join(targetImgDir, 'hero-human-sm.webp'));
  console.log(`Saved hero-human-sm.webp (860x${mobileH})`);

  await sharp(machineRaw)
    .resize(860, mobileH)
    .webp({ quality: 84, alphaQuality: 88 })
    .toFile(join(targetImgDir, 'hero-machine-sm.webp'));
  console.log(`Saved hero-machine-sm.webp (860x${mobileH})`);

  console.log('\n--- 2. Craft / Role Images ---');
  // Role Design: left 1383, top 0, width 672, height 760
  await sharp(srcImg)
    .extract({ left: 1383, top: 0, width: 672, height: 760 })
    .resize(1100)
    .webp({ quality: 85 })
    .toFile(join(targetImgDir, 'role-design.webp'));
  console.log('Saved role-design.webp');

  // Role Agents: left 2070, top 0, width 680, height 760
  await sharp(srcImg)
    .extract({ left: 2070, top: 0, width: 680, height: 760 })
    .resize(1100)
    .webp({ quality: 85 })
    .toFile(join(targetImgDir, 'role-agents.webp'));
  console.log('Saved role-agents.webp');

  // Role Data: left 1383, top 774, width 1367, height 760
  await sharp(srcImg)
    .extract({ left: 1383, top: 774, width: 1367, height: 760 })
    .resize(1100)
    .webp({ quality: 85 })
    .toFile(join(targetImgDir, 'role-data.webp'));
  console.log('Saved role-data.webp');

  console.log('\n--- 3. Video & Poster ---');
  const targetVideo = join(targetVideoDir, 'agents-loop.mp4');
  copyFileSync(srcVideo, targetVideo);
  console.log(`Copied agents-loop.mp4 (${(srcVideo.length / 1024).toFixed(0)} KB)`);

  // Video poster
  await sharp(srcFrame)
    .resize(1080)
    .jpeg({ quality: 85 })
    .toFile(join(targetVideoDir, 'agents-poster.jpg'));
  console.log('Saved agents-poster.jpg');

  console.log('\n🎉 ALL REAL USER ASSETS PROCESSED AND INSTALLED!');
}

processAll().catch(console.error);
