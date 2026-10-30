const test = require('node:test');
const assert = require('node:assert');
const { FONT_CATEGORIES, TYPOGRAPHY_PAIRING_PRESETS } = require('../src/presets/typographyPresets');
const { validateTypographyConfig, DEFAULT_CONFIG } = require('../src/utils/storage');

test('FONT_CATEGORIES contains all required categories from specification', () => {
  assert.ok(FONT_CATEGORIES.modern, 'Modern category required');
  assert.ok(FONT_CATEGORIES.cinematic, 'Cinematic category required');
  assert.ok(FONT_CATEGORIES.futuristic, 'Futuristic category required');
  assert.ok(FONT_CATEGORIES.bold, 'Bold category required');
  assert.ok(FONT_CATEGORIES.calligraphy, 'Calligraphy category required');
  assert.ok(FONT_CATEGORIES.handwritten, 'Handwritten category required');

  // Verify key fonts are present
  assert.ok(FONT_CATEGORIES.modern.fonts.includes('Outfit'));
  assert.ok(FONT_CATEGORIES.cinematic.fonts.includes('Playfair Display'));
  assert.ok(FONT_CATEGORIES.futuristic.fonts.includes('Orbitron'));
  assert.ok(FONT_CATEGORIES.bold.fonts.includes('Bebas Neue'));
  assert.ok(FONT_CATEGORIES.calligraphy.fonts.includes('Great Vibes'));
  assert.ok(FONT_CATEGORIES.handwritten.fonts.includes('Dancing Script'));
});

test('TYPOGRAPHY_PAIRING_PRESETS defines robust font combinations with full state configs', () => {
  assert.ok(TYPOGRAPHY_PAIRING_PRESETS.length >= 4);

  for (const preset of TYPOGRAPHY_PAIRING_PRESETS) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(preset.config.fontFamily);
    assert.ok(preset.config.activeLineFont);
    assert.ok(preset.config.prevLineFont);
    assert.ok(preset.config.activeWordFont);

    // Validate that validating preset config produces valid output
    const validated = validateTypographyConfig(preset.config);
    assert.strictEqual(validated.fontFamily, preset.config.fontFamily);
  }
});

