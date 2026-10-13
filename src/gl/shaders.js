/* GLSL for the three passes: the pointer trail, the hero/backdrop composite, and the particles.
   Colour maths is done directly in display (sRGB) space: textures are sampled raw and written raw. */

const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, v = 0.; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.; a *= .5; } return v; }
`;

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

/* ── 1. Pointer trail ──────────────────────────────────────────────
   A low-res ping-pong buffer. Each frame the previous frame is blurred,
   drifted by a little noise and decayed, then the pointer's path since
   the last frame is stamped in as a soft capsule. The hero reads it as
   the "how augmented is this pixel" mask. */
export const TRAIL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tPrev;
uniform vec2 uPoint, uPrevPoint, uTexel;
uniform float uAspect, uRadius, uStrength, uDecay, uTime;
varying vec2 vUv;
${NOISE}
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.);
  return length(pa - ba * h);
}
void main(){
  vec2 flow = vec2(noise(vUv * 5. + uTime * .25) - .5, noise(vUv * 5. + 31. - uTime * .2) - .5);
  vec2 uv = vUv - flow * .0035;
  float prev = texture2D(tPrev, uv).r * .4
             + (texture2D(tPrev, uv + vec2(uTexel.x, 0.)).r + texture2D(tPrev, uv - vec2(uTexel.x, 0.)).r
              + texture2D(tPrev, uv + vec2(0., uTexel.y)).r + texture2D(tPrev, uv - vec2(0., uTexel.y)).r) * .15;
  prev *= uDecay;
  vec2 asp = vec2(uAspect, 1.);
  float d = segDist(vUv * asp, uPrevPoint * asp, uPoint * asp);
  float s = smoothstep(uRadius, uRadius * .2, d) * uStrength;
  gl_FragColor = vec4(max(prev, s), 0., 0., 1.);
}
`;

/* ── 2. Hero + site backdrop ───────────────────────────────────────
   One full-screen pass draws everything behind the DOM: the warm "designer"
   world, the cold "engineer" world, the giant word behind the portrait, both
   portrait layers, and (once the hero has scrolled away) the dark site
   backdrop with its two drifting accent glows. */
export const HERO_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tFront, tBack, tWordA, tWordB, tTrail;
uniform vec2 uRes, uMouse, uFloodO;
uniform vec4 uRect, uWord;
uniform float uTime, uScroll, uFlood, uIntro, uPortrait;
uniform vec3 uGlowA, uGlowB;
varying vec2 vUv;
${NOISE}

float inside(vec2 p){ return step(0., p.x) * step(p.x, 1.) * step(0., p.y) * step(p.y, 1.); }

void main(){
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 par = uMouse - .5;

  float n1 = fbm(p * 1.4 + vec2(uTime * .05, -uTime * .03));
  float n2 = fbm(p * 1.4 + vec2(5.2 - uTime * .04, uTime * .05));
  float edgeN = fbm(p * 6. + uTime * .22) - .5;

  /* ── the mask: 0 = designer, 1 = engineer ── */
  float tr = texture2D(tTrail, uv + (vec2(n1, n2) - .5) * .014).r;
  float mT = smoothstep(.24, .42, tr + edgeN * .3 * smoothstep(0., .3, tr));
  float fd = distance(p, vec2(uFloodO.x * asp, uFloodO.y));
  float fr = uFlood * (asp + 1.25);
  float mF = (1. - smoothstep(fr - .2, fr, fd + edgeN * .24)) * step(.0005, uFlood);
  float m = mF + mT - 2. * mF * mT;                       /* hovering always shows the other one */
  float sc = smoothstep(.02, .32, uScroll);
  float mS = 1. - smoothstep(sc * 1.5 - .35, sc * 1.5 - .13, uv.y + edgeN * .22);
  m = max(m, mS);                                         /* scrolling floods it from below */

  float subjX = (uRect.x + uRect.z * .5) * asp;

  /* ── warm world ── */
  vec2 q = p + (vec2(n1, n2) - .5) * .7;
  float g = fbm(q * 1.25);
  vec3 cA = mix(vec3(1., .46, .05), vec3(.93, .09, .05), smoothstep(.2, .95, uv.x * .8 + g * .55 - uv.y * .18));
  cA = mix(cA, vec3(1., .74, .16), smoothstep(.85, 0., distance(p, vec2(subjX, .62))) * .6);
  cA = mix(cA, vec3(.55, .02, .12), smoothstep(.35, 1.3, distance(uv, vec2(.5)) * 1.3) * .6);

  /* ── cold world ── */
  vec3 cB = mix(vec3(.010, .016, .045), vec3(.02, .075, .19), g);
  cB += vec3(0., .34, .58) * smoothstep(.9, 0., distance(p, vec2(subjX, .6))) * .42;
  vec2 gp = p * 16. + vec2(0., uTime * .22);
  vec2 gl = abs(fract(gp) - .5);
  float grid = smoothstep(.47, .5, max(gl.x, gl.y));
  float pulse = step(.993, hash(floor(gp) + floor(uTime * 1.5) * 7.13));
  cB += vec3(.12, .78, 1.) * (grid * .11 * (.35 + .65 * g) + pulse * .1);
  cB *= 1. - smoothstep(.3, 1.2, distance(uv, vec2(.5)) * 1.25) * .55;

  /* ── the word behind the portrait ── */
  vec2 wuv = (uv - uWord.xy) / uWord.zw + par * vec2(.022, .016);
  float win = inside(wuv);
  float wa = texture2D(tWordA, wuv).a * win;
  float wb = texture2D(tWordB, wuv).a * win;
  float wordFade = uIntro * (1. - smoothstep(.08, .34, uScroll));
  cA = mix(cA, vec3(1., .80, .28), wa * .62 * wordFade);
  cB += vec3(.25, .9, 1.) * wb * .75 * wordFade;

  /* ── the portrait ── */
  float sIn = mix(1.12, 1., uIntro) + uScroll * .1;
  vec2 puv = (uv - uRect.xy) / uRect.zw;
  puv = (puv - vec2(.5, 0.)) / sIn + vec2(.5, 0.);
  puv -= par * vec2(.014, .009);
  float dz = smoothstep(.27, .66, uScroll);
  puv.y -= dz * .1;                                       /* lifts as it is eaten away from below */
  float pin = inside(puv);
  float e = 4. * m * (1. - m);                            /* 1 on the seam between worlds */
  vec2 ab = vec2(.007, 0.) * e;
  vec4 f = texture2D(tFront, puv) * pin;
  vec4 b = texture2D(tBack, puv) * pin;
  b.r = mix(b.r, texture2D(tBack, puv + ab).r, e * pin);
  b.b = mix(b.b, texture2D(tBack, puv - ab).b, e * pin);
  float dis = smoothstep(dz * 1.6 - .3, dz * 1.6, puv.y * .6 + fbm(p * 9.) * .5);
  float show = dis * uPortrait * smoothstep(0., .5, uIntro);
  f.a *= show; b.a *= show;

  vec3 colA = mix(cA, f.rgb, f.a);
  vec3 colB = mix(cB, b.rgb, b.a);
  vec3 col = mix(colA, colB, m);

  /* seam: a hot cyan lip and a line of scanning static */
  float scan = step(.5, fract(uv.y * uRes.y * .25 + uTime * 6.));
  col += vec3(.3, .95, 1.) * e * (.45 + .25 * scan);
  col += vec3(1.) * smoothstep(.75, 1., e) * .18;

  /* ── the site backdrop once the hero has gone ── */
  vec3 site = vec3(.018, .020, .034);
  site += uGlowA * smoothstep(1.05, 0., distance(p, vec2(asp * (.22 + .1 * sin(uTime * .11)), .78 + .08 * cos(uTime * .09)))) * .22 * (.6 + .8 * n1);
  site += uGlowB * smoothstep(1.15, 0., distance(p, vec2(asp * (.82 + .08 * cos(uTime * .08)), .18 + .1 * sin(uTime * .1)))) * .19 * (.6 + .8 * n2);
  site *= 1. - smoothstep(.4, 1.25, distance(uv, vec2(.5)) * 1.2) * .5;
  col = mix(col, site, smoothstep(.46, .8, uScroll));

  col *= smoothstep(0., .35, uIntro);
  col += (hash(uv * uRes + fract(uTime) * 91.7) - .5) * .045;
  gl_FragColor = vec4(col, 1.);
}
`;

/* ── 3. Particles ──────────────────────────────────────────────────
   Every particle carries its position in each shape. The shader blends
   them by weight, adds turbulence that peaks mid-morph, and shoves
   particles away from the pointer in screen space. */
export const SHAPE_COUNT = 6;

export const POINTS_VERT = /* glsl */ `
attribute vec3 aP0, aP1, aP2, aP3, aP4, aP5;
attribute vec4 aRnd;
uniform float uW[${SHAPE_COUNT}];
uniform float uTime, uTurb, uSize, uAlpha, uAspect, uRepel;
uniform vec2 uMouseN;
varying float vA;
varying float vMix;

vec3 wob(vec3 p, float t){
  return vec3(sin(p.y * 1.7 + t) + sin(p.z * 2.3 + t * 1.3),
              sin(p.z * 1.9 + t * 1.1) + sin(p.x * 2.1 + t * .7),
              sin(p.x * 1.6 + t * .9) + sin(p.y * 2.5 + t * 1.2)) * .5;
}

void main(){
  vec3 pos = aP0 * uW[0] + aP1 * uW[1] + aP2 * uW[2] + aP3 * uW[3] + aP4 * uW[4] + aP5 * uW[5];
  pos += wob(pos * 1.3 + aRnd.xyz * 6.283, uTime * .55 + aRnd.w * 6.283) * (.012 + uTurb * (.25 + aRnd.x * .9));
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  vec4 clip = projectionMatrix * mv;

  vec2 d = clip.xy / clip.w - uMouseN;
  d.x *= uAspect;
  float push = smoothstep(.42, 0., length(d)) * uRepel;
  clip.xy += normalize(d + 1e-5) * vec2(1. / uAspect, 1.) * push * .16 * clip.w;

  gl_Position = clip;
  gl_PointSize = uSize * (.45 + aRnd.y * 1.1) / max(.2, -mv.z);
  vA = uAlpha * (.3 + .7 * aRnd.z) * (1. + push * 1.6);
  vMix = aRnd.x;
}
`;

export const POINTS_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColA, uColB;
varying float vA;
varying float vMix;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .05, d);
  gl_FragColor = vec4(mix(uColA, uColB, smoothstep(.25, .75, vMix)) * a * vA, 1.);
}
`;
