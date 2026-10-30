/**
 * NeonLyrics V3 - Slide + Motion Blur Transition Effect
 * Slides active words directionally with proportional motion blur.
 */

class SlideBlurTransition {
  static apply(prevWordEl, nextWordEl, progress, options = {}) {
    const direction = options.direction || 'up';
    const distance = options.distance || 14;
    const blurStrength = options.blurStrength !== undefined ? options.blurStrength : 0.35;
    const motionBlur = options.motionBlur !== false;

    let dx = 0;
    let dy = 0;
    if (direction === 'up') dy = -distance;
    else if (direction === 'down') dy = distance;
    else if (direction === 'left') dx = -distance;
    else if (direction === 'right') dx = distance;

    if (prevWordEl) {
      const exitProgress = Math.min(1.0, progress * 1.3);
      const curX = dx * exitProgress;
      const curY = dy * exitProgress;
      const opacity = Math.max(0.0, 1.0 - exitProgress);
      const blurPx = motionBlur ? (exitProgress * blurStrength * 6).toFixed(1) : 0;

      prevWordEl.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;
      prevWordEl.style.opacity = opacity.toFixed(3);
      prevWordEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    }

    if (nextWordEl) {
      const enterProgress = Math.max(0.0, (progress - 0.1) / 0.9);
      const startX = -dx * (1 - enterProgress);
      const startY = -dy * (1 - enterProgress);
      const opacity = enterProgress;
      const blurPx = motionBlur ? ((1 - enterProgress) * blurStrength * 6).toFixed(1) : 0;

      nextWordEl.style.transform = `translate3d(${startX.toFixed(1)}px, ${startY.toFixed(1)}px, 0)`;
      nextWordEl.style.opacity = opacity.toFixed(3);
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
  module.exports = { SlideBlurTransition };
}
if (typeof window !== 'undefined') {
  window.SlideBlurTransition = SlideBlurTransition;
}

