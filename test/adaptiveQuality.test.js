const test = require('node:test');
const assert = require('node:assert');
const { AdaptiveQualityController } = require('../src/transitions/AdaptiveQualityController');

test('AdaptiveQualityController initializes with correct defaults and clamps levels', () => {
  const ctrl = new AdaptiveQualityController({ baseQuality: 'ultra', targetFps: 60 });
  assert.strictEqual(ctrl.getEffectiveQuality(), 'ultra');
  assert.strictEqual(ctrl.enabled, true);

  ctrl.setEnabled(false);
  assert.strictEqual(ctrl.getEffectiveQuality(), 'ultra');
  assert.strictEqual(ctrl.enabled, false);
});

test('AdaptiveQualityController automatically downgrades after repeated frame drops', () => {
  const ctrl = new AdaptiveQualityController({
    baseQuality: 'ultra',
    targetFps: 60,
    consecutiveDropThreshold: 3
  });

  const changes = [];
  ctrl.onQualityChange((q, reason) => changes.push({ q, reason }));

  // Normal frame duration at 60fps is ~16.6ms. Drop limit is ~25ms.
  // Feed 3 laggy frames (35ms each)
  ctrl.recordFrameTime(35);
  ctrl.recordFrameTime(35);
  assert.strictEqual(ctrl.getEffectiveQuality(), 'ultra'); // not yet

  ctrl.recordFrameTime(35); // 3rd drop -> triggers downgrade to balanced
  assert.strictEqual(ctrl.getEffectiveQuality(), 'balanced');
  assert.strictEqual(changes.length, 1);
  assert.strictEqual(changes[0].q, 'balanced');
  assert.strictEqual(changes[0].reason, 'downgraded');

  // Feed 3 more laggy frames -> triggers downgrade to low
  ctrl.recordFrameTime(35);
  ctrl.recordFrameTime(35);
  ctrl.recordFrameTime(35);
  assert.strictEqual(ctrl.getEffectiveQuality(), 'low');

  // Should not drop below 'low'
  ctrl.recordFrameTime(35);
  ctrl.recordFrameTime(35);
  ctrl.recordFrameTime(35);
  assert.strictEqual(ctrl.getEffectiveQuality(), 'low');
});

test('AdaptiveQualityController recovers back up to baseQuality when smooth frames persist', () => {
  const ctrl = new AdaptiveQualityController({
    baseQuality: 'balanced',
    targetFps: 60,
    consecutiveDropThreshold: 2,
    recoveryThresholdSeconds: 1 // 1000ms
  });

  // Downgrade to low first
  ctrl.recordFrameTime(40);
  ctrl.recordFrameTime(40);
  assert.strictEqual(ctrl.getEffectiveQuality(), 'low');

  // Feed smooth 16ms frames totaling 1000ms (e.g. 63 frames * 16ms = 1008ms)
  for (let i = 0; i < 65; i++) {
    ctrl.recordFrameTime(16);
  }

  // Recovered to base quality 'balanced'
  assert.strictEqual(ctrl.getEffectiveQuality(), 'balanced');

  // Does not exceed baseQuality ('balanced')
  for (let i = 0; i < 100; i++) {
    ctrl.recordFrameTime(16);
  }
  assert.strictEqual(ctrl.getEffectiveQuality(), 'balanced');
});

