/**
 * NeonLyrics V3 - WallpaperMode
 * Manages Wallpaper Mode desktop integration:
 * - Fullscreen / edge-to-edge desktop visualization
 * - Auto-hiding interactive controls when mouse is idle
 * - Opacity and background styling
 */

class WallpaperMode {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.opacity = typeof options.opacity === 'number' ? options.opacity : 0.85;
    this.autoHideControls = options.autoHideControls !== undefined ? Boolean(options.autoHideControls) : true;
    this.idleTimeoutSeconds = options.idleTimeoutSeconds || 3;
    this.blurBackground = Boolean(options.blurBackground);

    this.containerEl = null;
    this.controlsEl = null;
    this._idleTimer = null;
    this._isControlsVisible = true;
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
  }

  attach(containerEl, controlsEl) {
    this.containerEl = containerEl;
    this.controlsEl = controlsEl;

    if (this.containerEl && typeof this.containerEl.addEventListener === 'function') {
      this.containerEl.addEventListener('mousemove', this._onMouseMove);
      this.containerEl.addEventListener('mouseleave', this._onMouseLeave);
    }

    this.apply();
  }

  detach() {
    if (this.containerEl && typeof this.containerEl.removeEventListener === 'function') {
      this.containerEl.removeEventListener('mousemove', this._onMouseMove);
      this.containerEl.removeEventListener('mouseleave', this._onMouseLeave);
    }
    this._clearIdleTimer();
    this.containerEl = null;
    this.controlsEl = null;
  }

  enable() {
    this.enabled = true;
    this.apply();
  }

  disable() {
    this.enabled = false;
    this.apply();
  }

  updateConfig(config = {}) {
    if (config.enabled !== undefined) this.enabled = Boolean(config.enabled);
    if (config.opacity !== undefined) this.opacity = Math.max(0.1, Math.min(1.0, config.opacity));
    if (config.autoHideControls !== undefined) this.autoHideControls = Boolean(config.autoHideControls);
    if (config.idleTimeoutSeconds !== undefined) this.idleTimeoutSeconds = Math.max(1, config.idleTimeoutSeconds);
    if (config.blurBackground !== undefined) this.blurBackground = Boolean(config.blurBackground);
    this.apply();
  }

  apply() {
    if (!this.containerEl) return;

    if (this.enabled) {
      if (this.containerEl.classList) {
        this.containerEl.classList.add('wallpaper-mode-active');
      }
      if (this.containerEl.style) {
        this.containerEl.style.opacity = String(this.opacity);
      }
      if (this.autoHideControls) {
        this._resetIdleTimer();
      } else {
        this._showControls();
      }
    } else {
      if (this.containerEl.classList) {
        this.containerEl.classList.remove('wallpaper-mode-active');
      }
      if (this.containerEl.style) {
        this.containerEl.style.opacity = '1.0';
      }
      this._showControls();
      this._clearIdleTimer();
    }
  }

  _onMouseMove() {
    if (!this.enabled || !this.autoHideControls) return;
    this._showControls();
    this._resetIdleTimer();
  }

  _onMouseLeave() {
    if (!this.enabled || !this.autoHideControls) return;
    this._hideControls();
  }

  _showControls() {
    this._isControlsVisible = true;
    if (this.controlsEl && this.controlsEl.classList) {
      this.controlsEl.classList.remove('controls-idle-hidden');
    }
  }

  _hideControls() {
    this._isControlsVisible = false;
    if (this.controlsEl && this.controlsEl.classList) {
      this.controlsEl.classList.add('controls-idle-hidden');
    }
  }

  _resetIdleTimer() {
    this._clearIdleTimer();
    if (typeof setTimeout !== 'undefined') {
      this._idleTimer = setTimeout(() => {
        this._hideControls();
      }, this.idleTimeoutSeconds * 1000);
    }
  }

  _clearIdleTimer() {
    if (this._idleTimer) {
      if (typeof clearTimeout !== 'undefined') {
        clearTimeout(this._idleTimer);
      }
      this._idleTimer = null;
    }
  }

  isControlsVisible() {
    return this._isControlsVisible;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WallpaperMode };
}
if (typeof window !== 'undefined') {
  window.WallpaperMode = WallpaperMode;
}

