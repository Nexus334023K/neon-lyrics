/**
 * NeonLyrics V3 - WebGLRenderer
 * Native GPU-accelerated WebGL 2.0 / WebGL 1.0 renderer.
 * Coordinates multi-pass luminance thresholding, separable Gaussian blur downsampling,
 * multi-scale bloom accumulation, and blend mode compositing with alpha transparency.
 */

const { ShaderManager } = require('./ShaderManager');
const { TextureManager } = require('./TextureManager');
const { FramebufferManager } = require('./FramebufferManager');

const { fullscreenVert, fullscreenVert300 } = require('./shaders/fullscreen.vert');
const { thresholdFrag, thresholdFrag300 } = require('./shaders/threshold.frag');
const { blurFrag, blurFrag300 } = require('./shaders/blur.frag');
const { compositeFrag, compositeFrag300 } = require('./shaders/composite.frag');

function hexToRgb01(hex) {
  if (typeof hex !== 'string') return [1.0, 0.2, 0.72];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [1.0, 0.2, 0.72];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const BLEND_MODE_MAP = {
  'screen': 0,
  'add': 1,
  'linear-dodge': 2,
  'normal': 3,
  'lighten': 4
};

class WebGLRenderer {
  constructor(options = {}) {
    this.canvas = null;
    this.gl = null;
    this.isWebGL2 = false;
    this.width = 0;
    this.height = 0;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.isReady = false;
    this.isContextLost = false;

    this.shaderManager = null;
    this.textureManager = null;
    this.fboManager = null;
    this.quadBuffer = null;

    this.capabilities = {
      webgl2: false,
      maxTextureSize: 0,
      floatTextures: false,
      halfFloatTextures: false,
      colorBufferFloat: false,
      standardDerivatives: false,
      vendor: 'Unknown',
      renderer: 'Unknown'
    };

    this._onContextLost = this._onContextLost.bind(this);
    this._onContextRestored = this._onContextRestored.bind(this);
  }

  static isSupported() {
    if (typeof document === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  initialize(canvas) {
    if (!canvas) {
      throw new Error('[WebGLRenderer] Canvas element is required.');
    }
    this.canvas = canvas;

    const glOptions = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    };

    // Attempt WebGL 2.0 first
    this.gl = canvas.getContext('webgl2', glOptions);
    if (this.gl) {
      this.isWebGL2 = true;
    } else {
      // Fallback to WebGL 1.0
      this.gl = canvas.getContext('webgl', glOptions) || canvas.getContext('experimental-webgl', glOptions);
      this.isWebGL2 = false;
    }

    if (!this.gl) {
      throw new Error('[WebGLRenderer] WebGL is not supported on this device/environment.');
    }

    this._inspectCapabilities();

    // Initialize subsystems
    this.shaderManager = new ShaderManager(this.gl);
    this.textureManager = new TextureManager(this.gl);
    this.fboManager = new FramebufferManager(this.gl, this.textureManager);

    this._initQuad();
    this._initShaders();

    // Context loss handlers
    this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);

    this.isReady = true;
    this.isContextLost = false;
    this.resize(this.canvas.width || 800, this.canvas.height || 200);

    return true;
  }

  _inspectCapabilities() {
    const gl = this.gl;
    if (!gl) return;

    this.capabilities.webgl2 = this.isWebGL2;
    this.capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbgExt) {
      this.capabilities.vendor = gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL) || 'Unknown';
      this.capabilities.renderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) || 'Unknown';
    }

    if (this.isWebGL2) {
      this.capabilities.floatTextures = true;
      this.capabilities.halfFloatTextures = true;
      this.capabilities.colorBufferFloat = Boolean(gl.getExtension('EXT_color_buffer_float'));
    } else {
      this.capabilities.floatTextures = Boolean(gl.getExtension('OES_texture_float'));
      this.capabilities.halfFloatTextures = Boolean(gl.getExtension('OES_texture_half_float'));
      this.capabilities.colorBufferFloat = Boolean(gl.getExtension('WEBGL_color_buffer_float'));
      this.capabilities.standardDerivatives = Boolean(gl.getExtension('OES_standard_derivatives'));
    }
  }

  _initQuad() {
    const gl = this.gl;
    // 2 triangles covering full clip space: [pos.x, pos.y, uv.u, uv.v]
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0,
       1.0, -1.0, 1.0, 0.0,
      -1.0,  1.0, 0.0, 1.0,
      -1.0,  1.0, 0.0, 1.0,
       1.0, -1.0, 1.0, 0.0,
       1.0,  1.0, 1.0, 1.0
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  _initShaders() {
    const vs = this.isWebGL2 ? fullscreenVert300 : fullscreenVert;
    const thFs = this.isWebGL2 ? thresholdFrag300 : thresholdFrag;
    const blFs = this.isWebGL2 ? blurFrag300 : blurFrag;
    const cpFs = this.isWebGL2 ? compositeFrag300 : compositeFrag;

    this.shaderManager.createProgram('threshold', vs, thFs);
    this.shaderManager.createProgram('blur', vs, blFs);
    this.shaderManager.createProgram('composite', vs, cpFs);
  }

  _drawQuad(programName) {
    const gl = this.gl;
    const aPos = this.shaderManager.getAttribLocation(programName, 'a_position');
    const aTex = this.shaderManager.getAttribLocation(programName, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    if (aPos !== -1) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    }
    if (aTex !== -1) {
      gl.enableVertexAttribArray(aTex);
      gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _onContextLost(event) {
    if (event) event.preventDefault();
    this.isContextLost = true;
    this.isReady = false;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[WebGLRenderer] WebGL context lost.');
    }
  }

  _onContextRestored() {
    if (typeof console !== 'undefined' && console.info) {
      console.info('[WebGLRenderer] WebGL context restored, re-initializing.');
    }
    this.isContextLost = false;
    try {
      this.initialize(this.canvas);
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[WebGLRenderer] Failed to re-initialize after context restored:', e);
      }
    }
  }

  resize(width, height) {
    if (!this.canvas || !this.gl || this.isContextLost) return;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    const pixelW = Math.floor(this.width * this.dpr);
    const pixelH = Math.floor(this.height * this.dpr);

    this.canvas.width = pixelW;
    this.canvas.height = pixelH;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.gl.viewport(0, 0, pixelW, pixelH);

    if (this.fboManager) {
      this.fboManager.resize(pixelW, pixelH);
    }
  }

  clear() {
    if (!this.gl || this.isContextLost) return;
    const gl = this.gl;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Uploads an external source (such as rendered 2D text canvas)
   * into sourceFBO and executes the bloom and composite pipeline.
   */
  processBloomPipeline(sourceElement, config = {}) {
    if (!this.gl || this.isContextLost || !this.isReady) return;
    const gl = this.gl;

    const glowCfg = config.glow || {};
    const intensity = typeof glowCfg.intensity === 'number' ? glowCfg.intensity : 0.75;
    const radius = typeof glowCfg.radius === 'number' ? glowCfg.radius : 0.55;
    const threshold = typeof glowCfg.threshold === 'number' ? glowCfg.threshold : 0.35;
    const exposure = typeof glowCfg.exposure === 'number' ? glowCfg.exposure : 0.65;
    const saturation = typeof glowCfg.saturation === 'number' ? glowCfg.saturation : 1.0;
    const opacity = typeof glowCfg.opacity === 'number' ? glowCfg.opacity : 1.0;
    const colorRgb = hexToRgb01(glowCfg.color || config.primaryColor || '#ff35b8');
    const blendModeInt = BLEND_MODE_MAP[glowCfg.blendMode] !== undefined ? BLEND_MODE_MAP[glowCfg.blendMode] : 0;

    // Step 1: Upload source into sourceFBO texture
    if (sourceElement && this.fboManager.sourceFBO) {
      this.textureManager.uploadSource(this.fboManager.sourceFBO.texture, sourceElement);
    }

    // Step 2: Threshold Pass (sourceFBO -> thresholdFBO)
    this.fboManager.bind(this.fboManager.thresholdFBO);
    this.clear();
    this.shaderManager.useProgram('threshold');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboManager.sourceFBO.texture);
    this.shaderManager.setUniform1i('threshold', 'u_image', 0);
    this.shaderManager.setUniform1f('threshold', 'u_threshold', threshold);
    this.shaderManager.setUniform1f('threshold', 'u_softKnee', 0.5);
    this._drawQuad('threshold');

    // Step 3: Multi-scale blur pyramid passes
    let inputTex = this.fboManager.thresholdFBO.texture;
    const pyramid = this.fboManager.pyramid;

    this.shaderManager.useProgram('blur');
    this.shaderManager.setUniform1i('blur', 'u_image', 0);

    for (let i = 0; i < pyramid.length; i++) {
      const level = pyramid[i];
      const levelRadius = radius * (1.0 + i * 0.8);

      // Horizontal blur: inputTex -> level.ping
      this.fboManager.bind(level.ping);
      this.clear();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTex);
      this.shaderManager.setUniform2f('blur', 'u_direction', 1.0, 0.0);
      this.shaderManager.setUniform2f('blur', 'u_resolution', level.width, level.height);
      this.shaderManager.setUniform1f('blur', 'u_radius', levelRadius);
      this._drawQuad('blur');

      // Vertical blur: level.ping -> level.pong
      this.fboManager.bind(level.pong);
      this.clear();
      gl.bindTexture(gl.TEXTURE_2D, level.ping.texture);
      this.shaderManager.setUniform2f('blur', 'u_direction', 0.0, 1.0);
      this._drawQuad('blur');

      // Downsample input for next level
      inputTex = level.pong.texture;
    }

    // Step 4: Final Composite Pass onto main Canvas backbuffer
    this.fboManager.unbind();
    this.clear();

    this.shaderManager.useProgram('composite');

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboManager.sourceFBO.texture);
    this.shaderManager.setUniform1i('composite', 'u_baseTexture', 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pyramid[0] ? pyramid[0].pong.texture : this.fboManager.sourceFBO.texture);
    this.shaderManager.setUniform1i('composite', 'u_bloomTexture1', 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, pyramid[1] ? pyramid[1].pong.texture : this.fboManager.sourceFBO.texture);
    this.shaderManager.setUniform1i('composite', 'u_bloomTexture2', 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, pyramid[2] ? pyramid[2].pong.texture : this.fboManager.sourceFBO.texture);
    this.shaderManager.setUniform1i('composite', 'u_bloomTexture3', 3);

    this.shaderManager.setUniform1f('composite', 'u_intensity', intensity);
    this.shaderManager.setUniform1f('composite', 'u_exposure', exposure);
    this.shaderManager.setUniform1f('composite', 'u_saturation', saturation);
    this.shaderManager.setUniform1f('composite', 'u_opacity', opacity);
    this.shaderManager.setUniform3f('composite', 'u_glowColor', colorRgb[0], colorRgb[1], colorRgb[2]);
    this.shaderManager.setUniform1i('composite', 'u_blendMode', blendModeInt);

    this._drawQuad('composite');
  }

  render(sceneData = {}, config = {}) {
    if (!this.gl || this.isContextLost || !this.isReady) return;
    if (sceneData.sourceElement) {
      this.processBloomPipeline(sceneData.sourceElement, config);
    } else {
      this.clear();
    }
  }

  dispose() {
    this.isReady = false;
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this._onContextLost, false);
      this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored, false);
    }
    if (this.fboManager) {
      this.fboManager.dispose();
      this.fboManager = null;
    }
    if (this.textureManager) {
      this.textureManager.dispose();
      this.textureManager = null;
    }
    if (this.shaderManager) {
      this.shaderManager.dispose();
      this.shaderManager = null;
    }
    if (this.gl && this.quadBuffer) {
      this.gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }
    this.gl = null;
    this.canvas = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebGLRenderer };
}
if (typeof window !== 'undefined') {
  window.WebGLRenderer = WebGLRenderer;
}
