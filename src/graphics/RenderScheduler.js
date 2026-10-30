/**
 * NeonLyrics V3 - RenderScheduler
 * High-performance frame scheduler with target FPS throttling and idle sleeping.
 * Decoupled from lyric synchronization timestamps.
 */

class RenderScheduler {
  constructor(options = {}) {
    this.targetFps = options.targetFps || 'auto';
    this.displayRefreshRate = options.displayRefreshRate || 60;
    this.callbacks = new Set();
    this.isRunning = false;
    this.isPaused = false;
    this.rafId = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.currentFps = 0;
    this._fpsSampleStart = 0;
    this._fpsSampleCount = 0;

    this._loop = this._loop.bind(this);
  }

  setTargetFps(fps) {
    if (fps === 'auto' || fps === 'Auto') {
      this.targetFps = 'auto';
    } else {
      const parsed = parseInt(fps, 10);
      if ([30, 60, 90, 120].includes(parsed)) {
        this.targetFps = parsed;
      } else {
        this.targetFps = 'auto';
      }
    }
  }

  setDisplayRefreshRate(rate) {
    if (typeof rate === 'number' && rate > 0) {
      this.displayRefreshRate = rate;
    }
  }

  getTargetInterval() {
    if (this.targetFps === 'auto') {
      return 1000 / Math.max(30, this.displayRefreshRate || 60);
    }
    return 1000 / this.targetFps;
  }

  register(fn) {
    if (typeof fn !== 'function') return () => {};
    this.callbacks.add(fn);
    if (!this.isRunning && !this.isPaused) {
      this.start();
    }
    return () => this.unregister(fn);
  }

  unregister(fn) {
    this.callbacks.delete(fn);
    if (this.callbacks.size === 0) {
      this.pause();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = this._now();
    this._scheduleNext();
  }

  pause() {
    this.isPaused = true;
    this.isRunning = false;
    if (this.rafId) {
      this._cancelFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (this.callbacks.size > 0 && !this.isRunning) {
      this.isPaused = false;
      this.start();
    }
  }

  destroy() {
    this.pause();
    this.callbacks.clear();
  }

  _now() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  _requestFrame(fn) {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(fn);
    }
    return setTimeout(() => fn(this._now()), 16);
  }

  _cancelFrame(id) {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }

  _scheduleNext() {
    if (!this.isRunning) return;
    this.rafId = this._requestFrame(this._loop);
  }

  _loop(timestamp) {
    if (!this.isRunning) return;

    const now = typeof timestamp === 'number' ? timestamp : this._now();
    const interval = this.getTargetInterval();
    const elapsed = now - this.lastFrameTime;

    // Throttle if frame arrived earlier than target frame interval (with a 2ms margin for clock jitter)
    if (this.targetFps !== 'auto' && elapsed < interval - 2) {
      this._scheduleNext();
      return;
    }

    const delta = Math.min(elapsed / 1000, 0.1); // clamp delta to 100ms max to prevent spiral of death
    this.lastFrameTime = now;
    this.frameCount++;

    // Track real FPS
    if (this._fpsSampleStart === 0) {
      this._fpsSampleStart = now;
      this._fpsSampleCount = 0;
    } else {
      this._fpsSampleCount++;
      const sampleElapsed = now - this._fpsSampleStart;
      if (sampleElapsed >= 1000) {
        this.currentFps = Math.round((this._fpsSampleCount * 1000) / sampleElapsed);
        this._fpsSampleStart = now;
        this._fpsSampleCount = 0;
      }
    }

    // Execute callbacks safely
    for (const callback of this.callbacks) {
      try {
        callback({ now, delta, frameCount: this.frameCount });
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[RenderScheduler] Callback error:', err);
        }
      }
    }

    if (this.callbacks.size > 0) {
      this._scheduleNext();
    } else {
      this.pause();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RenderScheduler };
}
if (typeof window !== 'undefined') {
  window.RenderScheduler = RenderScheduler;
}

