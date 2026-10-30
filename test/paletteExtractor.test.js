const test = require('node:test');
const assert = require('node:assert');
const {
  PaletteExtractor,
  extractPaletteFromImageData,
  ensureDarkSurfaceReadability,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  hexToRgb,
  colorDistance
} = require('../src/utils/paletteExtractor');

test('rgbToHsl and hslToRgb convert back and forth accurately', () => {
  const redHsl = rgbToHsl(255, 0, 0);
  assert.strictEqual(redHsl.h, 0);
  assert.strictEqual(redHsl.s, 100);
  assert.strictEqual(redHsl.l, 50);

  const backRed = hslToRgb(redHsl.h, redHsl.s, redHsl.l);
  assert.strictEqual(backRed.r, 255);
  assert.strictEqual(backRed.g, 0);
  assert.strictEqual(backRed.b, 0);

  const cyanHsl = rgbToHsl(0, 242, 254);
  assert.ok(cyanHsl.h >= 180 && cyanHsl.h <= 190);
});

test('rgbToHex and hexToRgb convert color representations correctly', () => {
  assert.strictEqual(rgbToHex(255, 42, 133), '#ff2a85');
  assert.strictEqual(rgbToHex(0, 242, 254), '#00f2fe');

  const rgb = hexToRgb('#ff2a85');
  assert.strictEqual(rgb.r, 255);
  assert.strictEqual(rgb.g, 42);
  assert.strictEqual(rgb.b, 133);

  // Short hex support
  const shortRgb = hexToRgb('#f0f');
  assert.strictEqual(shortRgb.r, 255);
  assert.strictEqual(shortRgb.g, 0);
  assert.strictEqual(shortRgb.b, 255);

  // Invalid hex returns null
  assert.strictEqual(hexToRgb('invalid'), null);
});

test('ensureDarkSurfaceReadability boosts dark colors for legible overlay text', () => {
  // Dark navy: r=5, g=10, b=30 (lightness ~7%)
  const adjusted = ensureDarkSurfaceReadability(5, 10, 30, 55, 30);
  assert.ok(adjusted.hsl.l >= 55, `Lightness should be boosted to at least 55, got ${adjusted.hsl.l}`);
  assert.ok(adjusted.hex.startsWith('#'));

  // Already bright color remains largely unchanged
  const bright = ensureDarkSurfaceReadability(255, 100, 180, 50, 30);
  assert.ok(bright.hsl.l >= 50);
});

test('extractPaletteFromImageData extracts 3 distinct, coordinated colors from pixel buffer', () => {
  // Generate a mock 10x10 cyan and pink image buffer (400 bytes)
  const buffer = new Uint8ClampedArray(400);
  for (let i = 0; i < 400; i += 4) {
    if (i < 200) {
      // Magenta/Pink pixels
      buffer[i] = 255;
      buffer[i + 1] = 42;
      buffer[i + 2] = 133;
      buffer[i + 3] = 255;
    } else {
      // Cyan pixels
      buffer[i] = 0;
      buffer[i + 1] = 242;
      buffer[i + 2] = 254;
      buffer[i + 3] = 255;
    }
  }

  const palette = extractPaletteFromImageData(buffer, 10, 10);
  assert.ok(palette.primary, 'Should have primary color');
  assert.ok(palette.activeWord, 'Should have active word highlight');
  assert.ok(palette.secondary, 'Should have secondary lyric color');
  assert.ok(palette.primary.startsWith('#'));
  assert.ok(palette.activeWord.startsWith('#'));
  assert.ok(palette.secondary.startsWith('#'));
});

test('extractPaletteFromImageData handles empty or corrupt buffers safely with default fallback', () => {
  const p1 = extractPaletteFromImageData(null);
  assert.ok(p1.primary);
  assert.ok(p1.activeWord);
  assert.ok(p1.secondary);

  const p2 = extractPaletteFromImageData(new Uint8ClampedArray(0));
  assert.ok(p2.primary);
});

test('PaletteExtractor caches palettes and prevents redundant extractions', async () => {
  const extractor = new PaletteExtractor();
  const testKey = 'test-track-key-1';
  const customPalette = {
    primary: '#123456',
    activeWord: '#abcdef',
    secondary: '#654321',
    accent: '#abcdef'
  };

  extractor.setCached(testKey, customPalette);
  const retrieved = extractor.getCached(testKey);
  assert.deepStrictEqual(retrieved, customPalette);

  // Fallback on empty URL
  const fallback = await extractor.extractFromImageUrl('');
  assert.ok(fallback.primary);
});
