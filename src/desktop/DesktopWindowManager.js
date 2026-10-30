/**
 * NeonLyrics - DesktopWindowManager
 * Orchestrates desktop presentation modes (floating overlay, compact widget, taskbar dock),
 * multi-monitor placement, edge snapping, and presentation/game mode management.
 */

const { SnapGeometry } = (typeof module !== 'undefined' && module.exports)
  ? require('./SnapGeometry')
  : { SnapGeometry: window.SnapGeometry };

const MODE_PRESETS = {
  overlay: {
    width: 1100,
    height: 240,
    minWidth: 450,
    minHeight: 140
  },
  widget: {
    width: 380,
    height: 160,
    minWidth: 320,
    minHeight: 120
  },
  dock: {
    width: 620,
    height: 85,
    minWidth: 400,
    minHeight: 65
  }
};

class DesktopWindowManager {
  constructor(options = {}) {
    this.mode = options.mode || 'overlay'; // 'overlay' | 'widget' | 'dock'
    this.snapToEdges = options.snapToEdges !== false;
    this.edgeMargin = options.edgeMargin || 16;
    this.monitorIndex = options.monitorIndex || 0;
    this.gameModeAutoHide = Boolean(options.gameModeAutoHide);
    this.isGameModeHidden = false;
  }

  applyConfig(config = {}) {
    if (config.mode && MODE_PRESETS[config.mode]) this.mode = config.mode;
    if (config.snapToEdges !== undefined) this.snapToEdges = Boolean(config.snapToEdges);
    if (typeof config.edgeMargin === 'number') this.edgeMargin = config.edgeMargin;
    if (typeof config.monitorIndex === 'number') this.monitorIndex = config.monitorIndex;
    if (config.gameModeAutoHide !== undefined) this.gameModeAutoHide = Boolean(config.gameModeAutoHide);
  }

  getModeDimensions(mode = this.mode) {
    return MODE_PRESETS[mode] || MODE_PRESETS.overlay;
  }

  /**
   * Resolves target display given all available connected displays and a requested index.
   */
  resolveTargetDisplay(displays, requestedIndex = this.monitorIndex) {
    if (!Array.isArray(displays) || displays.length === 0) {
      return {
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        index: 0
      };
    }

    if (requestedIndex >= 0 && requestedIndex < displays.length) {
      return displays[requestedIndex];
    }

    // Fallback to primary display
    const primary = displays.find(d => d.isPrimary);
    return primary || displays[0];
  }

  /**
   * Computes target window bounds for a given mode and display work area.
   */
  computeTargetBounds(mode = this.mode, display = null, currentBounds = null) {
    const dim = this.getModeDimensions(mode);
    const workArea = display?.workArea || { x: 0, y: 0, width: 1920, height: 1040 };

    let width = dim.width;
    let height = dim.height;

    // Preserve custom sizing if already in this mode and size is within bounds
    if (currentBounds && currentBounds.width && currentBounds.height) {
      if (mode === this.mode) {
        width = Math.min(workArea.width, Math.max(dim.minWidth, currentBounds.width));
        height = Math.min(workArea.height, Math.max(dim.minHeight, currentBounds.height));
      }
    }

    // Default positioning based on mode
    let x, y;
    if (mode === 'dock') {
      // Bottom center dock
      x = workArea.x + Math.round((workArea.width - width) / 2);
      y = workArea.y + workArea.height - height - 10;
    } else if (mode === 'widget') {
      // Bottom right widget
      x = workArea.x + workArea.width - width - 30;
      y = workArea.y + workArea.height - height - 40;
    } else {
      // Bottom center overlay
      x = workArea.x + Math.round((workArea.width - width) / 2);
      y = workArea.y + workArea.height - height - 60;
    }

    const rawBounds = { x, y, width, height };

    if (this.snapToEdges) {
      const snapped = SnapGeometry.calculateSnap(rawBounds, workArea, this.edgeMargin);
      rawBounds.x = snapped.x;
      rawBounds.y = snapped.y;
    }

    return rawBounds;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DesktopWindowManager,
    SnapGeometry,
    MODE_PRESETS
  };
}
if (typeof window !== 'undefined') {
  window.DesktopWindowManager = DesktopWindowManager;
  window.SnapGeometry = SnapGeometry;
  window.MODE_PRESETS = MODE_PRESETS;
}

