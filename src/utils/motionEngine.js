/**
 * NeonLyrics - Motion Blur Engine & Frame Rate Controller
 * High-performance, delta-time driven animation and directional motion blur system.
 * Works in both browser/Electron renderer and Node.js testing environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.MotionBlurEngine = exports.MotionBlurEngine;
    root.FrameRateController = exports.FrameRateController;
    root.QUALITY_PRESETS = exports.QUALITY_PRESETS;
    root.BLUR_INTENSITY_VALUES = exports.BLUR_INTENSITY_VALUES;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUALITY_PRESETS = {
    cinematic: {
      targetFps: 120,
      motionBlur: true,
      motionBlurIntensity: 'high',
      label: 'Cinematic (120 FPS • High Blur)'
    },
    smooth: {
      targetFps: 60,
      motionBlur: true,
      motionBlurIntensity: 'medium',
      label: 'Smooth (60 FPS • Medium Blur)'
    },
    balanced: {
      targetFps: 60,
      motionBlur: true,
      motionBlurIntensity: 'low',
      label: 'Balanced (60 FPS • Low Blur)'
    },
    eco: {
      targetFps: 30,
      motionBlur: false,
      motionBlurIntensity: 'off',
      label: 'Eco (30 FPS • Blur Off)'
    },
    ultra: {
      targetFps: 120,
      motionBlur: true,
      motionBlurIntensity: 'high',
      label: 'Ultra (120 FPS • High Blur)'
    },
    low: {
      targetFps: 30,
      motionBlur: false,
      motionBlurIntensity: 'off',
      label: 'Low (30 FPS • Blur Off)'
    }
  };

  const BLUR_INTENSITY_VALUES = {
    off: { y: 0, css: '0px', svgDeviation: '0 0' },
    low: { y: 2, css: '2px', svgDeviation: '0 2' },
    medium: { y: 4.5, css: '4.5px', svgDeviation: '0 4.5' },
    high: { y: 8, css: '8px', svgDeviation: '0 8' }
  };

  /**
   * FrameRateController
   * Shared requestAnimationFrame scheduler with delta-time tracking and target FPS throttling.
   */
  class FrameRateController {
    constructor(options = {}) {
      this.targetFps = options.targetFps || 'auto';
      this.displayRefreshRate = options.displayRefreshRate || null;
      this.isPaused = false;
      this.callbacks = new Map();
      this.nextCallbackId = 1;

      this.rafId = null;
      this.lastFrameTimestamp = null;
      this.elapsedTime = 0;
      this.frameCount = 0;
      this.lastFpsSampleTime = 0;
      this.measuredFps = 60;

      // Injectable timing functions for Node.js unit testing
      this.now = options.nowFn || (() => {
        if (typeof performance !== 'undefined' && performance.now) {
          return performance.now();
        }
        return Date.now();
      });

      this.raf = options.rafFn || (typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame.bind(globalThis)
        : null);

      this.caf = options.cafFn || (typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame.bind(globalThis)
        : null);

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

    setDisplayRefreshRate(hz) {
      if (typeof hz === 'number' && hz > 0) {
        this.displayRefreshRate = hz;
      }
    }

    getFrameIntervalMs() {
      if (this.targetFps === 'auto') {
        return 0;
      }
      return 1000 / this.targetFps;
    }

    register(nameOrFn, fn) {
      const callback = typeof nameOrFn === 'function' ? nameOrFn : fn;
      if (typeof callback !== 'function') return () => {};

      const id = typeof nameOrFn === 'string' ? nameOrFn : `cb_${this.nextCallbackId++}`;
      this.callbacks.set(id, callback);

      return () => {
        this.callbacks.delete(id);
      };
    }

    unregister(id) {
      return this.callbacks.delete(id);
    }

    start() {
      this.isPaused = false;
      if (this.lastFrameTimestamp === null) {
        this.lastFrameTimestamp = this.now();
      }
      if (this.lastFpsSampleTime === 0) {
        this.lastFpsSampleTime = this.lastFrameTimestamp;
      }
      this.frameCount = 0;

      if (this.raf && this.rafId === null) {
        this.rafId = this.raf(this._loop);
      }
    }

    pause() {
      this.isPaused = true;
      if (this.rafId !== null && this.caf) {
        this.caf(this.rafId);
        this.rafId = null;
      }
    }

    resume() {
      if (!this.isPaused) return;
      this.isPaused = false;
      this.lastFrameTimestamp = this.now();
      if (this.raf && this.rafId === null) {
        this.rafId = this.raf(this._loop);
      }
    }

    stop() {
      this.pause();
    }

    destroy() {
      this.stop();
      this.callbacks.clear();
    }

    /**
     * Internal unified loop executing registered animation callbacks.
     */
    _loop(timestamp) {
      if (this.isPaused) {
        this.rafId = null;
        return;
      }

      const now = typeof timestamp === 'number' && timestamp >= 0 ? timestamp : this.now();

      if (this.lastFrameTimestamp === null) {
        this.lastFrameTimestamp = now;
      }

      const elapsedSinceLast = now - this.lastFrameTimestamp;
      const targetInterval = this.getFrameIntervalMs();

      // Throttling logic (only active when targetFps is not 'auto')
      if (targetInterval > 0) {
        // Small tolerance (up to 2ms or 8% of frame) to prevent harmonic skipping due to vsync quantization
        const jitterTolerance = Math.min(2.0, targetInterval * 0.08);
        if (elapsedSinceLast < (targetInterval - jitterTolerance)) {
          // Throttled: schedule next display frame without executing callbacks or busy-waiting
          if (this.raf && !this.isPaused) {
            this.rafId = this.raf(this._loop);
          }
          return;
        }
      }

      // Compute frame delta in seconds, clamped to max 0.1s to avoid huge jumps on wake/resume
      const deltaTime = Math.min(0.1, Math.max(0.001, elapsedSinceLast / 1000));
      this.elapsedTime += deltaTime;
      this.lastFrameTimestamp = now;

      // FPS measurement
      this.frameCount++;
      const sampleElapsed = now - this.lastFpsSampleTime;
      if (sampleElapsed >= 1000) {
        this.measuredFps = Math.round((this.frameCount * 1000) / sampleElapsed);
        this.frameCount = 0;
        this.lastFpsSampleTime = now;
      }

      // Execute all registered callbacks with delta timing
      this.callbacks.forEach((cb) => {
        try {
          cb(deltaTime, this.elapsedTime, now);
        } catch (err) {
          if (typeof console !== 'undefined' && console.error) {
            console.error('Animation callback error:', err);
          }
        }
      });

      // Schedule next tick
      if (this.raf && !this.isPaused) {
        this.rafId = this.raf(this._loop);
      }
    }

    getStats() {
      return {
        targetFps: this.targetFps,
        displayRefreshRate: this.displayRefreshRate,
        measuredFps: this.measuredFps,
        isPaused: this.isPaused,
        activeCallbacksCount: this.callbacks.size
      };
    }
  }

  /**
   * MotionBlurEngine
   * Applies directional motion blur during lyric entering, leaving, and scrolling.
   * Ensures active line is 100% sharp when stationary.
   */
  class MotionBlurEngine {
    constructor(options = {}) {
      this.config = {
        motionBlur: options.motionBlur !== false,
        motionBlurIntensity: options.motionBlurIntensity || 'medium',
        targetFps: options.targetFps || 'auto',
        qualityPreset: options.qualityPreset || 'smooth',
        respectReducedMotion: options.respectReducedMotion !== false,
        gpuFallback: options.gpuFallback !== false,
        animationSpeed: options.animationSpeed || 1.0,
        transitionDuration: options.transitionDuration || 0.28,
        perspectiveDepth: options.perspectiveDepth || 800,
        visualizationMode: options.visualizationMode || 'ship'
      };

      this.scheduler = options.scheduler || new FrameRateController({
        targetFps: this.config.targetFps,
        displayRefreshRate: options.displayRefreshRate || null,
        nowFn: options.nowFn,
        rafFn: options.rafFn,
        cafFn: options.cafFn
      });

      this.activeTransition = null;
      this.svgFilterEl = options.svgFilterEl || null;
      this.isLowEndHardware = this._detectLowEndHardware();

      // Hook scheduler callback
      this.scheduler.register('motion-engine-step', (dt, elapsed, now) => {
        this._updateActiveTransition(dt, elapsed, now);
      });
    }

    _detectLowEndHardware() {
      if (typeof navigator !== 'undefined') {
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
          return true;
        }
      }
      return false;
    }

    isReducedMotionPreferred() {
      if (typeof window !== 'undefined' && window.matchMedia) {
        try {
          return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
          return false;
        }
      }
      return false;
    }

    getEffectiveIntensity() {
      if (!this.config.motionBlur) return 'off';
      if (this.config.respectReducedMotion && this.isReducedMotionPreferred()) return 'off';
      if (this.isLowEndHardware && this.config.gpuFallback) {
        // Degrade high to medium or low on weaker hardware
        if (this.config.motionBlurIntensity === 'high') return 'low';
      }
      return this.config.motionBlurIntensity;
    }

    getBlurValues() {
      const intensity = this.getEffectiveIntensity();
      return BLUR_INTENSITY_VALUES[intensity] || BLUR_INTENSITY_VALUES.off;
    }

    applyConfig(newConfig = {}) {
      this.config = { ...this.config, ...newConfig };
      if (newConfig.targetFps !== undefined) {
        this.scheduler.setTargetFps(newConfig.targetFps);
      }
      this.updateSvgFilter();
    }

    updateSvgFilter() {
      const values = this.getBlurValues();
      if (this.svgFilterEl) {
        this.svgFilterEl.setAttribute('stdDeviation', values.svgDeviation);
      } else if (typeof document !== 'undefined') {
        const el = document.getElementById('motion-blur-filter');
        if (el) {
          el.setAttribute('stdDeviation', values.svgDeviation);
        }
      }
    }

    /**
     * Triggers a smooth, directional lyric transition.
     * During the transition, moving lines receive directional blur and transform.
     * When completed, blur is completely stripped, leaving the active line 100% sharp.
     */
    triggerTransition(params = {}) {
      const {
        pastEl,
        activeEl,
        nextLineEl,
        pastContent = '',
        activeContent = '',
        nextContent = '',
        direction = 'forward', // 'forward' | 'backward'
        duration: paramDuration,
        onSettle = null
      } = params;

      const speed = Math.max(0.25, Number(this.config.animationSpeed) || 1.0);
      const baseDuration = (paramDuration !== undefined) ? paramDuration : (this.config.transitionDuration || 0.28);
      const duration = baseDuration / speed;
      const visMode = params.visualizationMode || this.config.visualizationMode || 'ship';
      const perspectiveDepth = Number(this.config.perspectiveDepth) || 800;

      const effectiveIntensity = this.getEffectiveIntensity();
      const isInstant = this.config.respectReducedMotion && this.isReducedMotionPreferred();

      // If reduced motion is requested, perform instantaneous update without blur or translate
      if (isInstant || duration <= 0) {
        if (pastEl) {
          pastEl.textContent = pastContent;
          pastEl.className = 'line past-line line-settled';
          if (pastEl.classList && pastEl.classList.add) {
            pastEl.classList.remove('line-moving-out', 'line-moving-in');
            pastEl.classList.add('line-settled');
          }
          pastEl.style.filter = 'none';
          pastEl.style.transform = 'none';
        }
        if (activeEl) {
          activeEl.innerHTML = activeContent;
          activeEl.className = 'line active-line line-settled';
          if (activeEl.classList && activeEl.classList.add) {
            activeEl.classList.remove('line-moving-out', 'line-moving-in');
            activeEl.classList.add('line-settled');
          }
          activeEl.style.filter = 'none';
          activeEl.style.transform = 'none';
        }
        if (nextLineEl) {
          nextLineEl.textContent = nextContent;
          nextLineEl.className = 'line next-line line-settled';
          if (nextLineEl.classList && nextLineEl.classList.add) {
            nextLineEl.classList.remove('line-moving-out', 'line-moving-in');
            nextLineEl.classList.add('line-settled');
          }
          nextLineEl.style.filter = 'none';
          nextLineEl.style.transform = 'none';
        }
        if (typeof onSettle === 'function') onSettle();
        return;
      }

      // Directional parameters
      // Forward: lyrics scroll upwards. Moving out translates up; moving in translates from below.
      const isForward = direction === 'forward';
      const moveOutY = isForward ? -16 : 16;
      const moveInY = isForward ? 18 : -18;
      const blurValues = this.getBlurValues();

      // Setup DOM elements for transition
      if (pastEl) {
        pastEl.textContent = pastContent;
        pastEl.classList.remove('line-settled');
        pastEl.classList.add('line-moving-out');
        if (effectiveIntensity !== 'off') {
          pastEl.style.filter = `url(#directional-motion-blur), blur(${blurValues.css})`;
        }
      }

      if (activeEl) {
        activeEl.innerHTML = activeContent;
        activeEl.classList.remove('line-settled');
        activeEl.classList.add('line-moving-in');
        if (effectiveIntensity !== 'off') {
          activeEl.style.filter = `url(#directional-motion-blur), blur(${blurValues.css})`;
        }
        if (visMode === 'ship') {
          activeEl.style.transform = `perspective(${perspectiveDepth}px) translateY(${moveInY}px) translateZ(-35px) rotateX(${isForward ? 7 : -7}deg)`;
        } else if (visMode === 'fisheye' || visMode === 'fisheye-visual') {
          activeEl.style.transform = `scale(0.92) translateY(${moveInY}px)`;
        } else {
          activeEl.style.transform = `translateY(${moveInY}px)`;
        }
        activeEl.style.opacity = '0.35';
      }

      if (nextLineEl) {
        nextLineEl.textContent = nextContent;
        nextLineEl.classList.remove('line-settled');
        nextLineEl.classList.add('line-moving-in');
        if (effectiveIntensity !== 'off') {
          nextLineEl.style.filter = `url(#directional-motion-blur), blur(${blurValues.css})`;
        }
      }

      this.updateSvgFilter();

      // Register active transition for scheduler to drive
      this.activeTransition = {
        pastEl,
        activeEl,
        nextLineEl,
        duration: Math.max(0.05, duration),
        elapsed: 0,
        moveInY,
        moveOutY,
        visMode,
        perspectiveDepth,
        effectiveIntensity,
        onSettle
      };

      this.start();
    }

    _updateActiveTransition(dt) {
      if (!this.activeTransition) return;

      const t = this.activeTransition;
      t.elapsed += dt;
      const rawProgress = Math.min(1.0, t.elapsed / t.duration);

      // Smooth ease-out cubic curve: 1 - (1 - p)^3
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      if (t.activeEl) {
        const currentY = t.moveInY * (1 - ease);
        const currentOpacity = 0.35 + (0.65 * ease);

        if (t.visMode === 'ship') {
          const currentZ = (1 - ease) * -35;
          const tiltX = (1 - ease) * (t.moveInY > 0 ? 7 : -7);
          t.activeEl.style.transform = `perspective(${t.perspectiveDepth}px) translateY(${currentY.toFixed(2)}px) translateZ(${currentZ.toFixed(2)}px) rotateX(${tiltX.toFixed(2)}deg)`;
        } else if (t.visMode === 'fisheye' || t.visMode === 'fisheye-visual') {
          const currentScale = 0.92 + (0.08 * ease);
          t.activeEl.style.transform = `scale(${currentScale.toFixed(3)}) translateY(${currentY.toFixed(2)}px)`;
        } else {
          t.activeEl.style.transform = `translateY(${currentY.toFixed(2)}px)`;
        }
        t.activeEl.style.opacity = currentOpacity.toFixed(2);
      }

      // Transition complete: settle and guarantee 100% stationary sharpness
      if (rawProgress >= 1.0) {
        this._settleLines(t);
        this.activeTransition = null;
      }
    }

    _settleLines(transitionData) {
      const { pastEl, activeEl, nextLineEl, onSettle } = transitionData;

      if (pastEl) {
        pastEl.classList.remove('line-moving-out', 'line-moving-in');
        pastEl.classList.add('line-settled');
        pastEl.style.filter = 'none';
        pastEl.style.transform = 'none';
        pastEl.style.opacity = '';
      }

      if (activeEl) {
        activeEl.classList.remove('line-moving-out', 'line-moving-in');
        activeEl.classList.add('line-settled');
        // CRITICAL: Active lyric is 100% sharp when stationary
        activeEl.style.filter = 'none';
        activeEl.style.transform = 'none';
        activeEl.style.opacity = '1';
      }

      if (nextLineEl) {
        nextLineEl.classList.remove('line-moving-out', 'line-moving-in');
        nextLineEl.classList.add('line-settled');
        nextLineEl.style.filter = 'none';
        nextLineEl.style.transform = 'none';
        nextLineEl.style.opacity = '';
      }

      if (typeof onSettle === 'function') {
        try {
          onSettle();
        } catch (e) {}
      }
    }

    start() {
      this.scheduler.start();
    }

    pause() {
      this.scheduler.pause();
    }

    resume() {
      this.scheduler.resume();
    }

    destroy() {
      if (this.activeTransition) {
        this._settleLines(this.activeTransition);
        this.activeTransition = null;
      }
      this.scheduler.destroy();
    }
  }

  return {
    QUALITY_PRESETS,
    BLUR_INTENSITY_VALUES,
    FrameRateController,
    MotionBlurEngine
  };
});
