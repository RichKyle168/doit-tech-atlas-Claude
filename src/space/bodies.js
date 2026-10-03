import * as THREE from 'three';
import { flareTexture, glowTexture, hazeTexture } from './textures.js';
import { makePoints, pointsMaterial, rng } from './points.js';

const tint = (hue, s = 0.35, l = 0.72) => new THREE.Color().setHSL(hue / 360, s, l);
const WARM = new THREE.Color('#fff1dc');

function sprite(map, { color = 0xffffff, opacity = 1, scale = [1, 1] } = {}) {
  const m = new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  m.userData.base = opacity;
  const s = new THREE.Sprite(m);
  s.scale.set(scale[0], scale[1], 1);
  return s;
}

// ───────────────────────────── the sky (shared by every level)

/** Distant stars, denser along the same tilted band as the sky haze. Pixel-sized, so they read as infinitely far. */
export function makeStarField(count = 9000) {
  const r = rng(3);
  const tilt = 0.32; const lon0 = 0.6;
  const positions = []; const colors = []; const sizes = []; const phases = [];
  for (let i = 0; i < count; i += 1) {
    let lon; let lat;
    if (i % 5 < 2) { lon = r() * Math.PI * 2 - Math.PI; lat = Math.atan(Math.tan(tilt) * Math.sin(lon - lon0)) + r.gauss() * 0.09; }
    else { lon = r() * Math.PI * 2 - Math.PI; lat = Math.asin(r() * 2 - 1); }
    const R = 1500;
    positions.push(R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat), -R * Math.cos(lat) * Math.sin(lon)); // matches the sky sphere's UV layout
    const b = Math.pow(r(), 3.2);
    const c = new THREE.Color().setHSL(r() > 0.75 ? 0.6 : 0.09, 0.25 * r(), 0.55 + b * 0.45);
    colors.push(c.r, c.g, c.b);
    sizes.push(0.9 + b * 2.4);
    phases.push(r());
  }
  return makePoints({ positions, colors, sizes, phases }, pointsMaterial({ attenuate: false, opacity: 0.9, twinkle: 0.3 }));
}

/** Mid-distance stars: real parallax when the camera moves. */
export function makeMidStars(count = 2600) {
  const r = rng(11);
  const positions = []; const colors = []; const sizes = []; const phases = [];
  for (let i = 0; i < count; i += 1) {
    const d = 180 + r() * 520;
    const th = r() * Math.PI * 2; const ph = Math.acos(r() * 2 - 1);
    positions.push(d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph) * 0.7, d * Math.sin(ph) * Math.sin(th));
    const c = new THREE.Color().setHSL(0.1, 0.15, 0.6 + r() * 0.35);
    colors.push(c.r, c.g, c.b);
    sizes.push(0.35 + Math.pow(r(), 4) * 1.6);
    phases.push(r());
  }
  return makePoints({ positions, colors, sizes, phases }, pointsMaterial({ opacity: 0.85, twinkle: 0.35 }));
}

/** Out-of-focus dust close to the lens — the cue that gives the scene its depth. */
export function makeDust(count = 340) {
  const r = rng(5);
  const positions = []; const colors = []; const sizes = []; const phases = [];
  for (let i = 0; i < count; i += 1) {
    const d = 20 + r() * 170;
    const th = r() * Math.PI * 2; const ph = Math.acos(r() * 2 - 1);
    positions.push(d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph) * 0.6, d * Math.sin(ph) * Math.sin(th));
    const c = new THREE.Color().setHSL(0.08, 0.12, 0.7);
    colors.push(c.r, c.g, c.b);
    sizes.push(0.25 + r() * 0.9);
    phases.push(r());
  }
  return makePoints({ positions, colors, sizes, phases }, pointsMaterial({ opacity: 0.24, twinkle: 0.1 }));
}

// ───────────────────────────── level bodies

/** A star / sun: bright core, wide halo, optional horizontal lens streak. */
export function makeSun({ size = 3, color = WARM, flare = true, halo = 5 } = {}) {
  const g = new THREE.Group();
  const core = sprite(glowTexture(), { color, opacity: 1, scale: [size, size] });
  const haze = sprite(hazeTexture(), { color, opacity: 0.32, scale: [size * halo, size * halo] });
  g.add(haze, core);
  g.userData.glow = core;
  if (flare) g.add(sprite(flareTexture(), { color, opacity: 0.35, scale: [size * 15, size * 0.9] }));
  return g;
}

/** 宇宙: a tinted nebula cloud with a soft nucleus. */
export function makeNebula({ hue, radius = 5, seed = 1, bright = 1 }) {
  const r = rng(seed);
  const g = new THREE.Group();
  const positions = []; const colors = []; const sizes = []; const phases = [];
  const clumps = Array.from({ length: 6 }, () => [r.gauss() * radius * 0.6, r.gauss() * radius * 0.35, r.gauss() * radius * 0.6]);
  for (let i = 0; i < 1400; i += 1) {
    const c0 = clumps[i % clumps.length];
    positions.push(c0[0] + r.gauss() * radius * 0.55, c0[1] + r.gauss() * radius * 0.3, c0[2] + r.gauss() * radius * 0.55);
    const c = tint(hue + (r() - 0.5) * 40, 0.3 + r() * 0.2, 0.55 + r() * 0.35);
    colors.push(c.r, c.g, c.b);
    sizes.push(0.12 + Math.pow(r(), 3) * 0.5);
    phases.push(r());
  }
  const pts = makePoints({ positions, colors, sizes, phases }, pointsMaterial({ opacity: 0.75 * bright, twinkle: 0.2 }));
  g.add(sprite(hazeTexture(), { color: tint(hue, 0.4, 0.55), opacity: 0.38 * bright, scale: [radius * 3.4, radius * 3.4] }));
  g.add(pts);
  const core = sprite(glowTexture(), { color: tint(hue, 0.2, 0.9), opacity: 0.9 * bright, scale: [radius * 0.9, radius * 0.9] });
  g.add(core);
  g.userData.glow = core;
  g.userData.spin = (dt) => { pts.rotation.y += dt * 0.02; };
  return g;
}

/** 銀河: a tilted spiral disc of particles with a warm bulge. */
export function makeSpiral({ hue, radius = 8, arms = 2, seed = 1, bright = 1, count = 3200, tiltX = 1.0, tiltZ = 0.3 }) {
  const r = rng(seed);
  const g = new THREE.Group();
  const disc = new THREE.Group();
  const positions = []; const colors = []; const sizes = []; const phases = [];
  for (let i = 0; i < count; i += 1) {
    const arm = i % arms;
    const d = Math.pow(r(), 0.7);
    const theta = d * 3.6 + (arm * Math.PI * 2) / arms + r.gauss() * 0.42 * (1.1 - d * 0.6);
    const rad = d * radius;
    positions.push(Math.cos(theta) * rad, r.gauss() * radius * 0.04 * (1.2 - d), Math.sin(theta) * rad);
    const c = d < 0.2 ? new THREE.Color().setHSL(0.09, 0.35, 0.78 + r() * 0.15) : tint(hue + (r() - 0.5) * 30, 0.28 + r() * 0.2, 0.6 + r() * 0.3);
    colors.push(c.r, c.g, c.b);
    sizes.push((d < 0.2 ? 0.16 : 0.1) + Math.pow(r(), 4) * 0.35);
    phases.push(r());
  }
  const pts = makePoints({ positions, colors, sizes, phases }, pointsMaterial({ opacity: 0.85 * bright, twinkle: 0.15 }));
  disc.add(pts);
  disc.add(sprite(hazeTexture(), { color: new THREE.Color('#ffe9cf'), opacity: 0.45 * bright, scale: [radius * 0.9, radius * 0.9] }));
  disc.rotation.set(tiltX, 0, tiltZ);
  g.add(disc);
  const core = sprite(glowTexture(), { color: WARM, opacity: 0.95 * bright, scale: [radius * 0.45, radius * 0.45] });
  g.add(core);
  g.userData.glow = core;
  g.userData.spin = (dt) => { pts.rotation.y += dt * 0.06; };
  return g;
}

/** The galaxy you are standing in: a huge faint disc around the stage. */
export function makeGalaxyBackdrop({ hue, radius = 90, seed = 2 }) {
  const g = makeSpiral({ hue, radius, arms: 3, seed, bright: 0.45, count: 9000, tiltX: 0, tiltZ: 0 });
  g.position.y = -2.5;
  g.children[1].visible = false; // no extra bright core; the level has its own centre
  return g;
}

/** 星系 seen from its galaxy: a small sun with one visible orbit and a planet. */
export function makeSystemBody({ size = 1.6, bright = 1, hue = 40 }) {
  const g = makeSun({ size, color: new THREE.Color().setHSL(hue / 360, 0.25, 0.86), flare: bright > 0.9, halo: 4.2 });
  g.traverse((o) => { if (o.material) { o.material.userData.base *= bright; o.material.opacity *= bright; } });
  const ring = makeRing(size * 1.4, 0.22 * bright, 64);
  ring.rotation.x = 0.25;
  g.add(ring);
  const planet = sprite(glowTexture(), { color: 0xdfe8f5, opacity: 0.8 * bright, scale: [size * 0.28, size * 0.28] });
  g.add(planet);
  let a = Math.random() * 6.28;
  g.userData.spin = (dt) => { a += dt * 0.5; planet.position.set(Math.cos(a) * size * 1.4, Math.sin(a) * size * 1.4 * Math.sin(0.25) * -1, Math.sin(a) * size * 1.4 * Math.cos(0.25)); };
  return g;
}

/** 星星: a technology. */
export function makeStarBody({ size = 1, color = new THREE.Color('#e9f3ff') }) {
  const g = new THREE.Group();
  const halo = sprite(hazeTexture(), { color, opacity: 0.35, scale: [size * 3.2, size * 3.2] });
  const core = sprite(glowTexture(), { color, opacity: 1, scale: [size * 1.2, size * 1.2] });
  g.add(halo, core);
  g.userData.glow = core;
  return g;
}

/** A circular orbit in the XZ plane. */
export function makeRing(radius, opacity = 0.16, segments = 200) {
  const pts = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0xc9cfdb, transparent: true, opacity, depthWrite: false });
  mat.userData.base = opacity;
  return new THREE.LineLoop(geo, mat);
}

/** Invisible sphere used for pointer picking. */
export function makeHit(radius) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  m.userData.base = 0;
  m.userData.hit = true;
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), m);
}
