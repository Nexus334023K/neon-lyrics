/**
 * NeonLyrics V3 - Luminance Threshold Fragment Shader
 * Filters pixels above threshold with soft-knee transition for natural bloom origin.
 */

const thresholdFrag = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform float u_threshold;
uniform float u_softKnee;

void main() {
  vec4 color = texture2D(u_image, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  
  // Soft knee curve
  float knee = u_threshold * max(0.01, u_softKnee);
  float soft = luma - u_threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.00001);
  
  float weight = max(soft, luma - u_threshold);
  weight = max(weight, 0.0) / max(luma, 0.0001);
  
  gl_FragColor = vec4(color.rgb * weight, color.a * weight);
}
`;

const thresholdFrag300 = `#version 300 es
precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_image;
uniform float u_threshold;
uniform float u_softKnee;

out vec4 fragColor;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  
  float knee = u_threshold * max(0.01, u_softKnee);
  float soft = luma - u_threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.00001);
  
  float weight = max(soft, luma - u_threshold);
  weight = max(weight, 0.0) / max(luma, 0.0001);
  
  fragColor = vec4(color.rgb * weight, color.a * weight);
}
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { thresholdFrag, thresholdFrag300 };
}
if (typeof window !== 'undefined') {
  window.thresholdFrag = thresholdFrag;
  window.thresholdFrag300 = thresholdFrag300;
}

