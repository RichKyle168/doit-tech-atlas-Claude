import * as THREE from 'three';
import { skyTexture } from './textures.js';
import {
  makeDust, makeGalaxyBackdrop, makeHit, makeMidStars, makeNebula, makeRing, makeSpiral, makeStarBody, makeStarField, makeSun, makeSystemBody,
} from './bodies.js';
import { rng } from './points.js';

/**
 * SpaceScene — the 3D orrery behind every level.
 *
 * Every level shares one grammar: a body at the centre, other bodies orbiting it on tilted rings.
 *   atlas    → 宇宙 orbit the 2025–2035 core
 *   universe → 銀河 orbit the universe nucleus
 *   galaxy   → 星系 orbit the galactic bulge (inside a faint galactic disc)
 *   system   → 星星 orbit the system's sun, one ring per constellation
 *
 * Everything revolves on its own; dragging (mouse or touch), a wheel / trackpad swipe or the arrow keys
 * spin the whole system, which keeps turning with a little inertia. Dragging up and down tilts the view.
 *
 * The scene is data-agnostic: React hands it a `spec` and receives picks back.
 *   spec = { key, kind, elev, center: { id, label, sub, hue, pickable }, rings: [{ r, label?, bodies: [{ id, label, sub, hue, status, kind }] }] }
 */

const FOV = 46;
const SPEED = { atlas: 0.05, universe: 0.06, galaxy: 0.08, system: 0.1 }; // rad / s on the innermost ring
const FALLOFF = 0.5; // outer rings turn slower (ω ∝ r^-0.5), like a gentler Kepler
const MAX_SPIN = 4; // rad / s
const TILT = [-0.3, 0.32]; // how far a vertical drag may tilt the view (rad)
const ease = {
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const v3 = () => new THREE.Vector3();

function setFade(root, f, skip) {
  root.traverse((o) => {
    if (skip && (o === skip || skip.getObjectById?.(o.id))) return;
    const m = o.material;
    if (!m || m.userData.hit) return;
    const base = m.userData.base ?? 1;
    if (m.uniforms?.uOpacity) m.uniforms.uOpacity.value = base * f;
    else m.opacity = base * f;
  });
}

export class SpaceScene {
  constructor({ container, labelLayer, flash, onPick, onHover }) {
    this.container = container;
    this.labelLayer = labelLayer;
    this.flashEl = flash;
    this.onPick = onPick;
    this.onHover = onHover;
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#040405');
    // the milky haze lives on an inside-out sphere that travels with the camera (always "at infinity")
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, depthTest: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 32), skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 6000);
    this.look = v3();

    this.far = makeStarField();
    this.mid = makeMidStars();
    this.dust = makeDust();
    this.scene.add(this.far, this.mid, this.dust);
    this.pointMats = [this.far.material, this.mid.material, this.dust.material];

    this.level = null;
    this.anim = null;
    this.pending = null;
    this.timeScale = 1;
    this.hoverId = null;
    this.selection = { id: null, related: [] };
    this.lines = new THREE.Group();
    this.scene.add(this.lines);
    this.flash = 0;
    this.offset = 0; this.offsetTarget = 0;
    this.pointer = { x: 0, y: 0 }; this.ps = { x: 0, y: 0 };
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2(-9, -9);
    this.tmp = v3();
    this.tmp2 = v3();

    // spinning by hand
    this.surface = container.parentElement || container; // canvas + labels
    this.drag = null;
    this.spinVel = 0;
    this.tilt = 0;
    this.dragEndAt = -1e9;

    this.onMove = (e) => {
      if (this.drag?.moved) return;
      const r = this.container.getBoundingClientRect();
      this.pointer.x = (e.clientX - r.left) / r.width - 0.5;
      this.pointer.y = (e.clientY - r.top) / r.height - 0.5;
      this.ndc.set(this.pointer.x * 2, -this.pointer.y * 2);
    };
    this.onLeave = () => { this.ndc.set(-9, -9); };
    this.onClick = () => { if (this.hoverId && this.canPick()) this.onPick(this.hoverId); };
    this.onDown = (e) => this.dragStart(e);
    this.onDragMove = (e) => this.dragMove(e);
    this.onDragEnd = (e) => this.dragEnd(e);
    this.onWheel = (e) => this.wheel(e);
    this.onKey = (e) => this.key(e);
    this.renderer.domElement.addEventListener('pointermove', this.onMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onLeave);
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.surface.addEventListener('pointerdown', this.onDown);
    this.surface.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ───────────────────────────── sizing

  resize() {
    const w = this.container.clientWidth; const h = this.container.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const scale = (h * this.renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.uScale = scale;
    if (this.level) this.level.rest = this.restFor(this.level.spec);
  }

  restFor(spec) {
    const R = Math.max(...spec.rings.map((r) => r.r)) + 4;
    const portrait = this.w / this.h < 0.8;
    // on a tall phone screen look down more steeply, so the orbits fill the height instead of a thin band
    const elev = THREE.MathUtils.degToRad(portrait ? Math.min(72, spec.elev + 20) : spec.elev);
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const tanH = tanV * (this.w / this.h);
    const dH = (R * (portrait ? 1.02 : 1.2)) / tanH + R * 0.25;
    const dV = (R * Math.sin(elev) * 1.1 + R * 0.24) / tanV;
    const dist = Math.max(dH, dV, R * 1.7);
    return { dist, elev, pos: new THREE.Vector3(0, dist * Math.sin(elev), dist * Math.cos(elev)), look: new THREE.Vector3(0, -R * (portrait ? 0.34 : 0.1), 0) }; // portrait: lift the orrery above Dr. T
  }

  setPanelOffset(px) { this.offsetTarget = px; }

  /** Keeps the frame rate up on modest GPUs by trading resolution. */
  adapt(raw) {
    this.frames = (this.frames || 0) + 1;
    this.acc = (this.acc || 0) + raw;
    if (this.acc < 2) return;
    const avg = this.acc / this.frames;
    this.acc = 0; this.frames = 0;
    const pr = this.renderer.getPixelRatio();
    const max = Math.min(window.devicePixelRatio || 1, 1.75);
    let next = pr;
    if (avg > 1 / 35) next = Math.max(0.6, pr * 0.8);
    else if (avg < 1 / 55 && pr < max) next = Math.min(max, pr * 1.15);
    if (Math.abs(next - pr) > 0.01) { this.renderer.setPixelRatio(next); this.resize(); }
  }

  // ───────────────────────────── building a level

  build(spec) {
    const group = new THREE.Group();
    const layer = document.createElement('div');
    layer.className = 'lbl-layer';
    this.labelLayer.appendChild(layer);
    const r = rng(spec.key.length + 3);
    const level = { spec, group, layer, bodies: [], ringLabels: [], spinners: [], hits: [], t: 0, spin: 0, backdrop: null };
    this.spinVel = 0;
    this.tilt = 0;

    // centre
    const c = spec.center;
    let centreObj;
    if (spec.kind === 'atlas') centreObj = makeSun({ size: 3.2, color: new THREE.Color('#f4f1ea'), flare: true, halo: 6 });
    else if (spec.kind === 'universe') centreObj = makeSun({ size: 5.5, color: new THREE.Color().setHSL(c.hue / 360, 0.3, 0.86), flare: true, halo: 7 });
    else if (spec.kind === 'galaxy') {
      centreObj = makeSun({ size: 7, color: new THREE.Color('#ffe7c8'), flare: true, halo: 6 });
      const disc = makeGalaxyBackdrop({ hue: c.hue, radius: Math.max(...spec.rings.map((x) => x.r)) * 1.9, seed: 4 });
      group.add(disc);
      level.backdrop = disc;
      level.spinners.push(disc.userData.spin);
      this.pointMats.push(disc.children[0].children[0].material);
    } else centreObj = makeSun({ size: 5.2, color: new THREE.Color('#fff0d8'), flare: true, halo: 6 });
    group.add(centreObj);
    const centre = { id: c.id, obj: centreObj, size: spec.kind === 'galaxy' ? 4 : 3, label: this.makeLabel(layer, c, 'centre', c.pickable) };
    if (c.pickable) { const hit = makeHit(3); hit.userData.id = c.id; centreObj.add(hit); level.hits.push(hit); }
    level.centre = centre;

    // rings and their bodies
    spec.rings.forEach((ring, ri) => {
      const rg = new THREE.Group();
      rg.rotation.set((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.08);
      rg.add(makeRing(ring.r, spec.kind === 'system' ? 0.2 : 0.14));
      group.add(rg);
      // every ring revolves on its own; inner rings a little faster than outer ones
      const speed = this.reduce ? 0 : SPEED[spec.kind] * Math.pow(spec.rings[0].r / ring.r, FALLOFF);
      const n = ring.bodies.length;
      const offset = ri * 2.399; // golden angle keeps rings from lining up
      ring.bodies.forEach((b, bi) => {
        let obj; let size;
        const bright = b.status === 'active' ? 1 : b.status === 'partial' ? 0.8 : 0.6;
        if (b.kind === 'nebula') { size = b.status === 'active' ? 8.5 : 6.2; obj = makeNebula({ hue: b.hue, radius: size, seed: bi + 2, bright }); }
        else if (b.kind === 'spiral') { size = 9; obj = makeSpiral({ hue: b.hue, radius: size, arms: b.arms || 2, seed: bi + 5, bright, tiltX: 1.05 + bi * 0.25, tiltZ: 0.35 - bi * 0.6 }); }
        else if (b.kind === 'system') { size = b.status === 'active' ? 2.6 : 1.6; obj = makeSystemBody({ size, bright, hue: b.hue ?? 40 }); }
        else { size = 1; obj = makeStarBody({ size }); }
        if (obj.userData.spin) level.spinners.push(obj.userData.spin);
        obj.traverse((o) => { if (o.isPoints) this.pointMats.push(o.material); });
        const hit = makeHit(Math.max(size * 0.9, 1.6));
        hit.userData.id = b.id;
        obj.add(hit);
        level.hits.push(hit);
        rg.add(obj);
        level.bodies.push({
          ...b, obj, ring: rg, r: ring.r, size, speed, phase: b.phase ?? offset + (bi / n) * Math.PI * 2,
          label: this.makeLabel(layer, b, b.kind, true),
        });
      });
      if (ring.label) {
        const el = document.createElement('span');
        el.className = 'lbl lbl--ring';
        el.textContent = ring.label;
        layer.appendChild(el);
        level.ringLabels.push({ el, ring: rg, r: ring.r });
      }
    });

    this.scene.add(group);
    level.rest = this.restFor(spec);
    this.placeBodies(level);
    return level;
  }

  makeLabel(layer, item, kind, pickable) {
    const el = document.createElement(pickable ? 'button' : 'div');
    el.className = `lbl lbl--${kind}${item.status ? ` is-${item.status}` : ''}`;
    if (pickable) {
      el.type = 'button';
      el.addEventListener('click', (e) => { e.stopPropagation(); if (this.canPick()) this.onPick(item.id); });
      el.addEventListener('mouseenter', () => this.setHover(item.id));
      el.addEventListener('mouseleave', () => this.setHover(null));
      el.addEventListener('focus', () => this.setHover(item.id));
      el.addEventListener('blur', () => this.setHover(null));
      el.setAttribute('aria-label', [item.label, item.sub, item.status === 'preview' ? '建構中' : ''].filter(Boolean).join('，'));
    }
    el.innerHTML = `<span class="lbl__name">${item.label}</span>${item.sub ? `<span class="lbl__sub">${item.sub}</span>` : ''}`;
    layer.appendChild(el);
    return el;
  }

  dispose(level) {
    this.scene.remove(level.group);
    level.group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        const i = this.pointMats.indexOf(o.material);
        if (i >= 0) this.pointMats.splice(i, 1);
        o.material.dispose();
      }
    });
    level.layer.remove();
  }

  placeBodies(level) {
    for (const b of level.bodies) {
      const a = b.phase + b.speed * level.t + level.spin;
      b.obj.position.set(Math.cos(a) * b.r, 0, Math.sin(a) * b.r);
    }
    if (level.backdrop) level.backdrop.rotation.y = -level.spin; // the galactic disc turns with the hand, too
  }

  // ───────────────────────────── spinning by hand

  /** A click right after a drag is the end of the drag, not a pick. */
  canPick() { return !this.anim && performance.now() - this.dragEndAt > 250; }

  /** Screen radius of the outermost ring, so the body under the finger follows the finger. */
  ringRadiusPx() {
    const L = this.level;
    if (!L || !this.w) return 300;
    const R = Math.max(...L.spec.rings.map((r) => r.r));
    const c = v3().project(this.camera);
    const e = new THREE.Vector3(R, 0, 0).project(this.camera);
    return Math.max(80, (Math.abs(e.x - c.x) * this.w) / 2);
  }

  dragStart(e) {
    if (this.drag || this.anim || !this.level) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, vel: 0, radius: this.ringRadiusPx(), touch: e.pointerType !== 'mouse' };
    window.addEventListener('pointermove', this.onDragMove);
    window.addEventListener('pointerup', this.onDragEnd);
    window.addEventListener('pointercancel', this.onDragEnd);
  }

  dragMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id || !this.level) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < (d.touch ? 10 : 5)) return;
      d.moved = true;
      this.spinVel = 0;
      this.setHover(null);
      this.ndc.set(-9, -9);
      this.surface.classList.add('is-dragging');
      window.dispatchEvent(new Event('atlas:spun'));
    }
    const now = performance.now();
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    // dragging right carries the near side of the orbit to the right
    const da = -dx / d.radius;
    this.level.spin += da;
    this.tilt = THREE.MathUtils.clamp(this.tilt + (dy / this.h) * 0.9, TILT[0], TILT[1]);
    const ms = Math.max(1, now - d.t);
    d.vel = d.vel * 0.6 + (da / (ms / 1000)) * 0.4;
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  }

  dragEnd(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    window.removeEventListener('pointercancel', this.onDragEnd);
    this.drag = null;
    if (!d.moved) return;
    this.surface.classList.remove('is-dragging');
    this.dragEndAt = performance.now();
    // a flick keeps the system turning; a drag that stopped before letting go does not
    const still = performance.now() - d.t > 90;
    this.spinVel = this.reduce || still ? 0 : THREE.MathUtils.clamp(d.vel, -MAX_SPIN, MAX_SPIN);
  }

  wheel(e) {
    if (!this.level || this.anim) return;
    e.preventDefault();
    if (e.ctrlKey) return; // pinch gestures: ignore rather than zoom the page
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.h : 1;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = (horizontal ? e.deltaX : e.deltaY) * unit;
    if (this.reduce) { this.level.spin += delta * 0.002; return; }
    this.spinVel = THREE.MathUtils.clamp(this.spinVel + delta * 0.0022, -MAX_SPIN, MAX_SPIN);
  }

  key(e) {
    if (!this.level || this.anim || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    if (document.activeElement?.closest?.('.panel, .src-panel')) return;
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (this.reduce) { this.level.spin += dir * 0.25; return; }
    this.spinVel = THREE.MathUtils.clamp(this.spinVel + dir * 0.9, -MAX_SPIN, MAX_SPIN);
  }

  bodyWorld(level, id) {
    if (level.centre.id === id) return level.centre.obj.getWorldPosition(v3());
    const b = level.bodies.find((x) => x.id === id);
    return b ? b.obj.getWorldPosition(v3()) : null;
  }

  bodySize(level, id) {
    const b = level.bodies.find((x) => x.id === id);
    return b ? b.size : level.centre.size;
  }

  // ───────────────────────────── navigation

  /**
   * mode: 'in'   fly into `via` (a body of the current level), arrive at the new level from afar
   *       'out'  pull back, arrive next to `via` (a body of the new level) and pull back to rest
   *       'jump' leave and arrive from afar
   */
  goTo(spec, { mode = 'jump', via = null } = {}) {
    if (this.anim) { this.pending = { spec, mode, via }; return; }
    if (!this.level) {
      this.level = this.build(spec);
      setFade(this.level.group, 0);
      this.level.layer.style.opacity = 0;
      const { pos, look } = this.level.rest;
      this.camera.position.copy(pos).multiplyScalar(2.6);
      this.look.copy(look);
      this.animate({ dur: this.reduce ? 0.01 : 2.6, ease: ease.outCubic, fromPos: this.camera.position.clone(), toPos: pos, fromLook: look, toLook: look, fade: [0, 1], target: this.level });
      return;
    }
    if (spec.key === this.level.spec.key) return;

    const old = this.level;
    const out = () => {
      this.dispose(old);
      const next = this.build(spec);
      this.level = next;
      this.setSelection(this.selection);
      setFade(next.group, 0);
      next.layer.style.opacity = 0;
      const { pos, look } = next.rest;
      if (mode === 'out' && via && this.bodyWorld(next, via)) {
        const p = this.bodyWorld(next, via);
        const from = p.clone().add(pos.clone().sub(p).normalize().multiplyScalar(this.bodySize(next, via) * 2.4));
        this.camera.position.copy(from);
        this.look.copy(p);
        this.animate({ dur: 1.7, ease: ease.inOut, fromPos: from, toPos: pos, fromLook: p, toLook: look, fade: [0, 1], target: next });
      } else {
        const from = pos.clone().multiplyScalar(2.4);
        this.camera.position.copy(from);
        this.look.copy(look);
        this.animate({ dur: 1.6, ease: ease.outCubic, fromPos: from, toPos: pos, fromLook: look, toLook: look, fade: [0, 1], target: next });
      }
    };

    if (mode === 'in' && via && this.bodyWorld(old, via)) {
      const p = this.bodyWorld(old, via);
      const to = p.clone().add(this.camera.position.clone().sub(p).normalize().multiplyScalar(this.bodySize(old, via) * 0.6));
      const keep = old.bodies.find((b) => b.id === via)?.obj;
      this.frozen = true;
      this.timeScale = 0;
      this.spinVel = 0;
      this.animate({ dur: 1.15, ease: ease.inCubic, fromPos: this.camera.position.clone(), toPos: to, fromLook: this.look.clone(), toLook: p, fade: [1, 0], target: old, keep, then: () => { this.flash = 1; this.frozen = false; out(); } });
    } else {
      const to = this.camera.position.clone().multiplyScalar(mode === 'out' ? 2.4 : 2.0);
      this.animate({ dur: 0.85, ease: ease.inCubic, fromPos: this.camera.position.clone(), toPos: to, fromLook: this.look.clone(), toLook: this.look.clone(), fade: [1, 0], target: old, then: out });
    }
  }

  animate(a) { this.anim = { ...a, dur: this.reduce ? 0.01 : a.dur, t: 0 }; }

  finishAnim() {
    if (this.pending) { const p = this.pending; this.pending = null; this.goTo(p.spec, p); }
  }

  // ───────────────────────────── interaction state

  setHover(id) {
    if (this.hoverId === id) return;
    this.hoverId = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
    this.onHover?.(id);
  }

  setSelection(sel) {
    this.selection = sel;
    this.lines.clear();
    if (!this.level || !sel.id) return;
    for (const rel of sel.related) {
      const geo = new THREE.BufferGeometry().setFromPoints([v3(), v3()]);
      const mat = new THREE.LineBasicMaterial({ color: 0xf3e6cc, transparent: true, opacity: 0.75, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      line.userData = { from: sel.id, to: rel.id };
      this.lines.add(line);
    }
  }

  // ───────────────────────────── frame

  tick() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05); // simulation step (orbits, drift)
    const adt = Math.min(raw, 0.25); // wall-clock step for flights, so slow devices still arrive on time
    const t = this.clock.elapsedTime;
    this.adapt(raw);
    const L = this.level;
    if (!L) return;

    // orbits slow right down while the visitor is aiming at something or reading
    const want = this.frozen ? 0 : this.hoverId ? 0.08 : this.selection.id ? 0.3 : 1;
    this.timeScale += (want - this.timeScale) * Math.min(1, dt * 4);
    L.t += dt * this.timeScale;
    // inertia after a flick or a wheel turn
    if (!this.drag && !this.frozen && Math.abs(this.spinVel) > 1e-4) {
      L.spin += this.spinVel * dt;
      this.spinVel *= Math.exp(-dt * 1.6);
    }
    // a tilt eases back to the level's own angle once the hand lets go
    if (!this.drag?.moved) this.tilt += (0 - this.tilt) * Math.min(1, dt * 0.7);
    this.placeBodies(L);
    for (const s of L.spinners) s(dt * (this.reduce ? 0 : 1));
    if (!this.reduce) { this.far.rotation.y += dt * 0.0015; this.dust.rotation.y += dt * 0.006; this.mid.rotation.y += dt * 0.003; }

    // camera
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + adt / a.dur);
      const k = a.ease(a.t);
      this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
      this.look.lerpVectors(a.fromLook, a.toLook, k);
      const f = a.fade[0] + (a.fade[1] - a.fade[0]) * (a.fade[1] > a.fade[0] ? Math.min(1, a.t * 1.4) : k);
      setFade(a.target.group, f, a.keep);
      a.target.layer.style.opacity = f;
      if (a.t >= 1) {
        this.anim = null;
        if (a.then) a.then();
        else this.finishAnim();
      }
    } else {
      const { look } = L.rest;
      const elev = THREE.MathUtils.clamp(L.rest.elev + this.tilt, 0.1, 1.38);
      const pos = this.tmp2.set(0, L.rest.dist * Math.sin(elev), L.rest.dist * Math.cos(elev));
      this.ps.x += (this.pointer.x - this.ps.x) * Math.min(1, dt * 1.2);
      this.ps.y += (this.pointer.y - this.ps.y) * Math.min(1, dt * 1.2);
      const drift = this.reduce ? 0 : 1;
      const target = this.tmp.copy(pos).add(new THREE.Vector3(
        (this.ps.x * 0.06 + Math.sin(t * 0.07) * 0.01) * L.rest.dist * drift,
        (-this.ps.y * 0.04 + Math.sin(t * 0.05) * 0.008) * L.rest.dist * drift,
        0,
      ));
      this.camera.position.lerp(target, Math.min(1, dt * (this.drag?.moved ? 6 : 2)));
      this.look.lerp(look, Math.min(1, dt * 2));
    }
    this.camera.lookAt(this.look);
    this.sky.position.copy(this.camera.position);

    // shift the picture left while the reading panel is open
    this.offset += (this.offsetTarget - this.offset) * Math.min(1, dt * 5);
    if (Math.abs(this.offset) > 0.5) this.camera.setViewOffset(this.w, this.h, this.offset, 0, this.w, this.h);
    else this.camera.clearViewOffset();

    for (const m of this.pointMats) { m.uniforms.uTime.value = t; m.uniforms.uScale.value = this.uScale; }

    // pointer picking
    if (!this.anim && !this.drag?.moved && this.ndc.x > -2) {
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const hit = this.raycaster.intersectObjects(L.hits, false)[0];
      const id = hit?.object.userData.id || null;
      if (id !== this.hoverId && !(this.hoverId && document.activeElement?.classList?.contains('lbl'))) this.setHover(id);
    }

    this.updateHighlights(L);
    this.updateLines(L);
    this.updateLabels(L);

    if (this.flash > 0) { this.flash = Math.max(0, this.flash - adt * 1.6); }
    if (this.flashEl) this.flashEl.style.opacity = (this.flash * 0.55).toFixed(3);

    this.renderer.render(this.scene, this.camera);
  }

  updateHighlights(L) {
    const sel = this.selection;
    const rel = new Set(sel.related.map((r) => r.id));
    for (const b of L.bodies) {
      const glow = b.obj.userData.glow;
      const on = b.id === this.hoverId || b.id === sel.id;
      const target = b.id === sel.id ? 1.9 : on ? 1.5 : rel.has(b.id) ? 1.35 : 1;
      const s = (b.obj.userData.scale ?? 1) + (target - (b.obj.userData.scale ?? 1)) * 0.15;
      b.obj.userData.scale = s;
      if (glow) { const base = glow.userData.baseScale ||= glow.scale.x; glow.scale.setScalar(base * s); }
      b.label.classList.toggle('is-hover', b.id === this.hoverId);
      b.label.classList.toggle('is-selected', b.id === sel.id);
      b.label.classList.toggle('is-related', rel.has(b.id));
      b.label.classList.toggle('is-dim', Boolean(sel.id) && b.id !== sel.id && !rel.has(b.id));
    }
    L.centre.label.classList.toggle('is-hover', L.centre.id === this.hoverId);
  }

  updateLines(L) {
    for (const line of this.lines.children) {
      const a = this.bodyWorld(L, line.userData.from); const b = this.bodyWorld(L, line.userData.to);
      if (!a || !b) { line.visible = false; continue; }
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z);
      pos.needsUpdate = true;
    }
  }

  updateLabels(L) {
    const cam = this.camera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const items = [];
    const project = (el, world, sizeWorld, gap, prio) => {
      const d = cam.position.distanceTo(world);
      const p = world.clone().project(cam);
      if (p.z > 1 || d < 1) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      if (!el._w) { el._w = el.offsetWidth; el._h = el.offsetHeight; }
      const ppu = this.h / 2 / (d * tanV);
      items.push({
        el, d, prio,
        x: (p.x * 0.5 + 0.5) * this.w,
        y: (-p.y * 0.5 + 0.5) * this.h + sizeWorld * ppu * 0.5 + gap + el._h / 2, // label centre, just below the body
        near: THREE.MathUtils.clamp(1.25 - (d - L.rest.dist * 0.75) / (L.rest.dist * 0.9), 0.5, 1),
      });
    };
    const w = v3();
    const sel = this.selection.id; const hov = this.hoverId;
    for (const b of L.bodies) {
      b.obj.getWorldPosition(w);
      project(b.label, w, b.size * (b.kind === 'spiral' ? 1.4 : b.kind === 'nebula' ? 1.2 : 1), 6, b.id === sel || b.id === hov ? 3 : b.status === 'active' ? 1 : 0);
    }
    L.centre.obj.getWorldPosition(w);
    project(L.centre.label, w, L.centre.size * 1.1, 10, 2);

    // greedy de-overlap: important and nearer labels keep their place, the rest step aside vertically
    items.sort((a, b) => b.prio - a.prio || a.d - b.d);
    const placed = [];
    for (const it of items) {
      let y = it.y;
      for (let pass = 0; pass < 6; pass += 1) {
        const hit = placed.find((o) => Math.abs(o.x - it.x) < (o.el._w + it.el._w) / 2 + 4 && Math.abs(o.y - y) < (o.el._h + it.el._h) / 2 + 1);
        if (!hit) break;
        y = y >= hit.y ? hit.y + (hit.el._h + it.el._h) / 2 + 2 : hit.y - (hit.el._h + it.el._h) / 2 - 2;
      }
      // keep labels of on-screen bodies inside the screen (narrow phones)
      if (it.x > 0 && it.x < this.w) it.x = THREE.MathUtils.clamp(it.x, it.el._w / 2 + 6, this.w - it.el._w / 2 - 6);
      it.el._y = it.el._y == null || Math.abs(it.el._y - y) > 80 ? y : it.el._y + (y - it.el._y) * 0.2;
      placed.push({ ...it, y: it.el._y });
      it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${(it.el._y - it.el._h / 2).toFixed(1)}px, 0) translateX(-50%)`;
      it.el.style.setProperty('--depth', it.near.toFixed(2));
      it.el.style.zIndex = String(Math.round(2000 - it.d + it.prio * 500));
    }

    for (const rl of L.ringLabels) {
      w.set(0, 0, rl.r).applyMatrix4(rl.ring.matrixWorld);
      const p = w.clone().project(cam);
      rl.el.style.transform = `translate3d(${((p.x * 0.5 + 0.5) * this.w).toFixed(1)}px, ${((-p.y * 0.5 + 0.5) * this.h - 16).toFixed(1)}px, 0) translateX(-50%)`;
    }
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.surface.removeEventListener('pointerdown', this.onDown);
    this.surface.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    window.removeEventListener('pointercancel', this.onDragEnd);
    if (this.level) this.dispose(this.level);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
