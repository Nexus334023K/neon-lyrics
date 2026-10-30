const test = require('node:test');
const assert = require('node:assert');
const { SnapGeometry } = require('../src/desktop/SnapGeometry');
const { DesktopWindowManager, MODE_PRESETS } = require('../src/desktop/DesktopWindowManager');

test('SnapGeometry snaps to workArea edges within threshold distance', () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

  // 1. Near left edge (x=10, threshold=16) -> should snap to x=0
  const nearLeft = { x: 10, y: 500, width: 600, height: 200 };
  const snapLeft = SnapGeometry.calculateSnap(nearLeft, workArea, 16);
  assert.strictEqual(snapLeft.x, 0);
  assert.strictEqual(snapLeft.snappedLeft, true);

  // 2. Far from edge (x=100, threshold=16) -> should NOT snap
  const far = { x: 100, y: 500, width: 600, height: 200 };
  const noSnap = SnapGeometry.calculateSnap(far, workArea, 16);
  assert.strictEqual(noSnap.x, 100);
  assert.strictEqual(noSnap.snappedLeft, false);

  // 3. Near right edge (x=1310, width=600 -> right=1910, workArea.width=1920) -> should snap right
  const nearRight = { x: 1310, y: 500, width: 600, height: 200 };
  const snapRight = SnapGeometry.calculateSnap(nearRight, workArea, 16);
  assert.strictEqual(snapRight.x, 1920 - 600); // 1320
  assert.strictEqual(snapRight.snappedRight, true);

  // 4. Near bottom edge (y=835, height=200 -> bottom=1035, workArea.height=1040) -> should snap bottom
  const nearBottom = { x: 500, y: 835, width: 600, height: 200 };
  const snapBottom = SnapGeometry.calculateSnap(nearBottom, workArea, 16);
  assert.strictEqual(snapBottom.y, 1040 - 200); // 840
  assert.strictEqual(snapBottom.snappedBottom, true);
});

test('DesktopWindowManager provides presets and computes target layout bounds', () => {
  const manager = new DesktopWindowManager({ mode: 'widget' });
  const dim = manager.getModeDimensions('widget');
  assert.strictEqual(dim.width, MODE_PRESETS.widget.width);
  assert.strictEqual(dim.height, MODE_PRESETS.widget.height);

  const display = {
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 }
  };

  const widgetBounds = manager.computeTargetBounds('widget', display);
  assert.strictEqual(widgetBounds.width, MODE_PRESETS.widget.width);
  assert.strictEqual(widgetBounds.height, MODE_PRESETS.widget.height);
  assert.ok(widgetBounds.x > 0);
  assert.ok(widgetBounds.y > 0);

  // Multi-monitor resolution with fallback
  const displays = [
    { id: 1, isPrimary: true, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
    { id: 2, isPrimary: false, workArea: { x: 1920, y: 0, width: 2560, height: 1440 } }
  ];

  const resolvedTarget = manager.resolveTargetDisplay(displays, 1);
  assert.strictEqual(resolvedTarget.id, 2);

  const outOfRange = manager.resolveTargetDisplay(displays, 99);
  assert.strictEqual(outOfRange.id, 1, 'Should fallback to primary display');
});

