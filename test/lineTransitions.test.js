const test = require('node:test');
const assert = require('node:assert');

const { LineTransitionController, VALID_LINE_EFFECTS } = require('../src/transitions/LineTransitionController');

test('VALID_LINE_EFFECTS contains all 8 required specification effects', () => {
  const expected = [
    'crossfade',
    'morph',
    'slide',
    'slide-blur',
    'particle-dissolve',
    'elastic',
    'fade-blur',
    'vertical-reveal'
  ];
  assert.strictEqual(VALID_LINE_EFFECTS.length, 8);
  for (const eff of expected) {
    assert.ok(VALID_LINE_EFFECTS.includes(eff), `Missing effect ${eff}`);
  }
});

test('LineTransitionController applies each of the 8 effects and guarantees stationary sharpness on settle', () => {
  for (const eff of VALID_LINE_EFFECTS) {
    const controller = new LineTransitionController({
      effect: eff,
      duration: 300,
      blurStrength: 0.5,
      motionBlur: true
    });

    const mockPast = { textContent: '', style: {} };
    const mockActive = { textContent: '', style: {} };
    const mockNext = { textContent: '', style: {} };

    controller.triggerTransition({
      pastEl: mockPast,
      activeEl: mockActive,
      nextLineEl: mockNext,
      pastContent: 'Past Verse',
      activeContent: 'Active Chorus',
      nextContent: 'Next Verse'
    });

    assert.ok(controller.activeTransition);
    assert.strictEqual(controller.activeTransition.effect, eff);

    // Run frame at t = 0.5
    controller._applyFrame(0.5, controller.activeTransition);

    // Settle transition
    controller.settleLines({ pastEl: mockPast, activeEl: mockActive, nextLineEl: mockNext });

    // Assert stationary sharpness guarantee
    assert.strictEqual(mockActive.style.filter, 'none');
    assert.strictEqual(mockActive.style.transform, 'none');
    assert.strictEqual(mockActive.style.opacity, '1');
    assert.strictEqual(mockPast.style.filter, 'none');

    controller.destroy();
  }
});

test('LineTransitionController immediately settles on seek without animating missed lines', () => {
  const controller = new LineTransitionController({
    effect: 'slide-blur',
    duration: 500
  });

  const mockPast = { textContent: '', style: {} };
  const mockActive = { textContent: '', style: {} };
  const mockNext = { textContent: '', style: {} };

  controller.triggerTransition({
    pastEl: mockPast,
    activeEl: mockActive,
    nextLineEl: mockNext,
    pastContent: 'Line 20',
    activeContent: 'Line 21',
    nextContent: 'Line 22',
    isSeek: true
  });

  // Since isSeek is true, no animation loop should be active
  assert.strictEqual(controller.activeTransition, null);
  assert.strictEqual(mockActive.style.filter, 'none');
  assert.strictEqual(mockActive.textContent, 'Line 21');

  controller.destroy();
});

