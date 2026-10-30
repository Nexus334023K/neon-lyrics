const test = require('node:test');
const assert = require('node:assert');
const { PluginManager, GraphicsPlugin, PLUGIN_TYPES } = require('../src/plugins/PluginManager');

test('GraphicsPlugin initializes with default contracts and metadata', () => {
  const p = new GraphicsPlugin({
    id: 'test-lens-flare',
    name: 'Lens Flare Glow',
    type: 'glow',
    version: '1.2.0'
  });

  assert.strictEqual(p.id, 'test-lens-flare');
  assert.strictEqual(p.name, 'Lens Flare Glow');
  assert.strictEqual(p.type, 'glow');
  assert.strictEqual(p.version, '1.2.0');
  assert.strictEqual(p.enabled, false);

  const tex = { id: 101 };
  assert.strictEqual(p.render(null, tex), tex);
});

test('PluginManager validates plugin structure and rejects invalid plugins', () => {
  const pm = new PluginManager();

  // Invalid: missing render method
  assert.throws(() => {
    pm.registerPlugin({ id: 'bad-1', type: 'glow' });
  }, /render\(\) function is required/);

  // Invalid: unsupported type
  assert.throws(() => {
    pm.registerPlugin({ id: 'bad-2', type: 'hologram', render: () => {} });
  }, /Unsupported plugin type/);

  // Valid registration
  const validPlugin = new GraphicsPlugin({ id: 'valid-blur', type: 'blur' });
  assert.strictEqual(pm.registerPlugin(validPlugin), true);

  // Duplicate registration rejected
  assert.throws(() => {
    pm.registerPlugin(validPlugin);
  }, /already registered/);
});

test('PluginManager safely isolates errors and auto-disables unstable plugins', () => {
  const pm = new PluginManager();

  let calls = 0;
  const flakyPlugin = new GraphicsPlugin({
    id: 'flaky-distort',
    type: 'distortion',
    enabled: true
  });
  flakyPlugin.render = () => {
    calls++;
    throw new Error('GPU shader crashed!');
  };

  pm.registerPlugin(flakyPlugin);
  assert.strictEqual(flakyPlugin.enabled, true);

  // Execute stage 3 times (the maxConsecutiveErrors threshold)
  pm.executeStage('distortion', {}, 'texture-in');
  pm.executeStage('distortion', {}, 'texture-in');
  assert.strictEqual(flakyPlugin.enabled, true); // Still active after 2 failures

  pm.executeStage('distortion', {}, 'texture-in'); // 3rd failure triggers auto-disable
  assert.strictEqual(flakyPlugin.enabled, false);

  // 4th call does not invoke the disabled plugin
  pm.executeStage('distortion', {}, 'texture-in');
  assert.strictEqual(calls, 3);
});

