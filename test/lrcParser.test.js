const test = require('node:test');
const assert = require('node:assert');
const { parseLrc, serializeLrc, findActiveIndices, parseTimestamp, formatTimestamp } = require('../src/utils/lrcParser');

test('parseTimestamp converts minutes, seconds, milliseconds accurately', () => {
  assert.strictEqual(parseTimestamp('01', '30', '50'), 90.5);
  assert.strictEqual(parseTimestamp('00', '05', '200'), 5.2);
  assert.strictEqual(parseTimestamp('02', '00'), 120);
});

test('formatTimestamp formats seconds to [mm:ss.xx]', () => {
  assert.strictEqual(formatTimestamp(90.5), '[01:30.50]');
  assert.strictEqual(formatTimestamp(5.2), '[00:05.20]');
});

test('parseLrc handles standard LRC with metadata tags and line timestamps', () => {
  const lrc = `
[ti:Blinding Lights]
[ar:The Weeknd]
[al:After Hours]
[offset:500]
[00:10.00] Yeah
[00:14.50] I've been tryna call
[00:18.00] (Instrumental)
  `;

  const parsed = parseLrc(lrc);
  assert.strictEqual(parsed.metadata.title, 'Blinding Lights');
  assert.strictEqual(parsed.metadata.artist, 'The Weeknd');
  assert.strictEqual(parsed.metadata.album, 'After Hours');
  assert.strictEqual(parsed.metadata.offsetMs, 500);

  assert.strictEqual(parsed.lines.length, 3);
  // Timestamps adjusted by offset (+0.5s)
  assert.strictEqual(parsed.lines[0].time, 10.5);
  assert.strictEqual(parsed.lines[0].text, 'Yeah');
  assert.strictEqual(parsed.lines[1].time, 15.0);
  assert.strictEqual(parsed.lines[2].isInstrumental, true);
  assert.strictEqual(parsed.lines[2].text, '♪ (Instrumental) ♪');
});

test('parseLrc handles multi-timestamp lines [00:10.00][00:20.00]Chorus', () => {
  const lrc = `
[00:10.00][00:20.00] Repeat chorus line
  `;
  const parsed = parseLrc(lrc);
  assert.strictEqual(parsed.lines.length, 2);
  assert.strictEqual(parsed.lines[0].time, 10.0);
  assert.strictEqual(parsed.lines[1].time, 20.0);
  assert.strictEqual(parsed.lines[0].text, 'Repeat chorus line');
  assert.strictEqual(parsed.lines[1].text, 'Repeat chorus line');
});

test('parseLrc handles enhanced word-level timestamps', () => {
  const lrc = `
[00:05.00] <00:05.10>Hello <00:05.60>world <00:06.20>again
  `;
  const parsed = parseLrc(lrc);
  assert.strictEqual(parsed.lines.length, 1);
  assert.strictEqual(parsed.lines[0].hasWordTimings, true);
  assert.strictEqual(parsed.lines[0].words.length, 3);
  assert.strictEqual(parsed.lines[0].words[0].word, 'Hello');
  assert.strictEqual(parsed.lines[0].words[0].time, 5.1);
  assert.strictEqual(parsed.lines[0].words[0].verified, true);
});

test('findActiveIndices correctly tracks line and word progression', () => {
  const lrc = `
[00:05.00] First line
[00:10.00] <00:10.20>Second <00:11.00>line <00:12.00>test
[00:15.00] Third line
  `;
  const { lines } = parseLrc(lrc);

  // Before any lyric starts
  assert.deepStrictEqual(findActiveIndices(lines, 2.0), { lineIndex: -1, wordIndex: -1 });

  // Inside first line
  assert.deepStrictEqual(findActiveIndices(lines, 7.0), { lineIndex: 0, wordIndex: 0 });

  // In second line before word 1
  assert.deepStrictEqual(findActiveIndices(lines, 10.1), { lineIndex: 1, wordIndex: -1 });

  // In second line on word 0 ("Second")
  assert.deepStrictEqual(findActiveIndices(lines, 10.5), { lineIndex: 1, wordIndex: 0 });

  // In second line on word 1 ("line")
  assert.deepStrictEqual(findActiveIndices(lines, 11.5), { lineIndex: 1, wordIndex: 1 });

  // In third line
  assert.deepStrictEqual(findActiveIndices(lines, 16.0), { lineIndex: 2, wordIndex: 0 });
});

test('serializeLrc recreates valid formatted LRC text', () => {
  const lrc = `[00:05.00] Hello world\n[00:10.00] Second line`;
  const parsed = parseLrc(lrc);
  const serialized = serializeLrc(parsed.lines, { title: 'Test', artist: 'Artist' });
  assert.ok(serialized.includes('[ti:Test]'));
  assert.ok(serialized.includes('[ar:Artist]'));
  assert.ok(serialized.includes('[00:05.00] Hello world'));
  assert.ok(serialized.includes('[00:10.00] Second line'));
});
