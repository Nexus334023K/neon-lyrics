const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { MASTER_PRESETS } = require('../src/presets/masterPresets');
const { UniversalPresetManager } = require('../src/presets/UniversalPresetManager');

test('MASTER_PRESETS defines all 15 specification-mandated presets with complete schema', () => {
  const expectedIds = [
    'soft-neon',
    'deep-pink',
    'electric-blue',
    'cyberpunk',
    'aurora',
    'golden-aura',
    'liquid-chrome',
    'holographic',
    'cinematic',
    'minimal',
    'dreamscape',
    'retro-crt',
    'synthwave',
    'pure-white',
    'ultra-bloom'
  ];

  assert.strictEqual(MASTER_PRESETS.length, 15);

  for (const expectedId of expectedIds) {
    const preset = MASTER_PRESETS.find(p => p.id === expectedId);
    assert.ok(preset, `Preset ${expectedId} should exist`);
    assert.ok(preset.name, `Preset ${expectedId} must have name`);
    assert.ok(preset.colors.primary, `Preset ${expectedId} must have primary color`);
    assert.ok(preset.colors.secondary, `Preset ${expectedId} must have secondary color`);
    assert.ok(preset.typography.fontFamily, `Preset ${expectedId} must have typography`);
    assert.ok(preset.transitions.wordEffect, `Preset ${expectedId} must have transitions`);
    assert.ok(typeof preset.audioReactive.enabled === 'boolean', `Preset ${expectedId} must have audioReactive`);
    assert.ok(typeof preset.threeD.enabled === 'boolean', `Preset ${expectedId} must have threeD`);
  }
});

test('UniversalPresetManager handles custom presets lifecycle, import, and export', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-preset-test-'));
  const manager = new UniversalPresetManager({ presetsDir: tmpDir });

  // 1. Initial count equals master presets count (15)
  assert.strictEqual(manager.getAllPresets().length, 15);

  // 2. Prevent overwriting master presets
  assert.throws(() => {
    manager.saveCustomPreset({
      id: 'cyberpunk',
      name: 'Hacked Cyberpunk',
      colors: { primary: '#000', secondary: '#111' }
    });
  }, /Cannot overwrite system master presets/);

  // 3. Save a valid custom preset
  const customPreset = {
    id: 'stellar-purple',
    name: 'Stellar Purple',
    description: 'Deep cosmic violet ambiance',
    colors: { primary: '#9333ea', secondary: '#c084fc', activeWord: '#ffffff' },
    glow: { enabled: true, intensity: 1.2 },
    typography: { fontFamily: "'Inter', sans-serif", fontScale: 1.0 },
    transitions: { wordEffect: 'Morph', lineEffect: 'Morph' }
  };

  const saved = manager.saveCustomPreset(customPreset);
  assert.strictEqual(saved.id, 'stellar-purple');
  assert.strictEqual(manager.getAllPresets().length, 16);
  assert.ok(fs.existsSync(path.join(tmpDir, 'stellar-purple.neonpreset')));

  // 4. Export custom preset
  const exportedJson = manager.exportPresetJson('stellar-purple');
  assert.ok(exportedJson.includes('"format": "NeonLyricsPreset"'));

  // 5. Import preset JSON
  const imported = manager.importPresetJson(exportedJson);
  assert.ok(imported);

  // 6. Delete custom preset
  const deleted = manager.deleteCustomPreset('stellar-purple');
  assert.strictEqual(deleted, true);
  assert.strictEqual(manager.getAllPresets().length, 15);
  assert.strictEqual(fs.existsSync(path.join(tmpDir, 'stellar-purple.neonpreset')), false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('UniversalPresetManager handles per-song preset binding and config application', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-preset-bindings-'));
  const manager = new UniversalPresetManager({ presetsDir: tmpDir });

  const trackKey = 'Daft Punk - Tron Legacy';

  // Bind to electric-blue
  manager.bindSong(trackKey, 'electric-blue');
  const boundPreset = manager.getBindingForSong(trackKey);
  assert.ok(boundPreset);
  assert.strictEqual(boundPreset.id, 'electric-blue');

  // Verify persistence across reload
  const reloaded = new UniversalPresetManager({ presetsDir: tmpDir });
  assert.strictEqual(reloaded.getBindingForSong(trackKey).id, 'electric-blue');

  // Apply preset to config
  const initialConfig = {
    alwaysOnTop: true,
    primaryColor: '#ffffff',
    glowIntensity: 0.5,
    wordTransitions: { effect: 'FadeBlur', duration: 300 },
    lineTransitions: { effect: 'Crossfade', duration: 300 }
  };

  const appliedConfig = manager.applyPresetToConfig(boundPreset, initialConfig);
  assert.strictEqual(appliedConfig.alwaysOnTop, true); // preserved
  assert.strictEqual(appliedConfig.primaryColor, '#00d2ff'); // updated from electric-blue
  assert.strictEqual(appliedConfig.wordTransitions.effect, 'SlideBlur'); // updated
  assert.strictEqual(appliedConfig.lineTransitions.effect, 'SlideBlur'); // updated

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

