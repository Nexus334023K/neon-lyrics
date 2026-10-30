/**
 * NeonLyrics V3 - Fullscreen Quad Vertex Shader
 */
const fullscreenVert = `
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fullscreenVert300 = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  v_texCoord = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fullscreenVert, fullscreenVert300 };
}
if (typeof window !== 'undefined') {
  window.fullscreenVert = fullscreenVert;
  window.fullscreenVert300 = fullscreenVert300;
}

