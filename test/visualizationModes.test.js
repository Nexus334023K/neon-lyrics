const test = require('node:test');
const assert = require('node:assert');
const {
  MotionBlurEngine,
  FrameRateController,
  QUALITY_PRESETS
} = require('../src/utils/motionEngine');
const {
  DEFAULT_CONFIG,
  VALID_VISUALIZATION_MODES,
  validateAnimationConfig
} = require('../src/utils/storage');

test('Visualization modes define all four Verci-inspired modes with valid default', () => {
  assert.deepStrictEqual(VALID_VISUALIZATION_MODES, ['ship', 'fisheye', 'fisheye-visual', 'clean']);
  assert.strictEqual(DEFAULT_CONFIG.visualizationMode, 'ship');
  assert.strictEqual(DEFAULT_CONFIG.autoSyncAlbumColors, true);
});

test('MotionBlurEngine supports four visualization modes and mode-specific parameters', () => {
  const engine = new MotionBlurEngine({
    visualizationMode: 'ship',
    animationSpeed: 1.5,
    transitionDuration: 0.24,
    perspectiveDepth: 900
  });

  assert.strictEqual(engine.config.visualizationMode, 'ship');
  assert.strictEqual(engine.config.animationSpeed, 1.5);
  assert.strictEqual(engine.config.transitionDuration, 0.24);
  assert.strictEqual(engine.config.perspectiveDepth, 900);

  // Apply new mode
  engine.applyConfig({ visualizationMode: 'fisheye' });
  assert.strictEqual(engine.config.visualizationMode, 'fisheye');

  engine.destroy();
});

test('MotionBlurEngine transition applies mode transforms and guarantees stationary sharpness', () => {
  const engine = new MotionBlurEngine({
    motionBlur: true,
    motionBlurIntensity: 'high',
    visualizationMode: 'ship'
  });

  const mockPastEl = { textContent: '', className: '', style: {}, classList: { remove() {}, add() {} } };
  const mockActiveEl = { innerHTML: '', className: '', style: {}, classList: { remove() {}, add() {} } };
  const mockNextEl = { textContent: '', className: '', style: {}, classList: { remove() {}, add() {} } };

  // Trigger transition in Ship mode
  engine.triggerTransition({
    pastEl: mockPastEl,
    activeEl: mockActiveEl,
    nextLineEl: mockNextEl,
    pastContent: 'Past verse',
    activeContent: 'Active verse in wall',
    nextContent: 'Next verse',
    direction: 'forward',
    duration: 0.28,
    visualizationMode: 'ship'
  });

  // Active element should receive perspective and depth transform while moving
  assert.ok(mockActiveEl.style.transform.includes('perspective'));
  assert.ok(mockActiveEl.style.transform.includes('translateZ'));
  assert.ok(mockActiveEl.style.filter.includes('blur'));

  // Complete the transition
  engine._settleLines({
    pastEl: mockPastEl,
    activeEl: mockActiveEl,
    nextLineEl: mockNextEl
  });

  // Stationary sharpness guarantee: blur is 100% stripped upon settle
  assert.strictEqual(mockActiveEl.style.filter, 'none');
  assert.strictEqual(mockPastEl.style.filter, 'none');
  assert.strictEqual(mockNextEl.style.filter, 'none');
  assert.strictEqual(mockActiveEl.style.opacity, '1');

  engine.destroy();
});

test('Fisheye and Fisheye-Visual modes scale active line correctly during transition', () => {
  const engine = new MotionBlurEngine({
    visualizationMode: 'fisheye'
  });

  const mockPastEl = { textContent: '', className: '', style: {}, classList: { remove() {}, add() {} } };
  const mockActiveEl = { innerHTML: '', className: '', style: {}, classList: { remove() {}, add() {} } };
  const mockNextEl = { textContent: '', className: '', style: {}, classList: { remove() {}, add() {} } };

  engine.triggerTransition({
    pastEl: mockPastEl,
    activeEl: mockActiveEl,
    nextLineEl: mockNextEl,
    pastContent: 'Context',
    activeContent: 'Fisheye Focal Line',
    nextContent: 'Next',
    direction: 'forward',
    duration: 0.28,
    visualizationMode: 'fisheye'
  });

  assert.ok(mockActiveEl.style.transform.includes('scale'));

  engine.destroy();
});
