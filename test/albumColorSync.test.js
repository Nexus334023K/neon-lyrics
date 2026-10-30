const test = require('node:test');
const assert = require('node:assert');
const {
  calculateLuminance,
  calculateContrastRatio,
  validateAndEnforceContrast,
  DEFAULT_PALETTE,
  hexToRgb
} = require('../src/utils/paletteExtractor');

test('calculateLuminance and calculateContrastRatio follow WCAG specifications', () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  const lumWhite = calculateLuminance(white.r, white.g, white.b);
  const lumBlack = calculateLuminance(black.r, black.g, black.b);

  assert.strictEqual(Math.round(lumWhite * 100) / 100, 1.0);
  assert.strictEqual(Math.round(lumBlack * 100) / 100, 0.0);

  // Maximum contrast ratio between pure black and pure white is 21:1
  const ratio = calculateContrastRatio(white, black);
  assert.strictEqual(Math.round(ratio), 21);

  // Contrast ratio of identical colors is 1:1
  const selfRatio = calculateContrastRatio(white, white);
  assert.strictEqual(Math.round(selfRatio), 1);
});

test('validateAndEnforceContrast boosts dark or muddy colors to guarantee overlay readability', () => {
  // A palette with very dark colors that would be illegible on transparent desktop
  const darkPalette = {
    primary: '#111115', // very dark
    secondary: '#181820', // very dark
    activeWord: '#22222a', // very dark
    accent: '#0a0a0f' // very dark
  };

  const darkBg = { r: 15, g: 15, b: 20 };
  const enforced = validateAndEnforceContrast(darkPalette, 4.5);

  // The resulting colors should all have contrast ratio >= 4.5 against the dark background
  for (const key of ['primary', 'secondary', 'activeWord', 'accent']) {
    const rgb = hexToRgb(enforced[key]);
    assert.ok(rgb, `RGB must parse for ${key}`);
    const ratio = calculateContrastRatio(rgb, darkBg);
    assert.ok(ratio >= 4.0, `${key} ratio ${ratio} must be boosted for legibility`);
  }
});

