/**
 * NeonLyrics V3 - Elastic Transition Effect
 * Smooth spring-like scale overshoot for vibrant, dynamic word highlighting.
 */

class ElasticTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    const intensity = options.intensity !== undefined ? options.intensity : 1.0;

    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.5);
      prevWordEl.style.transform = `scale(${(1.0 - 0.1 * exitProgress).toFixed(3)})`;
      prevWordEl.style.opacity = Math.max(0.0, 1.0 - exitProgress).toFixed(3);
    }

    if (nextWordEl) {
      // Elastic spring formula: 1 + sin(p * PI * 2) * exp(-p * 4) * intensity
      const decay = Math.exp(-progress * 5);
      const osc = Math.sin(progress * Math.PI * 2.5);
      const scale = 1.0 + osc * decay * 0.28 * intensity;
      nextWordEl.style.transform = `scale(${scale.toFixed(3)})`;
      nextWordEl.style.opacity = Math.min(1.0, progress * 2.0).toFixed(3);
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
  module.exports = { ElasticTransition };
}
if (typeof window !== 'undefined') {
  window.ElasticTransition = ElasticTransition;
}
