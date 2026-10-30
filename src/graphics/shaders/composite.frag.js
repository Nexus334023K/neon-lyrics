/**
 * NeonLyrics V3 - Multi-scale Bloom Composite Fragment Shader
 * Blends bloom passes with base texture using configurable blend modes,
 * exposure, saturation, tint color, and alpha transparency preservation.
 */

const compositeFrag = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_baseTexture;
uniform sampler2D u_bloomTexture1;
uniform sampler2D u_bloomTexture2;
uniform sampler2D u_bloomTexture3;

uniform float u_intensity;
uniform float u_exposure;
uniform float u_saturation;
uniform float u_opacity;
uniform vec3 u_glowColor;
uniform int u_blendMode; // 0: screen, 1: add, 2: linear-dodge, 3: normal, 4: lighten

vec3 adjustSaturation(vec3 color, float sat) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, sat);
}

void main() {
  vec4 base = texture2D(u_baseTexture, v_texCoord);
  vec4 b1 = texture2D(u_bloomTexture1, v_texCoord);
  vec4 b2 = texture2D(u_bloomTexture2, v_texCoord);
  vec4 b3 = texture2D(u_bloomTexture3, v_texCoord);

  // Multi-scale bloom accumulation
  vec3 bloom = (b1.rgb * 0.5 + b2.rgb * 0.3 + b3.rgb * 0.2) * u_intensity;
  bloom *= u_glowColor;
  bloom = adjustSaturation(bloom, u_saturation);
  bloom *= u_exposure;

  vec3 outColor;
  // Blend Modes
  if (u_blendMode == 0) {
    // Screen: 1.0 - (1.0 - base) * (1.0 - bloom)
    outColor = 1.0 - (1.0 - base.rgb) * (1.0 - clamp(bloom, 0.0, 1.0));
  } else if (u_blendMode == 1) {
    // Add
    outColor = base.rgb + bloom;
  } else if (u_blendMode == 2) {
    // Linear Dodge (clamp add)
    outColor = clamp(base.rgb + bloom, 0.0, 1.0);
  } else if (u_blendMode == 4) {
    // Lighten
    outColor = max(base.rgb, bloom);
  } else {
    // Normal / Over
    float alpha = max(b1.a, max(b2.a, b3.a)) * u_opacity;
    outColor = mix(base.rgb, bloom, clamp(alpha, 0.0, 1.0));
  }

  // Alpha composition ensuring desktop transparency is maintained
  float finalAlpha = clamp(base.a + (b1.a + b2.a + b3.a) * 0.333 * u_opacity, 0.0, 1.0);
  gl_FragColor = vec4(outColor, finalAlpha);
}
`;

const compositeFrag300 = `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_baseTexture;
uniform sampler2D u_bloomTexture1;
uniform sampler2D u_bloomTexture2;
uniform sampler2D u_bloomTexture3;

uniform float u_intensity;
uniform float u_exposure;
uniform float u_saturation;
uniform float u_opacity;
uniform vec3 u_glowColor;
uniform int u_blendMode; // 0: screen, 1: add, 2: linear-dodge, 3: normal, 4: lighten

out vec4 fragColor;

vec3 adjustSaturation(vec3 color, float sat) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, sat);
}

void main() {
  vec4 base = texture(u_baseTexture, v_texCoord);
  vec4 b1 = texture(u_bloomTexture1, v_texCoord);
  vec4 b2 = texture(u_bloomTexture2, v_texCoord);
  vec4 b3 = texture(u_bloomTexture3, v_texCoord);

  vec3 bloom = (b1.rgb * 0.5 + b2.rgb * 0.3 + b3.rgb * 0.2) * u_intensity;
  bloom *= u_glowColor;
  bloom = adjustSaturation(bloom, u_saturation);
  bloom *= u_exposure;

  vec3 outColor;
  if (u_blendMode == 0) {
    outColor = 1.0 - (1.0 - base.rgb) * (1.0 - clamp(bloom, 0.0, 1.0));
  } else if (u_blendMode == 1) {
    outColor = base.rgb + bloom;
  } else if (u_blendMode == 2) {
    outColor = clamp(base.rgb + bloom, 0.0, 1.0);
  } else if (u_blendMode == 4) {
    outColor = max(base.rgb, bloom);
  } else {
    float alpha = max(b1.a, max(b2.a, b3.a)) * u_opacity;
    outColor = mix(base.rgb, bloom, clamp(alpha, 0.0, 1.0));
  }

  float finalAlpha = clamp(base.a + (b1.a + b2.a + b3.a) * 0.333 * u_opacity, 0.0, 1.0);
  fragColor = vec4(outColor, finalAlpha);
}
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compositeFrag, compositeFrag300 };
}
if (typeof window !== 'undefined') {
  window.compositeFrag = compositeFrag;
  window.compositeFrag300 = compositeFrag300;
}

