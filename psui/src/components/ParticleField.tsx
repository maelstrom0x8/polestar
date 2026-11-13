import { useEffect, useRef } from "react";
import { Noise2D, curl2D } from "../lib/curlNoise";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  depth: number;
  depthPhase: number;
  depthFreq: number;
  radius: number;
  baseAlpha: number;
  speedScale: number;
  orbitSign: 1 | -1;
  homeRadiusX: number;
  homeRadiusY: number;
  angle: number;
}

// "Several hundred... individually visible": a large elliptical/toroidal
// formation, not a sparse scatter.
const PARTICLE_COUNT = 520;
const MARGIN_FACTOR = 0.1;

const MOTION_NOISE_SCALE = 0.0018;
const MOTION_TIME_SCALE = 0.00007;
const COLOR_NOISE_SCALE = 0.0009;
const CENTER_DRIFT_SCALE = 0.00003;
const CENTER_DRIFT_RADIUS_X = 0.1;
const CENTER_DRIFT_RADIUS_Y = 0.08;

const SWIRL_SPEED = 0.2;
const CURL_STRENGTH = 0.05;
const RADIAL_SPRING = 0.006;
const DAMPING = 0.985;

const CURSOR_RADIUS = 170;
const CURSOR_PULL = 0.5;
const CURSOR_SWIRL = 1.0;

/**
 * Restrained and blue-dominant, matching the reference stills: blue
 * alone reads as the majority of any given frame, indigo/violet are
 * close relatives rather than equally-weighted alternatives, and
 * coral/orange/yellow are rare accents, not a quarter of the field.
 */
const HUE_BUCKETS: ReadonlyArray<{ hue: number; weight: number }> = [
  { hue: 225, weight: 0.42 }, // --signal blue
  { hue: 242, weight: 0.24 }, // indigo
  { hue: 268, weight: 0.14 }, // violet
  { hue: 8, weight: 0.14 }, // muted coral/red
  { hue: 30, weight: 0.04 }, // orange accent
  { hue: 62, weight: 0.02 }, // --electric yellow accent
];
const HUE_CUMULATIVE = (() => {
  let sum = 0;
  return HUE_BUCKETS.map((b) => (sum += b.weight));
})();
const HUE_TOTAL = HUE_CUMULATIVE[HUE_CUMULATIVE.length - 1];

function hueFromNoise(sample: number): number {
  const t = ((sample + 1) / 2) * HUE_TOTAL;
  for (let i = 0; i < HUE_CUMULATIVE.length; i++) {
    if (t <= HUE_CUMULATIVE[i]) return HUE_BUCKETS[i].hue;
  }
  return HUE_BUCKETS[HUE_BUCKETS.length - 1].hue;
}

const SATURATION = 58;

// Roughly the hero's left-aligned text column (nav + headline + subhead +
// CTA), where density and opacity are reduced so the ring never competes
// with legibility, expressed as canvas fractions so it scales with width.
const TEXT_ZONE = { x0: 0, x1: 0.68, y0: 0.3, y1: 0.86 };

export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx2d = canvasEl.getContext("2d");
    if (!ctx2d) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctx2d;

    const motionNoise = new Noise2D(2025);
    const colorNoise = new Noise2D(7331);
    const centerNoise = new Noise2D(4242);
    const particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let width = 0;
    let height = 0;
    let marginX = 0;
    let marginY = 0;
    let dpr = 1;
    let frame = 0;
    let raf = 0;

    function inTextZone(x: number, y: number): boolean {
      return (
        x >= TEXT_ZONE.x0 * width &&
        x <= TEXT_ZONE.x1 * width &&
        y >= TEXT_ZONE.y0 * height &&
        y <= TEXT_ZONE.y1 * height
      );
    }

    function spawnParticle(): Particle {
      // An elliptical/toroidal distribution around the hero's own center:
      // a minimum radius fraction keeps the middle relatively clear, and
      // the bias toward larger fractions puts most particles in a broad
      // band reaching toward and past the viewport edges.
      const angle = Math.random() * Math.PI * 2;
      const rFrac = 0.28 + 0.75 * Math.pow(Math.random(), 0.75);
      const semiX = width * 0.5;
      const semiY = height * 0.48;
      let x = width * 0.5 + Math.cos(angle) * rFrac * semiX;
      let y = height * 0.5 + Math.sin(angle) * rFrac * semiY;

      // A handful of retries if we land deep in the text zone, so density
      // there is reduced without carving an artificial hard-edged hole.
      for (let attempt = 0; attempt < 3 && inTextZone(x, y) && Math.random() > 0.55; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.28 + 0.75 * Math.pow(Math.random(), 0.75);
        x = width * 0.5 + Math.cos(a) * r * semiX;
        y = height * 0.5 + Math.sin(a) * r * semiY;
      }

      const depth = Math.random();
      const hue = hueFromNoise(colorNoise.sample(x * COLOR_NOISE_SCALE, y * COLOR_NOISE_SCALE));
      const densityPenalty = inTextZone(x, y) ? 0.5 : 1;

      return {
        x,
        y,
        vx: 0,
        vy: 0,
        hue,
        depth,
        depthPhase: Math.random() * Math.PI * 2,
        depthFreq: 0.004 + Math.random() * 0.006,
        radius: 0.5 + depth * 1.4,
        baseAlpha: (0.18 + depth * 0.62) * densityPenalty,
        speedScale: 0.55 + depth * 0.75,
        orbitSign: Math.random() < 0.5 ? 1 : -1,
        homeRadiusX: rFrac * semiX,
        homeRadiusY: rFrac * semiY,
        angle,
      };
    }

    function seedParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle());
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      marginX = width * MARGIN_FACTOR;
      marginY = height * MARGIN_FACTOR;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function onPointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    }

    function onPointerLeave() {
      pointer.active = false;
    }

    function fieldCenter(): readonly [number, number] {
      // The orbit's center drifts slowly along its own low-frequency
      // path (the whole formation gradually shifts, never a rigid
      // fixed-point rotation), but stays near the hero's true center
      // (never pinned to an edge or corner).
      const t = frame * CENTER_DRIFT_SCALE;
      const driftX = centerNoise.sample(t, 0) * width * CENTER_DRIFT_RADIUS_X;
      const driftY = centerNoise.sample(0, t) * height * CENTER_DRIFT_RADIUS_Y;
      return [width * 0.5 + driftX, height * 0.5 + driftY];
    }

    function step() {
      frame++;
      ctx.clearRect(0, 0, width, height);

      const [cx, cy] = fieldCenter();

      for (const p of particles) {
        const rx = p.x - cx;
        const ry = p.y - cy;
        const dist = Math.hypot(rx, ry) || 1;
        const homeRadius = Math.hypot(p.homeRadiusX, p.homeRadiusY) || 1;

        // Tangential (orbital) term: perpendicular to the radius vector,
        // so particles sweep around the center instead of approaching or
        // receding from it.
        const tangentSpeed = SWIRL_SPEED * p.speedScale * p.orbitSign;
        p.vx += (-ry / dist) * tangentSpeed;
        p.vy += (rx / dist) * tangentSpeed;

        // A gentle spring back toward each particle's own home radius:
        // keeps the ring's shape stable over an arbitrarily long session
        // without constraining instant-to-instant organic variation.
        const radialError = homeRadius - dist;
        p.vx += (rx / dist) * radialError * RADIAL_SPRING;
        p.vy += (ry / dist) * radialError * RADIAL_SPRING;

        // Curl noise: organic variation so particles don't all trace the
        // same clean ellipse: some wider arcs, some tighter curves.
        const [ncx, ncy] = curl2D(
          motionNoise,
          p.x * MOTION_NOISE_SCALE,
          p.y * MOTION_NOISE_SCALE + frame * MOTION_TIME_SCALE,
        );
        p.vx += ncx * CURL_STRENGTH * p.speedScale;
        p.vy += ncy * CURL_STRENGTH * p.speedScale;

        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const pdist = Math.hypot(dx, dy);
          if (pdist < CURSOR_RADIUS && pdist > 0.01) {
            const falloff = 1 - pdist / CURSOR_RADIUS;
            p.vx += (dx / pdist) * falloff * CURSOR_PULL * 0.05;
            p.vy += (dy / pdist) * falloff * CURSOR_PULL * 0.05;
            p.vx += (-dy / pdist) * falloff * CURSOR_SWIRL * 0.05;
            p.vy += (dx / pdist) * falloff * CURSOR_SWIRL * 0.05;
          }
        }

        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -marginX) p.x = width + marginX;
        if (p.x > width + marginX) p.x = -marginX;
        if (p.y < -marginY) p.y = height + marginY;
        if (p.y > height + marginY) p.y = -marginY;
      }

      ctx.lineCap = "round";
      for (const p of particles) {
        // A slow depth oscillation (the "subtle movement perpendicular
        // to the orbital plane") modulates size/opacity a little over
        // time so the formation isn't a static ring of fixed dots.
        const wobble = Math.sin(frame * p.depthFreq + p.depthPhase);
        const liveDepth = Math.min(1, Math.max(0, p.depth + wobble * 0.12));
        const radius = 0.5 + liveDepth * 1.4;
        const alpha = p.baseAlpha * (0.75 + liveDepth * 0.5);

        // Short directional dashes rather than dots: length tracks
        // current speed (with a floor so slow particles stay visible).
        const speed = Math.hypot(p.vx, p.vy);
        const dashLen = Math.max(1.6, Math.min(7, speed * 5)) * (0.6 + liveDepth * 0.8);
        const dirLen = speed > 0.02 ? speed : 1;
        const ux = p.vx / dirLen;
        const uy = p.vy / dirLen;

        ctx.beginPath();
        ctx.moveTo(p.x - ux * dashLen * 0.5, p.y - uy * dashLen * 0.5);
        ctx.lineTo(p.x + ux * dashLen * 0.5, p.y + uy * dashLen * 0.5);
        ctx.strokeStyle = `hsl(${p.hue} ${SATURATION}% ${40 + liveDepth * 22}% / ${alpha})`;
        ctx.lineWidth = radius;
        ctx.stroke();
      }

      raf = requestAnimationFrame(step);
    }

    resize();
    raf = requestAnimationFrame(step);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
