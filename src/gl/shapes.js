/* Particle targets. Every generator returns a Float32Array of n xyz triplets,
   sized to sit roughly inside a radius of 1.2 world units. */

const TAU = Math.PI * 2;

/** Small seeded PRNG so every shape is identical between loads. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() + r() - 2) / 2;

/** Loads a point cloud written by scripts/sample-glb.mjs. `yaw` re-orients it about Y (radians). */
export async function loadPoints(url, { yaw = 0 } = {}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  // Dev servers and SPA hosts answer a missing file with index.html and a 200. Parsing that as points
  // yields NaNs, and one NaN target blanks every particle (NaN × 0 is still NaN in the shader's blend).
  if (/text\/html/i.test(res.headers.get('content-type') || '')) throw new Error(`${url}: not a point file`);
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength % 6 !== 0) throw new Error(`${url}: not a point file`);
  const raw = new Int16Array(bytes);
  const out = new Float32Array(raw.length);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i < raw.length; i += 3) {
    const x = raw[i] / 32767, y = raw[i + 1] / 32767, z = raw[i + 2] / 32767;
    out[i] = x * c + z * s;
    out[i + 1] = y;
    out[i + 2] = -x * s + z * c;
  }
  return out;
}

/** Fits a loaded cloud of any length onto n particles, scaled and offset. */
function fromCloud(cloud, n, r, { scale = 1, y = 0 } = {}) {
  const out = new Float32Array(n * 3);
  const count = Math.floor(cloud.length / 3);
  for (let i = 0; i < n; i++) {
    const j = (i % count) * 3;
    const jitter = i >= count ? 0.012 : 0;
    out[i * 3] = cloud[j] * scale + gauss(r) * jitter;
    out[i * 3 + 1] = cloud[j + 1] * scale + y + gauss(r) * jitter;
    out[i * 3 + 2] = cloud[j + 2] * scale + gauss(r) * jitter;
  }
  return out;
}

/** 0 · A three-armed spiral disc with a loose halo. Used as ambient drift. */
export function nebula(n) {
  const r = rng(11), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (r() < 0.2) {
      const u = r() * 2 - 1, th = r() * TAU, rad = 0.6 + Math.cbrt(r()) * 1.9, k = Math.sqrt(1 - u * u);
      x = k * Math.cos(th) * rad; y = u * rad * 0.6; z = k * Math.sin(th) * rad;
    } else {
      const t = Math.pow(r(), 0.55), rad = 0.12 + t * 1.9;
      const ang = ((i % 3) * TAU) / 3 + rad * 2.3 + gauss(r) * 0.55 * (1 - t * 0.45);
      x = Math.cos(ang) * rad; z = Math.sin(ang) * rad; y = gauss(r) * 0.16 * (1.5 - t);
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

/** 1 · Web design: four interface panels exploded in depth, drawn as dotted wireframes. */
export function interfacePanels(n) {
  const r = rng(23), out = new Float32Array(n * 3);
  const rect = (x, y, w, h) => ({ t: 'rect', x, y, w, h, wt: (w + h) * 2 * 1.5 });
  const fill = (x, y, w, h, d = 1) => ({ t: 'fill', x, y, w, h, wt: w * h * 9 * d });
  const seg = (x1, y1, x2, y2) => ({ t: 'seg', x1, y1, x2, y2, wt: Math.hypot(x2 - x1, y2 - y1) * 1.2 });
  const ring = (cx, cy, rad) => ({ t: 'ring', cx, cy, rad, wt: TAU * rad * 1.5 });
  // each panel: centre, size, and primitives in the panel's own 0..1 space
  const panels = [
    { c: [0.12, 0.06, -0.6], s: [2.0, 1.25], items: [
      rect(0, 0, 1, 1), seg(0, 0.9, 1, 0.9), ring(0.04, 0.95, 0.012), ring(0.08, 0.95, 0.012), ring(0.12, 0.95, 0.012),
      fill(0.06, 0.46, 0.88, 0.36, 0.55), rect(0.06, 0.46, 0.88, 0.36),
      rect(0.06, 0.08, 0.27, 0.3), rect(0.365, 0.08, 0.27, 0.3), rect(0.67, 0.08, 0.27, 0.3),
      fill(0.08, 0.2, 0.23, 0.16, 0.5), fill(0.385, 0.2, 0.23, 0.16, 0.5), fill(0.69, 0.2, 0.23, 0.16, 0.5),
    ] },
    { c: [-0.32, -0.1, -0.18], s: [1.45, 0.95], items: [
      rect(0, 0, 1, 1), seg(0, 0.88, 1, 0.88),
      rect(0.05, 0.47, 0.28, 0.34), rect(0.36, 0.47, 0.28, 0.34), rect(0.67, 0.47, 0.28, 0.34),
      rect(0.05, 0.08, 0.28, 0.34), rect(0.36, 0.08, 0.28, 0.34), rect(0.67, 0.08, 0.28, 0.34),
      seg(0.05, 0.47, 0.33, 0.81), seg(0.36, 0.08, 0.64, 0.42), fill(0.67, 0.47, 0.28, 0.34, 0.7),
    ] },
    { c: [0.72, -0.12, 0.22], s: [0.56, 1.12], items: [
      rect(0, 0, 1, 1), fill(0.1, 0.72, 0.8, 0.2, 0.9), ring(0.5, 0.955, 0.03),
      seg(0.1, 0.62, 0.9, 0.62), seg(0.1, 0.55, 0.7, 0.55), seg(0.1, 0.48, 0.8, 0.48),
      rect(0.1, 0.2, 0.37, 0.2), rect(0.53, 0.2, 0.37, 0.2), fill(0.1, 0.06, 0.8, 0.08, 1.2),
    ] },
    { c: [-0.55, 0.42, 0.58], s: [0.86, 0.52], items: [
      rect(0, 0, 1, 1), ring(0.22, 0.5, 0.3), ring(0.22, 0.5, 0.2),
      fill(0.5, 0.12, 0.08, 0.3, 1.4), fill(0.62, 0.12, 0.08, 0.52, 1.4), fill(0.74, 0.12, 0.08, 0.4, 1.4), fill(0.86, 0.12, 0.08, 0.7, 1.4),
      seg(0.5, 0.88, 0.94, 0.88),
    ] },
  ];
  const all = [];
  for (const p of panels) for (const it of p.items) all.push({ p, it, wt: it.wt * p.s[0] * (it.t === 'fill' ? p.s[1] : 1) });
  const total = all.reduce((a, b) => a + b.wt, 0);
  let acc = 0;
  for (const a of all) { acc += a.wt / total; a.end = acc; }
  for (let i = 0; i < n; i++) {
    const pick = r();
    const { p, it } = all.find((a) => pick <= a.end) || all[all.length - 1];
    let u, v;
    if (it.t === 'rect') {
      const per = r() * (it.w + it.h) * 2;
      if (per < it.w) { u = it.x + per; v = it.y; }
      else if (per < it.w + it.h) { u = it.x + it.w; v = it.y + per - it.w; }
      else if (per < it.w * 2 + it.h) { u = it.x + per - it.w - it.h; v = it.y + it.h; }
      else { u = it.x; v = it.y + per - it.w * 2 - it.h; }
    } else if (it.t === 'fill') {
      // snapped to a lattice so fills read as a dot matrix, not fog
      const g = 0.016;
      u = it.x + Math.round((r() * it.w) / g) * g; v = it.y + Math.round((r() * it.h) / (g * 1.6)) * g * 1.6;
    } else if (it.t === 'seg') {
      const t = r(); u = it.x1 + (it.x2 - it.x1) * t; v = it.y1 + (it.y2 - it.y1) * t;
    } else {
      const th = r() * TAU, asp = p.s[1] / p.s[0];
      u = it.cx + Math.cos(th) * it.rad * asp; v = it.cy + Math.sin(th) * it.rad;
    }
    out[i * 3] = p.c[0] + (u - 0.5) * p.s[0] + gauss(r) * 0.003;
    out[i * 3 + 1] = p.c[1] + (v - 0.5) * p.s[1] + gauss(r) * 0.003;
    out[i * 3 + 2] = p.c[2] + gauss(r) * 0.004;
  }
  return out;
}

/** 2 · AI agents: a head at the centre, tools in orbit, each wired back to it. */
export function agent(n, head) {
  const r = rng(37), out = new Float32Array(n * 3);
  const nHead = Math.floor(n * 0.62), nRing = Math.floor(n * 0.14), nNode = Math.floor(n * 0.14);
  const core = head ? fromCloud(head, nHead, r, { scale: 0.78, y: -0.02 }) : null;
  const orbits = [
    { rad: 1.22, tilt: [0.42, 0.1], nodes: [0.3, 2.5, 4.4] },
    { rad: 1.02, tilt: [-0.7, 0.55], nodes: [1.2, 3.9] },
    { rad: 1.38, tilt: [1.25, -0.3], nodes: [0.8, 3.4, 5.5] },
  ];
  const onOrbit = (o, th) => {
    let x = Math.cos(th) * o.rad, y = 0, z = Math.sin(th) * o.rad;
    const [tx, tz] = o.tilt;
    let c = Math.cos(tx), s = Math.sin(tx);
    [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(tz); s = Math.sin(tz);
    [x, y] = [x * c - y * s, x * s + y * c];
    return [x, y, z];
  };
  const nodes = orbits.flatMap((o) => o.nodes.map((th) => onOrbit(o, th)));
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < nHead) {
      if (core) { x = core[i * 3]; y = core[i * 3 + 1]; z = core[i * 3 + 2]; }
      else {
        const u = r() * 2 - 1, th = r() * TAU, k = Math.sqrt(1 - u * u);
        x = k * Math.cos(th) * 0.6; y = u * 0.6; z = k * Math.sin(th) * 0.6;
      }
    } else if (i < nHead + nRing) {
      [x, y, z] = onOrbit(orbits[i % orbits.length], r() * TAU);
    } else if (i < nHead + nRing + nNode) {
      const c = nodes[i % nodes.length];
      const u = r() * 2 - 1, th = r() * TAU, k = Math.sqrt(1 - u * u), rad = 0.085;
      x = c[0] + k * Math.cos(th) * rad; y = c[1] + u * rad; z = c[2] + k * Math.sin(th) * rad;
    } else {
      const c = nodes[i % nodes.length], t = 0.42 + r() * 0.58; // a thread from the head out to a node
      x = c[0] * t; y = c[1] * t; z = c[2] * t;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

/** 3 · Data engineering: source streams converge on a three-zone lake, then fan out to tables. */
export function pipeline(n) {
  const r = rng(53), out = new Float32Array(n * 3);
  const zones = [0.46, 0, -0.46];
  const ease = (t) => t * t * (3 - 2 * t);
  const nIn = Math.floor(n * 0.3), nLake = Math.floor(n * 0.44);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i < nIn) {
      const k = i % 9, t = r(), e = ease(t);
      const y0 = -0.95 + (k / 8) * 1.9, z0 = Math.sin(k * 2.1) * 0.55;
      x = -2.0 + t * 1.54; y = y0 + (zones[k % 3] - y0) * e + Math.sin(t * 9 + k) * 0.02; z = z0 * (1 - e);
      x += gauss(r) * 0.012; y += gauss(r) * 0.014; z += gauss(r) * 0.014;
    } else if (i < nIn + nLake) {
      const yc = zones[i % 3], rad = 0.46, h = 0.3, th = r() * TAU, pick = r();
      if (pick < 0.42) { x = Math.cos(th) * rad; z = Math.sin(th) * rad; y = yc + (r() < 0.5 ? h / 2 : -h / 2); }              // rims
      else if (pick < 0.8) { x = Math.cos(th) * rad; z = Math.sin(th) * rad; y = yc + (Math.round(r() * 6) / 6 - 0.5) * h; }  // banded wall
      else { const rr = Math.sqrt(r()) * rad; x = Math.cos(th) * rr; z = Math.sin(th) * rr; y = yc + h / 2; }                 // lid
    } else {
      const k = i % 3, t = r(), e = ease(t);
      const y1 = [0.72, 0, -0.72][k];
      if (t < 0.72) {
        const tt = t / 0.72, ee = ease(tt);
        x = 0.46 + tt * 0.95; y = zones[k] + (y1 - zones[k]) * ee; z = 0;
        x += gauss(r) * 0.012; y += gauss(r) * 0.014; z += gauss(r) * 0.014;
      } else {
        // a little table: a 5 × 4 grid of cells
        const gx = Math.floor(r() * 6) / 5, gy = Math.floor(r() * 5) / 4, along = r();
        const horizontal = r() < 0.5;
        const u = horizontal ? along : gx, v = horizontal ? gy : along;
        x = 1.45 + u * 0.5; y = y1 - 0.17 + v * 0.34; z = 0;
      }
      void e;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

/** 4 · About: a point-cloud bust when one is supplied, a torus knot otherwise. */
export function bust(n, cloud) {
  const r = rng(71);
  if (cloud) return fromCloud(cloud, n, r, { scale: 1.2 });
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = r() * TAU, p = 2, q = 3, rad = 0.62 + 0.24 * Math.cos(q * t);
    out[i * 3] = rad * Math.cos(p * t) + gauss(r) * 0.03;
    out[i * 3 + 1] = rad * Math.sin(p * t) + gauss(r) * 0.03;
    out[i * 3 + 2] = 0.3 * Math.sin(q * t) + gauss(r) * 0.03;
  }
  return out;
}

/** 5 · Contact: a globe of latitude lines with two rings around it. */
export function globe(n) {
  const r = rng(89), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x, y, z;
    const pick = r();
    if (pick < 0.5) {
      const k = (i + 0.5) / n, phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i;
      x = Math.cos(th) * Math.sin(phi); y = Math.cos(phi); z = Math.sin(th) * Math.sin(phi);
    } else if (pick < 0.76) {
      const lat = (Math.round(r() * 10) / 10 - 0.5) * Math.PI * 0.92, th = r() * TAU;
      x = Math.cos(lat) * Math.cos(th); y = Math.sin(lat); z = Math.cos(lat) * Math.sin(th);
    } else {
      const big = r() < 0.5, rad = (big ? 1.62 : 1.34) + gauss(r) * 0.02, th = r() * TAU, tilt = big ? 0.42 : -0.3;
      x = Math.cos(th) * rad; z = Math.sin(th) * rad; y = x * Math.sin(tilt); x *= Math.cos(tilt);
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}
