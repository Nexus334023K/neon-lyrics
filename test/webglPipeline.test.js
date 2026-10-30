const test = require('node:test');
const assert = require('node:assert');

const { fullscreenVert, fullscreenVert300 } = require('../src/graphics/shaders/fullscreen.vert');
const { thresholdFrag, thresholdFrag300 } = require('../src/graphics/shaders/threshold.frag');
const { blurFrag, blurFrag300 } = require('../src/graphics/shaders/blur.frag');
const { compositeFrag, compositeFrag300 } = require('../src/graphics/shaders/composite.frag');

const { ShaderManager } = require('../src/graphics/ShaderManager');
const { TextureManager } = require('../src/graphics/TextureManager');
const { FramebufferManager } = require('../src/graphics/FramebufferManager');
const { WebGLRenderer } = require('../src/graphics/WebGLRenderer');

test('GLSL shader definitions are complete and contain required uniforms and varyings', () => {
  // Vertex shaders
  assert.ok(fullscreenVert.includes('a_position'));
  assert.ok(fullscreenVert.includes('v_texCoord'));
  assert.ok(fullscreenVert300.includes('#version 300 es'));

  // Threshold shaders
  assert.ok(thresholdFrag.includes('u_threshold'));
  assert.ok(thresholdFrag.includes('u_softKnee'));
  assert.ok(thresholdFrag300.includes('#version 300 es'));

  // Blur shaders
  assert.ok(blurFrag.includes('u_direction'));
  assert.ok(blurFrag.includes('u_resolution'));
  assert.ok(blurFrag.includes('u_radius'));
  assert.ok(blurFrag300.includes('#version 300 es'));

  // Composite shaders
  assert.ok(compositeFrag.includes('u_intensity'));
  assert.ok(compositeFrag.includes('u_exposure'));
  assert.ok(compositeFrag.includes('u_saturation'));
  assert.ok(compositeFrag.includes('u_blendMode'));
  assert.ok(compositeFrag.includes('u_glowColor'));
  assert.ok(compositeFrag300.includes('#version 300 es'));
});

test('ShaderManager compiles programs, caches uniforms, and handles errors', () => {
  const mockGl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    createShader(type) { return { type, id: Math.random() }; },
    shaderSource(shader, src) { shader.src = src; },
    compileShader(shader) { shader.compiled = true; },
    getShaderParameter(shader, param) { return true; },
    getShaderInfoLog() { return ''; },
    deleteShader(shader) { shader.deleted = true; },
    createProgram() { return { id: Math.random() }; },
    attachShader(prog, sh) {},
    linkProgram(prog) { prog.linked = true; },
    getProgramParameter(prog, param) { return true; },
    getProgramInfoLog() { return ''; },
    deleteProgram(prog) { prog.deleted = true; },
    useProgram(prog) { mockGl.activeProg = prog; },
    getUniformLocation(prog, name) { return { name }; },
    getAttribLocation(prog, name) { return 0; },
    uniform1f() {},
    uniform1i() {},
    uniform2f() {},
    uniform3f() {}
  };

  const sm = new ShaderManager(mockGl);
  const prog = sm.createProgram('testProg', 'void main(){}', 'void main(){}');
  assert.ok(prog);
  assert.strictEqual(sm.getProgram('testProg'), prog);

  sm.useProgram('testProg');
  assert.strictEqual(mockGl.activeProg, prog);

  const loc = sm.getUniformLocation('testProg', 'u_radius');
  assert.deepStrictEqual(loc, { name: 'u_radius' });

  sm.dispose();
  assert.strictEqual(sm.programs.size, 0);
});

test('TextureManager allocates textures and tracks safe cleanup', () => {
  const createdTextures = [];
  const deletedTextures = [];

  const mockGl = {
    TEXTURE_2D: 3553,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    CLAMP_TO_EDGE: 33071,
    LINEAR: 9729,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    createTexture() {
      const tex = { id: Math.random() };
      createdTextures.push(tex);
      return tex;
    },
    bindTexture() {},
    texParameteri() {},
    texImage2D() {},
    pixelStorei() {},
    deleteTexture(tex) {
      deletedTextures.push(tex);
    }
  };

  const tm = new TextureManager(mockGl);
  const tex = tm.createTexture(800, 200);
  assert.ok(tex);
  assert.strictEqual(tm.textures.size, 1);

  tm.deleteTexture(tex);
  assert.strictEqual(tm.textures.size, 0);
  assert.strictEqual(deletedTextures.length, 1);

  // Allocate multiple then dispose
  tm.createTexture(400, 100);
  tm.createTexture(200, 50);
  assert.strictEqual(tm.textures.size, 2);

  tm.dispose();
  assert.strictEqual(tm.textures.size, 0);
  assert.strictEqual(deletedTextures.length, 3);
});

test('FramebufferManager builds multi-scale pyramid and resizes correctly', () => {
  const mockGl = {
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053,
    TEXTURE_2D: 3553,
    createFramebuffer() { return { id: Math.random() }; },
    bindFramebuffer() {},
    framebufferTexture2D() {},
    checkFramebufferStatus() { return 36053; },
    deleteFramebuffer() {},
    viewport() {}
  };

  const tm = {
    createTexture(w, h) { return { w, h, id: Math.random() }; },
    deleteTexture() {}
  };

  const fbm = new FramebufferManager(mockGl, tm);
  fbm.resize(1000, 400);

  assert.ok(fbm.sourceFBO);
  assert.strictEqual(fbm.sourceFBO.width, 1000);
  assert.strictEqual(fbm.sourceFBO.height, 400);

  // Check 3 pyramid levels (1/2, 1/4, 1/8)
  assert.strictEqual(fbm.pyramid.length, 3);
  assert.strictEqual(fbm.pyramid[0].width, 500);
  assert.strictEqual(fbm.pyramid[0].height, 200);
  assert.strictEqual(fbm.pyramid[1].width, 250);
  assert.strictEqual(fbm.pyramid[1].height, 100);
  assert.strictEqual(fbm.pyramid[2].width, 125);
  assert.strictEqual(fbm.pyramid[2].height, 50);

  fbm.dispose();
  assert.strictEqual(fbm.sourceFBO, null);
  assert.strictEqual(fbm.pyramid.length, 0);
});

