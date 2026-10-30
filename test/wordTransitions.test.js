const test = require('node:test');
const assert = require('node:assert');

const { EasingLibrary, getEasing } = require('../src/transitions/EasingLibrary');
const { WordTransitionController, EFFECT_MAP } = require('../src/transitions/WordTransitionController');
const { MorphTransition } = require('../src/transitions/effects/MorphTransition');
const { SlideBlurTransition } = require('../src/transitions/effects/SlideBlurTransition');
const { ParticleDissolveTransition } = require('../src/transitions/effects/ParticleDissolveTransition');
const { ElasticTransition } = require('../src/transitions/effects/ElasticTransition');
const { LetterRevealTransition } = require('../src/transitions/effects/LetterRevealTransition');
const { FadeBlurTransition } = require('../src/transitions/effects/FadeBlurTransition');

test('EasingLibrary computes accurate mathematical boundaries across curves', () => {
  // Test endpoints: 0 -> 0, 1 -> 1
  assert.strictEqual(EasingLibrary.linear(0), 0);
  assert.strictEqual(EasingLibrary.linear(1), 1);

  assert.strictEqual(EasingLibrary.easeIn(0), 0);
  assert.strictEqual(EasingLibrary.easeIn(1), 1);

  assert.strictEqual(EasingLibrary.easeOut(0), 0);
  assert.strictEqual(EasingLibrary.easeOut(1), 1);

  assert.strictEqual(EasingLibrary.cubicIn(0), 0);
  assert.strictEqual(EasingLibrary.cubicOut(1), 1);

  assert.strictEqual(EasingLibrary.expoIn(0), 0);
  assert.strictEqual(EasingLibrary.expoOut(1), 1);

  assert.strictEqual(EasingLibrary.bounceOut(0), 0);
  assert.strictEqual(Math.round(EasingLibrary.bounceOut(1)), 1);

  // ElasticOut starts at 0 and reaches 1 at t=1
  assert.strictEqual(EasingLibrary.elasticOut(0), 0);
  assert.strictEqual(EasingLibrary.elasticOut(1), 1);

  // getEasing returns function for aliases
  assert.strictEqual(getEasing('ease-out'), EasingLibrary.easeOut);
  assert.strictEqual(getEasing('elastic'), EasingLibrary.elasticOut);
  assert.strictEqual(getEasing('bounce'), EasingLibrary.bounceOut);
  assert.strictEqual(getEasing('linear'), EasingLibrary.linear);
  assert.ok(typeof getEasing('custom-unknown') === 'function');
});

test('All 6 word transition effects apply transforms and reset cleanly', () => {
  const effects = [
    MorphTransition,
    SlideBlurTransition,
    ParticleDissolveTransition,
    ElasticTransition,
    LetterRevealTransition,
    FadeBlurTransition
  ];

  for (const EffectClass of effects) {
    const mockPrevEl = { style: {}, querySelectorAll: () => [] };
    const mockNextEl = { style: {}, querySelectorAll: () => [] };

    // Apply half-way (progress = 0.5)
    EffectClass.apply(mockPrevEl, mockNextEl, 0.5, {
      direction: 'up',
      distance: 16,
      blurStrength: 0.4
    });

    // Check that styles were modified
    assert.ok(mockPrevEl.style.opacity !== undefined || mockPrevEl.style.transform !== undefined);
    assert.ok(mockNextEl.style.opacity !== undefined || mockNextEl.style.transform !== undefined);

    // Reset
    EffectClass.reset(mockPrevEl, mockNextEl);
    assert.strictEqual(mockNextEl.style.opacity, '1');
    assert.strictEqual(mockNextEl.style.transform, 'none');
  }
});

test('WordTransitionController manages word activation state and ignores duplicate ticks', () => {
  const controller = new WordTransitionController({
    effect: 'slide-blur',
    duration: 200
  });

  const words = [
    { classList: { add() {}, remove() {} }, style: {} },
    { classList: { add() {}, remove() {} }, style: {} },
    { classList: { add() {}, remove() {} }, style: {} }
  ];

  const mockContainer = {
    querySelectorAll: (selector) => {
      if (selector === '.word-token') return words;
      return [];
    }
  };

  // 1. Activate word 0 of line 0
  controller.onWordChange(0, 0, mockContainer);
  assert.strictEqual(controller.currentLineIdx, 0);
  assert.strictEqual(controller.currentWordIdx, 0);

  // 2. Redundant tick with identical indices does NOT re-trigger animation
  const initialAnim = controller.activeAnimation;
  controller.onWordChange(0, 0, mockContainer);
  assert.strictEqual(controller.activeAnimation, initialAnim);

  // 3. Progression to word 1 of line 0 triggers new transition
  controller.onWordChange(0, 1, mockContainer);
  assert.strictEqual(controller.currentWordIdx, 1);

  // 4. Seek / reconcile cancels stale animation
  controller.seekReconcile();
  assert.strictEqual(controller.activeAnimation, null);

  controller.destroy();
  assert.strictEqual(controller.currentWordIdx, -1);
});

test('WordTransitionController respects reduced motion by settling immediately', () => {
  const controller = new WordTransitionController({
    effect: 'elastic',
    reducedMotion: true
  });

  const words = [
    { classList: { add() {}, remove() {} }, style: {} },
    { classList: { add() {}, remove() {} }, style: {} }
  ];

  const mockContainer = {
    querySelectorAll: () => words
  };

  controller.onWordChange(0, 1, mockContainer);
  assert.strictEqual(controller.activeAnimation, null); // Did not spawn animation loop

  controller.destroy();
});

