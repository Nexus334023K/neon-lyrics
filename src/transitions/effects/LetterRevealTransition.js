/**
 * NeonLyrics V3 - Letter-by-Letter Reveal Transition Effect
 * Progressively animates characters sequentially across the incoming active word.
 */

class LetterRevealTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.5);
      prevWordEl.style.opacity = Math.max(0.0, 1.0 - exitProgress).toFixed(3);
    }

    if (nextWordEl) {
      // If characters are already wrapped in .char-span, stagger their opacities
      const chars = nextWordEl.querySelectorAll('.char-span');
      if (chars && chars.length > 0) {
        const total = chars.length;
        chars.forEach((c, idx) => {
          const charThreshold = idx / total;
          const charProgress = Math.max(0, Math.min(1, (progress - charThreshold * 0.6) / 0.4));
          c.style.opacity = charProgress.toFixed(2);
          c.style.transform = `translate3d(0, ${((1 - charProgress) * 4).toFixed(1)}px, 0)`;
        });
        nextWordEl.style.opacity = '1';
      } else {
        // Fallback for unwrapped text
        nextWordEl.style.opacity = Math.min(1.0, progress * 1.8).toFixed(3);
        nextWordEl.style.transform = `translate3d(0, ${((1 - progress) * 6).toFixed(1)}px, 0)`;
      }
    }
  }

  static reset(prevWordEl, nextWordEl) {
    if (prevWordEl) {
      prevWordEl.style.opacity = '1';
      prevWordEl.style.transform = 'none';
      prevWordEl.style.filter = 'none';
    }
    if (nextWordEl) {
      nextWordEl.style.opacity = '1';
      nextWordEl.style.transform = 'none';
      nextWordEl.style.filter = 'none';
      const chars = nextWordEl.querySelectorAll('.char-span');
      chars.forEach(c => {
        c.style.opacity = '1';
        c.style.transform = 'none';
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LetterRevealTransition };
}
if (typeof window !== 'undefined') {
  window.LetterRevealTransition = LetterRevealTransition;
}
