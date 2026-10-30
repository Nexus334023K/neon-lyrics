/**
 * NeonLyrics V3 - CanvasRenderer
 * High-performance Canvas 2D fallback renderer.
 * Emulates multi-layer glow, blend modes, and transparent overlays
 * when WebGL 2.0 is unavailable or disabled.
 */

class CanvasRenderer {
  constructor(options = {}) {
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.isReady = false;
  }

  initialize(canvas) {
    if (!canvas) {
      throw new Error('[CanvasRenderer] Canvas element is required.');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    if (!this.ctx) {
      throw new Error('[CanvasRenderer] Unable to obtain 2D rendering context.');
    }
    this.isReady = true;
    this.resize(this.canvas.width || 800, this.canvas.height || 200);
    return true;
  }

  resize(width, height) {
    if (!this.canvas) return;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  render(sceneData = {}, config = {}) {
    if (!this.ctx || !this.isReady) return;

    this.clear();
    const glowConfig = config.glow || {};
    const glowEnabled = glowConfig.enabled !== false;
    const baseColor = glowConfig.color || config.primaryColor || '#00f2fe';
    const intensity = typeof glowConfig.intensity === 'number' ? glowConfig.intensity : 0.8;
    const radius = typeof glowConfig.radius === 'number' ? glowConfig.radius : 0.5;

    const layers = Array.isArray(glowConfig.layers) && glowConfig.layers.length > 0
      ? glowConfig.layers
      : [
          { radiusMultiplier: 0.3, intensityMultiplier: 1.0, color: baseColor },
          { radiusMultiplier: 0.8, intensityMultiplier: 0.6, color: baseColor },
          { radiusMultiplier: 1.6, intensityMultiplier: 0.3, color: baseColor }
        ];

    const lines = sceneData.lines || [];
    if (!lines.length && sceneData.text) {
      lines.push({ text: sceneData.text, x: this.width / 2, y: this.height / 2, style: {} });
    }

    this.ctx.save();

    for (const item of lines) {
      if (!item.text) continue;

      const font = item.font || `${item.fontSize || 32}px ${item.fontFamily || 'Outfit, sans-serif'}`;
      this.ctx.font = font;
      this.ctx.textAlign = item.textAlign || 'center';
      this.ctx.textBaseline = item.textBaseline || 'middle';
      const x = item.x !== undefined ? item.x : this.width / 2;
      const y = item.y !== undefined ? item.y : this.height / 2;
      const fill = item.color || '#ffffff';

      if (glowEnabled) {
        // Render multi-layer blur passes
        for (const layer of layers) {
          this.ctx.save();
          this.ctx.shadowColor = layer.color || baseColor;
          this.ctx.shadowBlur = Math.round(25 * radius * (layer.radiusMultiplier || 1.0));
          this.ctx.fillStyle = layer.color || baseColor;
          this.ctx.globalAlpha = Math.min(1.0, intensity * (layer.intensityMultiplier || 0.5));
          this.ctx.fillText(item.text, x, y);
          this.ctx.restore();
        }
      }

      // Crisp core glyph render
      this.ctx.save();
      this.ctx.fillStyle = fill;
      this.ctx.globalAlpha = item.opacity !== undefined ? item.opacity : 1.0;
      this.ctx.fillText(item.text, x, y);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  dispose() {
    this.isReady = false;
    this.canvas = null;
    this.ctx = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CanvasRenderer };
}
if (typeof window !== 'undefined') {
  window.CanvasRenderer = CanvasRenderer;
}

