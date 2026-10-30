/**
 * NeonLyrics V3 - Separable Gaussian Blur Fragment Shader
 * High-performance 9-tap separable blur utilizing hardware bilinear filtering.
 */

const blurFrag = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_direction;
uniform vec2 u_resolution;
uniform float u_radius;

void main() {
  vec2 texelSize = vec2(1.0) / u_resolution;
  vec2 step = u_direction * texelSize * max(0.5, u_radius);
  
  // 9-tap Gaussian weights
  vec4 color = vec4(0.0);
  color += texture2D(u_image, v_texCoord - step * 3.230769) * 0.070270;
  color += texture2D(u_image, v_texCoord - step * 1.384615) * 0.316216;
  color += texture2D(u_image, v_texCoord) * 0.227027;
  color += texture2D(u_image, v_texCoord + step * 1.384615) * 0.316216;
  color += texture2D(u_image, v_texCoord + step * 3.230769) * 0.070270;
  
  gl_FragColor = color;
}
`;

const blurFrag300 = `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_direction;
uniform vec2 u_resolution;
uniform float u_radius;

out vec4 fragColor;

void main() {
  vec2 texelSize = vec2(1.0) / u_resolution;
  vec2 step = u_direction * texelSize * max(0.5, u_radius);
  
  vec4 color = vec4(0.0);
  color += texture(u_image, v_texCoord - step * 3.230769) * 0.070270;
  color += texture(u_image, v_texCoord - step * 1.384615) * 0.316216;
  color += texture(u_image, v_texCoord) * 0.227027;
  color += texture(u_image, v_texCoord + step * 1.384615) * 0.316216;
  color += texture(u_image, v_texCoord + step * 3.230769) * 0.070270;
  
  fragColor = color;
}
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { blurFrag, blurFrag300 };
}
if (typeof window !== 'undefined') {
  window.blurFrag = blurFrag;
  window.blurFrag300 = blurFrag300;
}

