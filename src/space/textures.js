import * as THREE from 'three';

/** Procedural textures — everything is drawn on canvas at start-up, nothing is downloaded. */

const cache = {};
const once = (key, make) => (cache[key] ||= make());

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bright point with a soft halo — stars, suns, cores. */
export const glowTexture = () => once('glow', () => canvasTexture(256, 256, (g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.06, 'rgba(255,255,255,0.95)');
  r.addColorStop(0.16, 'rgba(255,255,255,0.42)');
  r.addColorStop(0.36, 'rgba(255,255,255,0.12)');
  r.addColorStop(0.7, 'rgba(255,255,255,0.03)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
}));

/** Wide, soft falloff without a hot centre — halos and nebula haze. */
export const hazeTexture = () => once('haze', () => canvasTexture(256, 256, (g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  r.addColorStop(0.7, 'rgba(255,255,255,0.05)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
}));

/** Horizontal lens streak, like a bright sun photographed through glass. */
export const flareTexture = () => once('flare', () => canvasTexture(512, 64, (g, w, h) => {
  const x = g.createLinearGradient(0, 0, w, 0);
  x.addColorStop(0, 'rgba(255,255,255,0)');
  x.addColorStop(0.42, 'rgba(255,255,255,0.25)');
  x.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  x.addColorStop(0.58, 'rgba(255,255,255,0.25)');
  x.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = x; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const y = g.createLinearGradient(0, 0, 0, h);
  y.addColorStop(0, 'rgba(0,0,0,0)');
  y.addColorStop(0.5, 'rgba(0,0,0,1)');
  y.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = y; g.fillRect(0, 0, w, h);
}));

/**
 * Equirectangular sky: a tilted band of milky haze with darker dust lanes.
 * Only haze lives here; individual stars are real 3D points so they keep their parallax.
 */
export const skyTexture = () => once('sky', () => canvasTexture(2048, 1024, (g, W, H) => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
  g.fillStyle = '#040405';
  g.fillRect(0, 0, W, H);

  const tilt = 0.32; // band inclination (rad)
  const lon0 = 0.6;
  const bandLat = (lon) => Math.atan(Math.tan(tilt) * Math.sin(lon - lon0));
  const toXY = (lon, lat) => [((lon + Math.PI) / (2 * Math.PI)) * W, (0.5 - lat / Math.PI) * H];

  const blob = (x, y, r, color) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // broad glow of the band
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 1400; i += 1) {
    const lon = rnd() * Math.PI * 2 - Math.PI;
    const lat = bandLat(lon) + gauss() * 0.13;
    const [x, y] = toXY(lon, lat);
    const warm = 120 + Math.floor(rnd() * 40);
    blob(x, y, 24 + rnd() * 70, `rgba(${warm},${warm - 8},${warm - 22},${0.011 + rnd() * 0.013})`);
  }
  // brighter clumps
  for (let i = 0; i < 700; i += 1) {
    const lon = rnd() * Math.PI * 2 - Math.PI;
    const lat = bandLat(lon) + gauss() * 0.06;
    const [x, y] = toXY(lon, lat);
    blob(x, y, 6 + rnd() * 20, `rgba(200,190,175,${0.018 + rnd() * 0.026})`);
  }
  // dust lanes
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 700; i += 1) {
    const lon = rnd() * Math.PI * 2 - Math.PI;
    const lat = bandLat(lon) + gauss() * 0.035 + Math.sin(lon * 3) * 0.02;
    const [x, y] = toXY(lon, lat);
    blob(x, y, 8 + rnd() * 26, `rgba(3,3,4,${0.08 + rnd() * 0.1})`);
  }
  // faint cool and warm patches far from the band
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i += 1) {
    const [x, y] = [rnd() * W, rnd() * H];
    blob(x, y, 80 + rnd() * 200, rnd() > 0.5 ? 'rgba(60,70,100,0.012)' : 'rgba(100,80,60,0.01)');
  }
}));
