const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  StorageManager,
  DEFAULT_CONFIG,
  validateAudioReactiveConfig,
  validateThreeDConfig,
  validateAiIntelligenceConfig,
  validateLyricsStudioConfig,
  validateDesktopWidgetsConfig,
  validateInsightsConfig
} = require('../src/utils/storage');

test('DEFAULT_CONFIG contains all Master Platform extension sections', () => {
  assert.ok(DEFAULT_CONFIG.audioReactive, 'audioReactive must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.audioReactive.enabled, false);
  assert.strictEqual(DEFAULT_CONFIG.audioReactive.source, 'system');

  assert.ok(DEFAULT_CONFIG.threeD, 'threeD must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.threeD.cameraMotion, 'orbit');

  assert.ok(DEFAULT_CONFIG.aiIntelligence, 'aiIntelligence must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.aiIntelligence.provider, 'local');

  assert.ok(DEFAULT_CONFIG.lyricsStudio, 'lyricsStudio must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.lyricsStudio.syncOffset, 0.0);

  assert.ok(DEFAULT_CONFIG.desktopWidgets, 'desktopWidgets must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.desktopWidgets.mode, 'overlay');

  assert.ok(DEFAULT_CONFIG.insights, 'insights must exist in schema');
  assert.strictEqual(DEFAULT_CONFIG.insights.trackingEnabled, true);
});

test('New section validators clamp out-of-bounds parameters and maintain defaults', () => {
  // 1. Audio-Reactive validator
  const validAudio = validateAudioReactiveConfig({
    enabled: true,
    sensitivity: 2.5,
    smoothing: 0.85,
    source: 'mic'
  });
  assert.strictEqual(validAudio.enabled, true);
  assert.strictEqual(validAudio.sensitivity, 2.5);
  assert.strictEqual(validAudio.source, 'mic');

  const invalidAudio = validateAudioReactiveConfig({
    sensitivity: 99.0, // out of bounds
    smoothing: -1.0, // out of bounds
    source: 'unsupported_device'
  });
  assert.strictEqual(invalidAudio.sensitivity, DEFAULT_CONFIG.audioReactive.sensitivity);
  assert.strictEqual(invalidAudio.smoothing, DEFAULT_CONFIG.audioReactive.smoothing);
  assert.strictEqual(invalidAudio.source, DEFAULT_CONFIG.audioReactive.source);

  // 2. ThreeD validator
  const validThreeD = validateThreeDConfig({
    enabled: true,
    depth: 1200,
    cameraMotion: 'tunnel'
  });
  assert.strictEqual(validThreeD.enabled, true);
  assert.strictEqual(validThreeD.depth, 1200);
  assert.strictEqual(validThreeD.cameraMotion, 'tunnel');

  const invalidThreeD = validateThreeDConfig({
    depth: 50, // too small
    cameraMotion: 'rollercoaster' // invalid
  });
  assert.strictEqual(invalidThreeD.depth, DEFAULT_CONFIG.threeD.depth);
  assert.strictEqual(invalidThreeD.cameraMotion, DEFAULT_CONFIG.threeD.cameraMotion);

  // 3. AI Intelligence validator
  const validAi = validateAiIntelligenceConfig({
    enabled: true,
    provider: 'custom',
    apiEndpoint: 'https://api.example.com/v1'
  });
  assert.strictEqual(validAi.enabled, true);
  assert.strictEqual(validAi.provider, 'custom');
  assert.strictEqual(validAi.apiEndpoint, 'https://api.example.com/v1');

  // 4. Lyrics Studio validator
  const validLyrics = validateLyricsStudioConfig({
    syncOffset: -0.25,
    romanization: true
  });
  assert.strictEqual(validLyrics.syncOffset, -0.25);
  assert.strictEqual(validLyrics.romanization, true);

  // 5. Desktop Widgets validator
  const validWidgets = validateDesktopWidgetsConfig({
    mode: 'widget',
    snapToEdges: true,
    edgeMargin: 20
  });
  assert.strictEqual(validWidgets.mode, 'widget');
  assert.strictEqual(validWidgets.edgeMargin, 20);

  // 6. Insights validator
  const validInsights = validateInsightsConfig({
    trackingEnabled: false,
    retentionDays: 180
  });
  assert.strictEqual(validInsights.trackingEnabled, false);
  assert.strictEqual(validInsights.retentionDays, 180);
});

test('StorageManager migrates legacy V2/V3 configuration to Master Schema seamlessly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neon-master-mig-'));
  const cfgPath = path.join(tmpDir, 'config.json');

  // Simulate legacy v2/v3 config missing all new extension sections
  const legacyConfig = {
    theme: 'theme-neon-pink',
    glowIntensity: 1.2,
    fontFamily: 'Inter',
    fontScale: 1.1,
    visualizationMode: 'fisheye',
    alwaysOnTop: true
  };
  fs.writeFileSync(cfgPath, JSON.stringify(legacyConfig, null, 2), 'utf8');

  const storageMgr = new StorageManager({ configFile: cfgPath });
  const loaded = storageMgr.getConfig();

  // Existing settings preserved
  assert.strictEqual(loaded.theme, 'theme-neon-pink');
  assert.strictEqual(loaded.fontFamily, 'Inter');
  assert.strictEqual(loaded.visualizationMode, 'fisheye');
  assert.strictEqual(loaded.alwaysOnTop, true);

  // New sections automatically populated with valid defaults
  assert.ok(loaded.audioReactive);
  assert.strictEqual(loaded.audioReactive.enabled, false);
  assert.ok(loaded.threeD);
  assert.strictEqual(loaded.threeD.cameraMotion, 'orbit');
  assert.ok(loaded.aiIntelligence);
  assert.strictEqual(loaded.aiIntelligence.provider, 'local');
  assert.ok(loaded.lyricsStudio);
  assert.ok(loaded.desktopWidgets);
  assert.ok(loaded.insights);

  // Update and persist partial changes to new sections
  storageMgr.saveConfig({
    audioReactive: { enabled: true, sensitivity: 1.8 },
    threeD: { enabled: true, cameraMotion: 'dynamic' }
  });

  const reloaded = storageMgr.getConfig();
  assert.strictEqual(reloaded.audioReactive.enabled, true);
  assert.strictEqual(reloaded.audioReactive.sensitivity, 1.8);
  assert.strictEqual(reloaded.threeD.enabled, true);
  assert.strictEqual(reloaded.threeD.cameraMotion, 'dynamic');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

