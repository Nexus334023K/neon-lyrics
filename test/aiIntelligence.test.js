const test = require('node:test');
const assert = require('node:assert');
const {
  LocalHeuristicsProvider,
  AIIntelligenceService,
  MOOD_CATEGORIES,
  MOOD_RECOMMENDATIONS
} = require('../src/ai/AIIntelligenceService');

test('LocalHeuristicsProvider accurately identifies all 8 standard mood categories', () => {
  const provider = new LocalHeuristicsProvider();

  const testCases = [
    { title: 'Walking on Sunshine', lyrics: 'I am so happy and full of joy smile sunshine', expected: 'happy' },
    { title: 'Tears in Heaven', lyrics: 'I cry alone in pain and sorrow grief broken heart', expected: 'sad' },
    { title: 'Endless Love', lyrics: 'My love baby darling kiss hold me forever sweet romance', expected: 'romantic' },
    { title: 'Ocean Waves', lyrics: 'Soft gentle slow breeze quiet breath ocean calm relax', expected: 'calm' },
    { title: 'Dance Party', lyrics: 'Party jump high beat fire electro bass wild loud power', expected: 'energetic' },
    { title: 'Astral Dreams', lyrics: 'Floating in clouds stars universe space galaxy dream mystic', expected: 'dreamy' },
    { title: 'Battle Cry', lyrics: 'Rage fight destroy war blood hate fury smash scream', expected: 'aggressive' },
    { title: 'Faded Echoes', lyrics: 'Memories of yesterday shadows dark cold regret lost whisper', expected: 'melancholic' }
  ];

  for (const tc of testCases) {
    const res = provider.analyze({ title: tc.title }, tc.lyrics);
    assert.strictEqual(res.mood, tc.expected, `Expected mood ${tc.expected} for ${tc.title}, got ${res.mood}`);
    assert.ok(MOOD_CATEGORIES.includes(res.mood));
    assert.ok(res.confidence > 0);
  }
});

test('LocalHeuristicsProvider computes sentiment, energy, and visual recommendations', () => {
  const provider = new LocalHeuristicsProvider();

  // Energetic happy track
  const upbeat = provider.analyze({ title: 'Happy Dance' }, 'Celebrate joy dance fun sun bright light');
  assert.ok(upbeat.sentiment > 0, 'Happy track should have positive sentiment');
  assert.ok(upbeat.energy > 0.5, 'Happy dance track should have high energy');
  assert.strictEqual(upbeat.recommendation.glowPreset, 'aurora');

  // Sad track
  const sad = provider.analyze({ title: 'Lonely Tears' }, 'Cry alone sorrow tears pain grief');
  assert.ok(sad.sentiment < 0, 'Sad track should have negative sentiment');
  assert.strictEqual(sad.recommendation.visualMode, 'clean');
});

test('AIIntelligenceService caches results and falls back cleanly to local heuristics', async () => {
  const service = new AIIntelligenceService({
    enabled: true,
    provider: 'custom',
    apiEndpoint: 'http://localhost:59999/invalid-endpoint', // Unreachable endpoint
    apiKey: 'test-key'
  });

  let callbackFired = false;
  service.onAnalysisComplete((res) => {
    callbackFired = true;
    assert.ok(res.mood);
  });

  // Track analysis should fallback to local heuristics without throwing
  const result = await service.analyzeTrack(
    { artist: 'Coldplay', title: 'Yellow' },
    'Look at the stars look how they shine for you'
  );

  assert.ok(result);
  assert.ok(callbackFired);
  assert.strictEqual(result.trackKey, 'coldplay - yellow');

  // Second call with same track should return cached result instantly
  const cached = await service.analyzeTrack({ artist: 'Coldplay', title: 'Yellow' });
  assert.strictEqual(cached.timestamp, result.timestamp);

  service.clearCache();
  assert.strictEqual(service.cache.size, 0);
});

