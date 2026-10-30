/**
 * NeonLyrics V3 - Custom Font Manager
 * Manages secure font file validation, persistence in userData, metadata extraction,
 * and dynamic @font-face CSS generation for custom desktop typography.
 */

const fs = require('fs');
const path = require('path');
const paths = require('./paths');

const MAX_FONT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB max limit

const FONT_SIGNATURES = {
  // TrueType: 0x00010000 or 'true'
  ttf: [
    [0x00, 0x01, 0x00, 0x00],
    [0x74, 0x72, 0x75, 0x65]
  ],
  // OpenType: 'OTTO'
  otf: [
    [0x4F, 0x54, 0x54, 0x4F]
  ],
  // WOFF: 'wOFF'
  woff: [
    [0x77, 0x4F, 0x46, 0x46]
  ],
  // WOFF2: 'wOF2'
  woff2: [
    [0x77, 0x4F, 0x46, 0x32]
  ]
};

function matchesSignature(buffer, sig) {
  if (buffer.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buffer[i] !== sig[i]) return false;
  }
  return true;
}

function detectFontFormat(buffer) {
  if (!buffer || buffer.length < 4) return null;

  for (const [format, sigs] of Object.entries(FONT_SIGNATURES)) {
    for (const sig of sigs) {
      if (matchesSignature(buffer, sig)) {
        return format;
      }
    }
  }
  return null;
}

class FontManager {
  constructor(storageManager = null, fontsDir = paths.fontsDir) {
    this.storage = storageManager;
    this.fontsDir = fontsDir;
    this._ensureFontsDir();
  }

  _ensureFontsDir() {
    try {
      if (!fs.existsSync(this.fontsDir)) {
        fs.mkdirSync(this.fontsDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[FontManager] Could not ensure fonts directory:', err.message);
    }
  }

  /**
   * Validates buffer or file path.
   * Returns { valid: boolean, format: string|null, error: string|null }
   */
  validateFont(bufferOrPath) {
    let buffer;
    if (typeof bufferOrPath === 'string') {
      try {
        const stat = fs.statSync(bufferOrPath);
        if (stat.size > MAX_FONT_SIZE_BYTES) {
          return { valid: false, format: null, error: 'Font file exceeds 15MB limit' };
        }
        buffer = fs.readFileSync(bufferOrPath);
      } catch (err) {
        return { valid: false, format: null, error: `Cannot read font file: ${err.message}` };
      }
    } else if (Buffer.isBuffer(bufferOrPath)) {
      buffer = bufferOrPath;
      if (buffer.length > MAX_FONT_SIZE_BYTES) {
        return { valid: false, format: null, error: 'Font buffer exceeds 15MB limit' };
      }
    } else {
      return { valid: false, format: null, error: 'Invalid font input' };
    }

    const format = detectFontFormat(buffer);
    if (!format) {
      return { valid: false, format: null, error: 'Unsupported or corrupt font format (expected TTF, OTF, WOFF, or WOFF2)' };
    }

    return { valid: true, format, error: null };
  }

  /**
   * Imports a font file from user filesystem into userData/fonts/.
   */
  importFont(sourcePath, customName = null) {
    const validation = this.validateFont(sourcePath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this._ensureFontsDir();

    const originalFilename = path.basename(sourcePath);
    const ext = path.extname(originalFilename).toLowerCase();
    const baseName = path.basename(originalFilename, ext);
    const fontName = (customName && customName.trim()) || baseName;
    const fontId = `custom-font-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const targetFilename = `${fontId}${ext}`;
    const targetPath = path.join(this.fontsDir, targetFilename);

    fs.copyFileSync(sourcePath, targetPath);

    const fontMeta = {
      id: fontId,
      name: fontName,
      originalFilename,
      format: validation.format,
      path: targetPath,
      addedAt: new Date().toISOString()
    };

    if (this.storage && typeof this.storage.getConfig === 'function') {
      const config = this.storage.getConfig();
      const customFonts = Array.isArray(config.customFonts) ? [...config.customFonts] : [];
      // Remove any previous font with exact same name to prevent duplicates
      const filtered = customFonts.filter(f => f.name.toLowerCase() !== fontName.toLowerCase());
      filtered.push(fontMeta);
      this.storage.saveConfig({ customFonts: filtered });
    }

    return fontMeta;
  }

  getCustomFonts() {
    if (this.storage && typeof this.storage.getConfig === 'function') {
      const config = this.storage.getConfig();
      return Array.isArray(config.customFonts) ? config.customFonts : [];
    }
    return [];
  }

  deleteFont(fontId) {
    if (!fontId) return false;

    if (this.storage && typeof this.storage.getConfig === 'function') {
      const config = this.storage.getConfig();
      const customFonts = Array.isArray(config.customFonts) ? config.customFonts : [];
      const target = customFonts.find(f => f.id === fontId);

      if (target) {
        if (target.path && fs.existsSync(target.path)) {
          try {
            fs.unlinkSync(target.path);
          } catch (e) {
            console.warn('[FontManager] Could not delete font file:', e.message);
          }
        }

        const remaining = customFonts.filter(f => f.id !== fontId);
        
        // If deleted font was active in typography, reset to default 'Outfit'
        const typoUpdates = {};
        if (config.typography) {
          const t = config.typography;
          if (t.fontFamily === target.name) typoUpdates.fontFamily = 'Outfit';
          if (t.activeWordFont === target.name) typoUpdates.activeWordFont = null;
          if (t.sungWordFont === target.name) typoUpdates.sungWordFont = null;
          if (t.upcomingWordFont === target.name) typoUpdates.upcomingWordFont = null;
          if (t.prevLineFont === target.name) typoUpdates.prevLineFont = null;
          if (t.activeLineFont === target.name) typoUpdates.activeLineFont = null;
          if (t.nextLineFont === target.name) typoUpdates.nextLineFont = null;
        }

        this.storage.saveConfig({
          customFonts: remaining,
          typography: { ...(config.typography || {}), ...typoUpdates }
        });

        return true;
      }
    }
    return false;
  }

  generateFontFaceCSS(fontMeta) {
    if (!fontMeta || !fontMeta.name || !fontMeta.path) return '';

    // Normalize forward slashes for CSS url
    const normalizedPath = fontMeta.path.replace(/\\/g, '/');
    const formatSpecifier = fontMeta.format === 'ttf' ? 'truetype'
      : fontMeta.format === 'otf' ? 'opentype'
      : fontMeta.format;

    return `@font-face {
  font-family: '${fontMeta.name.replace(/'/g, "\\'")}';
  src: url('file:///${normalizedPath}') format('${formatSpecifier}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;
  }
}

module.exports = {
  FontManager,
  detectFontFormat,
  MAX_FONT_SIZE_BYTES
};

