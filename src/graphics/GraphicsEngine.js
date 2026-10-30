/**
 * NeonLyrics V3 - GraphicsEngine
 * Central orchestration facade for GPU and Canvas rendering.
 * Coordinates WebGL 2.0, Canvas 2D fallback, RenderScheduler, and post-processing passes.
 */

const { RenderScheduler } = require('./RenderScheduler');
const { WebGLRenderer } = require('./WebGLRenderer');
const { CanvasRenderer } = require('./CanvasRenderer');

class GraphicsEngine {
  constructor(options = {}) {
    this.canvas = null;
    this.options = options;
    this.scheduler = new RenderScheduler({
      targetFps: options.targetFps || 'auto',
      displayRefreshRate: options.displayRefreshRate || 60
    });

    this.activeRendererType = 'none'; // 'webgl2' | 'webgl' | 'canvas' | 'none'
    this.webglRenderer = null;
    this.canvasRenderer = null;
    this.isInitialized = false;

    this.lastSceneData = null;
    this.lastConfig = null;
    this._renderFrame = this._renderFrame.bind(this);
  }

  static detectCapabilities() {
    if (typeof document === 'undefined') {
      return {
        webgl2: false,
        webgl: false,
        canvas2d: true,
        maxTextureSize: 2048,
        floatTextures: false,
        vendor: 'Headless/Node',
        renderer: 'Software'
      };
    }

    try {
      const c = document.createElement('canvas');
      const gl2 = c.getContext('webgl2');
      if (gl2) {
        const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
        return {
          webgl2: true,
          webgl: true,
          canvas2d: true,
          maxTextureSize: gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 4096,
          floatTextures: true,
          vendor: dbg ? gl2.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'Unknown',
          renderer: dbg ? gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'Unknown'
        };
      }
      const gl1 = c.getContext('webgl');
      if (gl1) {
        const dbg = gl1.getExtension('WEBGL_debug_renderer_info');
        return {
          webgl2: false,
          webgl: true,
          canvas2d: true,
          maxTextureSize: gl1.getParameter(gl1.MAX_TEXTURE_SIZE) || 2048,
          floatTextures: Boolean(gl1.getExtension('OES_texture_float')),
          vendor: dbg ? gl1.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'Unknown',
          renderer: dbg ? gl1.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'Unknown'
        };
      }
    } catch (e) {}

    return {
      webgl2: false,
      webgl: false,
      canvas2d: true,
      maxTextureSize: 2048,
      floatTextures: false,
      vendor: 'Fallback',
      renderer: 'Canvas 2D'
    };
  }

  initialize(canvas, preferFallback = false) {
    if (!canvas) {
      throw new Error('[GraphicsEngine] Canvas element must be provided.');
    }
    this.canvas = canvas;

    if (!preferFallback) {
      try {
        const glR = new WebGLRenderer(this.options);
        glR.initialize(canvas);
        this.webglRenderer = glR;
        this.activeRendererType = glR.isWebGL2 ? 'webgl2' : 'webgl';
      } catch (glErr) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[GraphicsEngine] WebGL initialization failed, falling back to Canvas 2D:', glErr.message);
        }
      }
    }

    if (!this.webglRenderer) {
      const cvR = new CanvasRenderer(this.options);
      cvR.initialize(canvas);
      this.canvasRenderer = cvR;
      this.activeRendererType = 'canvas';
    }

    this.isInitialized = true;
    return this.activeRendererType;
  }

  resize(width, height) {
    if (this.webglRenderer) this.webglRenderer.resize(width, height);
    if (this.canvasRenderer) this.canvasRenderer.resize(width, height);
  }

  render(sceneData, config) {
    this.lastSceneData = sceneData;
    this.lastConfig = config;

    const renderer = this.webglRenderer || this.canvasRenderer;
    if (renderer) {
      renderer.render(sceneData, config);
    }
  }

  startLoop() {
    this.scheduler.register(this._renderFrame);
  }

  stopLoop() {
    this.scheduler.unregister(this._renderFrame);
  }

  _renderFrame({ now, delta, frameCount }) {
    if (this.lastSceneData && this.lastConfig) {
      this.render(this.lastSceneData, this.lastConfig);
    }
  }

  getCapabilities() {
    if (this.webglRenderer) {
      return {
        activeType: this.activeRendererType,
        ...this.webglRenderer.capabilities
      };
    }
    return {
      activeType: this.activeRendererType,
      webgl2: false,
      webgl: false,
      canvas2d: true,
      maxTextureSize: 2048
    };
  }

  dispose() {
    this.stopLoop();
    this.scheduler.destroy();
    if (this.webglRenderer) {
      this.webglRenderer.dispose();
      this.webglRenderer = null;
    }
    if (this.canvasRenderer) {
      this.canvasRenderer.dispose();
      this.canvasRenderer = null;
    }
    this.isInitialized = false;
    this.activeRendererType = 'none';
    this.canvas = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GraphicsEngine };
}
if (typeof window !== 'undefined') {
  window.GraphicsEngine = GraphicsEngine;
}

