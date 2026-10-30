const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  StorageManager,
  DEFAULT_CONFIG,
  validateGlowConfig,
  validateWordTransitionConfig,
  validateLineTransitionConfig,
  validateTypographyConfig,
  validateWallpaperConfig,
  VALID_VISUALIZATION_MODES,
  VALID_BLEND_MODES
} = require('../src/utils/storage');

test('DEFAULT_CONFIG conforms to NeonLyrics V3 schema specification', () => {
  assert.strictEqual(DEFAULT_CONFIG.version, 3);
  assert.strictEqual(DEFAULT_CONFIG.schemaVersion, 3);
  assert.strictEqual(DEFAULT_CONFIG.visualMode, 'ship');
  assert.strictEqual(DEFAULT_CONFIG.visualizationMode, 'ship');

  // Wallpaper mode
  assert.ok(DEFAULT_CONFIG.wallpaperMode);
  assert.strictEqual(DEFAULT_CONFIG.wallpaperMode.enabled, false);
  assert.strictEqual(DEFAULT_CONFIG.wallpaperMode.controlsOnHover, true);
  assert.strictEqual(DEFAULT_CONFIG.wallpaperMode.autoHideControls, true);

  // Deep Glow
  assert.ok(DEFAULT_CONFIG.glow);
  assert.strictEqual(DEFAULT_CONFIG.glow.enabled, true);
  assert.strictEqual(DEFAULT_CONFIG.glow.intensity, 0.75);
  assert.strictEqual(DEFAULT_CONFIG.glow.radius, 0.55);
  assert.strictEqual(DEFAULT_CONFIG.glow.threshold, 0.35);
  assert.strictEqual(DEFAULT_CONFIG.glow.blendMode, 'screen');

  // Word Transitions
  assert.ok(DEFAULT_CONFIG.wordTransitions);
  assert.strictEqual(DEFAULT_CONFIG.wordTransitions.enabled, true);
  assert.strictEqual(DEFAULT_CONFIG.wordTransitions.effect, 'slide-blur');
  assert.strictEqual(DEFAULT_CONFIG.wordTransitions.duration, 300);

  // Line Transitions
  assert.ok(DEFAULT_CONFIG.lineTransitions);
  assert.strictEqual(DEFAULT_CONFIG.lineTransitions.enabled, true);
  assert.strictEqual(DEFAULT_CONFIG.lineTransitions.effect, 'fade-blur');
  assert.strictEqual(DEFAULT_CONFIG.lineTransitions.duration, 450);

  // Typography
  assert.ok(DEFAULT_CONFIG.typography);
  assert.strictEqual(DEFAULT_CONFIG.typography.fontFamily, 'Outfit');
  assert.strictEqual(DEFAULT_CONFIG.typography.fontScale, 1.0);

  // Album Sync
  assert.ok(DEFAULT_CONFIG.albumSync);
  assert.strictEqual(DEFAULT_CONFIG.albumSync.autoSync, true);
});

test('validateGlowConfig sanitizes out-of-bounds parameters and maintains defaults', () => {
  const valid = validateGlowConfig({
    enabled: true,
    intensity: 1.5,
    radius: 0.8,
    threshold: 0.2,
    blendMode: 'add',
    color: '#00f2fe'
  });
  assert.strictEqual(valid.intensity, 1.5);
  assert.strictEqual(valid.radius, 0.8);
  assert.strictEqual(valid.threshold, 0.2);
  assert.strictEqual(valid.blendMode, 'add');
  assert.strictEqual(valid.color, '#00f2fe');

  // Clamps out of range inputs
  const invalid = validateGlowConfig({
    intensity: 99.0, // beyond max 3
    radius: -1.0,    // negative
    blendMode: 'invalid-dodge',
    color: 'not-a-color'
  });
  assert.strictEqual(invalid.intensity, DEFAULT_CONFIG.glow.intensity);
  assert.strictEqual(invalid.radius, DEFAULT_CONFIG.glow.radius);
  assert.strictEqual(invalid.blendMode, DEFAULT_CONFIG.glow.blendMode);
  assert.strictEqual(invalid.color, DEFAULT_CONFIG.glow.color);
});

test('validateWordTransitionConfig and validateLineTransitionConfig enforce effects & limits', () => {
  const wordCfg = validateWordTransitionConfig({
    effect: 'morph',
    duration: 500,
    blurStrength: 0.5
  });
  assert.strictEqual(wordCfg.effect, 'morph');
  assert.strictEqual(wordCfg.duration, 500);
  assert.strictEqual(wordCfg.blurStrength, 0.5);

  const invalidWordCfg = validateWordTransitionConfig({
    effect: 'unsupported-effect',
    duration: 10 // too low (min 50)
  });
  assert.strictEqual(invalidWordCfg.effect, DEFAULT_CONFIG.wordTransitions.effect);
  assert.strictEqual(invalidWordCfg.duration, DEFAULT_CONFIG.wordTransitions.duration);

  const lineCfg = validateLineTransitionConfig({
    effect: 'particle-dissolve',
    duration: 600,
    distance: 40
  });
  assert.strictEqual(lineCfg.effect, 'particle-dissolve');
  assert.strictEqual(lineCfg.duration, 600);
  assert.strictEqual(lineCfg.distance, 40);
});

test('StorageManager migrates legacy v2 configs cleanly to V3 structures', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-storage-v3-'));
  const testStorage = new StorageManager({
    paths: {
      configFile: path.join(tempDir, 'config.json'),
      favoritesFile: path.join(tempDir, 'favorites.json'),
      historyFile: path.join(tempDir, 'history.json')
    }
  });

  // Write legacy v2 config with old flat fields
  const legacyConfig = {
    theme: 'theme-dracula',
    primaryColor: '#ff79c6',
    glowIntensity: 1.8,
    fontFamily: 'Montserrat',
    fontScale: 1.2,
    visualizationMode: 'fisheye'
  };
  fs.writeFileSync(path.join(tempDir, 'config.json'), JSON.stringify(legacyConfig), 'utf8');

  const loaded = testStorage.getConfig();

  // Preserves existing legacy settings
  assert.strictEqual(loaded.theme, 'theme-dracula');
  assert.strictEqual(loaded.primaryColor, '#ff79c6');
  assert.strictEqual(loaded.visualizationMode, 'fisheye');
  assert.strictEqual(loaded.visualMode, 'fisheye');

  // Mapped cleanly into V3 structures
  assert.strictEqual(loaded.glow.intensity, 1.8);
  assert.strictEqual(loaded.glowIntensity, 1.8);
  assert.strictEqual(loaded.typography.fontFamily, 'Montserrat');
  assert.strictEqual(loaded.typography.fontScale, 1.2);

  // New V3 defaults populated
  assert.ok(loaded.wordTransitions);
  assert.ok(loaded.lineTransitions);
  assert.ok(loaded.wallpaperMode);
  assert.strictEqual(loaded.wallpaperMode.enabled, false);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

