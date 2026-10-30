/**
 * NeonLyrics V3 - Fade + Blur Transition Effect
 * Fades out previous word with softening blur while new active word clarifies into view.
 */

class FadeBlurTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    const blurStrength = options.blurStrength !== undefined ? options.blurStrength : 0.4;

    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.3);
      prevWordEl.style.opacity = Math.max(0.0, 1.0 - exitProgress).toFixed(3);
      prevWordEl.style.filter = `blur(${(exitProgress * blurStrength * 8).toFixed(1)}px)`;
    }

    if (nextWordEl) {
      const enterProgress = Math.max(0.0, (progress - 0.1) / 0.9);
      nextWordEl.style.opacity = enterProgress.toFixed(3);
      const blurPx = ((1.0 - enterProgress) * blurStrength * 8).toFixed(1);
      nextWordEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    }
  }

  static reset(prevWordEl, nextWordEl) {
    if (prevWordEl) {
      prevWordEl.style.transform = 'none';
      prevWordEl.style.opacity = '1';
      prevWordEl.style.filter = 'none';
    }
    if (nextWordEl) {
      nextWordEl.style.transform = 'none';
      nextWordEl.style.opacity = '1';
      nextWordEl.style.filter = 'none';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FadeBlurTransition };
}
if (typeof window !== 'undefined') {
  window.FadeBlurTransition = FadeBlurTransition;
}
