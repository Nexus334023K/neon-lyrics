const test = require('node:test');
const assert = require('node:assert');
const { ParticleEnvironment } = require('../src/three/ParticleEnvironment');
const { Scene3DManager } = require('../src/three/Scene3DManager');

test('ParticleEnvironment initializes particles within spatial boundaries and wraps depth', () => {
  const env = new ParticleEnvironment({ count: 20, boundZ: 500, speed: 2.0 });
  assert.strictEqual(env.particles.length, 20);

  const initialZ = env.particles[0].z;
  // Update with delta time
  env.update(0.1);
  assert.notStrictEqual(env.particles[0].z, initialZ);

  // Force particle past near plane to verify wrap
  env.particles[0].z = -5;
  env.update(0.016);
  assert.ok(env.particles[0].z > 0, 'Particle must wrap back into depth');
});

test('ParticleEnvironment responds to audio energy and beat transients', () => {
  const env = new ParticleEnvironment({ count: 10, speed: 1.0 });
  const p = env.particles[0];
  const oldZ = p.z;

  // Normal update
  env.update(0.1, { energy: 0.0, isBeat: false });
  const normalStep = Math.abs(p.z - oldZ);

  // Update with high energy + beat kick
  const preKickZ = p.z;
  env.update(0.1, { energy: 0.9, isBeat: true });
  const kickStep = Math.abs(p.z - preKickZ);

  assert.ok(kickStep > normalStep * 1.5, 'Audio beat kick must accelerate particle travel');
});

test('Scene3DManager manages camera trajectories and renders to canvas', () => {
  let cleared = false;
  let arcDrawn = false;

  const mockCtx = {
    clearRect() { cleared = true; },
    beginPath() {},
    arc() { arcDrawn = true; },
    fill() {}
  };

  const mockCanvas = {
    width: 600,
    height: 200,
    getContext: () => mockCtx
  };

  const manager = new Scene3DManager({ enabled: true, cameraMotion: 'orbit' });
  manager.attach(mockCanvas);

  assert.strictEqual(manager.enabled, true);

  // Tick orbit
  manager.tick(0.05);
  const cam1 = manager.getCameraState();
  assert.strictEqual(cam1.motion, 'orbit');
  assert.ok(cleared);
  assert.ok(arcDrawn);

  // Switch to tunnel mode
  manager.applyConfig({ cameraMotion: 'tunnel' });
  manager.tick(0.05);
  const cam2 = manager.getCameraState();
  assert.strictEqual(cam2.motion, 'tunnel');

  // Detach and clean up
  manager.detach();
  assert.strictEqual(manager.canvas, null);
});

