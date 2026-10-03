import * as THREE from 'three';

/**
 * Soft, twinkling point sprites.
 *  attenuate = true  → size in world units, shrinks with distance (dust, galaxies, nebulae)
 *  attenuate = false → size in pixels (the distant star field)
 */
export function pointsMaterial({ attenuate = true, opacity = 1, twinkle = 0.25 } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 400 },
      uOpacity: { value: opacity },
      uTwinkle: { value: twinkle },
      uAttenuate: { value: attenuate ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float phase;
      attribute vec3 color;
      uniform float uTime, uScale, uOpacity, uTwinkle, uAttenuate;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 1.0 - uTwinkle + uTwinkle * sin(uTime * (0.6 + phase * 1.8) + phase * 40.0);
        vColor = color;
        float px = uAttenuate > 0.5 ? size * uScale / max(-mv.z, 0.001) : size;
        // tiny points get dimmer instead of disappearing
        vAlpha = tw * uOpacity * clamp(px / 1.5, 0.15, 1.0);
        gl_PointSize = clamp(px, 1.0, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a;
        gl_FragColor = vec4(vColor, a * vAlpha);
      }`,
  });
  m.userData.base = opacity;
  return m;
}

/** Builds a Points object from arrays. */
export function makePoints({ positions, colors, sizes, phases }, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  g.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const p = new THREE.Points(g, material);
  p.frustumCulled = false;
  return p;
}

export function rng(seed = 1) {
  let s = Math.floor(seed * 9973) % 2147483647 || 1;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  r.gauss = () => (r() + r() + r() + r() - 2) / 2;
  return r;
}
