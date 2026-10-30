const test = require('node:test');
const assert = require('node:assert');
const { WallpaperMode } = require('../src/modes/WallpaperMode');

test('WallpaperMode attaches and manages active classes and opacity', () => {
  const container = {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    style: {},
    addEventListener() {},
    removeEventListener() {}
  };

  const controls = {
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  };

  const wp = new WallpaperMode({ enabled: true, opacity: 0.75, autoHideControls: true });
  wp.attach(container, controls);

  assert.strictEqual(container.classList.contains('wallpaper-mode-active'), true);
  assert.strictEqual(container.style.opacity, '0.75');

  wp.disable();
  assert.strictEqual(container.classList.contains('wallpaper-mode-active'), false);
  assert.strictEqual(container.style.opacity, '1.0');

  wp.enable();
  assert.strictEqual(container.classList.contains('wallpaper-mode-active'), true);

  wp.detach();
});

test('WallpaperMode updates configuration safely and validates opacity bounds', () => {
  const wp = new WallpaperMode();
  wp.updateConfig({ opacity: 1.5, autoHideControls: false, idleTimeoutSeconds: 5 });
  assert.strictEqual(wp.opacity, 1.0); // clamped to 1.0
  assert.strictEqual(wp.autoHideControls, false);
  assert.strictEqual(wp.idleTimeoutSeconds, 5);

  wp.updateConfig({ opacity: -0.2 });
  assert.strictEqual(wp.opacity, 0.1); // clamped to 0.1
});

