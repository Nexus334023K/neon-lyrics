const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { StorageManager } = require('../src/utils/storage');

test('StorageManager manages configuration safely and preserves defaults', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-storage-test-'));
  const testPaths = {
    userData: tmpDir,
    configFile: path.join(tmpDir, 'config.json'),
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });
  const initial = sm.getConfig();
  assert.strictEqual(initial.theme, 'theme-cyber');
  assert.strictEqual(initial.schemaVersion, 3);

  // Update partial config
  sm.saveConfig({ theme: 'theme-neon-pink', syncOffset: 0.8 });
  const updated = sm.getConfig();
  assert.strictEqual(updated.theme, 'theme-neon-pink');
  assert.strictEqual(updated.syncOffset, 0.8);
  assert.strictEqual(updated.lineMode, 2); // Default preserved
});

test('StorageManager handles favorites add, remove, and duplicate handling', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-fav-test-'));
  const testPaths = {
    userData: tmpDir,
    configFile: path.join(tmpDir, 'config.json'),
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });
  assert.strictEqual(sm.getFavorites().length, 0);

  sm.addFavorite({ title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' });
  assert.strictEqual(sm.getFavorites().length, 1);
  assert.strictEqual(sm.isFavorite('the weeknd - blinding lights'), true);

  // Re-adding updates without duplicate
  sm.addFavorite({ title: 'Blinding Lights', artist: 'The Weeknd', artwork: 'https://img.jpg' });
  assert.strictEqual(sm.getFavorites().length, 1);
  assert.strictEqual(sm.getFavorites()[0].artwork, 'https://img.jpg');

  // Remove favorite
  sm.removeFavorite('the weeknd - blinding lights');
  assert.strictEqual(sm.getFavorites().length, 0);
  assert.strictEqual(sm.isFavorite('the weeknd - blinding lights'), false);
});

test('StorageManager handles playback history and deduplicates consecutive plays', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-hist-test-'));
  const testPaths = {
    userData: tmpDir,
    configFile: path.join(tmpDir, 'config.json'),
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });
  sm.addToHistory({ title: 'Song A', artist: 'Artist 1' });
  sm.addToHistory({ title: 'Song A', artist: 'Artist 1' }); // Consecutive duplicate
  assert.strictEqual(sm.getHistory().length, 1);

  sm.addToHistory({ title: 'Song B', artist: 'Artist 2' });
  assert.strictEqual(sm.getHistory().length, 2);
  assert.strictEqual(sm.getHistory()[0].title, 'Song B'); // Most recent first

  sm.clearHistory();
  assert.strictEqual(sm.getHistory().length, 0);
});

test('StorageManager safely recovers from corrupted JSON file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-corrupt-test-'));
  const configFile = path.join(tmpDir, 'config.json');
  fs.writeFileSync(configFile, 'INVALID_JSON{{{corrupt', 'utf8');

  const testPaths = {
    userData: tmpDir,
    configFile,
    favoritesFile: path.join(tmpDir, 'favorites.json'),
    historyFile: path.join(tmpDir, 'history.json'),
    ensureDirectories: () => {}
  };

  const sm = new StorageManager({ paths: testPaths });
  const recovered = sm.getConfig();
  assert.strictEqual(recovered.theme, 'theme-cyber'); // Default recovered
});
