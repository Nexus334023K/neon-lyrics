const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { logger } = require('./logger');

const CURRENT_SCHEMA_VERSION = 3;

const DEFAULT_CONFIG = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  theme: 'theme-cyber',
  isCustomColor: false,
  primaryColor: '#00f2fe',
  secondaryColor: '#4facfe',
  activeWordColor: '#ffffff',
  sungWordColor: '#ffffff',
  glowIntensity: 1.0,
  fontScale: 1.0,
  fontFamily: "'Outfit', sans-serif",
  textAlign: 'center',
  lineMode: 2,
  syncOffset: 0.0,
  backdropOpacity: 0.0,
  backdropBlur: 16,
  showMiniPlayer: true,
  miniPlayerCollapsed: false,
  isClickThrough: false,
  alwaysOnTop: false,
  autoStart: true,
  windowBounds: {
    width: 1100,
    height: 240,
    x: null,
    y: null
  },
  spotify: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    connected: false
  },
  ai: {
    enabled: false,
    provider: 'local', // 'local' | 'custom'
    apiEndpoint: '',
    apiKey: '',
    autoAnalyze: false
  }
};

class StorageManager {
  constructor(options = {}) {
    this.paths = options.paths || paths;
    this.configFile = options.configFile || this.paths.configFile;
    this.favoritesFile = options.favoritesFile || this.paths.favoritesFile;
    this.historyFile = options.historyFile || this.paths.historyFile;
    this.ensureFiles();
  }

  ensureFiles() {
    try {
      this.paths.ensureDirectories?.();
    } catch (e) {}
  }

  safeReadJson(filePath, defaultValue) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      logger.warn(`Corrupted JSON detected in ${filePath}, recovering with default`, err.message);
      try {
        const backupPath = `${filePath}.corrupt.${Date.now()}`;
        fs.renameSync(filePath, backupPath);
      } catch (backupErr) {}
      return defaultValue;
    }
  }

  safeWriteJson(filePath, data) {
    try {
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (err) {
      logger.error(`Failed to write JSON to ${filePath}`, err.message);
      return false;
    }
  }

  // --- CONFIG ---
  getConfig() {
    const data = this.safeReadJson(this.configFile, DEFAULT_CONFIG);
    const merged = { ...DEFAULT_CONFIG, ...data };
    if (!merged.windowBounds) {
      merged.windowBounds = { ...DEFAULT_CONFIG.windowBounds };
    }
    if (!merged.spotify) {
      merged.spotify = { ...DEFAULT_CONFIG.spotify };
    }
    if (!merged.ai) {
      merged.ai = { ...DEFAULT_CONFIG.ai };
    }
    return merged;
  }

  saveConfig(partialConfig) {
    const current = this.getConfig();
    const updated = {
      ...current,
      ...partialConfig,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    return this.safeWriteJson(this.configFile, updated);
  }

  // --- FAVORITES ---
  getFavorites() {
    const list = this.safeReadJson(this.favoritesFile, []);
    return Array.isArray(list) ? list : [];
  }

  addFavorite(track) {
    if (!track || !track.title) return false;
    const favorites = this.getFavorites();
    const id = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();

    const existingIdx = favorites.findIndex(f => f.id === id);
    const item = {
      id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      artwork: track.artwork || '',
      duration: track.duration || 0,
      savedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      favorites[existingIdx] = { ...favorites[existingIdx], ...item };
    } else {
      favorites.unshift(item);
    }

    return this.safeWriteJson(this.favoritesFile, favorites);
  }

  removeFavorite(trackId) {
    if (!trackId) return false;
    const normalizedId = String(trackId).trim().toLowerCase();
    const favorites = this.getFavorites().filter(f => f.id !== normalizedId);
    return this.safeWriteJson(this.favoritesFile, favorites);
  }

  isFavorite(trackId) {
    if (!trackId) return false;
    const normalizedId = String(trackId).trim().toLowerCase();
    return this.getFavorites().some(f => f.id === normalizedId);
  }

  // --- PLAYBACK HISTORY ---
  getHistory(limit = 50) {
    const list = this.safeReadJson(this.historyFile, []);
    const arr = Array.isArray(list) ? list : [];
    return arr.slice(0, limit);
  }

  addToHistory(track) {
    if (!track || !track.title) return false;
    const history = this.getHistory(100);
    const id = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();

    // Prevent immediate consecutive duplicate
    if (history.length > 0 && history[0].id === id) {
      return true;
    }

    const entry = {
      id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      duration: track.duration || 0,
      artwork: track.artwork || '',
      playedAt: new Date().toISOString()
    };

    history.unshift(entry);
    const trimmed = history.slice(0, 100);
    return this.safeWriteJson(this.historyFile, trimmed);
  }

  clearHistory() {
    return this.safeWriteJson(this.historyFile, []);
  }
}

const storage = new StorageManager();

module.exports = {
  StorageManager,
  storage,
  DEFAULT_CONFIG
};
