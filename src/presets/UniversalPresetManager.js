/**
 * NeonLyrics - UniversalPresetManager
 * Manages master presets, user-created .neonpreset bundles, import/export, and per-song bindings.
 */

const fs = require('fs');
const path = require('path');
const { MASTER_PRESETS } = require('./masterPresets');

const PRESET_SCHEMA_VERSION = '1.0.0';

class UniversalPresetManager {
  constructor(options = {}) {
    this.presetsDir = options.presetsDir || null;
    this.customPresets = [];
    this.songBindings = {}; // { 'artist - title': 'preset-id' }
    this.bindingsFilePath = options.bindingsFilePath || (this.presetsDir ? path.join(this.presetsDir, 'song_bindings.json') : null);

    this.loadCustomPresets();
    this.loadSongBindings();
  }

  loadCustomPresets() {
    this.customPresets = [];
    if (!this.presetsDir || !fs.existsSync(this.presetsDir)) return;

    try {
      const files = fs.readdirSync(this.presetsDir);
      for (const file of files) {
        if (file.endsWith('.neonpreset') || (file.endsWith('.json') && file !== 'song_bindings.json')) {
          try {
            const raw = fs.readFileSync(path.join(this.presetsDir, file), 'utf8');
            const parsed = JSON.parse(raw);
            if (this.validatePreset(parsed)) {
              this.customPresets.push(parsed);
            }
          } catch (e) {
            console.warn(`[UniversalPresetManager] Failed to load preset file ${file}:`, e.message);
          }
        }
      }
    } catch (err) {
      console.warn('[UniversalPresetManager] Error reading presets directory:', err.message);
    }
  }

  loadSongBindings() {
    this.songBindings = {};
    if (!this.bindingsFilePath || !fs.existsSync(this.bindingsFilePath)) return;

    try {
      const raw = fs.readFileSync(this.bindingsFilePath, 'utf8').trim();
      if (raw) {
        this.songBindings = JSON.parse(raw);
      }
    } catch (e) {
      this.songBindings = {};
    }
  }

  saveSongBindings() {
    if (!this.bindingsFilePath) return;
    try {
      const dir = path.dirname(this.bindingsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.bindingsFilePath, JSON.stringify(this.songBindings, null, 2), 'utf8');
    } catch (e) {
      console.warn('[UniversalPresetManager] Failed to save song bindings:', e.message);
    }
  }

  getAllPresets() {
    return [...MASTER_PRESETS, ...this.customPresets];
  }

  getPresetById(id) {
    if (!id || typeof id !== 'string') return null;
    const all = this.getAllPresets();
    return all.find(p => p.id === id) || null;
  }

  validatePreset(preset) {
    if (!preset || typeof preset !== 'object') return false;
    if (typeof preset.id !== 'string' || !preset.id.trim()) return false;
    if (typeof preset.name !== 'string' || !preset.name.trim()) return false;
    if (!preset.colors || typeof preset.colors !== 'object') return false;
    return true;
  }

  saveCustomPreset(preset) {
    if (!this.validatePreset(preset)) {
      throw new Error('Invalid preset schema');
    }

    // Check if preset is trying to overwrite built-in master preset
    if (MASTER_PRESETS.some(mp => mp.id === preset.id)) {
      throw new Error('Cannot overwrite system master presets');
    }

    const cleanPreset = {
      ...preset,
      version: preset.version || PRESET_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };

    const idx = this.customPresets.findIndex(p => p.id === cleanPreset.id);
    if (idx >= 0) {
      this.customPresets[idx] = cleanPreset;
    } else {
      this.customPresets.push(cleanPreset);
    }

    if (this.presetsDir) {
      try {
        if (!fs.existsSync(this.presetsDir)) {
          fs.mkdirSync(this.presetsDir, { recursive: true });
        }
        const fileName = `${cleanPreset.id}.neonpreset`;
        fs.writeFileSync(path.join(this.presetsDir, fileName), JSON.stringify(cleanPreset, null, 2), 'utf8');
      } catch (err) {
        console.warn('[UniversalPresetManager] Error persisting custom preset:', err.message);
      }
    }

    return cleanPreset;
  }

  deleteCustomPreset(presetId) {
    if (!presetId || typeof presetId !== 'string') return false;
    if (MASTER_PRESETS.some(mp => mp.id === presetId)) {
      return false; // Cannot delete master presets
    }

    const idx = this.customPresets.findIndex(p => p.id === presetId);
    if (idx === -1) return false;

    this.customPresets.splice(idx, 1);

    if (this.presetsDir) {
      try {
        const filePath = path.join(this.presetsDir, `${presetId}.neonpreset`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {}
    }

    // Clean up any song bindings pointing to this deleted preset
    let bindingChanged = false;
    for (const [songKey, boundId] of Object.entries(this.songBindings)) {
      if (boundId === presetId) {
        delete this.songBindings[songKey];
        bindingChanged = true;
      }
    }
    if (bindingChanged) {
      this.saveSongBindings();
    }

    return true;
  }

  exportPresetJson(presetId) {
    const preset = this.getPresetById(presetId);
    if (!preset) return null;
    return JSON.stringify({
      format: 'NeonLyricsPreset',
      version: PRESET_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      preset
    }, null, 2);
  }

  importPresetJson(jsonString) {
    if (typeof jsonString !== 'string') throw new Error('Input must be a JSON string');
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Malformed JSON content');
    }

    const presetData = parsed.preset ? parsed.preset : parsed;
    if (!this.validatePreset(presetData)) {
      throw new Error('JSON does not contain a valid NeonLyrics preset');
    }

    // If id conflicts with a built-in master preset, rename id
    if (MASTER_PRESETS.some(mp => mp.id === presetData.id)) {
      presetData.id = `${presetData.id}-custom-${Date.now().toString(36).substr(2, 4)}`;
      presetData.name = `${presetData.name} (Imported)`;
    }

    return this.saveCustomPreset(presetData);
  }

  bindSong(trackKey, presetId) {
    if (!trackKey || typeof trackKey !== 'string') return false;
    const cleanKey = trackKey.trim().toLowerCase();
    if (!presetId) {
      delete this.songBindings[cleanKey];
    } else {
      if (!this.getPresetById(presetId)) {
        throw new Error(`Preset "${presetId}" does not exist`);
      }
      this.songBindings[cleanKey] = presetId;
    }
    this.saveSongBindings();
    return true;
  }

  getBindingForSong(trackKey) {
    if (!trackKey || typeof trackKey !== 'string') return null;
    const cleanKey = trackKey.trim().toLowerCase();
    const presetId = this.songBindings[cleanKey];
    return presetId ? this.getPresetById(presetId) : null;
  }

  /**
   * Translates a preset safely into full application config fields without wiping out user preferences.
   */
  applyPresetToConfig(preset, currentConfig = {}) {
    if (!preset) return currentConfig;

    const baseConfig = { ...currentConfig };

    // 1. Colors
    if (preset.colors) {
      baseConfig.primaryColor = preset.colors.primary || baseConfig.primaryColor;
      baseConfig.secondaryColor = preset.colors.secondary || baseConfig.secondaryColor;
      baseConfig.activeWordColor = preset.colors.activeWord || baseConfig.activeWordColor;
      baseConfig.manualColors = {
        primary: preset.colors.primary || baseConfig.primaryColor,
        secondary: preset.colors.secondary || baseConfig.secondaryColor,
        activeWord: preset.colors.activeWord || baseConfig.activeWordColor
      };
      baseConfig.isCustomColor = true;
      baseConfig.autoSyncAlbumColors = false;
    }

    // 2. Glow
    if (preset.glow) {
      baseConfig.glow = {
        ...(baseConfig.glow || {}),
        ...preset.glow
      };
      baseConfig.glowIntensity = preset.glow.intensity ?? baseConfig.glowIntensity;
    }

    // 3. Typography
    if (preset.typography) {
      baseConfig.fontFamily = preset.typography.fontFamily || baseConfig.fontFamily;
      baseConfig.fontScale = preset.typography.fontScale ?? baseConfig.fontScale;
      baseConfig.textAlign = preset.typography.textAlign || baseConfig.textAlign;
      baseConfig.typography = {
        ...(baseConfig.typography || {}),
        ...preset.typography
      };
    }

    // 4. Transitions
    if (preset.transitions) {
      if (baseConfig.wordTransitions) {
        baseConfig.wordTransitions = {
          ...baseConfig.wordTransitions,
          effect: preset.transitions.wordEffect || baseConfig.wordTransitions.effect,
          duration: preset.transitions.duration || baseConfig.wordTransitions.duration
        };
      }
      if (baseConfig.lineTransitions) {
        baseConfig.lineTransitions = {
          ...baseConfig.lineTransitions,
          effect: preset.transitions.lineEffect || baseConfig.lineTransitions.effect,
          duration: preset.transitions.duration || baseConfig.lineTransitions.duration
        };
      }
    }

    // 5. Audio Reactive
    if (preset.audioReactive && baseConfig.audioReactive) {
      baseConfig.audioReactive = {
        ...baseConfig.audioReactive,
        ...preset.audioReactive
      };
    }

    // 6. 3D Scene
    if (preset.threeD && baseConfig.threeD) {
      baseConfig.threeD = {
        ...baseConfig.threeD,
        ...preset.threeD
      };
    }

    return baseConfig;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UniversalPresetManager,
    PRESET_SCHEMA_VERSION
  };
}
if (typeof window !== 'undefined') {
  window.UniversalPresetManager = UniversalPresetManager;
}

