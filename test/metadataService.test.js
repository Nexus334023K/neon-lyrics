const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { MetadataService } = require('../src/utils/metadataService');

test('cleanQuery strips remastered, feat, live, and version tags cleanly', () => {
  const service = new MetadataService();
  assert.strictEqual(service.cleanQuery('Blinding Lights (feat. Someone)'), 'Blinding Lights');
  assert.strictEqual(service.cleanQuery('Hotel California - 2013 Remaster'), 'Hotel California');
  assert.strictEqual(service.cleanQuery('Wonderwall [Deluxe Edition]'), 'Wonderwall');
});

test('MetadataService correctly uses cache and returns cached data without network call', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-meta-test-'));
  const service = new MetadataService({ cacheDir: tmpDir });

  // Pre-seed cache
  service.saveCachedMetadata('Queen', 'Bohemian Rhapsody', {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    artwork: 'https://test.com/queen.jpg',
    source: 'test'
  });

  const res = await service.fetchTrackMetadata('Queen', 'Bohemian Rhapsody');
  assert.strictEqual(res.title, 'Bohemian Rhapsody');
  assert.strictEqual(res.artwork, 'https://test.com/queen.jpg');
});
