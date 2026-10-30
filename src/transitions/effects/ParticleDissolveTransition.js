/**
 * NeonLyrics V3 - Particle Dissolve Transition Effect
 * Breaks the departing word into dispersed particles while next word materializes.
 */

class ParticleDissolveTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    const intensity = options.intensity !== undefined ? options.intensity : 1.0;

    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.4);
      const scatter = exitProgress * 12 * intensity;
      const opacity = Math.max(0.0, 1.0 - exitProgress);
      // Simulate particle dissolution via letter spacing dispersion, scale, and multi-directional spread
      prevWordEl.style.transform = `scale(${(1.0 + exitProgress * 0.2).toFixed(3)}) translate3d(0, -${(scatter * 0.5).toFixed(1)}px, 0)`;
      prevWordEl.style.letterSpacing = `${scatter.toFixed(1)}px`;
      prevWordEl.style.opacity = opacity.toFixed(3);
      prevWordEl.style.filter = `blur(${(exitProgress * 5 * intensity).toFixed(1)}px)`;
    }

    if (nextWordEl) {
      const enterProgress = Math.max(0.0, (progress - 0.2) / 0.8);
      const initialScatter = (1.0 - enterProgress) * 6 * intensity;
      nextWordEl.style.transform = `scale(${(0.92 + 0.08 * enterProgress).toFixed(3)})`;
      nextWordEl.style.letterSpacing = `${initialScatter.toFixed(1)}px`;
      nextWordEl.style.opacity = enterProgress.toFixed(3);
      nextWordEl.style.filter = `blur(${((1.0 - enterProgress) * 3 * intensity).toFixed(1)}px)`;
    }
  }

  static reset(prevWordEl, nextWordEl) {
    if (prevWordEl) {
      prevWordEl.style.transform = 'none';
      prevWordEl.style.letterSpacing = 'normal';
      prevWordEl.style.opacity = '1';
      prevWordEl.style.filter = 'none';
    }
    if (nextWordEl) {
      nextWordEl.style.transform = 'none';
      nextWordEl.style.letterSpacing = 'normal';
      nextWordEl.style.opacity = '1';
      nextWordEl.style.filter = 'none';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParticleDissolveTransition };
}
if (typeof window !== 'undefined') {
  window.ParticleDissolveTransition = ParticleDissolveTransition;
}

