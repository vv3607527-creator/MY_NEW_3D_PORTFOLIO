# Venkatesh — 3D WebGL Portfolio

A scroll-driven WebGL portfolio built with Three.js, GSAP and Lenis. One renderer, three passes a frame: pointer trail, hero/backdrop composite, and particles.

## Quick Start

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Build

```bash
npm run build
npm run preview
```

The built `dist/` works from any sub-path (relative base).

## Asset Checklist

The site works immediately with procedural fallbacks. To get the full experience, add:

### Hero portraits (pixel-aligned pair)
Put two portrait images of yourself in `public/assets/img/`:
- `hero-human.webp` + `hero-human-sm.webp` — normal you
- `hero-machine.webp` + `hero-machine-sm.webp` — "augmented" you (same pose/frame!)

Use the script:
```bash
node scripts/process-images.mjs <folder-with-raw-pngs>
```

### Craft/role images
- `public/assets/img/role-design.webp`
- `public/assets/img/role-agents.webp`
- `public/assets/img/role-data.webp`

### Project screenshots
Add screenshots to `public/assets/screenshots/`:
- `drone-1.webp`, `drone-2.webp`, `drone-3.webp`

### Video (card 3)
- `public/assets/video/agents-loop.mp4`
- `public/assets/video/agents-poster.jpg`

### 3D point clouds (optional — fallbacks are already built-in)
```bash
node scripts/sample-glb.mjs android.glb public/assets/geo/android.bin 42000 --preview check.png
node scripts/sample-glb.mjs bust.glb    public/assets/geo/bust.bin    44000 --preview check.png
```

### Logo ring (optional)
Drop SVG/PNG files into `public/assets/logos/` if any RING entries in `src/content.js` use `file:` references.

## Your Details

All personal info is in two places:
- **`index.html`** — static HTML (name, meta tags, contact links)
- **`src/content.js`** — copy rendered from JS (SITE, MODES, CRAFT, RING, STACK_GROUPS)

## Debug

Add `?debug` to the URL to get `window.__stage` and `window.__ScrollTrigger` in the console.

## Contacts
- Email: venkeypro456@gmail.com
- LinkedIn: https://www.linkedin.com/in/venky-venkatesh-726172415
- Instagram: https://instagram.com/mrvenky60
- X: https://x.com/VENKY5789
