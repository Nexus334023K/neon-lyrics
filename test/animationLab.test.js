const test = require('node:test');
const assert = require('node:assert');
const {
  QUALITY_PRESETS,
  MotionBlurEngine
} = require('../src/utils/motionEngine');
const {
  validateAnimationConfig,
  DEFAULT_CONFIG
} = require('../src/utils/storage');

test('Animation Lab includes Ultra, Balanced, and Low presets alongside backward-compatible keys', () => {
  assert.ok(QUALITY_PRESETS.ultra, 'Must include ultra preset');
  assert.strictEqual(QUALITY_PRESETS.ultra.targetFps, 120);
  assert.strictEqual(QUALITY_PRESETS.ultra.motionBlur, true);
  assert.strictEqual(QUALITY_PRESETS.ultra.motionBlurIntensity, 'high');

  assert.ok(QUALITY_PRESETS.balanced, 'Must include balanced preset');
  assert.strictEqual(QUALITY_PRESETS.balanced.targetFps, 60);

  assert.ok(QUALITY_PRESETS.low, 'Must include low preset');
  assert.strictEqual(QUALITY_PRESETS.low.targetFps, 30);
  assert.strictEqual(QUALITY_PRESETS.low.motionBlur, false);

  // Backward compatibility keys verified
  assert.ok(QUALITY_PRESETS.cinematic);
  assert.ok(QUALITY_PRESETS.smooth);
  assert.ok(QUALITY_PRESETS.eco);
});

test('validateAnimationConfig validates and sanitizes Animation Lab parameters', () => {
  // Valid inputs
  const valid = validateAnimationConfig({
    animationSpeed: 1.8,
    transitionDuration: 0.35,
    perspectiveDepth: 1100,
    qualityPreset: 'ultra'
  });
  assert.strictEqual(valid.animationSpeed, 1.8);
  assert.strictEqual(valid.transitionDuration, 0.35);
  assert.strictEqual(valid.perspectiveDepth, 1100);
  assert.strictEqual(valid.qualityPreset, 'ultra');

  // Out of bounds inputs safely clamped to defaults
  const invalid = validateAnimationConfig({
    animationSpeed: 99.0, // too high
    transitionDuration: -0.5, // negative
    perspectiveDepth: 50 // too small
  });
  assert.strictEqual(invalid.animationSpeed, DEFAULT_CONFIG.animation.animationSpeed);
  assert.strictEqual(invalid.transitionDuration, DEFAULT_CONFIG.animation.transitionDuration);
  assert.strictEqual(invalid.perspectiveDepth, DEFAULT_CONFIG.animation.perspectiveDepth);
});

test('MotionBlurEngine scales transition duration inversely with animation speed', () => {
  const engine = new MotionBlurEngine({
    animationSpeed: 2.0, // 2x speed -> duration should be halved
    transitionDuration: 0.28
  });

  const mockActiveEl = { innerHTML: '', className: '', style: {}, classList: { remove() {}, add() {} } };
  engine.triggerTransition({
    activeEl: mockActiveEl,
    activeContent: 'Speed Test Line',
    direction: 'forward',
    duration: 0.28
  });

  assert.ok(engine.activeTransition);
  // Expected duration: 0.28 / 2.0 = 0.14s
  assert.strictEqual(Math.round(engine.activeTransition.duration * 100) / 100, 0.14);

  engine.destroy();
});
