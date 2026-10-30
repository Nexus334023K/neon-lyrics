/**
 * NeonLyrics - Album Artwork Color Intelligence Engine
 * Extracts a coordinated three-color palette from album artwork:
 * 1. Primary lyric text
 * 2. Active-word highlight
 * 3. Secondary lyric text
 *
 * Runs efficiently with downsampled image sampling and ensures all colors
 * maintain high readability and contrast against dark backgrounds.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.PaletteExtractor = exports.PaletteExtractor;
    root.extractPaletteFromImageData = exports.extractPaletteFromImageData;
    root.rgbToHsl = exports.rgbToHsl;
    root.hslToRgb = exports.hslToRgb;
    root.rgbToHex = exports.rgbToHex;
    root.hexToRgb = exports.hexToRgb;
    root.calculateLuminance = exports.calculateLuminance;
    root.calculateContrastRatio = exports.calculateContrastRatio;
    root.validateAndEnforceContrast = exports.validateAndEnforceContrast;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Fallback palette (Verci-inspired neon magenta / cyan / pink)
  const DEFAULT_PALETTE = {
    primary: '#ff2a85',
    activeWord: '#ffffff',
    secondary: '#00f2fe',
    accent: '#a855f7'
  };

  /**
   * RGB to HSL conversion
   */
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  /**
   * HSL to RGB conversion
   */
  function hslToRgb(h, s, l) {
    h = (h % 360 + 360) % 360 / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      const h = clamped.toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Ensures color is vibrant and readable on dark surfaces.
   * If lightness is too low (< 45%) or saturation is very low, boosts it.
   */
  function ensureDarkSurfaceReadability(r, g, b, minLightness = 55, minSaturation = 30) {
    const hsl = rgbToHsl(r, g, b);
    let adjusted = false;

    if (hsl.l < minLightness) {
      hsl.l = minLightness;
      adjusted = true;
    }
    if (hsl.s < minSaturation && hsl.l < 90) {
      hsl.s = minSaturation;
      adjusted = true;
    }

    if (adjusted) {
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      return { ...rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b), hsl };
    }
    return { r, g, b, hex: rgbToHex(r, g, b), hsl };
  }

  /**
   * Color distance (Euclidean in RGB space)
   */
  function colorDistance(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Calculates WCAG relative luminance
   */
  function calculateLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /**
   * Calculates WCAG contrast ratio between two RGB colors (>= 4.5 is AA legible)
   */
  function calculateContrastRatio(rgb1, rgb2) {
    if (!rgb1 || !rgb2) return 1.0;
    const l1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Enforces minimum contrast against dark overlay backgrounds for transparency legibility
   */
  function validateAndEnforceContrast(palette, minContrastAgainstDark = 4.5) {
    if (!palette) return { ...DEFAULT_PALETTE };
    const darkBackground = { r: 15, g: 15, b: 20 }; // Typical transparent overlay dark anchor
    const res = { ...palette };

    for (const key of ['primary', 'secondary', 'activeWord', 'accent']) {
      if (!res[key]) continue;
      const rgb = hexToRgb(res[key]);
      if (rgb) {
        const ratio = calculateContrastRatio(rgb, darkBackground);
        if (ratio < minContrastAgainstDark) {
          const readable = ensureDarkSurfaceReadability(rgb.r, rgb.g, rgb.b, 65, 40);
          res[key] = readable.hex;
        }
      }
    }
    return res;
  }

  /**
   * Extracts a coordinated three-color palette from raw pixel data.
   * pixels: Uint8ClampedArray | Array of [r, g, b, a]
   */
  function extractPaletteFromImageData(pixelData, width, height) {
    if (!pixelData || pixelData.length < 4) {
      return { ...DEFAULT_PALETTE };
    }

    // Downsample and bucket pixels into color clusters
    const sampleStep = Math.max(1, Math.floor(pixelData.length / (4 * 400))); // Sample ~400 pixels
    const colorBuckets = [];

    for (let i = 0; i < pixelData.length; i += 4 * sampleStep) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      // Ignore fully transparent or pure black/white pixels
      if (a < 128) continue;
      const hsl = rgbToHsl(r, g, b);

      // Filter extreme near-black or extreme near-white for dominant color selection
      if (hsl.l < 8 || hsl.l > 94) continue;

      colorBuckets.push({ r, g, b, hsl, weight: hsl.s * (100 - Math.abs(50 - hsl.l)) });
    }

    if (colorBuckets.length === 0) {
      return { ...DEFAULT_PALETTE };
    }

    // Sort by saturation and vibrancy weight
    colorBuckets.sort((a, b) => b.weight - a.weight);

    // Pick 1: Primary vibrant color
    const primaryCandidate = colorBuckets[0];
    const primaryClean = ensureDarkSurfaceReadability(
      primaryCandidate.r,
      primaryCandidate.g,
      primaryCandidate.b,
      56,
      45
    );

    // Pick 2: Active Word Highlight
    // Find candidate with distinct hue or highest lightness/luminance
    let activeCandidate = null;
    for (let i = 1; i < colorBuckets.length; i++) {
      const cand = colorBuckets[i];
      const dist = colorDistance(primaryClean, cand);
      if (dist > 70) {
        activeCandidate = cand;
        break;
      }
    }

    let activeWordHex = '#ffffff';
    if (activeCandidate) {
      // Make active-word highlight brighter and punchy
      const brightened = ensureDarkSurfaceReadability(
        activeCandidate.r,
        activeCandidate.g,
        activeCandidate.b,
        82,
        60
      );
      activeWordHex = brightened.hex;
    } else {
      // Generate harmonized bright tint of primary
      const pHsl = primaryClean.hsl;
      const tinted = hslToRgb((pHsl.h + 25) % 360, Math.min(100, pHsl.s + 20), 88);
      activeWordHex = rgbToHex(tinted.r, tinted.g, tinted.b);
    }

    // Pick 3: Secondary Lyric Text
    // Harmonious complementary or analogous color with moderate lightness
    let secondaryCandidate = null;
    for (let i = 1; i < colorBuckets.length; i++) {
      const cand = colorBuckets[i];
      const distP = colorDistance(primaryClean, cand);
      const distA = activeCandidate ? colorDistance(activeCandidate, cand) : 100;
      if (distP > 50 && distA > 40) {
        secondaryCandidate = cand;
        break;
      }
    }

    let secondaryHex = '#4facfe';
    if (secondaryCandidate) {
      const harmonized = ensureDarkSurfaceReadability(
        secondaryCandidate.r,
        secondaryCandidate.g,
        secondaryCandidate.b,
        50,
        35
      );
      secondaryHex = harmonized.hex;
    } else {
      // Generate harmonious complementary or rotated hue (+140deg)
      const pHsl = primaryClean.hsl;
      const rotated = hslToRgb((pHsl.h + 140) % 360, Math.max(40, pHsl.s - 15), 65);
      secondaryHex = rgbToHex(rotated.r, rotated.g, rotated.b);
    }

    return {
      primary: primaryClean.hex,
      activeWord: activeWordHex,
      secondary: secondaryHex,
      accent: activeWordHex
    };
  }

  /**
   * PaletteExtractor class
   * Handles caching, asynchronous image loading, and extraction fallback.
   */
  class PaletteExtractor {
    constructor(options = {}) {
      this.cache = new Map();
      this.maxCacheSize = options.maxCacheSize || 60;
      this.defaultPalette = options.defaultPalette || { ...DEFAULT_PALETTE };
      this.currentPalette = { ...this.defaultPalette };
      this.pendingExtraction = null;
    }

    getCached(key) {
      if (!key) return null;
      return this.cache.get(key) || null;
    }

    setCached(key, palette) {
      if (!key || !palette) return;
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, palette);
    }

    /**
     * Extracts palette asynchronously from image URL or base64.
     * Never throws, handles failures smoothly with fallback.
     */
    async extractFromImageUrl(imageUrl, cacheKey = null) {
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return { ...this.defaultPalette };
      }

      const key = cacheKey || imageUrl;
      const cached = this.getCached(key);
      if (cached) {
        this.currentPalette = cached;
        return cached;
      }

      // If in Node.js test environment without DOM
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        const fallback = { ...this.defaultPalette };
        this.setCached(key, fallback);
        return fallback;
      }

      return new Promise((resolve) => {
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';

          const timeoutTimer = setTimeout(() => {
            img.src = '';
            resolve({ ...this.defaultPalette });
          }, 3500);

          img.onload = () => {
            clearTimeout(timeoutTimer);
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              const size = 48; // Downsample to 48x48 for ultra fast, non-blocking extraction
              canvas.width = size;
              canvas.height = size;
              ctx.drawImage(img, 0, 0, size, size);

              const imgData = ctx.getImageData(0, 0, size, size);
              const palette = extractPaletteFromImageData(imgData.data, size, size);
              this.setCached(key, palette);
              this.currentPalette = palette;
              resolve(palette);
            } catch (err) {
              resolve({ ...this.defaultPalette });
            }
          };

          img.onerror = () => {
            clearTimeout(timeoutTimer);
            resolve({ ...this.defaultPalette });
          };

          img.src = imageUrl;
        } catch (e) {
          resolve({ ...this.defaultPalette });
        }
      });
    }

    clearCache() {
      this.cache.clear();
    }
  }

  return {
    DEFAULT_PALETTE,
    PaletteExtractor,
    extractPaletteFromImageData,
    ensureDarkSurfaceReadability,
    rgbToHsl,
    hslToRgb,
    rgbToHex,
    hexToRgb,
    colorDistance,
    calculateLuminance,
    calculateContrastRatio,
    validateAndEnforceContrast
  };
});
