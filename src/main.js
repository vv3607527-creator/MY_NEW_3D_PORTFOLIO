import 'lenis/dist/lenis.css';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/pixelify-sans';
import './style.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { Stage, SHAPE } from './gl/stage.js';
import { MODES, CRAFT, RING, STACK_GROUPS } from './content.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const BASE = import.meta.env.BASE_URL;
const asset = (p) => BASE + p;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const mqMobile = matchMedia('(max-width: 820px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

let stage = null;
let lenis = null;
let craftTrigger = null;

/** Extra scroll the hero stays pinned for, in viewport heights. */
const HERO_HOLD = 0.7;

/* ═════════════ DOM that is rendered from content.js ═════════════ */

function renderContent() {
  $('#craftText').innerHTML = CRAFT.map((c, i) => `
    <article class="chapter" data-chapter="${i}" style="--c:${c.accent}">
      <p class="chapter__kicker">${c.kicker}</p>
      <h3>${c.title}</h3>
      <p class="chapter__body">${c.body}</p>
      <ol class="steps" aria-label="Process">${c.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <ul class="chips" aria-label="Tools">${c.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
    </article>`).join('');
  $('#craftMedia').innerHTML = CRAFT.map((c) => `<img class="shot" src="${asset(c.image)}" alt="${c.alt}" width="1100" height="1366" />`).join('');
  $('#craftRail').innerHTML = CRAFT.map((c) => `<li style="--c:${c.accent}"><span>${c.index} — ${c.title}</span><i></i></li>`).join('');

  $('#stackGroups').innerHTML = STACK_GROUPS.map((g) => `
    <div style="--c:${g.accent}">
      <h3><i></i>${g.title}</h3>
      <ul class="chips">${g.items.map((t) => `<li>${t}</li>`).join('')}</ul>
    </div>`).join('');

  $('#ringSpin').innerHTML = RING.map((t) => {
    const mark = t.svg ? `<i style="color:${t.tint}">${t.svg}</i>` : `<img src="${asset(`assets/logos/${t.file}`)}" alt="" loading="lazy" />`;
    return `<div class="ring__item">${mark}<span>${t.name}</span></div>`;
  }).join('');

  const lakeEl = $('#lake');
  if (lakeEl) lakeEl.innerHTML = lakeDiagram();
}

/** Positions the logo tiles around a cylinder sized to the current tile width. */
function layoutRing() {
  const spin = $('#ringSpin'), items = $$('.ring__item', spin), n = items.length;
  const radius = Math.round(spin.offsetWidth / 2 / Math.tan(Math.PI / n)) + 26;
  items.forEach((el, i) => { el.style.transform = `rotateY(${(i * 360) / n}deg) translateZ(${radius}px)`; });
}

/** A visual diagram of projects flowing into a showcase, with animated packets. */
function lakeDiagram() {
  const zones = [['Design', 214], ['Build', 348], ['Ship', 482]];
  const zy = 150, zh = 190, zw = 96, n = 14;
  let wires = '', dots = '', packets = '';
  for (let i = 0; i < n; i++) {
    const y = 132 + i * 17.6, ty = (zy + 14 + ((zh - 28) * i) / (n - 1)).toFixed(1);
    const d = `M40 ${y.toFixed(1)}C128 ${y.toFixed(1)} 138 ${ty} 214 ${ty}`;
    wires += `<path class="wire" d="${d}"/>`;
    dots += `<circle class="src" cx="40" cy="${y.toFixed(1)}" r="2.6"/>`;
    if (!reduced) {
      const dur = (3.4 + ((i * 7) % 5) * 0.45).toFixed(2), begin = (-((i * 13) % 10) * 0.37).toFixed(2);
      packets += `<circle class="pkt" r="2.6"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${d}L578 ${ty}"/></circle>`;
    }
  }
  const boxes = zones.map(([name, x]) => `
    <rect class="zone" x="${x}" y="${zy}" width="${zw}" height="${zh}" rx="14"/>
    <text x="${x + zw / 2}" y="${zy + zh + 22}" text-anchor="middle">${name}</text>`).join('');
  const links = [310, 444].map((x) => [178, 222, 268, 312].map((y) => `<path class="wire" d="M${x} ${y}h38"/>`).join('')).join('');
  return `<svg viewBox="0 0 600 392" aria-hidden="true">
    <text class="big" x="18" y="74">7+</text>
    <text x="22" y="98">Live projects</text>
    <path class="wire" stroke-dasharray="3 5" d="M214 132h364"/>
    <text x="578" y="120" text-anchor="end">Design · Build · Ship</text>
    ${wires}${links}${boxes}${dots}${packets}
  </svg>`;
}

/* ═════════════ small effects ═════════════ */

/** Rewrites an element's text through a burst of glyph noise. */
function scramble(el, text, duration = 0.85) {
  if (reduced) { el.textContent = text; return; }
  const glyphs = '01<>/\\[]{}#*+=-_';
  const state = { p: 0 };
  gsap.killTweensOf(state);
  gsap.to(state, {
    p: 1, duration, ease: 'none',
    onUpdate() {
      const done = Math.floor(state.p * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) out += i < done || text[i] === ' ' ? text[i] : glyphs[(Math.random() * glyphs.length) | 0];
      el.textContent = out;
    },
    onComplete() { el.textContent = text; },
  });
}

function countUp(el, duration = 2) {
  const target = +el.dataset.count, state = { v: 0 };
  if (reduced) { el.textContent = target; return; }
  gsap.to(state, { v: target, duration, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(state.v); } });
}

function initCursor() {
  if (!finePointer) return;
  const root = $('#cursor'), ring = $('.cursor__ring', root), dot = $('.cursor__dot', root), label = $('#cursorLabel');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  window.addEventListener('pointermove', (e) => {
    root.classList.add('is-on');
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    const tagged = e.target.closest?.('[data-cursor]');
    const text = tagged?.dataset.cursor || '';
    if (text) label.textContent = text;
    root.classList.toggle('is-label', !!text);
    root.classList.toggle('is-link', !text && !!e.target.closest?.('a, button'));
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('is-on'));
}

function initMagnetic() {
  if (!finePointer || reduced) return;
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.32); y((e.clientY - r.top - r.height / 2) * 0.42);
    });
    el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); });
  });
}

function initTilt() {
  if (!finePointer || reduced) return;
  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 1300 });
    const rx = gsap.quickTo(el, 'rotateX', { duration: 0.7, ease: 'power3' }), ry = gsap.quickTo(el, 'rotateY', { duration: 0.7, ease: 'power3' });
    const host = el.closest('.card') || el;
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 16); rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
    });
    host.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ═════════════ sections ═════════════ */

function initHero() {
  const hero = $('#hero'), lines = $$('#heroTitle .ln > span'), body = $('#heroBody'), hint = $('#heroHint');
  const buttons = $$('.switch button');
  let mode = 'designer';

  /** Floods the hero into the other world from (x, y), given in 0..1 with y up. */
  const setMode = (next, x = 0.5, y = 0.1) => {
    if (next === mode) return;
    mode = next;
    document.documentElement.dataset.mode = next;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
    if (stage) {
      stage.setFloodOrigin(x, y);
      gsap.to(stage.flood, { value: next === 'engineer' ? 1 : 0, duration: reduced ? 0 : 1.5, ease: 'power2.inOut', overwrite: true });
    }
    MODES[next].title.forEach((text, i) => scramble(lines[i], text, 0.7 + i * 0.25));
    gsap.to([body, hint], {
      opacity: 0, duration: 0.25, overwrite: true,
      onComplete() { body.textContent = MODES[next].body; hint.textContent = MODES[next].hint; gsap.to([body, hint], { opacity: 1, duration: 0.5 }); },
    });
  };

  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    setMode(mode === 'designer' ? 'engineer' : 'designer', e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  });
  buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // The hero holds still for most of a screen while scrolling floods it into the other world and
  // dissolves the portrait; the copy clears out first so the portrait has the stage to itself.
  gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${innerHeight * HERO_HOLD}`, pin: true, scrub: true, anticipatePin: 1 } })
    .to('.hero__copy, .hero__foot, .hero__stats, .hero__dock', { yPercent: -30, autoAlpha: 0, ease: 'none', duration: 0.55 })
    .to({}, { duration: 0.45 });
}

function initManifesto() {
  const el = $('#manifestoLines');
  const split = SplitText.create(el, { type: 'words' });
  if (reduced) return;
  gsap.fromTo(split.words, { opacity: 0.13 }, {
    opacity: 1, stagger: 0.12, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true },
  });
}

function initCraft() {
  const chapters = $$('.chapter'), shots = $$('.shot'), rail = $$('#craftRail li'), index = $('#craftIndex');
  let active = -1, z = 1;

  const show = (i, dir) => {
    if (i === active) return;
    const prev = active;
    active = i;
    index.textContent = CRAFT[i].index;
    rail.forEach((li, k) => li.classList.toggle('is-active', k === i));
    if (prev >= 0) gsap.to(chapters[prev], { autoAlpha: 0, duration: 0.3, ease: 'power2.in', overwrite: true });
    gsap.set(chapters[i], { autoAlpha: 1, delay: prev >= 0 ? 0.3 : 0, overwrite: true });
    gsap.fromTo(chapters[i].children, { y: 46 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: prev >= 0 ? 0.3 : 0, overwrite: true });
    gsap.set(shots[i], { zIndex: ++z });
    gsap.fromTo(shots[i],
      { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', scale: 1.18 },
      { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: prev >= 0 ? 1.1 : 0.01, ease: 'expo.inOut', overwrite: true });
  };

  craftTrigger = ScrollTrigger.create({
    trigger: '#craftPin', start: 'top top', end: () => `+=${innerHeight * 3}`, pin: true, anticipatePin: 1,
    onUpdate(self) {
      const p = self.progress;
      show(Math.min(2, Math.floor(p * 3)), self.direction || 1);
      rail.forEach((li, k) => li.style.setProperty('--p', clamp01(p * 3 - k).toFixed(3)));
    },
  });
  show(0, 1);
}

function initWork() {
  const cards = $$('.card');
  const mm = gsap.matchMedia();

  // stacked deck: each card sinks back as the next one slides over it
  mm.add('(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)', () => {
    cards.slice(0, -1).forEach((card, i) => {
      gsap.to(card, {
        scale: 0.93, filter: 'brightness(0.45)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 12%', scrub: true },
      });
    });
  });

  if (!reduced) {
    const phones = $$('.phones img');
    const fanIn = (els, to, card) => els.forEach((el, i) => gsap.fromTo(el, { xPercent: 0, rotateY: 0, rotate: 0, scale: 0.8, z: 0, y: 60 }, { ...to[i], ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 85%', end: 'top 22%', scrub: 0.6 } }));
    fanIn(phones, [
      { xPercent: 16, rotateY: 30, scale: 0.86, z: -60, y: 0 },
      { xPercent: 0, rotateY: 0, scale: 1.04, z: 70, y: 0 },
      { xPercent: -16, rotateY: -30, scale: 0.86, z: -60, y: 0 },
    ], cards[0]);
    fanIn($$('.fan img'), [
      { xPercent: -64, rotate: -11, scale: 0.9, z: -40, y: 10 },
      { xPercent: 64, rotate: 11, scale: 0.9, z: -40, y: 10 },
      { xPercent: 0, rotate: 0, scale: 1, z: 50, y: 0 },
    ], cards[3]);
  } else {
    gsap.set('.phones img', { scale: 0.9 });
    gsap.set('.fan img', { xPercent: (i) => [-64, 64, 0][i], rotate: (i) => [-11, 11, 0][i] });
  }

  // the film only plays while it is on screen (if present)
  const video = $('.film video');
  if (video) {
    ScrollTrigger.create({
      trigger: video, start: 'top bottom', end: 'bottom top',
      onToggle(self) { if (self.isActive && !reduced) video.play().catch(() => {}); else video.pause(); },
    });
    if (reduced) video.controls = true;
  }
}

function initRing() {
  const spin = $('#ringSpin');
  let angle = 0, visible = false;
  layoutRing();
  ScrollTrigger.create({ trigger: '#ring', start: 'top bottom', end: 'bottom top', onToggle: (self) => { visible = self.isActive; } });
  const apply = () => { spin.style.transform = `rotateX(-9deg) rotateY(${angle.toFixed(2)}deg)`; };
  apply();
  if (reduced) return;
  gsap.ticker.add((_, dt) => {
    if (!visible) return;
    const v = lenis ? lenis.velocity : 0;   // scrolling throws the ring; it coasts back to a slow idle turn
    angle -= (dt / 1000) * 9 + v * 0.045;
    apply();
  });
}

function initReveals() {
  if (reduced) return;
  $$('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w' });
    gsap.from(split.words, { yPercent: 118, duration: 1.15, ease: 'expo.out', stagger: 0.055, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
  });
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 30 });
  ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09 }) });
}

function initChrome() {
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  $$('.nav__pill a').forEach((a) => {
    ScrollTrigger.create({ trigger: a.getAttribute('href'), start: 'top 55%', end: 'bottom 55%', onToggle: (self) => a.classList.toggle('is-active', self.isActive) });
  });
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView();
    history.replaceState(null, '', a.getAttribute('href'));
  }));
}

/* ═════════════ particle choreography ═════════════ */

/** Maps scroll ranges to what the particles should be doing. Rebuilt on every ScrollTrigger refresh. */
function buildKeyframes() {
  if (!stage) return;
  const vh = innerHeight, m = mqMobile.matches;
  const box = (sel) => { const el = $(sel), t = el.getBoundingClientRect().top + scrollY; return [t, t + el.offsetHeight]; };
  const [mT, mB] = box('#manifesto'), [wT, wB] = box('#work'), [sT, sB] = box('#stack'), [aT, aB] = box('#about'), [cT] = box('#contact');
  const cS = craftTrigger.start, cE = craftTrigger.end, seg = (cE - cS) / 3;
  const craft = m ? { x: 0.42, y: 0.4, scale: 0.4 } : { x: 0.63, y: -0.02, scale: 0.8 };

  stage.setKeyframes([
    { from: -1e9, to: vh * 0.7, shape: SHAPE.NEBULA, scale: m ? 1.2 : 1.75, alpha: 0.2, size: 1.3, turb: 0.3, rotX: 1.1, spin: 1,
      colA: '#ffd9a0', colB: '#fff3dc', glowA: '#ff4a12', glowB: '#0b3cff' },
    { from: mT - vh * 0.15, to: mB - vh * 0.95, shape: SHAPE.NEBULA, x: m ? 0 : 0.34, scale: m ? 0.9 : 1.25, alpha: m ? 0.55 : 0.8, turb: 0.12, rotX: 0.95, spin: 1,
      colA: '#ff6a2a', colB: '#45e6ff', glowA: '#ff4a12', glowB: '#0b3cff' },
    { from: cS - vh * 0.12, to: cS + seg * 0.82, shape: SHAPE.INTERFACE, ...craft, scale: craft.scale * 0.8, alpha: 0.9, turb: 0.015, rotX: 0.12, rotY: -0.5, sway: 0.16,
      colA: '#ffb066', colB: '#ff5f9e', glowA: '#b8380f', glowB: '#7a1447' },
    { from: cS + seg * 1.08, to: cS + seg * 1.82, shape: SHAPE.AGENT, ...craft, scale: craft.scale * 1.05, alpha: 0.9, turb: 0.02, rotX: 0.06, rotY: -0.3, sway: 0.42,
      colA: '#45e6ff', colB: '#d6fbff', glowA: '#0aa5c9', glowB: '#1238ff' },
    { from: cS + seg * 2.08, to: cE - vh * 0.05, shape: SHAPE.PIPELINE, ...craft, scale: craft.scale * 0.76, alpha: 0.95, turb: 0.02, rotX: 0.28, rotY: -0.38, sway: 0.2,
      colA: '#8f7bff', colB: '#45c8ff', glowA: '#5b3dff', glowB: '#0a84ff' },
    { from: wT - vh * 0.1, to: wB - vh, shape: SHAPE.NEBULA, scale: 2.3, alpha: 0.3, turb: 0.22, rotX: 0.5, spin: 1,
      colA: '#8f7bff', colB: '#ff7a2e', glowA: '#3a2a8a', glowB: '#7a2a10' },
    { from: sT - vh * 0.1, to: sB - vh * 0.95, shape: SHAPE.NEBULA, y: -0.12, scale: m ? 1 : 1.55, alpha: 0.6, turb: 0.1, rotX: 1.36, spin: 1,
      colA: '#45e6ff', colB: '#8f7bff', glowA: '#0a8fb0', glowB: '#5b3dff' },
    { from: aT - vh * 0.12, to: aB - vh * 0.9, shape: SHAPE.BUST, x: m ? 0 : -0.5, y: m ? 0.2 : -0.04, scale: m ? 0.66 : 1.02, alpha: m ? 0.6 : 0.95, turb: 0.012, rotY: m ? 0 : 0.3, sway: 0.34,
      colA: '#45e6ff', colB: '#f2fdff', glowA: '#0aa5c9', glowB: '#10206a' },
    { from: cT - vh * 0.1, to: 1e9, shape: SHAPE.GLOBE, x: m ? 0 : 0.5, y: m ? -0.1 : -0.06, scale: m ? 0.8 : 1.12, alpha: m ? 0.4 : 0.62, turb: 0.03, rotX: 0.3, spin: 1,
      colA: '#ff7a2e', colB: '#ffcf6b', glowA: '#ff5a1f', glowB: '#a35a00' },
  ]);
}

/* ═════════════ boot ═════════════ */

async function boot() {
  renderContent();

  const counter = $('#loaderCount'), bar = $('#loaderBar'), shown = { v: 0 };
  const setProgress = (p) => gsap.to(shown, {
    v: p * 100, duration: 0.7, ease: 'power2.out', overwrite: true,
    onUpdate() { counter.textContent = String(Math.round(shown.v)).padStart(3, '0'); bar.style.transform = `scaleX(${shown.v / 100})`; },
  });

  await Promise.allSettled([
    document.fonts.load('900 80px "Big Shoulders Display"'),
    document.fonts.load('500 40px "Pixelify Sans Variable"'),
    document.fonts.load('500 12px "Geist Mono Variable"'),
    document.fonts.load('400 16px "Geist Variable"'),
  ]);
  setProgress(0.2);

  try {
    stage = new Stage($('#gl'), { base: BASE, mobile: mqMobile.matches, reduced });
    stage.setWords('DESIGNER', 'BUILDER', '"Big Shoulders Display"');
    if (new URLSearchParams(location.search).has('debug')) { window.__stage = stage; window.__ScrollTrigger = ScrollTrigger; }   // handles for scripts/ and the console
    await stage.load((p) => setProgress(0.2 + p * 0.8));
    if (stage.hasBust) $('#aboutCaption').textContent = 'That figure is a point cloud of me, sampled from a 3D mesh generated from a single photo.';
  } catch (err) {
    console.warn('WebGL stage unavailable, falling back to the static hero.', err);
    stage = null;
    document.documentElement.classList.add('no-gl');
  }
  await setProgress(1);

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  initCursor();
  initMagnetic();
  initTilt();
  initHero();
  initManifesto();
  initCraft();
  initWork();
  initRing();
  initReveals();
  initChrome();

  ScrollTrigger.addEventListener('refresh', buildKeyframes);
  ScrollTrigger.refresh();

  if (stage) {
    const heroEl = $('#hero');
    gsap.ticker.add(() => {
      stage.scrollY = window.scrollY;
      stage.heroProgress = clamp01(window.scrollY / (heroEl.offsetHeight * (1 + HERO_HOLD)));
    });
    stage.start();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    stage?.resize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layoutRing(); ScrollTrigger.refresh(); }, 180);
  });

  /* curtain up */
  const loader = $('#loader');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => loader.remove() });
  if (reduced) {
    if (stage) stage.intro.value = 1;
    gsap.set(loader, { autoAlpha: 0 });
    $$('[data-count]').forEach((el) => countUp(el));
    return;
  }
  tl.to(loader, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, 0.15);
  if (stage) tl.to(stage.intro, { value: 1, duration: 2.4, ease: 'power2.out' }, 0.55);
  tl.from('#heroTitle .ln > span', { yPercent: 115, duration: 1.2, stagger: 0.1 }, 1)
    .from('[data-intro]:not(.ln)', { autoAlpha: 0, y: 26, duration: 1, ease: 'power3.out', stagger: 0.08 }, 1.15)
    .from('.nav > *', { y: -28, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 1.1)
    .add(() => $$('[data-count]').forEach((el) => countUp(el)), 1.5);
}

boot();
