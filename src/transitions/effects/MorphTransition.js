/**
 * NeonLyrics V3 - Morph Transition Effect
 * Smooth transformation between active word states with weight and scale interpolation.
 */

class MorphTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    const intensity = options.intensity !== undefined ? options.intensity : 1.0;

    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.5);
      const scale = 1.0 - 0.15 * exitProgress * intensity;
      const opacity = Math.max(0.0, 1.0 - exitProgress);
      prevWordEl.style.transform = `scale(${scale.toFixed(3)})`;
      prevWordEl.style.opacity = opacity.toFixed(3);
      prevWordEl.style.filter = `blur(${(exitProgress * 3 * intensity).toFixed(1)}px)`;
    }

    if (nextWordEl) {
      const enterProgress = Math.max(0.0, (progress - 0.2) / 0.8);
      const scale = 0.88 + 0.12 * enterProgress;
      const opacity = enterProgress;
      nextWordEl.style.transform = `scale(${scale.toFixed(3)})`;
      nextWordEl.style.opacity = opacity.toFixed(3);
      nextWordEl.style.filter = `blur(${((1 - enterProgress) * 4 * intensity).toFixed(1)}px)`;
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
  module.exports = { MorphTransition };
}
if (typeof window !== 'undefined') {
  window.MorphTransition = MorphTransition;
}

