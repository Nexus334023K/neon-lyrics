/**
 * NeonLyrics - RomanizationHelper
 * Detects CJK / non-Latin scripts, extracts embedded dual-language translations,
 * and produces romanized phonetic sub-lines for international lyrics.
 */

// Script detection regexes
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const HANGUL_REGEX = /[\uac00-\ud7af\u1100-\u11ff]/;
const CYRILLIC_REGEX = /[\u0400-\u04ff]/;

class RomanizationHelper {
  constructor() {}

  /**
   * Returns true if text contains Japanese, Chinese, or Korean characters.
   */
  hasCJK(text) {
    if (!text || typeof text !== 'string') return false;
    return CJK_REGEX.test(text) || HANGUL_REGEX.test(text);
  }

  /**
   * Splits dual-language lines into primary and translation/romanized subtext.
   * e.g. "夜に駆ける (Racing into the night)" -> { primary: "夜に駆ける", secondary: "Racing into the night" }
   */
  parseDualLanguage(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { primary: '', secondary: null };
    }

    const trimmed = rawText.trim();

    // Match parentheses translation: "Original (Translation)"
    const parenMatch = trimmed.match(/^(.*?)\s*[\(\[\{（【]([^\(\)\[\]\{\}（【]+)[\)\]\}）】]$/);
    if (parenMatch && parenMatch[1].trim() && parenMatch[2].trim()) {
      return {
        primary: parenMatch[1].trim(),
        secondary: parenMatch[2].trim()
      };
    }

    // Match slash separator: "Original / Translation"
    const slashMatch = trimmed.match(/^(.*?)\s*\/\s*(.*)$/);
    if (slashMatch && slashMatch[1].trim() && slashMatch[2].trim()) {
      return {
        primary: slashMatch[1].trim(),
        secondary: slashMatch[2].trim()
      };
    }

    return {
      primary: trimmed,
      secondary: null
    };
  }

  /**
   * Generates a phonetic pronunciation guide for non-Latin lines.
   */
  getPhoneticHint(text) {
    if (!text || typeof text !== 'string') return '';
    const parsed = this.parseDualLanguage(text);
    if (parsed.secondary) {
      return parsed.secondary;
    }
    return '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RomanizationHelper,
    CJK_REGEX,
    HANGUL_REGEX,
    CYRILLIC_REGEX
  };
}
if (typeof window !== 'undefined') {
  window.RomanizationHelper = RomanizationHelper;
}

