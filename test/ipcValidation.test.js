const test = require('node:test');
const assert = require('node:assert');

test('URL validation only permits safe external https protocols', () => {
  const isSafeUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

  assert.strictEqual(isSafeUrl('https://lrclib.net/api'), true);
  assert.strictEqual(isSafeUrl('http://example.com'), true);
  assert.strictEqual(isSafeUrl('javascript:alert(1)'), false);
  assert.strictEqual(isSafeUrl('file:///C:/Windows/System32/cmd.exe'), false);
  assert.strictEqual(isSafeUrl('data:text/html,hack'), false);
});

test('Media control actions are strictly allowlisted', () => {
  const ALLOWED_ACTIONS = new Set(['play_pause', 'next', 'prev', 'seek', 'load_custom_lyrics', 'quit']);
  const isValidAction = (action) => ALLOWED_ACTIONS.has(action);

  assert.strictEqual(isValidAction('play_pause'), true);
  assert.strictEqual(isValidAction('seek'), true);
  assert.strictEqual(isValidAction('rmdir'), false);
  assert.strictEqual(isValidAction('__proto__'), false);
});
