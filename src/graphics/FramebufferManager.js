/**
 * NeonLyrics V3 - FramebufferManager
 * Multi-scale pyramid framebuffer manager with ping-pong buffers
 * for separable Gaussian blur and multi-resolution bloom accumulation.
 */

class FramebufferManager {
  constructor(gl, textureManager) {
    this.gl = gl;
    this.textureManager = textureManager;
    this.width = 0;
    this.height = 0;

    // Pyramid levels: level 0 = 1x, level 1 = 0.5x, level 2 = 0.25x, level 3 = 0.125x
    // Each downsampled level has ping-pong buffers: { a: FBO, b: FBO }
    this.sourceFBO = null; // Base full-res
    this.thresholdFBO = null;
    this.pyramid = [];
    this.numLevels = 3;
  }

  _createFBO(w, h) {
    const gl = this.gl;
    const width = Math.max(1, Math.floor(w));
    const height = Math.max(1, Math.floor(h));
    const texture = this.textureManager.createTexture(width, height, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      this.textureManager.deleteTexture(texture);
      throw new Error(`[FramebufferManager] Framebuffer incomplete status: ${status}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, texture, width, height };
  }

  _disposeFBO(obj) {
    if (!obj) return;
    if (obj.fbo) this.gl.deleteFramebuffer(obj.fbo);
    if (obj.texture) this.textureManager.deleteTexture(obj.texture);
  }

  resize(width, height) {
    this.dispose();

    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    // Base source and threshold buffers
    this.sourceFBO = this._createFBO(this.width, this.height);
    this.thresholdFBO = this._createFBO(this.width, this.height);

    // Build multi-scale pyramid (levels 1, 2, 3: 1/2, 1/4, 1/8)
    this.pyramid = [];
    let curW = this.width;
    let curH = this.height;

    for (let i = 0; i < this.numLevels; i++) {
      curW = Math.max(1, Math.floor(curW / 2));
      curH = Math.max(1, Math.floor(curH / 2));

      this.pyramid.push({
        level: i + 1,
        width: curW,
        height: curH,
        ping: this._createFBO(curW, curH),
        pong: this._createFBO(curW, curH)
      });
    }
  }

  bind(fboObj) {
    const gl = this.gl;
    if (fboObj && fboObj.fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboObj.fbo);
      gl.viewport(0, 0, fboObj.width, fboObj.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);
    }
  }

  unbind() {
    this.bind(null);
  }

  dispose() {
    this._disposeFBO(this.sourceFBO);
    this.sourceFBO = null;
    this._disposeFBO(this.thresholdFBO);
    this.thresholdFBO = null;

    if (this.pyramid) {
      for (const level of this.pyramid) {
        this._disposeFBO(level.ping);
        this._disposeFBO(level.pong);
      }
      this.pyramid = [];
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FramebufferManager };
}
if (typeof window !== 'undefined') {
  window.FramebufferManager = FramebufferManager;
}

