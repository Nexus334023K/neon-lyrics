/**
 * NeonLyrics - ParticleEnvironment
 * High-performance 3D ambient particle system with spatial depth and audio turbulence.
 */

class ParticleEnvironment {
  constructor(options = {}) {
    this.count = options.count || 80;
    this.particles = [];
    this.bounds = {
      x: options.boundX || 600,
      y: options.boundY || 350,
      z: options.boundZ || 900
    };
    this.focalLength = options.focalLength || 500;
    this.speed = options.speed || 1.0;

    this.init();
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * this.bounds.x * 2,
        y: (Math.random() - 0.5) * this.bounds.y * 2,
        z: Math.random() * this.bounds.z,
        vz: -(15 + Math.random() * 35) * this.speed,
        vx: (Math.random() - 0.5) * 8 * this.speed,
        vy: (Math.random() - 0.5) * 8 * this.speed,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.6,
        baseAlpha: 0.2 + Math.random() * 0.6
      });
    }
  }

  update(dt = 0.016, audioMetrics = null) {
    const energyBoost = audioMetrics ? (1.0 + (audioMetrics.energy || 0.0) * 2.0) : 1.0;
    const beatKick = (audioMetrics && audioMetrics.isBeat) ? 3.0 : 1.0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.z += p.vz * dt * energyBoost * beatKick;
      p.x += p.vx * dt * energyBoost;
      p.y += p.vy * dt * energyBoost;

      // Wrap-around in depth
      if (p.z <= 0) {
        p.z = this.bounds.z;
        p.x = (Math.random() - 0.5) * this.bounds.x * 2;
        p.y = (Math.random() - 0.5) * this.bounds.y * 2;
      } else if (p.z > this.bounds.z) {
        p.z = 1;
      }

      // Audio reactive brightness
      if (audioMetrics) {
        p.alpha = Math.min(1.0, p.baseAlpha * (1.0 + (audioMetrics.energy || 0.0) * 1.5));
      } else {
        p.alpha = p.baseAlpha;
      }
    }
  }

  render(ctx, width, height, cameraOffset = { x: 0, y: 0, z: 0 }) {
    if (!ctx) return;

    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const relX = p.x - cameraOffset.x;
      const relY = p.y - cameraOffset.y;
      const relZ = p.z - cameraOffset.z;

      if (relZ <= 10) continue; // Behind camera or near plane

      const scale = this.focalLength / relZ;
      const screenX = cx + relX * scale;
      const screenY = cy + relY * scale;

      if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) {
        continue;
      }

      const renderSize = Math.max(0.5, p.size * scale);
      ctx.beginPath();
      ctx.arc(screenX, screenY, renderSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 242, 254, ${p.alpha * Math.min(1.0, scale * 1.5)})`;
      ctx.fill();
    }
  }

  resize(width, height) {
    this.bounds.x = width * 1.2;
    this.bounds.y = height * 1.2;
  }

  dispose() {
    this.particles = [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParticleEnvironment };
}
if (typeof window !== 'undefined') {
  window.ParticleEnvironment = ParticleEnvironment;
}

