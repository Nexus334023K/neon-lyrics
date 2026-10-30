/**
 * NeonLyrics V3 - Easing Library
 * Conforms to Section 7.3 of Product Requirements.
 * High-performance, allocation-free mathematical easing curves.
 */

const EasingLibrary = {
  linear: t => t,

  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  cubicIn: t => t * t * t,
  cubicOut: t => --t * t * t + 1,
  cubicInOut: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  quartIn: t => t * t * t * t,
  quartOut: t => 1 - --t * t * t * t,
  quartInOut: t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

  quintIn: t => t * t * t * t * t,
  quintOut: t => 1 + --t * t * t * t * t,
  quintInOut: t => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),

  expoIn: t => (t === 0 ? 0 : Math.pow(1024, t - 1)),
  expoOut: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) return 0.5 * Math.pow(1024, t - 1);
    return 0.5 * (-Math.pow(2, -10 * (t - 1)) + 2);
  },

  backIn: (t, s = 1.70158) => t * t * ((s + 1) * t - s),
  backOut: (t, s = 1.70158) => --t * t * ((s + 1) * t + s) + 1,
  backInOut: (t, s = 1.70158 * 1.525) => {
    if ((t *= 2) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
  },

  elasticOut: (t, amplitude = 1.0, period = 0.3) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1;
  },
  elasticIn: (t, amplitude = 1.0, period = 0.3) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period));
  },
  elasticInOut: (t, amplitude = 1.0, period = 0.45) => {
    if (t === 0) return 0;
    if ((t *= 2) === 2) return 1;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    if (t < 1) {
      return -0.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period));
    }
    return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin(((t - s) * (2 * Math.PI)) / period) * 0.5 + 1;
  },

  bounceOut: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  bounceIn: t => 1 - EasingLibrary.bounceOut(1 - t),
  bounceInOut: t => (t < 0.5 ? (1 - EasingLibrary.bounceOut(1 - 2 * t)) / 2 : (1 + EasingLibrary.bounceOut(2 * t - 1)) / 2),

  spring: (t, bounce = 0.3) => {
    return 1 - Math.exp(-6 * t) * Math.cos(2 * Math.PI * (1 - bounce) * t * 2);
  }
};

const EASING_ALIASES = {
  'linear': EasingLibrary.linear,
  'ease-in': EasingLibrary.easeIn,
  'ease-out': EasingLibrary.easeOut,
  'ease-in-out': EasingLibrary.easeInOut,
  'cubic': EasingLibrary.cubicOut,
  'cubic-in': EasingLibrary.cubicIn,
  'cubic-out': EasingLibrary.cubicOut,
  'cubic-in-out': EasingLibrary.cubicInOut,
  'quart': EasingLibrary.quartOut,
  'quint': EasingLibrary.quintOut,
  'expo': EasingLibrary.expoOut,
  'back': EasingLibrary.backOut,
  'elastic': EasingLibrary.elasticOut,
  'bounce': EasingLibrary.bounceOut,
  'spring': EasingLibrary.spring
};

function getEasing(nameOrFn) {
  if (typeof nameOrFn === 'function') return nameOrFn;
  if (typeof nameOrFn === 'string') {
    const key = nameOrFn.toLowerCase().trim();
    if (EASING_ALIASES[key]) return EASING_ALIASES[key];
    if (EasingLibrary[key]) return EasingLibrary[key];
  }
  return EasingLibrary.easeOut;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EasingLibrary, getEasing };
}
if (typeof window !== 'undefined') {
  window.EasingLibrary = EasingLibrary;
  window.getEasing = getEasing;
}

