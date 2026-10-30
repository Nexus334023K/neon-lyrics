/**
 * NeonLyrics - AudioReactiveDispatcher
 * Connects audio analysis to CSS custom properties and rendering systems.
 */

const { AudioCaptureService } = (typeof module !== 'undefined' && module.exports)
  ? require('./AudioCaptureService')
  : { AudioCaptureService: window.AudioCaptureService };

const { AudioAnalysisEngine } = (typeof module !== 'undefined' && module.exports)
  ? require('./AudioAnalysisEngine')
  : { AudioAnalysisEngine: window.AudioAnalysisEngine };

class AudioReactiveDispatcher {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.captureService = new AudioCaptureService(options);
    this.analysisEngine = new AudioAnalysisEngine(options);

    this.beatListeners = new Set();
    this.metricsListeners = new Set();

    this._beatPulse = 0.0;
    this._beatDecayRate = 0.08;
    this._targetElement = options.targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  }

  async start() {
    if (!this.enabled) return;
    await this.captureService.start();
  }

  stop() {
    this.captureService.stop();
    this.analysisEngine.reset();
    this._resetCssProperties();
  }

  applyConfig(config = {}) {
    if (config.enabled !== undefined) {
      const wasEnabled = this.enabled;
      this.enabled = Boolean(config.enabled);
      if (this.enabled && !wasEnabled) {
        this.start();
      } else if (!this.enabled && wasEnabled) {
        this.stop();
      }
    }

    this.analysisEngine.updateConfig(config);
    if (config.source && config.source !== this.captureService.source && this.enabled) {
      this.captureService.start(config.source);
    }
  }

  /**
   * Called per-frame by RenderScheduler or requestAnimationFrame.
   */
  tick(dt = 0.016) {
    if (!this.enabled) return null;

    const freqData = this.captureService.getFrequencyData();
    const metrics = this.analysisEngine.analyze(freqData);

    // Update beat pulse decay
    if (metrics.isBeat) {
      this._beatPulse = 1.0;
      this._emitBeat(metrics);
    } else {
      this._beatPulse = Math.max(0.0, this._beatPulse - this._beatDecayRate);
    }

    metrics.beatPulse = this._beatPulse;

    // Apply to DOM / CSS variables
    this._updateCssProperties(metrics);
    this._emitMetrics(metrics);

    return metrics;
  }

  _updateCssProperties(metrics) {
    if (!this._targetElement || !this._targetElement.style) return;

    const bassScale = (1.0 + metrics.bass * 0.08).toFixed(3);
    const glowBoost = (1.0 + metrics.energy * 0.5 + this._beatPulse * 0.4).toFixed(3);

    this._targetElement.style.setProperty('--audio-bass', metrics.bass.toFixed(3));
    this._targetElement.style.setProperty('--audio-mid', metrics.mid.toFixed(3));
    this._targetElement.style.setProperty('--audio-treble', metrics.treble.toFixed(3));
    this._targetElement.style.setProperty('--audio-energy', metrics.energy.toFixed(3));
    this._targetElement.style.setProperty('--audio-beat-pulse', this._beatPulse.toFixed(3));
    this._targetElement.style.setProperty('--audio-bass-scale', bassScale);
    this._targetElement.style.setProperty('--audio-glow-boost', glowBoost);
  }

  _resetCssProperties() {
    if (!this._targetElement || !this._targetElement.style) return;

    this._targetElement.style.setProperty('--audio-bass', '0.000');
    this._targetElement.style.setProperty('--audio-mid', '0.000');
    this._targetElement.style.setProperty('--audio-treble', '0.000');
    this._targetElement.style.setProperty('--audio-energy', '0.000');
    this._targetElement.style.setProperty('--audio-beat-pulse', '0.000');
    this._targetElement.style.setProperty('--audio-bass-scale', '1.000');
    this._targetElement.style.setProperty('--audio-glow-boost', '1.000');
  }

  onBeat(cb) {
    if (typeof cb === 'function') {
      this.beatListeners.add(cb);
      return () => this.beatListeners.delete(cb);
    }
    return () => {};
  }

  onMetrics(cb) {
    if (typeof cb === 'function') {
      this.metricsListeners.add(cb);
      return () => this.metricsListeners.delete(cb);
    }
    return () => {};
  }

  _emitBeat(metrics) {
    for (const cb of this.beatListeners) {
      try { cb(metrics); } catch (e) {}
    }
  }

  _emitMetrics(metrics) {
    for (const cb of this.metricsListeners) {
      try { cb(metrics); } catch (e) {}
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioReactiveDispatcher };
}
if (typeof window !== 'undefined') {
  window.AudioReactiveDispatcher = AudioReactiveDispatcher;
}

