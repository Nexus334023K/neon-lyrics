const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { GLOW_PRESETS, getGlowPresetById } = require('../src/presets/glowPresets');
const { StorageManager, validateGlowConfig } = require('../src/utils/storage');

test('GLOW_PRESETS contains all 10 specification presets', () => {
  const expected = [
    'soft-neon',
    'deep-pink',
    'electric-blue',
    'cyberpunk',
    'aurora',
    'golden-aura',
    'pure-white',
    'ultra-bloom',
    'cinematic-glow',
    'minimal-glow'
  ];

  assert.strictEqual(GLOW_PRESETS.length, 10);
  for (const id of expected) {
    const found = getGlowPresetById(id);
    assert.ok(found, `Preset ${id} should exist`);
    assert.strictEqual(found.id, id);
    assert.ok(typeof found.name === 'string');
    assert.ok(typeof found.intensity === 'number');
    assert.ok(typeof found.radius === 'number');
    assert.ok(typeof found.threshold === 'number');
    assert.ok(typeof found.color === 'string');
    assert.ok(['screen', 'add', 'linear-dodge', 'normal', 'lighten'].includes(found.blendMode));

    // Must be valid according to schema validator
    const sanitized = validateGlowConfig(found);
    assert.strictEqual(sanitized.intensity, found.intensity);
    assert.strictEqual(sanitized.blendMode, found.blendMode);
  }

  assert.strictEqual(getGlowPresetById('non-existent'), null);
});

test('StorageManager handles custom glow preset lifecycle (save, duplicate, rename, delete)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-glow-test-'));
  const testStorage = new StorageManager({
    paths: {
      configFile: path.join(tempDir, 'config.json'),
      favoritesFile: path.join(tempDir, 'favorites.json'),
      historyFile: path.join(tempDir, 'history.json'),
      glowPresetsFile: path.join(tempDir, 'glow_presets.json')
    }
  });

  // 1. Initial list empty
  assert.deepStrictEqual(testStorage.getCustomGlowPresets(), []);

  // 2. Save new custom preset
  const saved = testStorage.saveCustomGlowPreset({
    name: 'My Synthwave',
    intensity: 1.4,
    radius: 0.8,
    threshold: 0.2,
    color: '#ff007f',
    blendMode: 'screen'
  });
  assert.ok(saved);
  assert.strictEqual(saved.name, 'My Synthwave');
  assert.strictEqual(saved.intensity, 1.4);
  assert.strictEqual(testStorage.getCustomGlowPresets().length, 1);

  // 3. Rename preset
  const renameOk = testStorage.renameCustomGlowPreset(saved.id, 'My Outrun Glow');
  assert.strictEqual(renameOk, true);
  const renamed = testStorage.getCustomGlowPresets()[0];
  assert.strictEqual(renamed.name, 'My Outrun Glow');

  // 4. Duplicate preset
  const duplicate = testStorage.duplicateCustomGlowPreset(saved.id, 'My Outrun Glow (V2)');
  assert.ok(duplicate);
  assert.strictEqual(duplicate.name, 'My Outrun Glow (V2)');
  assert.strictEqual(testStorage.getCustomGlowPresets().length, 2);

  // 5. Delete preset
  const deleteOk = testStorage.deleteCustomGlowPreset(saved.id);
  assert.strictEqual(deleteOk, true);
  const remaining = testStorage.getCustomGlowPresets();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, duplicate.id);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

