const test = require('node:test');
const assert = require('node:assert');
const { analyzeLyricsLocally } = require('../src/utils/lyricAnalysis');

test('analyzeLyricsLocally produces meaningful metrics on sample lyrics', () => {
  const lyrics = `
[00:10.00] I've been running through the night
[00:14.00] Looking for the city lights
[00:18.00] Baby I love the way we dance in love
[00:22.00] I've been running through the night
  `;

  const analysis = analyzeLyricsLocally(lyrics);
  assert.ok(analysis.wordCount > 10);
  assert.ok(analysis.uniqueWords > 5);
  assert.ok(analysis.lexicalDiversity > 0);
  assert.ok(analysis.topThemes.includes('Romance & Love') || analysis.topThemes.includes('Nightlife & Celebration'));
  assert.strictEqual(analysis.generated, false);
  // Hook detected
  assert.ok(analysis.repeatedPhrases.some(p => p.phrase.includes('running through the night')));
});
