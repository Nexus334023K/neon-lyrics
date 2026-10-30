/**
 * NeonLyrics V3 - ShaderManager
 * Compiles, links, caches, and binds GLSL shader programs and uniform locations.
 */

class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.uniformCache = new Map();
    this.attributeCache = new Map();
  }

  compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source.trim());
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`[ShaderManager] Shader compilation error: ${info}`);
    }
    return shader;
  }

  createProgram(name, vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = this.compileShader(fsSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      throw new Error(`[ShaderManager] Program link error for "${name}": ${info}`);
    }

    // Clean up detached shaders
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.programs.set(name, program);
    this.uniformCache.set(name, new Map());
    this.attributeCache.set(name, new Map());

    return program;
  }

  getProgram(name) {
    return this.programs.get(name) || null;
  }

  useProgram(name) {
    const program = this.getProgram(name);
    if (!program) {
      throw new Error(`[ShaderManager] Program "${name}" not found.`);
    }
    this.gl.useProgram(program);
    return program;
  }

  getUniformLocation(programName, uniformName) {
    const pCache = this.uniformCache.get(programName);
    if (pCache && pCache.has(uniformName)) {
      return pCache.get(uniformName);
    }
    const program = this.getProgram(programName);
    if (!program) return null;

    const loc = this.gl.getUniformLocation(program, uniformName);
    if (pCache) pCache.set(uniformName, loc);
    return loc;
  }

  getAttribLocation(programName, attribName) {
    const pCache = this.attributeCache.get(programName);
    if (pCache && pCache.has(attribName)) {
      return pCache.get(attribName);
    }
    const program = this.getProgram(programName);
    if (!program) return -1;

    const loc = this.gl.getAttribLocation(program, attribName);
    if (pCache) pCache.set(attribName, loc);
    return loc;
  }

  setUniform1f(programName, name, val) {
    const loc = this.getUniformLocation(programName, name);
    if (loc !== null) this.gl.uniform1f(loc, val);
  }

  setUniform1i(programName, name, val) {
    const loc = this.getUniformLocation(programName, name);
    if (loc !== null) this.gl.uniform1i(loc, val);
  }

  setUniform2f(programName, name, x, y) {
    const loc = this.getUniformLocation(programName, name);
    if (loc !== null) this.gl.uniform2f(loc, x, y);
  }

  setUniform3f(programName, name, x, y, z) {
    const loc = this.getUniformLocation(programName, name);
    if (loc !== null) this.gl.uniform3f(loc, x, y, z);
  }

  dispose() {
    const gl = this.gl;
    for (const [, prog] of this.programs) {
      gl.deleteProgram(prog);
    }
    this.programs.clear();
    this.uniformCache.clear();
    this.attributeCache.clear();
    this.gl = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShaderManager };
}
if (typeof window !== 'undefined') {
  window.ShaderManager = ShaderManager;
}

