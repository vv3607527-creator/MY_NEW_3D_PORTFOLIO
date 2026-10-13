// Turns a .glb mesh into a compact point cloud the site can morph particles into.
//
//   node scripts/sample-glb.mjs <in.glb> <out.bin> [count=40000] [--preview out.png] [--crop-top 0.55]
//
// Output: Int16 xyz triplets, normalised so the largest half-extent is 32767.
// Points are sampled uniformly by surface area, so density follows the mesh
// rather than its triangulation. Only plain (non-Draco, non-meshopt) GLB is read.

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, ...rest] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node scripts/sample-glb.mjs <in.glb> <out.bin> [count] [--preview out.png] [--crop-top f]');
  process.exit(1);
}
let count = 40000, preview = null, cropTop = 0;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--preview') preview = rest[++i];
  else if (rest[i] === '--crop-top') cropTop = parseFloat(rest[++i]);
  else count = parseInt(rest[i], 10);
}

const buf = readFileSync(inPath);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file');
let off = 12, json = null, bin = null;
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  const chunk = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
  else if (type === 0x004e4942) bin = chunk;
  off += 8 + len;
}
if (!json || !bin) throw new Error('GLB is missing its JSON or BIN chunk');
const ext = [...(json.extensionsRequired || [])];
if (ext.some((e) => /draco|meshopt/i.test(e))) throw new Error(`compressed GLB not supported (${ext.join(', ')})`);

/* ── accessors ── */
const COMPONENTS = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readAccessor(index) {
  const acc = json.accessors[index];
  const view = json.bufferViews[acc.bufferView];
  const [, size] = COMPONENTS[acc.componentType];
  const width = WIDTH[acc.type];
  const stride = view.byteStride || size * width;
  const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float64Array(acc.count * width);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const get = {
    5120: (o) => dv.getInt8(o), 5121: (o) => dv.getUint8(o), 5122: (o) => dv.getInt16(o, true),
    5123: (o) => dv.getUint16(o, true), 5125: (o) => dv.getUint32(o, true), 5126: (o) => dv.getFloat32(o, true),
  }[acc.componentType];
  for (let i = 0; i < acc.count; i++) for (let c = 0; c < width; c++) out[i * width + c] = get(base + i * stride + c * size);
  return out;
}

/* ── node transforms (column-major 4×4) ── */
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function local(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

/* ── collect world-space triangles ── */
const tris = []; // flat: 9 numbers per triangle
function visit(index, parent) {
  const node = json.nodes[index];
  const world = mul(parent, local(node));
  if (node.mesh !== undefined) {
    for (const prim of json.meshes[node.mesh].primitives) {
      if ((prim.mode ?? 4) !== 4 || prim.attributes.POSITION === undefined) continue;
      const pos = readAccessor(prim.attributes.POSITION);
      const idx = prim.indices !== undefined ? readAccessor(prim.indices) : null;
      const n = idx ? idx.length : pos.length / 3;
      for (let i = 0; i < n; i++) {
        const v = (idx ? idx[i] : i) * 3;
        const x = pos[v], y = pos[v + 1], z = pos[v + 2];
        tris.push(world[0] * x + world[4] * y + world[8] * z + world[12], world[1] * x + world[5] * y + world[9] * z + world[13], world[2] * x + world[6] * y + world[10] * z + world[14]);
      }
    }
  }
  for (const child of node.children || []) visit(child, world);
}
const scene = json.scenes[json.scene ?? 0];
for (const root of scene.nodes) visit(root, IDENT);
const triCount = tris.length / 9;
if (!triCount) throw new Error('no triangles found');

/* ── bounds, optional crop to the top fraction of the model (for a head-and-shoulders bust) ── */
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < tris.length; i += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], tris[i + c]); max[c] = Math.max(max[c], tris[i + c]); }
const yCut = cropTop > 0 ? max[1] - (max[1] - min[1]) * cropTop : -Infinity;

/* ── area-weighted sampling ── */
const cdf = new Float64Array(triCount);
let total = 0;
for (let t = 0; t < triCount; t++) {
  const o = t * 9;
  const cy = (tris[o + 1] + tris[o + 4] + tris[o + 7]) / 3;
  let area = 0;
  if (cy >= yCut) {
    const ax = tris[o + 3] - tris[o], ay = tris[o + 4] - tris[o + 1], az = tris[o + 5] - tris[o + 2];
    const bx = tris[o + 6] - tris[o], by = tris[o + 7] - tris[o + 1], bz = tris[o + 8] - tris[o + 2];
    area = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  }
  total += area; cdf[t] = total;
}
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pts = new Float64Array(count * 3);
for (let i = 0; i < count; i++) {
  const r = rnd() * total;
  let lo = 0, hi = triCount - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
  const o = lo * 9;
  let u = rnd(), v = rnd();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  const w = 1 - u - v;
  for (let c = 0; c < 3; c++) pts[i * 3 + c] = tris[o + c] * w + tris[o + 3 + c] * u + tris[o + 6 + c] * v;
}

/* ── normalise to [-1, 1] on the largest axis, centred ── */
min = [Infinity, Infinity, Infinity]; max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < pts.length; i += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], pts[i + c]); max[c] = Math.max(max[c], pts[i + c]); }
const centre = min.map((m, c) => (m + max[c]) / 2);
const half = Math.max(...min.map((m, c) => (max[c] - m) / 2));
const out = new Int16Array(count * 3);
for (let i = 0; i < pts.length; i += 3) for (let c = 0; c < 3; c++) out[i + c] = Math.round(((pts[i + c] - centre[c]) / half) * 32767);
writeFileSync(outPath, Buffer.from(out.buffer));
console.log(`${inPath}: ${triCount} triangles -> ${count} points, extents ${min.map((m, c) => (max[c] - m).toFixed(2)).join(' × ')} -> ${outPath} (${(out.byteLength / 1024).toFixed(0)} KB)`);

/* ── optional front + side scatter preview, to check orientation by eye ── */
if (preview) {
  const { default: sharp } = await import('sharp');
  const S = 512, img = Buffer.alloc(S * 2 * S * 3, 8);
  const plot = (px, py, shade) => {
    if (px < 0 || py < 0 || px >= S * 2 || py >= S) return;
    const o = (py * S * 2 + px) * 3;
    img[o] = Math.min(255, img[o] + shade * 0.3); img[o + 1] = Math.min(255, img[o + 1] + shade * 0.8); img[o + 2] = Math.min(255, img[o + 2] + shade);
  };
  for (let i = 0; i < out.length; i += 3) {
    const x = out[i] / 32767, y = out[i + 1] / 32767, z = out[i + 2] / 32767;
    plot(Math.round((x * 0.46 + 0.5) * S), Math.round((0.5 - y * 0.46) * S), 60 + 50 * (z + 1));   // front (looking down -Z)
    plot(S + Math.round((z * 0.46 + 0.5) * S), Math.round((0.5 - y * 0.46) * S), 90);               // side  (looking down -X)
  }
  await sharp(img, { raw: { width: S * 2, height: S, channels: 3 } }).png().toFile(preview);
  console.log(`preview -> ${preview}  (left: front view, right: side view)`);
}
