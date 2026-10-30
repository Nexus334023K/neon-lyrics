/**
 * NeonLyrics - SnapGeometry
 * Computes magnetic edge snapping coordinates against monitor work area boundaries.
 */

class SnapGeometry {
  /**
   * Snaps a window rectangle to workArea boundaries if within threshold distance.
   * @param {Object} bounds - { x, y, width, height }
   * @param {Object} workArea - { x, y, width, height }
   * @param {number} threshold - Magnetic snap distance in pixels (default 16)
   * @returns {Object} - { x, y, snappedLeft, snappedRight, snappedTop, snappedBottom }
   */
  static calculateSnap(bounds, workArea, threshold = 16) {
    if (!bounds || !workArea) {
      return {
        x: bounds?.x || 0,
        y: bounds?.y || 0,
        snappedLeft: false,
        snappedRight: false,
        snappedTop: false,
        snappedBottom: false
      };
    }

    let snapX = bounds.x;
    let snapY = bounds.y;
    let snappedLeft = false;
    let snappedRight = false;
    let snappedTop = false;
    let snappedBottom = false;

    // Horizontal snapping
    // Left edge
    if (Math.abs(bounds.x - workArea.x) <= threshold) {
      snapX = workArea.x;
      snappedLeft = true;
    }
    // Right edge
    else if (Math.abs((bounds.x + bounds.width) - (workArea.x + workArea.width)) <= threshold) {
      snapX = workArea.x + workArea.width - bounds.width;
      snappedRight = true;
    }

    // Vertical snapping
    // Top edge
    if (Math.abs(bounds.y - workArea.y) <= threshold) {
      snapY = workArea.y;
      snappedTop = true;
    }
    // Bottom edge
    else if (Math.abs((bounds.y + bounds.height) - (workArea.y + workArea.height)) <= threshold) {
      snapY = workArea.y + workArea.height - bounds.height;
      snappedBottom = true;
    }

    return {
      x: snapX,
      y: snapY,
      snappedLeft,
      snappedRight,
      snappedTop,
      snappedBottom
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SnapGeometry };
}
if (typeof window !== 'undefined') {
  window.SnapGeometry = SnapGeometry;
}

