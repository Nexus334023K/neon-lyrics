const test = require('node:test');
const assert = require('node:assert');
const {
  FrameRateController,
  MotionBlurEngine,
  QUALITY_PRESETS,
  BLUR_INTENSITY_VALUES
} = require('../src/utils/motionEngine');

// Mock clock and rAF simulator for precise deterministic frame testing
function createMockClock(startTime = 1000) {
  let currentTime = startTime;
  let nextRafId = 1;
  const queuedCallbacks = new Map();

  return {
    now: () => currentTime,
    advance: (ms) => {
      currentTime += ms;
    },
    raf: (cb) => {
      const id = nextRafId++;
      queuedCallbacks.set(id, cb);
      return id;
    },
    caf: (id) => {
      queuedCallbacks.delete(id);
    },
    step: () => {
      // Execute all currently queued callbacks with current time
      const toRun = Array.from(queuedCallbacks.entries());
      queuedCallbacks.clear();
      toRun.forEach(([id, cb]) => {
        cb(currentTime);
      });
      return toRun.length;
    },
    pendingCount: () => queuedCallbacks.size
  };
}

test('FrameRateController calculates correct frame intervals for 30, 60, 90, 120 FPS and Auto', () => {
  const clock = createMockClock();
  const ctrl = new FrameRateController({ nowFn: clock.now, rafFn: clock.raf, cafFn: clock.caf });

  ctrl.setTargetFps('auto');
  assert.strictEqual(ctrl.getFrameIntervalMs(), 0);

  ctrl.setTargetFps(30);
  assert.strictEqual(Math.round(ctrl.getFrameIntervalMs() * 100) / 100, 33.33);

  ctrl.setTargetFps(60);
  assert.strictEqual(Math.round(ctrl.getFrameIntervalMs() * 100) / 100, 16.67);

  ctrl.setTargetFps(90);
  assert.strictEqual(Math.round(ctrl.getFrameIntervalMs() * 100) / 100, 11.11);

  ctrl.setTargetFps(120);
  assert.strictEqual(Math.round(ctrl.getFrameIntervalMs() * 100) / 100, 8.33);

  ctrl.destroy();
});

test('FrameRateController throttles ticks at 30 FPS target without dropping speed', () => {
  const clock = createMockClock(0);
  const ctrl = new FrameRateController({
    targetFps: 30,
    nowFn: clock.now,
    rafFn: clock.raf,
    cafFn: clock.caf
  });

  let ticksCount = 0;
  let totalDelta = 0;
  ctrl.register((dt) => {
    ticksCount++;
    totalDelta += dt;
  });

  ctrl.start();

  // Simulate a 120Hz display refresh (calling rAF every ~8.33ms for ~110ms)
  for (let step = 0; step < 14; step++) {
    clock.advance(8.33);
    clock.step();
  }

  // Over ~110ms at 30 FPS (interval ~33.3ms), we should have approximately 3-4 ticks executed
  assert.ok(ticksCount >= 3 && ticksCount <= 4, `Expected 3-4 ticks at 30 FPS over 110ms, got ${ticksCount}`);
  assert.ok(totalDelta >= 0.09 && totalDelta <= 0.14, `Total delta should approximate ~0.1s, got ${totalDelta}`);

  ctrl.destroy();
});

test('FrameRateController delivers higher frame cadence at 60 FPS and 120 FPS', () => {
  const clock = createMockClock(0);

  // Test 60 FPS
  const ctrl60 = new FrameRateController({
    targetFps: 60,
    nowFn: clock.now,
    rafFn: clock.raf,
    cafFn: clock.caf
  });
  let ticks60 = 0;
  ctrl60.register(() => ticks60++);
  ctrl60.start();

  // 120ms total simulation stepping at 4ms intervals
  for (let i = 0; i < 30; i++) {
    clock.advance(4);
    clock.step();
  }
  // At 60 FPS (~16.6ms), 120ms should produce ~7 ticks
  assert.ok(ticks60 >= 6 && ticks60 <= 8, `Expected ~7 ticks at 60 FPS, got ${ticks60}`);
  ctrl60.destroy();

  // Test 120 FPS
  const ctrl120 = new FrameRateController({
    targetFps: 120,
    nowFn: clock.now,
    rafFn: clock.raf,
    cafFn: clock.caf
  });
  let ticks120 = 0;
  ctrl120.register(() => ticks120++);
  ctrl120.start();

  for (let i = 0; i < 30; i++) {
    clock.advance(4);
    clock.step();
  }
  // At 120 FPS (~8.33ms), 120ms should produce ~14 ticks
  assert.ok(ticks120 >= 12 && ticks120 <= 16, `Expected ~14 ticks at 120 FPS, got ${ticks120}`);
  ctrl120.destroy();
});

test('Elapsed-time based animation progresses at identical physical speed across 30 FPS and 120 FPS', () => {
  const duration = 0.3; // 300ms animation
  const totalPhysicalTime = 150; // 150ms elapsed (halfway through)

  // Simulation at 30 FPS
  const clock30 = createMockClock(0);
  const ctrl30 = new FrameRateController({ targetFps: 30, nowFn: clock30.now, rafFn: clock30.raf, cafFn: clock30.caf });
  let progress30 = 0;
  ctrl30.register((dt, elapsed) => {
    progress30 = Math.min(1.0, elapsed / duration);
  });
  ctrl30.start();

  // Simulate 150ms in 16.6ms steps
  for (let t = 0; t < 9; t++) {
    clock30.advance(16.67);
    clock30.step();
  }
  ctrl30.destroy();

  // Simulation at 120 FPS
  const clock120 = createMockClock(0);
  const ctrl120 = new FrameRateController({ targetFps: 120, nowFn: clock120.now, rafFn: clock120.raf, cafFn: clock120.caf });
  let progress120 = 0;
  ctrl120.register((dt, elapsed) => {
    progress120 = Math.min(1.0, elapsed / duration);
  });
  ctrl120.start();

  // Simulate 150ms in 8.33ms steps
  for (let t = 0; t < 18; t++) {
    clock120.advance(8.33);
    clock120.step();
  }
  ctrl120.destroy();

  // Both should reach approximately 50% (0.5) progress despite vastly different frame counts
  assert.ok(Math.abs(progress30 - 0.5) < 0.08, `30 FPS progress should be ~0.5, got ${progress30}`);
  assert.ok(Math.abs(progress120 - 0.5) < 0.05, `120 FPS progress should be ~0.5, got ${progress120}`);
  assert.ok(Math.abs(progress30 - progress120) < 0.08, `Speed disparity between 30 and 120 FPS must be minimal`);
});

test('FrameRateController pause and resume lifecycle prevents background workload', () => {
  const clock = createMockClock(0);
  const ctrl = new FrameRateController({ targetFps: 60, nowFn: clock.now, rafFn: clock.raf, cafFn: clock.caf });

  let runCount = 0;
  ctrl.register(() => runCount++);
  ctrl.start();

  clock.advance(16.67);
  clock.step();
  assert.strictEqual(runCount, 1);

  // Pause
  ctrl.pause();
  clock.advance(100);
  clock.step();
  assert.strictEqual(runCount, 1, 'No frames should execute while paused');
  assert.strictEqual(clock.pendingCount(), 0, 'No rAF should be pending while paused');

  // Resume
  ctrl.resume();
  clock.advance(16.67);
  clock.step();
  assert.strictEqual(runCount, 2, 'Execution resumes on unpause');

  ctrl.destroy();
});

test('MotionBlurEngine maps intensity levels accurately', () => {
  const engine = new MotionBlurEngine({
    motionBlur: true,
    motionBlurIntensity: 'medium',
    gpuFallback: false
  });

  assert.strictEqual(engine.getEffectiveIntensity(), 'medium');
  assert.strictEqual(engine.getBlurValues().css, '4.5px');
  assert.strictEqual(engine.getBlurValues().svgDeviation, '0 4.5');

  engine.applyConfig({ motionBlurIntensity: 'high' });
  assert.strictEqual(engine.getEffectiveIntensity(), 'high');
  assert.strictEqual(engine.getBlurValues().css, '8px');

  engine.applyConfig({ motionBlurIntensity: 'low' });
  assert.strictEqual(engine.getEffectiveIntensity(), 'low');
  assert.strictEqual(engine.getBlurValues().css, '2px');

  engine.applyConfig({ motionBlur: false });
  assert.strictEqual(engine.getEffectiveIntensity(), 'off');
  assert.strictEqual(engine.getBlurValues().css, '0px');

  engine.destroy();
});

test('MotionBlurEngine guarantees stationary sharpness when line transition completes', () => {
  const clock = createMockClock(0);
  const engine = new MotionBlurEngine({
    motionBlur: true,
    motionBlurIntensity: 'high',
    nowFn: clock.now,
    rafFn: clock.raf,
    cafFn: clock.caf
  });

  // Mock DOM elements
  const createMockEl = (tag) => ({
    tagName: tag,
    className: '',
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  });

  const pastEl = createMockEl('div');
  const activeEl = createMockEl('div');
  const nextEl = createMockEl('div');

  let settledFired = false;
  engine.triggerTransition({
    pastEl,
    activeEl,
    nextLineEl: nextEl,
    pastContent: 'Previous Line',
    activeContent: '<span class="word">Active Line</span>',
    nextContent: 'Next Line',
    direction: 'forward',
    duration: 0.28,
    onSettle: () => {
      settledFired = true;
    }
  });

  // During transition: filter should be active on activeEl
  assert.ok(activeEl.classList.contains('line-moving-in'), 'Line should receive moving-in class');
  assert.ok(activeEl.style.filter.includes('blur'), 'Filter must be applied during motion');

  // Advance clock across transition duration (300ms in 20ms steps) and step
  for (let s = 0; s < 16; s++) {
    clock.advance(20);
    clock.step();
  }

  // After completion: CRITICAL STATIONARY SHARPNESS
  assert.strictEqual(settledFired, true, 'onSettle must fire');
  assert.ok(activeEl.classList.contains('line-settled'), 'Must have line-settled class');
  assert.strictEqual(activeEl.style.filter, 'none', 'Filter must be reset to none when settled (stationary sharpness)');
  assert.strictEqual(activeEl.style.transform, 'none', 'Transform must be reset to none');

  engine.destroy();
});

test('MotionBlurEngine respects reduced motion preferences by completing instantly without blur', () => {
  const engine = new MotionBlurEngine({
    motionBlur: true,
    motionBlurIntensity: 'high',
    respectReducedMotion: true
  });

  // Mock reduced motion query match
  engine.isReducedMotionPreferred = () => true;
  assert.strictEqual(engine.getEffectiveIntensity(), 'off');

  const createMockEl = (tag) => ({
    tagName: tag,
    className: '',
    style: {},
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  });

  const pastEl = createMockEl('div');
  const activeEl = createMockEl('div');
  const nextEl = createMockEl('div');

  let settled = false;
  engine.triggerTransition({
    pastEl,
    activeEl,
    nextLineEl: nextEl,
    pastContent: 'Past',
    activeContent: 'Active',
    nextContent: 'Next',
    onSettle: () => { settled = true; }
  });

  // Instantly settled
  assert.strictEqual(settled, true);
  assert.strictEqual(activeEl.style.filter, 'none');
  assert.strictEqual(activeEl.style.transform, 'none');
  assert.ok(activeEl.classList.contains('line-settled'));
  assert.strictEqual(activeEl.innerHTML, 'Active');

  engine.destroy();
});

test('QUALITY_PRESETS configurations match production specifications', () => {
  assert.deepStrictEqual(QUALITY_PRESETS.cinematic, {
    targetFps: 120,
    motionBlur: true,
    motionBlurIntensity: 'high',
    label: 'Cinematic (120 FPS • High Blur)'
  });

  assert.deepStrictEqual(QUALITY_PRESETS.smooth, {
    targetFps: 60,
    motionBlur: true,
    motionBlurIntensity: 'medium',
    label: 'Smooth (60 FPS • Medium Blur)'
  });

  assert.deepStrictEqual(QUALITY_PRESETS.balanced, {
    targetFps: 60,
    motionBlur: true,
    motionBlurIntensity: 'low',
    label: 'Balanced (60 FPS • Low Blur)'
  });

  assert.deepStrictEqual(QUALITY_PRESETS.eco, {
    targetFps: 30,
    motionBlur: false,
    motionBlurIntensity: 'off',
    label: 'Eco (30 FPS • Blur Off)'
  });
});
