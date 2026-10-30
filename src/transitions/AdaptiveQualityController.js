/**
 * NeonLyrics V3 - AdaptiveQualityController
 * Monitors frame rendering times and automatically scales animation and graphics quality
 * to preserve smooth playback and avoid dropped frames.
 */

class AdaptiveQualityController {
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;
    this.baseQuality = options.baseQuality || 'balanced';
    this.currentQuality = this.baseQuality;
    this.targetFps = options.targetFps || 60;
    this.dropThresholdRatio = options.dropThresholdRatio || 1.5; // frame takes > 1.5x expected interval
    this.consecutiveDropThreshold = options.consecutiveDropThreshold || 5; // 5 drops trigger downgrade
    this.recoveryThresholdSeconds = options.recoveryThresholdSeconds || 4; // 4s of smooth frames trigger upgrade

    this._consecutiveDrops = 0;
    this._smoothFramesCount = 0;
    this._smoothDurationMs = 0;
    this._listeners = new Set();
    this.qualityLevels = ['low', 'balanced', 'ultra'];
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.currentQuality = this.baseQuality;
      this._emitChange(this.currentQuality, 'disabled');
    }
  }

  setBaseQuality(quality) {
    if (this.qualityLevels.includes(quality)) {
      this.baseQuality = quality;
      if (!this.enabled) {
        this.currentQuality = quality;
        this._emitChange(this.currentQuality, 'base_updated');
      }
    }
  }

  setTargetFps(fps) {
    const parsed = parseInt(fps, 10);
    if (!isNaN(parsed) && parsed > 0) {
      this.targetFps = parsed;
    }
  }

  getEffectiveQuality() {
    return this.enabled ? this.currentQuality : this.baseQuality;
  }

  /**
   * Called by render loop on each frame with frame render duration in ms.
   */
  recordFrameTime(frameDurationMs) {
    if (!this.enabled) return;

    const expectedInterval = 1000 / (this.targetFps || 60);
    const dropLimit = expectedInterval * this.dropThresholdRatio;

    if (frameDurationMs > dropLimit) {
      this._consecutiveDrops++;
      this._smoothFramesCount = 0;
      this._smoothDurationMs = 0;

      if (this._consecutiveDrops >= this.consecutiveDropThreshold) {
        this._downgrade();
        this._consecutiveDrops = 0;
      }
    } else {
      this._consecutiveDrops = Math.max(0, this._consecutiveDrops - 1);
      this._smoothFramesCount++;
      this._smoothDurationMs += frameDurationMs;

      const recoveryNeededMs = this.recoveryThresholdSeconds * 1000;
      if (this._smoothDurationMs >= recoveryNeededMs) {
        this._upgrade();
        this._smoothFramesCount = 0;
        this._smoothDurationMs = 0;
      }
    }
  }

  _downgrade() {
    const currentIndex = this.qualityLevels.indexOf(this.currentQuality);
    if (currentIndex > 0) {
      const nextQuality = this.qualityLevels[currentIndex - 1];
      this.currentQuality = nextQuality;
      this._emitChange(nextQuality, 'downgraded');
    }
  }

  _upgrade() {
    const maxAllowedIndex = this.qualityLevels.indexOf(this.baseQuality);
    const currentIndex = this.qualityLevels.indexOf(this.currentQuality);
    if (currentIndex < maxAllowedIndex) {
      const nextQuality = this.qualityLevels[currentIndex + 1];
      this.currentQuality = nextQuality;
      this._emitChange(nextQuality, 'upgraded');
    }
  }

  onQualityChange(callback) {
    if (typeof callback === 'function') {
      this._listeners.add(callback);
      return () => this._listeners.delete(callback);
    }
    return () => {};
  }

  _emitChange(quality, reason) {
    for (const listener of this._listeners) {
      try {
        listener(quality, reason);
      } catch (err) {
        console.error('[AdaptiveQualityController] Error in listener:', err);
      }
    }
  }

  reset() {
    this._consecutiveDrops = 0;
    this._smoothFramesCount = 0;
    this._smoothDurationMs = 0;
    this.currentQuality = this.baseQuality;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdaptiveQualityController };
}
if (typeof window !== 'undefined') {
  window.AdaptiveQualityController = AdaptiveQualityController;
}

