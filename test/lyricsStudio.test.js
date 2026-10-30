const test = require('node:test');
const assert = require('node:assert');
const { RomanizationHelper } = require('../src/lyrics/RomanizationHelper');
const { LyricsStudioManager } = require('../src/lyrics/LyricsStudioManager');

test('RomanizationHelper identifies CJK scripts and parses dual-language lines', () => {
  const helper = new RomanizationHelper();

  assert.strictEqual(helper.hasCJK('夜に駆ける'), true);
  assert.strictEqual(helper.hasCJK('사랑해'), true);
  assert.strictEqual(helper.hasCJK('English Lyrics'), false);

  // Parentheses format
  const parsed1 = helper.parseDualLanguage('夜に駆ける (Racing into the night)');
  assert.strictEqual(parsed1.primary, '夜に駆ける');
  assert.strictEqual(parsed1.secondary, 'Racing into the night');

  // Slash format
  const parsed2 = helper.parseDualLanguage('First Line / Second Translation');
  assert.strictEqual(parsed2.primary, 'First Line');
  assert.strictEqual(parsed2.secondary, 'Second Translation');

  // Monolingual format
  const parsed3 = helper.parseDualLanguage('Simple single line');
  assert.strictEqual(parsed3.primary, 'Simple single line');
  assert.strictEqual(parsed3.secondary, null);
});

test('LyricsStudioManager micro-tunes line and word timestamps proportionally', () => {
  const studio = new LyricsStudioManager({ syncOffset: 0.1 });

  const lines = [
    {
      time: 10.0,
      endTime: 14.0,
      text: 'First line',
      words: [
        { time: 10.0, endTime: 12.0, word: 'First' },
        { time: 12.0, endTime: 14.0, word: 'line' }
      ]
    },
    {
      time: 20.0,
      endTime: 25.0,
      text: 'Second line'
    }
  ];

  // Adjust line 0 forward by +0.5s
  const ok = studio.adjustLineTimestamp(lines, 0, 0.5);
  assert.strictEqual(ok, true);
  assert.strictEqual(lines[0].time, 10.5);
  assert.strictEqual(lines[0].endTime, 14.5);
  assert.strictEqual(lines[0].words[0].time, 10.5);
  assert.strictEqual(lines[0].words[1].time, 12.5);

  // Micro-tune word 1 by +0.2s
  studio.adjustWordTimestamp(lines, 0, 1, 0.2);
  assert.strictEqual(lines[0].words[1].time, 12.7);
});

test('LyricsStudioManager manages favorite moments and exports valid LRC files', () => {
  const studio = new LyricsStudioManager({ syncOffset: -0.2 });

  // Favorite moment
  const moment = studio.saveFavoriteMoment('Artist - Title', 2, 'Favorite chorus line', 45.5);
  assert.ok(moment.id);
  assert.strictEqual(moment.lineText, 'Favorite chorus line');
  assert.strictEqual(studio.getFavoriteMoments('Artist - Title').length, 1);

  // Export to LRC
  const sampleLines = [
    { time: 5.5, text: 'Intro verse' },
    {
      time: 12.0,
      text: 'Word timed verse',
      hasWordTimings: true,
      words: [
        { time: 12.0, word: 'Word' },
        { time: 13.5, word: 'timed' }
      ]
    }
  ];

  const lrc = studio.exportToLrc(sampleLines, {
    title: 'Neon Song',
    artist: 'Neon Artist',
    album: 'Neon Album'
  });

  assert.ok(lrc.includes('[ti:Neon Song]'));
  assert.ok(lrc.includes('[ar:Neon Artist]'));
  assert.ok(lrc.includes('[offset:-200]'));
  assert.ok(lrc.includes('[00:05.50]Intro verse'));
  assert.ok(lrc.includes('<00:12.00>Word <00:13.50>timed'));
});

