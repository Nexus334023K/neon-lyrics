const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  StorageManager,
  DEFAULT_CONFIG,
  validateAnimationConfig,
  VALID_BLUR_INTENSITIES,
  VALID_TARGET_FPS,
  VALID_QUALITY_PRESETS
} = require('../src/utils/storage');

test('Animation configuration has robust default values', () => {
  assert.ok(DEFAULT_CONFIG.animation, 'Default config must include animation section');
  assert.strictEqual(DEFAULT_CONFIG.animation.motionBlur, true);
  assert.strictEqual(DEFAULT_CONFIG.animation.motionBlurIntensity, 'medium');
  assert.strictEqual(DEFAULT_CONFIG.animation.targetFps, 'auto');
  assert.strictEqual(DEFAULT_CONFIG.animation.qualityPreset, 'smooth');
  assert.strictEqual(DEFAULT_CONFIG.animation.respectReducedMotion, true);
  assert.strictEqual(DEFAULT_CONFIG.animation.gpuFallback, true);
});

test('validateAnimationConfig handles invalid, corrupt, or missing fields with safe defaults', () => {
  // Empty or non-object inputs
  const def1 = validateAnimationConfig(null);
  assert.strictEqual(def1.motionBlur, true);
  assert.strictEqual(def1.motionBlurIntensity, 'medium');
  assert.strictEqual(def1.targetFps, 'auto');
  assert.strictEqual(def1.qualityPreset, 'smooth');

  const def2 = validateAnimationConfig(undefined);
  assert.strictEqual(def2.motionBlur, true);

  // Out-of-bounds FPS options are clamped to 'auto'
  const invalidFps1 = validateAnimationConfig({ targetFps: 45 });
  assert.strictEqual(invalidFps1.targetFps, 'auto');

  const invalidFps2 = validateAnimationConfig({ targetFps: -10 });
  assert.strictEqual(invalidFps2.targetFps, 'auto');

  const invalidFps3 = validateAnimationConfig({ targetFps: 'unsupported' });
  assert.strictEqual(invalidFps3.targetFps, 'auto');

  // Valid FPS inputs (numbers and valid strings)
  assert.strictEqual(validateAnimationConfig({ targetFps: 30 }).targetFps, 30);
  assert.strictEqual(validateAnimationConfig({ targetFps: 60 }).targetFps, 60);
  assert.strictEqual(validateAnimationConfig({ targetFps: 90 }).targetFps, 90);
  assert.strictEqual(validateAnimationConfig({ targetFps: 120 }).targetFps, 120);
  assert.strictEqual(validateAnimationConfig({ targetFps: '60' }).targetFps, 60);
  assert.strictEqual(validateAnimationConfig({ targetFps: 'auto' }).targetFps, 'auto');

  // Invalid intensity fallback
  assert.strictEqual(validateAnimationConfig({ motionBlurIntensity: 'extreme' }).motionBlurIntensity, 'medium');
  assert.strictEqual(validateAnimationConfig({ motionBlurIntensity: 'off' }).motionBlurIntensity, 'off');
  assert.strictEqual(validateAnimationConfig({ motionBlurIntensity: 'low' }).motionBlurIntensity, 'low');
  assert.strictEqual(validateAnimationConfig({ motionBlurIntensity: 'high' }).motionBlurIntensity, 'high');

  // Invalid quality preset fallback
  assert.strictEqual(validateAnimationConfig({ qualityPreset: 'ultra-hd' }).qualityPreset, 'smooth');
  assert.strictEqual(validateAnimationConfig({ qualityPreset: 'cinematic' }).qualityPreset, 'cinematic');
  assert.strictEqual(validateAnimationConfig({ qualityPreset: 'eco' }).qualityPreset, 'eco');
});

test('StorageManager migrates legacy configurations lacking animation settings', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-legacy-anim-test-'));
  const configFile = path.join(tmpDir, 'config.json');

  // Legacy config without animation section
  const legacyConfig = {
    schemaVersion: 2,
    theme: 'theme-neon-pink',
    fontScale: 1.2
  };
  fs.writeFileSync(configFile, JSON.stringify(legacyConfig), 'utf8');

  const testPaths = {
    userData: tmpDir,
    configFile,
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });
  const loaded = sm.getConfig();

  // Legacy preserved
  assert.strictEqual(loaded.theme, 'theme-neon-pink');
  assert.strictEqual(loaded.fontScale, 1.2);

  // New animation section automatically populated with valid defaults
  assert.ok(loaded.animation);
  assert.strictEqual(loaded.animation.motionBlur, true);
  assert.strictEqual(loaded.animation.targetFps, 'auto');
  assert.strictEqual(loaded.animation.qualityPreset, 'smooth');
});

test('StorageManager updates animation settings and validates persistence', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-anim-save-test-'));
  const testPaths = {
    userData: tmpDir,
    configFile: path.join(tmpDir, 'config.json'),
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });

  // Update animation settings via partial config
  sm.saveConfig({
    animation: {
      targetFps: 120,
      motionBlurIntensity: 'high',
      qualityPreset: 'cinematic'
    }
  });

  const updated = sm.getConfig();
  assert.strictEqual(updated.animation.targetFps, 120);
  assert.strictEqual(updated.animation.motionBlurIntensity, 'high');
  assert.strictEqual(updated.animation.qualityPreset, 'cinematic');
  assert.strictEqual(updated.animation.motionBlur, true); // Preserved
  assert.strictEqual(updated.animation.respectReducedMotion, true); // Preserved
});
