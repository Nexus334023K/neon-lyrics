/**
 * NeonLyrics - LyricsStudioManager
 * Advanced lyric editor, timestamp micro-tuner, sync offset controller,
 * dual-language presenter, and favorite lyric moments manager.
 */

const { RomanizationHelper } = (typeof module !== 'undefined' && module.exports)
  ? require('./RomanizationHelper')
  : { RomanizationHelper: window.RomanizationHelper };

class LyricsStudioManager {
  constructor(options = {}) {
    this.syncOffset = typeof options.syncOffset === 'number' ? options.syncOffset : 0.0;
    this.showDualLanguage = Boolean(options.showDualLanguage);
    this.romanization = Boolean(options.romanization);
    this.karaokeHighlight = options.karaokeHighlight !== false;
    this.fontSize = options.fontSize || 1.0;

    this.romanizationHelper = new RomanizationHelper();
    this.favoriteMoments = [];
  }

  applyConfig(config = {}) {
    if (typeof config.syncOffset === 'number') this.syncOffset = config.syncOffset;
    if (config.showDualLanguage !== undefined) this.showDualLanguage = Boolean(config.showDualLanguage);
    if (config.romanization !== undefined) this.romanization = Boolean(config.romanization);
    if (config.karaokeHighlight !== undefined) this.karaokeHighlight = Boolean(config.karaokeHighlight);
    if (typeof config.fontSize === 'number') this.fontSize = config.fontSize;
  }

  adjustSyncOffset(deltaSeconds) {
    this.syncOffset = Math.round((this.syncOffset + deltaSeconds) * 1000) / 1000;
    return this.syncOffset;
  }

  /**
   * Adjusts the timestamp of a specific line and offsets its word timestamps proportionally.
   */
  adjustLineTimestamp(lines, lineIndex, deltaSeconds) {
    if (!Array.isArray(lines) || lineIndex < 0 || lineIndex >= lines.length) {
      return false;
    }

    const line = lines[lineIndex];
    const newTime = Math.max(0.0, Math.round((line.time + deltaSeconds) * 1000) / 1000);
    const actualDelta = newTime - line.time;

    line.time = newTime;
    if (line.endTime) {
      line.endTime = Math.max(newTime, Math.round((line.endTime + actualDelta) * 1000) / 1000);
    }

    if (Array.isArray(line.words)) {
      for (let i = 0; i < line.words.length; i++) {
        const w = line.words[i];
        if (typeof w.time === 'number') {
          w.time = Math.max(0.0, Math.round((w.time + actualDelta) * 1000) / 1000);
        }
        if (typeof w.endTime === 'number') {
          w.endTime = Math.max(w.time, Math.round((w.endTime + actualDelta) * 1000) / 1000);
        }
      }
    }

    // Re-sort lines in case timestamp crossed neighboring lines
    lines.sort((a, b) => a.time - b.time);
    return true;
  }

  /**
   * Micro-tunes a single word timestamp within a line.
   */
  adjustWordTimestamp(lines, lineIndex, wordIndex, deltaSeconds) {
    if (!Array.isArray(lines) || lineIndex < 0 || lineIndex >= lines.length) return false;
    const line = lines[lineIndex];
    if (!Array.isArray(line.words) || wordIndex < 0 || wordIndex >= line.words.length) return false;

    const word = line.words[wordIndex];
    word.time = Math.max(0.0, Math.round((word.time + deltaSeconds) * 1000) / 1000);
    if (word.endTime) {
      word.endTime = Math.max(word.time, Math.round((word.endTime + deltaSeconds) * 1000) / 1000);
    }
    word.verified = true;
    return true;
  }

  formatDisplayLine(lineText) {
    if (!lineText) return { primary: '', secondary: null };

    if (!this.showDualLanguage && !this.romanization) {
      return { primary: lineText, secondary: null };
    }

    const parsed = this.romanizationHelper.parseDualLanguage(lineText);
    return parsed;
  }

  saveFavoriteMoment(trackId, lineIndex, lineText, timestamp) {
    if (!trackId || !lineText) return null;

    const moment = {
      id: `fav-moment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      trackId,
      lineIndex,
      lineText,
      timestamp: Math.round(timestamp * 1000) / 1000,
      savedAt: new Date().toISOString()
    };

    this.favoriteMoments.unshift(moment);
    return moment;
  }

  getFavoriteMoments(trackId = null) {
    if (trackId) {
      return this.favoriteMoments.filter(m => m.trackId === trackId);
    }
    return this.favoriteMoments;
  }

  /**
   * Generates a fully formatted LRC file string.
   */
  exportToLrc(lines, metadata = {}) {
    if (!Array.isArray(lines)) return '';

    const headers = [];
    if (metadata.title) headers.push(`[ti:${metadata.title}]`);
    if (metadata.artist) headers.push(`[ar:${metadata.artist}]`);
    if (metadata.album) headers.push(`[al:${metadata.album}]`);
    if (this.syncOffset !== 0.0) {
      const msOffset = Math.round(this.syncOffset * 1000);
      headers.push(`[offset:${msOffset}]`);
    }

    const formatTimestamp = (sec) => {
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(Math.floor(sec % 60)).padStart(2, '0');
      const ms = String(Math.round((sec % 1) * 100)).padStart(2, '0');
      return `[${mm}:${ss}.${ms}]`;
    };

    const formatWordTimestamp = (sec) => {
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(Math.floor(sec % 60)).padStart(2, '0');
      const ms = String(Math.round((sec % 1) * 100)).padStart(2, '0');
      return `<${mm}:${ss}.${ms}>`;
    };

    const lrcLines = lines.map(line => {
      const timeTag = formatTimestamp(line.time);
      if (line.hasWordTimings && Array.isArray(line.words) && line.words.length > 0) {
        const wordsStr = line.words.map(w => `${formatWordTimestamp(w.time)}${w.word}`).join(' ');
        return `${timeTag}${wordsStr}`;
      }
      return `${timeTag}${line.text}`;
    });

    return [...headers, ...lrcLines].join('\n');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LyricsStudioManager };
}
if (typeof window !== 'undefined') {
  window.LyricsStudioManager = LyricsStudioManager;
}

