/**
 * NeonLyrics V3 - LineTransitionController
 * Manages 3-line stage transitions (pastLine, activeLine, nextLine)
 * completely independent of word transitions.
 * Conforms to Section 6 of Product Requirements.
 */

const { getEasing } = require('./EasingLibrary');

const VALID_LINE_EFFECTS = [
  'crossfade',
  'morph',
  'slide',
  'slide-blur',
  'particle-dissolve',
  'elastic',
  'fade-blur',
  'vertical-reveal'
];

class LineTransitionController {
  constructor(options = {}) {
    this.config = {
      enabled: true,
      effect: 'fade-blur',
      duration: 450,
      easing: 'ease-in-out',
      direction: 'up',
      motionBlur: true,
      blurStrength: 0.4,
      stagger: 0.05,
      glow: true,
      opacity: 0.85,
      distance: 30,
      reducedMotion: false,
      ...options
    };

    this.activeTransition = null;
    this.rafId = null;
    this.lastLineIdx = -1;
  }

  applyConfig(newConfig = {}) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  isReducedMotion() {
    if (this.config.reducedMotion) return true;
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (e) {}
    }
    return false;
  }

  triggerTransition(opts = {}) {
    const {
      pastEl,
      activeEl,
      nextLineEl,
      pastContent = '',
      activeContent = '',
      nextContent = '',
      direction = this.config.direction || 'up',
      duration = this.config.duration || 450,
      isSeek = false
    } = opts;

    // Immediately settle any previous transition
    this.settleLines({ pastEl, activeEl, nextLineEl });

    // Set updated content
    if (pastEl) pastEl.textContent = pastContent;
    if (activeEl) {
      if (typeof activeContent === 'string' && activeContent.includes('<')) {
        activeEl.innerHTML = activeContent;
      } else {
        activeEl.textContent = activeContent;
      }
    }
    if (nextLineEl) nextLineEl.textContent = nextContent;

    // Large seeks or reduced motion complete instantly with stationary sharpness
    if (isSeek || !this.config.enabled || this.isReducedMotion()) {
      this.settleLines({ pastEl, activeEl, nextLineEl });
      return;
    }

    const durationMs = Math.max(50, typeof duration === 'number' && duration < 10 ? duration * 1000 : duration);
    const easingFn = getEasing(this.config.easing);
    const effect = VALID_LINE_EFFECTS.includes(this.config.effect) ? this.config.effect : 'fade-blur';
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    this.activeTransition = {
      pastEl,
      activeEl,
      nextLineEl,
      effect,
      direction,
      easingFn,
      durationMs,
      startTime
    };

    const step = () => {
      if (!this.activeTransition) return;

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - this.activeTransition.startTime;
      const linearT = Math.min(1.0, elapsed / this.activeTransition.durationMs);
      const easedT = this.activeTransition.easingFn(linearT);

      this._applyFrame(easedT, this.activeTransition);

      if (linearT < 1.0) {
        this.rafId = this._requestFrame(step);
      } else {
        this.settleLines({ pastEl, activeEl, nextLineEl });
      }
    };

    this.rafId = this._requestFrame(step);
  }

  _applyFrame(t, active) {
    const { pastEl, activeEl, nextLineEl, effect, direction } = active;
    const isUp = direction === 'up';
    const dist = this.config.distance || 30;
    const blurStrength = this.config.blurStrength || 0.4;
    const motionBlur = this.config.motionBlur !== false;

    // 1. Crossfade
    if (effect === 'crossfade') {
      if (activeEl) activeEl.style.opacity = t.toFixed(3);
      if (pastEl) pastEl.style.opacity = (1.0 - t * 0.4).toFixed(3);
      if (nextLineEl) nextLineEl.style.opacity = (0.6 + t * 0.1).toFixed(3);
      return;
    }

    // 2. Slide
    if (effect === 'slide') {
      const shiftY = isUp ? (1 - t) * dist : -(1 - t) * dist;
      if (activeEl) {
        activeEl.style.transform = `translate3d(0, ${shiftY.toFixed(1)}px, 0)`;
        activeEl.style.opacity = t.toFixed(3);
      }
      if (pastEl) {
        pastEl.style.transform = `translate3d(0, ${(-t * dist * 0.5).toFixed(1)}px, 0)`;
      }
      return;
    }

    // 3. Slide + Blur
    if (effect === 'slide-blur') {
      const shiftY = isUp ? (1 - t) * dist : -(1 - t) * dist;
      const blurPx = motionBlur ? ((1 - t) * blurStrength * 10).toFixed(1) : 0;
      if (activeEl) {
        activeEl.style.transform = `translate3d(0, ${shiftY.toFixed(1)}px, 0)`;
        activeEl.style.opacity = t.toFixed(3);
        activeEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
      }
      if (pastEl) {
        const pastBlur = motionBlur ? (t * blurStrength * 6).toFixed(1) : 0;
        pastEl.style.transform = `translate3d(0, ${(-t * dist * 0.5).toFixed(1)}px, 0)`;
        pastEl.style.filter = pastBlur > 0 ? `blur(${pastBlur}px)` : 'none';
      }
      return;
    }

    // 4. Elastic
    if (effect === 'elastic') {
      const decay = Math.exp(-t * 5);
      const osc = Math.sin(t * Math.PI * 2.5);
      const scale = 1.0 + osc * decay * 0.15;
      const shiftY = isUp ? (1 - t) * dist * 0.8 : -(1 - t) * dist * 0.8;
      if (activeEl) {
        activeEl.style.transform = `translate3d(0, ${shiftY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        activeEl.style.opacity = Math.min(1.0, t * 1.8).toFixed(3);
      }
      return;
    }

    // 5. Morph
    if (effect === 'morph') {
      const scale = 0.94 + 0.06 * t;
      const blurPx = motionBlur ? ((1 - t) * blurStrength * 8).toFixed(1) : 0;
      if (activeEl) {
        activeEl.style.transform = `scale(${scale.toFixed(3)})`;
        activeEl.style.opacity = t.toFixed(3);
        activeEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
      }
      if (pastEl) {
        pastEl.style.transform = `scale(${(1.0 - t * 0.05).toFixed(3)})`;
      }
      return;
    }

    // 6. Particle Dissolve
    if (effect === 'particle-dissolve') {
      const spacing = (1 - t) * 4;
      const blurPx = motionBlur ? ((1 - t) * blurStrength * 10).toFixed(1) : 0;
      if (activeEl) {
        activeEl.style.letterSpacing = `${spacing.toFixed(1)}px`;
        activeEl.style.opacity = t.toFixed(3);
        activeEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
      }
      if (pastEl) {
        pastEl.style.letterSpacing = `${(t * 3).toFixed(1)}px`;
        pastEl.style.opacity = (1 - t * 0.5).toFixed(3);
      }
      return;
    }

    // 7. Vertical Reveal
    if (effect === 'vertical-reveal') {
      const clipPct = Math.round(t * 100);
      if (activeEl) {
        activeEl.style.clipPath = `inset(${100 - clipPct}% 0 0 0)`;
        activeEl.style.opacity = '1';
      }
      return;
    }

    // 8. Fade + Blur (Default)
    const blurPx = motionBlur ? ((1 - t) * blurStrength * 12).toFixed(1) : 0;
    if (activeEl) {
      activeEl.style.opacity = t.toFixed(3);
      activeEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    }
    if (pastEl) {
      const pastBlur = motionBlur ? (t * blurStrength * 8).toFixed(1) : 0;
      pastEl.style.filter = pastBlur > 0 ? `blur(${pastBlur}px)` : 'none';
    }
  }

  settleLines(elements = {}) {
    if (this.rafId) {
      this._cancelFrame(this.rafId);
      this.rafId = null;
    }
    this.activeTransition = null;

    const { pastEl, activeEl, nextLineEl } = elements;
    if (activeEl) {
      activeEl.style.transform = 'none';
      activeEl.style.filter = 'none';
      activeEl.style.opacity = '1';
      activeEl.style.letterSpacing = 'normal';
      activeEl.style.clipPath = 'none';
    }
    if (pastEl) {
      pastEl.style.transform = 'none';
      pastEl.style.filter = 'none';
      pastEl.style.letterSpacing = 'normal';
    }
    if (nextLineEl) {
      nextLineEl.style.transform = 'none';
      nextLineEl.style.filter = 'none';
      nextLineEl.style.letterSpacing = 'normal';
    }
  }

  destroy() {
    this.settleLines({});
  }

  _requestFrame(fn) {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(fn);
    }
    return setTimeout(fn, 16);
  }

  _cancelFrame(id) {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LineTransitionController, VALID_LINE_EFFECTS };
}
if (typeof window !== 'undefined') {
  window.LineTransitionController = LineTransitionController;
  window.VALID_LINE_EFFECTS = VALID_LINE_EFFECTS;
}

