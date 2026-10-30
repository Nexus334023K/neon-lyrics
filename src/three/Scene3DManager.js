/**
 * NeonLyrics - Scene3DManager
 * Spatial 3D scene orchestrator with perspective camera trajectories and depth particle environments.
 */

const { ParticleEnvironment } = (typeof module !== 'undefined' && module.exports)
  ? require('./ParticleEnvironment')
  : { ParticleEnvironment: window.ParticleEnvironment };

class Scene3DManager {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.depth = options.depth || 800;
    this.cameraFov = options.cameraFov || 60;
    this.cameraMotion = options.cameraMotion || 'orbit'; // 'orbit' | 'tunnel' | 'static' | 'dynamic'
    this.particleField = options.particleField !== undefined ? Boolean(options.particleField) : true;
    this.audioReactivity = options.audioReactivity !== undefined ? Boolean(options.audioReactivity) : true;

    this.canvas = null;
    this.ctx = null;
    this.particles = new ParticleEnvironment({ count: 60 });

    this.camera = {
      x: 0,
      y: 0,
      z: 0,
      rotX: 0,
      rotY: 0
    };

    this._time = 0;
    this._width = 800;
    this._height = 240;
    this._beatZoom = 0.0;
  }

  attach(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    if (typeof canvas.getContext === 'function') {
      this.ctx = canvas.getContext('2d');
    }
    this.resize(canvas.width || 800, canvas.height || 240);
  }

  detach() {
    this.canvas = null;
    this.ctx = null;
    this.particles.dispose();
  }

  applyConfig(config = {}) {
    if (config.enabled !== undefined) this.enabled = Boolean(config.enabled);
    if (config.depth !== undefined) this.depth = config.depth;
    if (config.cameraFov !== undefined) this.cameraFov = config.cameraFov;
    if (config.cameraMotion) this.cameraMotion = config.cameraMotion;
    if (config.particleField !== undefined) this.particleField = Boolean(config.particleField);
    if (config.audioReactivity !== undefined) this.audioReactivity = Boolean(config.audioReactivity);

    if (!this.enabled && this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this._width, this._height);
    }
  }

  resize(width, height) {
    this._width = Math.max(10, width);
    this._height = Math.max(10, height);
    if (this.canvas) {
      this.canvas.width = this._width;
      this.canvas.height = this._height;
    }
    this.particles.resize(this._width, this._height);
  }

  /**
   * Called per frame by RenderScheduler.
   */
  tick(dt = 0.016, audioMetrics = null) {
    if (!this.enabled) return;

    this._time += dt;

    // Camera Motion Trajectories
    this._updateCamera(dt, audioMetrics);

    // Update Particles
    if (this.particleField) {
      const metrics = this.audioReactivity ? audioMetrics : null;
      this.particles.update(dt, metrics);
    }

    // Render Canvas
    this._render();
  }

  _updateCamera(dt, audioMetrics) {
    // Audio beat push
    if (this.audioReactivity && audioMetrics && audioMetrics.isBeat) {
      this._beatZoom = 25.0 * (audioMetrics.beatConfidence || 1.0);
    } else {
      this._beatZoom = Math.max(0.0, this._beatZoom - dt * 60.0);
    }

    switch (this.cameraMotion) {
      case 'tunnel':
        this.camera.z = (this._time * 40.0) % 500;
        this.camera.x = Math.sin(this._time * 0.5) * 20.0;
        this.camera.y = Math.cos(this._time * 0.4) * 10.0;
        break;

      case 'dynamic':
        this.camera.x = Math.sin(this._time * 1.2) * 35.0;
        this.camera.y = Math.cos(this._time * 0.9) * 18.0;
        this.camera.z = -this._beatZoom;
        break;

      case 'static':
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.z = -this._beatZoom * 0.5;
        break;

      case 'orbit':
      default:
        this.camera.x = Math.sin(this._time * 0.4) * 25.0;
        this.camera.y = Math.sin(this._time * 0.3) * 12.0;
        this.camera.z = Math.cos(this._time * 0.35) * 15.0 - this._beatZoom;
        break;
    }
  }

  _render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this._width, this._height);

    if (this.particleField) {
      this.particles.render(this.ctx, this._width, this._height, this.camera);
    }
  }

  getCameraState() {
    return {
      x: this.camera.x,
      y: this.camera.y,
      z: this.camera.z,
      depth: this.depth,
      fov: this.cameraFov,
      motion: this.cameraMotion
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Scene3DManager };
}
if (typeof window !== 'undefined') {
  window.Scene3DManager = Scene3DManager;
}

