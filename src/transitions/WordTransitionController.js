/**
 * NeonLyrics V3 - WordTransitionController
 * Dedicated controller for real-time word-level synchronized transitions.
 * Strictly decoupled from lyric timestamps; media playback is the absolute source of truth.
 */

const { getEasing } = require('./EasingLibrary');
const { MorphTransition } = require('./effects/MorphTransition');
const { SlideBlurTransition } = require('./effects/SlideBlurTransition');
const { ParticleDissolveTransition } = require('./effects/ParticleDissolveTransition');
const { ElasticTransition } = require('./effects/ElasticTransition');
const { LetterRevealTransition } = require('./effects/LetterRevealTransition');
const { FadeBlurTransition } = require('./effects/FadeBlurTransition');

const EFFECT_MAP = {
  'morph': MorphTransition,
  'slide-blur': SlideBlurTransition,
  'particle-dissolve': ParticleDissolveTransition,
  'elastic': ElasticTransition,
  'letter-reveal': LetterRevealTransition,
  'fade-blur': FadeBlurTransition
};

class WordTransitionController {
  constructor(options = {}) {
    this.config = {
      enabled: true,
      effect: 'slide-blur',
      duration: 300,
      easing: 'ease-out',
      direction: 'up',
      distance: 14,
      motionBlur: true,
      blurStrength: 0.35,
      intensity: 1.0,
      reducedMotion: false,
      ...options
    };

    this.currentLineIdx = -1;
    this.currentWordIdx = -1;
    this.activeAnimation = null;
    this.rafId = null;
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

  /**
   * Called on playback sync updates.
   * Compares (lineIdx, wordIdx) against current active indices.
   * If unchanged, ignores without restarting.
   * If changed, cancels in-flight transition and executes new word transition.
   */
  onWordChange(lineIdx, wordIdx, wordsContainer) {
    if (lineIdx === this.currentLineIdx && wordIdx === this.currentWordIdx) {
      return; // No change, do not restart
    }

    const prevWordIdx = this.currentWordIdx;
    const isLineChange = lineIdx !== this.currentLineIdx;

    this.currentLineIdx = lineIdx;
    this.currentWordIdx = wordIdx;

    // Settle any in-flight animation immediately
    this.settleActive();

    if (!wordsContainer) return;

    const wordEls = wordsContainer.querySelectorAll('.word-token');
    if (!wordEls || wordEls.length === 0) return;

    const prevWordEl = prevWordIdx >= 0 && prevWordIdx < wordEls.length && !isLineChange
      ? wordEls[prevWordIdx]
      : null;
    const nextWordEl = wordIdx >= 0 && wordIdx < wordEls.length
      ? wordEls[wordIdx]
      : null;

    // Mark active word class in DOM
    wordEls.forEach((el, idx) => {
      if (idx === wordIdx) {
        el.classList.add('word-active');
        el.classList.remove('word-sung', 'word-upcoming');
      } else if (idx < wordIdx) {
        el.classList.add('word-sung');
        el.classList.remove('word-active', 'word-upcoming');
      } else {
        el.classList.add('word-upcoming');
        el.classList.remove('word-active', 'word-sung');
      }
    });

    if (!this.config.enabled || this.isReducedMotion() || (!prevWordEl && !nextWordEl)) {
      this._resetElements(prevWordEl, nextWordEl);
      return;
    }

    this._startTransition(prevWordEl, nextWordEl);
  }

  _startTransition(prevWordEl, nextWordEl) {
    const effectClass = EFFECT_MAP[this.config.effect] || SlideBlurTransition;
    const easingFn = getEasing(this.config.easing);
    const durationMs = Math.max(50, this.config.duration || 300);

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    this.activeAnimation = {
      prevWordEl,
      nextWordEl,
      effectClass,
      easingFn,
      durationMs,
      startTime
    };

    const step = () => {
      if (!this.activeAnimation) return;

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - this.activeAnimation.startTime;
      const linearT = Math.min(1.0, elapsed / this.activeAnimation.durationMs);
      const easedT = this.activeAnimation.easingFn(linearT);

      this.activeAnimation.effectClass.apply(
        this.activeAnimation.prevWordEl,
        this.activeAnimation.nextWordEl,
        easedT,
        this.config
      );

      if (linearT < 1.0) {
        this.rafId = this._requestFrame(step);
      } else {
        this.settleActive();
      }
    };

    this.rafId = this._requestFrame(step);
  }

  settleActive() {
    if (this.rafId) {
      this._cancelFrame(this.rafId);
      this.rafId = null;
    }
    if (this.activeAnimation) {
      const { prevWordEl, nextWordEl, effectClass } = this.activeAnimation;
      effectClass.reset(prevWordEl, nextWordEl);
      this.activeAnimation = null;
    }
  }

  _resetElements(prevWordEl, nextWordEl) {
    const effectClass = EFFECT_MAP[this.config.effect] || SlideBlurTransition;
    effectClass.reset(prevWordEl, nextWordEl);
  }

  seekReconcile() {
    this.settleActive();
  }

  destroy() {
    this.settleActive();
    this.currentLineIdx = -1;
    this.currentWordIdx = -1;
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
  module.exports = { WordTransitionController, EFFECT_MAP };
}
if (typeof window !== 'undefined') {
  window.WordTransitionController = WordTransitionController;
  window.WORD_EFFECT_MAP = EFFECT_MAP;
}

