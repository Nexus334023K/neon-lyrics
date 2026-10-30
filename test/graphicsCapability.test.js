const test = require('node:test');
const assert = require('node:assert');
const { RenderScheduler } = require('../src/graphics/RenderScheduler');
const { CanvasRenderer } = require('../src/graphics/CanvasRenderer');
const { WebGLRenderer } = require('../src/graphics/WebGLRenderer');
const { GraphicsEngine } = require('../src/graphics/GraphicsEngine');

test('RenderScheduler calculates correct target intervals and supports FPS switching', () => {
  const scheduler = new RenderScheduler({ targetFps: 60, displayRefreshRate: 60 });
  assert.strictEqual(scheduler.targetFps, 60);
  assert.strictEqual(Math.round(scheduler.getTargetInterval() * 100) / 100, 16.67);

  scheduler.setTargetFps(30);
  assert.strictEqual(scheduler.targetFps, 30);
  assert.strictEqual(Math.round(scheduler.getTargetInterval() * 100) / 100, 33.33);

  scheduler.setTargetFps(120);
  assert.strictEqual(scheduler.targetFps, 120);
  assert.strictEqual(Math.round(scheduler.getTargetInterval() * 100) / 100, 8.33);

  scheduler.setTargetFps('auto');
  scheduler.setDisplayRefreshRate(144);
  assert.strictEqual(scheduler.targetFps, 'auto');
  assert.strictEqual(Math.round(scheduler.getTargetInterval() * 100) / 100, 6.94);

  scheduler.destroy();
});

test('RenderScheduler manages lifecycle and callback registrations safely', (t, done) => {
  const scheduler = new RenderScheduler({ targetFps: 60 });
  let frameFired = false;

  const unregister = scheduler.register(({ now, delta, frameCount }) => {
    assert.ok(typeof now === 'number');
    assert.ok(delta >= 0);
    assert.ok(frameCount >= 1);
    frameFired = true;
    unregister();
    scheduler.destroy();
    assert.strictEqual(frameFired, true);
    done();
  });
});

test('GraphicsEngine safely detects environment capabilities and falls back gracefully', () => {
  const caps = GraphicsEngine.detectCapabilities();
  assert.ok(caps);
  assert.strictEqual(typeof caps.webgl2, 'boolean');
  assert.strictEqual(typeof caps.canvas2d, 'boolean');
  assert.ok(caps.maxTextureSize >= 2048);
});

test('CanvasRenderer can initialize with mock 2D context and render without crashing', () => {
  const mockCalls = [];
  const mockCanvas = {
    width: 800,
    height: 200,
    style: {},
    getContext: (type) => {
      if (type === '2d') {
        return {
          save() { mockCalls.push('save'); },
          restore() { mockCalls.push('restore'); },
          clearRect() { mockCalls.push('clearRect'); },
          setTransform() {},
          scale() {},
          fillText(txt) { mockCalls.push(`fillText:${txt}`); }
        };
      }
      return null;
    }
  };

  const renderer = new CanvasRenderer();
  const ok = renderer.initialize(mockCanvas);
  assert.strictEqual(ok, true);
  assert.strictEqual(renderer.isReady, true);

  renderer.render({
    text: 'Test Lyric Line'
  }, {
    glow: { enabled: true, intensity: 1.0, radius: 0.5 }
  });

  assert.ok(mockCalls.includes('save'));
  assert.ok(mockCalls.some(c => c.startsWith('fillText:Test Lyric Line')));

  renderer.dispose();
  assert.strictEqual(renderer.isReady, false);
});

test('GraphicsEngine initializes with CanvasRenderer fallback when WebGL is unavailable', () => {
  const mockCanvas = {
    width: 800,
    height: 200,
    style: {},
    getContext: (type) => {
      // Return null for WebGL contexts
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      if (type === '2d') {
        return {
          save() {},
          restore() {},
          clearRect() {},
          setTransform() {},
          scale() {},
          fillText() {}
        };
      }
      return null;
    }
  };

  const engine = new GraphicsEngine();
  const activeType = engine.initialize(mockCanvas);
  assert.strictEqual(activeType, 'canvas');
  assert.strictEqual(engine.activeRendererType, 'canvas');

  const caps = engine.getCapabilities();
  assert.strictEqual(caps.canvas2d, true);

  engine.dispose();
  assert.strictEqual(engine.isInitialized, false);
});

