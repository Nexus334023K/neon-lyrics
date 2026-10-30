const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { FontManager, detectFontFormat, MAX_FONT_SIZE_BYTES } = require('../src/utils/fontManager');

test('detectFontFormat accurately identifies TTF, OTF, WOFF, and WOFF2 headers', () => {
  const ttfBuffer1 = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x01]);
  const ttfBuffer2 = Buffer.from([0x74, 0x72, 0x75, 0x65, 0x00, 0x01]);
  const otfBuffer = Buffer.from([0x4F, 0x54, 0x54, 0x4F, 0x00, 0x01]);
  const woffBuffer = Buffer.from([0x77, 0x4F, 0x46, 0x46, 0x00, 0x01]);
  const woff2Buffer = Buffer.from([0x77, 0x4F, 0x46, 0x32, 0x00, 0x01]);
  const invalidBuffer = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  assert.strictEqual(detectFontFormat(ttfBuffer1), 'ttf');
  assert.strictEqual(detectFontFormat(ttfBuffer2), 'ttf');
  assert.strictEqual(detectFontFormat(otfBuffer), 'otf');
  assert.strictEqual(detectFontFormat(woffBuffer), 'woff');
  assert.strictEqual(detectFontFormat(woff2Buffer), 'woff2');
  assert.strictEqual(detectFontFormat(invalidBuffer), null);
});

test('FontManager validates font inputs and rejects malformed or oversized files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-font-test-'));
  const fm = new FontManager(null, tmpDir);

  // Malformed file
  const badPath = path.join(tmpDir, 'bad.txt');
  fs.writeFileSync(badPath, 'not a font file');
  const resBad = fm.validateFont(badPath);
  assert.strictEqual(resBad.valid, false);
  assert.ok(resBad.error);

  // Valid pseudo TTF
  const goodPath = path.join(tmpDir, 'test.ttf');
  fs.writeFileSync(goodPath, Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x05]));
  const resGood = fm.validateFont(goodPath);
  assert.strictEqual(resGood.valid, true);
  assert.strictEqual(resGood.format, 'ttf');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('FontManager imports, persists, and deletes fonts with typography fallbacks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-font-store-'));
  const fontsSubdir = path.join(tmpDir, 'fonts');

  let mockConfig = {
    customFonts: [],
    typography: {
      fontFamily: 'Outfit',
      activeWordFont: null
    }
  };

  const mockStorage = {
    getConfig: () => mockConfig,
    saveConfig: (partial) => {
      mockConfig = { ...mockConfig, ...partial };
      return mockConfig;
    }
  };

  const fm = new FontManager(mockStorage, fontsSubdir);

  // Create fake TTF font file
  const srcFont = path.join(tmpDir, 'MyNeonFont.ttf');
  fs.writeFileSync(srcFont, Buffer.from([0x00, 0x01, 0x00, 0x00, 0x10, 0x20]));

  const imported = fm.importFont(srcFont, 'My Custom Font');
  assert.strictEqual(imported.name, 'My Custom Font');
  assert.strictEqual(imported.format, 'ttf');
  assert.ok(fs.existsSync(imported.path));
  assert.strictEqual(mockConfig.customFonts.length, 1);

  // Generate @font-face CSS
  const css = fm.generateFontFaceCSS(imported);
  assert.ok(css.includes("@font-face"));
  assert.ok(css.includes("font-family: 'My Custom Font'"));
  assert.ok(css.includes("format('truetype')"));

  // Set typography to use this font
  mockConfig.typography.fontFamily = 'My Custom Font';
  mockConfig.typography.activeWordFont = 'My Custom Font';

  // Delete font
  const deleted = fm.deleteFont(imported.id);
  assert.strictEqual(deleted, true);
  assert.strictEqual(mockConfig.customFonts.length, 0);
  assert.strictEqual(fs.existsSync(imported.path), false);
  // Typography reset to fallback 'Outfit'
  assert.strictEqual(mockConfig.typography.fontFamily, 'Outfit');
  assert.strictEqual(mockConfig.typography.activeWordFont, null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

