/**
 * NeonLyrics V3 - TextureManager
 * Allocates, uploads, caches, and safely disposes WebGL textures.
 */

class TextureManager {
  constructor(gl) {
    this.gl = gl;
    this.textures = new Set();
  }

  createTexture(width, height, data = null) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      Math.max(1, Math.floor(width)),
      Math.max(1, Math.floor(height)),
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );

    this.textures.add(tex);
    return tex;
  }

  uploadSource(texture, source) {
    if (!texture || !source) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  deleteTexture(texture) {
    if (!texture) return;
    this.gl.deleteTexture(texture);
    this.textures.delete(texture);
  }

  dispose() {
    for (const tex of this.textures) {
      this.gl.deleteTexture(tex);
    }
    this.textures.clear();
    this.gl = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TextureManager };
}
if (typeof window !== 'undefined') {
  window.TextureManager = TextureManager;
}

