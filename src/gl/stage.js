/* The one WebGL stage behind the whole page.
   Three passes a frame: pointer trail → hero/backdrop composite → particles.
   Nothing here reads the DOM except the canvas; main.js feeds it scroll state. */

import * as THREE from 'three';
import { QUAD_VERT, TRAIL_FRAG, HERO_FRAG, POINTS_VERT, POINTS_FRAG, SHAPE_COUNT } from './shaders.js';
import * as shapes from './shapes.js';

export const SHAPE = { NEBULA: 0, INTERFACE: 1, AGENT: 2, PIPELINE: 3, BUST: 4, GLOBE: 5 };

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

/** Numeric fields every keyframe carries; colours are handled separately. */
const FIELDS = ['x', 'y', 'scale', 'alpha', 'size', 'turb', 'rotX', 'rotY', 'sway', 'spin', 'repel'];
const DEFAULTS = { x: 0, y: 0, scale: 1, alpha: 1, size: 1, turb: 0.05, rotX: 0, rotY: 0, sway: 0, spin: 0, repel: 1 };

export class Stage {
  constructor(canvas, { base = '/', mobile = false, reduced = false } = {}) {
    this.canvas = canvas;
    this.base = base;
    this.mobile = mobile;
    this.reduced = reduced;
    this.heroProgress = 0;          // 0 at the top of the page, 1 once the hero has scrolled away
    this.scrollY = 0;
    this.keyframes = [];
    this.running = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.autoClear = false;
    renderer.setClearColor(0x05060a, 1);
    this.renderer = renderer;
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(this.dpr);

    this.time = 0;
    this.last = performance.now();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.PlaneGeometry(2, 2);

    /* pointer: `target` is where the user (or autopilot) is, `point` chases it for the trail,
       `soft` chases it slowly for parallax. All in 0..1 with y up. */
    this.pointer = { target: new THREE.Vector2(0.5, 0.5), point: new THREE.Vector2(0.5, 0.5), prev: new THREE.Vector2(0.5, 0.5), soft: new THREE.Vector2(0.5, 0.5), lastMove: -1e9, active: false };

    this.#buildTrail();
    this.#buildHero();
    this.#buildPoints();

    this.onPointer = (e) => {
      if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
      this.pointer.target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      this.pointer.lastMove = performance.now();
      this.pointer.active = true;
    };
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    window.addEventListener('pointerdown', this.onPointer, { passive: true });
    this.resize();
  }

  /* ───────────────────────── passes ───────────────────────── */

  #buildTrail() {
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.trailA = new THREE.WebGLRenderTarget(2, 2, opts);
    this.trailB = new THREE.WebGLRenderTarget(2, 2, opts);
    this.trailMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: TRAIL_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tPrev: { value: null }, uPoint: { value: new THREE.Vector2() }, uPrevPoint: { value: new THREE.Vector2() },
        uTexel: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uRadius: { value: 0.14 }, uStrength: { value: 0 },
        uDecay: { value: 0.97 }, uTime: { value: 0 },
      },
    });
    this.trailScene = new THREE.Scene();
    this.trailScene.add(new THREE.Mesh(this.quad, this.trailMat));
  }

  #buildHero() {
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    blank.needsUpdate = true;
    this.heroMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: HERO_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tFront: { value: blank }, tBack: { value: blank }, tWordA: { value: blank }, tWordB: { value: blank }, tTrail: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uFloodO: { value: new THREE.Vector2(0.5, 0.5) },
        uRect: { value: new THREE.Vector4(0.3, 0, 0.4, 0.95) }, uWord: { value: new THREE.Vector4(0, 0.4, 1, 0.3) },
        uTime: { value: 0 }, uScroll: { value: 0 }, uFlood: { value: 0 }, uIntro: { value: 0 }, uPortrait: { value: 0 },
        uGlowA: { value: new THREE.Color(0x000000) }, uGlowB: { value: new THREE.Color(0x000000) },
      },
    });
    this.heroScene = new THREE.Scene();
    this.heroScene.add(new THREE.Mesh(this.quad, this.heroMat));
    this.imageAspect = 0.8056;
    this.wordAspect = 5;
  }

  #buildPoints() {
    const n = (this.count = this.mobile ? 20000 : 46000);
    const geo = new THREE.BufferGeometry();
    const rnd = new Float32Array(n * 4);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    // procedural shapes are ready immediately; the two sampled ones are swapped in by load()
    const targets = [shapes.nebula(n), shapes.interfacePanels(n), shapes.agent(n, null), shapes.pipeline(n), shapes.bust(n, null), shapes.globe(n)];
    targets.forEach((arr, i) => geo.setAttribute(`aP${i}`, new THREE.BufferAttribute(arr, 3)));
    geo.setAttribute('position', geo.getAttribute('aP0'));
    this.pointsGeo = geo;

    this.pointsMat = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG,
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        uW: { value: new Array(SHAPE_COUNT).fill(0) }, uTime: { value: 0 }, uTurb: { value: 0.1 }, uSize: { value: 10 }, uAlpha: { value: 0 },
        uAspect: { value: 1 }, uRepel: { value: 1 }, uMouseN: { value: new THREE.Vector2(9, 9) },
        uColA: { value: new THREE.Color(0xffffff) }, uColB: { value: new THREE.Color(0xffffff) },
      },
    });
    this.points = new THREE.Points(geo, this.pointsMat);
    this.points.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.points);
    this.world = new THREE.Scene();
    this.world.add(this.group);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    this.camera.position.z = 5;
    this.spinAngle = 0;
    this.state = { ...DEFAULTS, alpha: 0 };
    this.colA = new THREE.Color(); this.colB = new THREE.Color(); this.glowA = new THREE.Color(); this.glowB = new THREE.Color();
  }

  /* ───────────────────────── assets ───────────────────────── */

  /** Loads the portrait layers and sampled point clouds. Resolves even if optional ones fail. */
  async load(onProgress = () => {}) {
    const suffix = this.mobile ? '-sm' : '';
    const loader = new THREE.TextureLoader();
    const tex = (file) => loader.loadAsync(`${this.base}assets/img/${file}`).then((t) => {
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      t.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      return t;
    });
    const cloud = (file, yaw) => shapes.loadPoints(`${this.base}assets/geo/${file}`, { yaw }).catch(() => null);
    const jobs = [tex(`hero-human${suffix}.webp`), tex(`hero-machine${suffix}.webp`), cloud('android.bin', -Math.PI / 2), cloud('bust.bin', 0)];
    let done = 0;
    jobs.forEach((j) => j.finally(() => onProgress(++done / jobs.length)));
    const [front, back, android, bustCloud] = await Promise.all(jobs);

    this.heroMat.uniforms.tFront.value = front;
    this.heroMat.uniforms.tBack.value = back;
    this.heroMat.uniforms.uPortrait.value = 1;
    this.imageAspect = front.image.width / front.image.height;
    if (android) this.#setShape(SHAPE.AGENT, shapes.agent(this.count, android));
    if (bustCloud) this.#setShape(SHAPE.BUST, shapes.bust(this.count, bustCloud));
    this.hasBust = !!bustCloud;
    this.resize();
  }

  #setShape(index, array) {
    const attr = this.pointsGeo.getAttribute(`aP${index}`);
    attr.array.set(array);
    attr.needsUpdate = true;
  }

  /** Draws the two giant words into textures. Call after the display font has loaded. */
  setWords(a, b, font) {
    const make = (text, outline) => {
      const size = 420, c = document.createElement('canvas'), ctx = c.getContext('2d');
      ctx.font = `900 ${size}px ${font}`;
      const m = ctx.measureText(text);
      const asc = m.actualBoundingBoxAscent, pad = 24;
      c.width = Math.min(4096, Math.ceil(m.width + pad * 2));
      c.height = Math.ceil(asc + m.actualBoundingBoxDescent + pad * 2);
      ctx.font = `900 ${size}px ${font}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
      if (outline) {
        ctx.globalAlpha = 0.1; ctx.fillText(text, pad, pad + asc);
        ctx.globalAlpha = 1; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeText(text, pad, pad + asc);
      } else ctx.fillText(text, pad, pad + asc);
      const t = new THREE.CanvasTexture(c);
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      this.wordAspect = c.width / c.height;
      return t;
    };
    this.heroMat.uniforms.tWordA.value = make(a, false);
    this.heroMat.uniforms.tWordB.value = make(b, true);
    this.resize();
  }

  /* ───────────────────────── layout ───────────────────────── */

  resize() {
    const w = window.innerWidth, h = window.innerHeight, asp = w / h;
    this.renderer.setSize(w, h, false);
    this.heroMat.uniforms.uRes.value.set(w * this.dpr, h * this.dpr);
    this.camera.aspect = asp; this.camera.updateProjectionMatrix();
    this.pointsMat.uniforms.uAspect.value = asp;
    this.pointsMat.uniforms.uSize.value = 10.5 * this.dpr * Math.max(0.8, Math.min(1.25, h / 900));

    // portrait: stands on the bottom edge; right of centre on wide screens, centred on tall ones
    const wide = asp > 1;
    let ph = wide ? 0.95 : 0.62;
    let pw = (ph * h * this.imageAspect) / w;
    if (pw > 1.15) { pw = 1.15; ph = (pw * w) / (h * this.imageAspect); }
    const cx = wide ? 0.575 : 0.5;
    this.heroMat.uniforms.uRect.value.set(cx - pw / 2, 0, pw, ph);
    this.portraitRect = { x: cx - pw / 2, y: 0, w: pw, h: ph };

    // word: spans the screen behind the shoulders
    const ww = wide ? 0.97 : 1.55;
    const wh = (ww * w) / this.wordAspect / h;
    const wy = wide ? 0.56 - wh / 2 : ph * 0.5 - wh / 2;
    this.heroMat.uniforms.uWord.value.set(0.5 - ww / 2, wy, ww, wh);

    // trail buffer: small, same aspect as the screen
    const tw = wide ? 384 : 216, th = Math.max(8, Math.round(tw / asp));
    this.trailA.setSize(tw, th); this.trailB.setSize(tw, th);
    this.trailMat.uniforms.uTexel.value.set(1 / tw, 1 / th);
    this.trailMat.uniforms.uAspect.value = asp;
    this.visibleHalfW = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z * asp;
    this.visibleHalfH = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
  }

  /** Scroll ranges and the particle state to hold inside each: [{ from, to, shape, colA, colB, glowA, glowB, ...FIELDS }]. */
  setKeyframes(list) {
    this.keyframes = list.map((k) => ({
      ...DEFAULTS, ...k,
      _colA: new THREE.Color(k.colA ?? '#ffffff'), _colB: new THREE.Color(k.colB ?? '#ffffff'),
      _glowA: new THREE.Color(k.glowA ?? '#000000'), _glowB: new THREE.Color(k.glowB ?? '#000000'),
    }));
  }

  #sample(y) {
    const ks = this.keyframes, w = this.pointsMat.uniforms.uW.value;
    w.fill(0);
    if (!ks.length) { w[0] = 1; return 0; }
    let a = ks[0], b = ks[0], t = 0;
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i], next = ks[i + 1];
      if (y <= k.to || !next) { a = b = k; t = 0; break; }
      if (y < next.from) { a = k; b = next; t = smooth((y - k.to) / Math.max(1, next.from - k.to)); break; }
    }
    for (const f of FIELDS) this.state[f] = lerp(a[f], b[f], t);
    this.colA.copy(a._colA).lerp(b._colA, t); this.colB.copy(a._colB).lerp(b._colB, t);
    this.glowA.copy(a._glowA).lerp(b._glowA, t); this.glowB.copy(a._glowB).lerp(b._glowB, t);
    w[a.shape] += 1 - t; w[b.shape] += t;
    return a.shape === b.shape ? 0 : 4 * t * (1 - t);   // morph energy, peaks mid-transition
  }

  /* ───────────────────────── frame ───────────────────────── */

  start() {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  /** Renders exactly one frame; used when the loop is paused. */
  renderOnce() { this.#frame(); }

  #frame() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const time = (this.time += dt);
    const p = this.pointer;
    const hero = this.heroProgress;
    const r = this.renderer;

    /* pointer, with an autopilot that wanders over the portrait when nobody is driving */
    const idle = now - p.lastMove > 3500;
    const auto = idle && !this.reduced && hero < 0.9;
    if (auto && this.portraitRect) {
      const pr = this.portraitRect;
      p.target.set(pr.x + pr.w * (0.5 + 0.3 * Math.sin(time * 0.62)), pr.y + pr.h * (0.56 + 0.26 * Math.sin(time * 0.93 + 1.2)));
    }
    p.prev.copy(p.point);
    p.point.lerp(p.target, 1 - Math.pow(0.0005, dt));
    p.soft.lerp(p.target, 1 - Math.pow(0.04, dt));
    const speed = p.point.distanceTo(p.prev) / Math.max(dt, 1e-3);

    /* 1 · trail */
    if (hero < 1) {
      const tu = this.trailMat.uniforms;
      tu.tPrev.value = this.trailA.texture;
      tu.uPoint.value.copy(p.point); tu.uPrevPoint.value.copy(p.prev);
      tu.uRadius.value = (this.mobile ? 0.13 : 0.15) + Math.min(0.09, speed * 0.035);
      tu.uStrength.value = p.active || auto ? 1 : 0;
      tu.uDecay.value = Math.exp(-dt * 1.35);
      tu.uTime.value = time;
      r.setRenderTarget(this.trailB);
      r.render(this.trailScene, this.quadCam);
      r.setRenderTarget(null);
      [this.trailA, this.trailB] = [this.trailB, this.trailA];
    }

    /* 2 · hero + backdrop */
    const energy = this.#sample(this.scrollY);
    const hu = this.heroMat.uniforms;
    hu.tTrail.value = this.trailA.texture;
    hu.uTime.value = time; hu.uScroll.value = hero; hu.uMouse.value.copy(p.soft);
    hu.uGlowA.value.copy(this.glowA); hu.uGlowB.value.copy(this.glowB);
    r.clear();
    r.render(this.heroScene, this.quadCam);

    /* 3 · particles */
    const s = this.state, pu = this.pointsMat.uniforms, g = this.group;
    this.spinAngle = (this.spinAngle + dt * 0.11) % (Math.PI * 2);
    const spin = this.spinAngle > Math.PI ? this.spinAngle - Math.PI * 2 : this.spinAngle;
    const mx = p.soft.x - 0.5, my = p.soft.y - 0.5;
    g.position.set(s.x * this.visibleHalfW, s.y * this.visibleHalfH, 0);
    g.scale.setScalar(s.scale);
    g.rotation.set(s.rotX - my * 0.22, s.rotY + Math.sin(time * 0.38) * s.sway + spin * s.spin + mx * 0.4, 0);
    pu.uTime.value = this.reduced ? 0 : time;
    pu.uTurb.value = s.turb + energy * 0.42;
    pu.uAlpha.value = s.alpha * hu.uIntro.value;
    pu.uRepel.value = this.reduced ? 0 : s.repel;
    pu.uColA.value.copy(this.colA); pu.uColB.value.copy(this.colB);
    pu.uMouseN.value.set(p.active ? p.soft.x * 2 - 1 : 9, p.active ? p.soft.y * 2 - 1 : 9);
    r.render(this.world, this.camera);
  }

  /** Uniform handles main.js tweens directly. */
  get intro() { return this.heroMat.uniforms.uIntro; }
  get flood() { return this.heroMat.uniforms.uFlood; }
  setFloodOrigin(x, y) { this.heroMat.uniforms.uFloodO.value.set(x, y); }
}
