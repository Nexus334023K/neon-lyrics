const { contextBridge, ipcRenderer } = require('electron');

// Narrow, secure allowlisted API bridge
contextBridge.exposeInMainWorld('neonLyricsApi', {
  // Listeners
  onPlaybackData: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('playback-data', subscription);
    return () => ipcRenderer.removeListener('playback-data', subscription);
  },

  onApplyConfig: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('apply-config', subscription);
    return () => ipcRenderer.removeListener('apply-config', subscription);
  },

  onClickThroughToggled: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('click-through-toggled', subscription);
    return () => ipcRenderer.removeListener('click-through-toggled', subscription);
  },

  onFavoritesUpdated: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('favorites-updated', subscription);
    return () => ipcRenderer.removeListener('favorites-updated', subscription);
  },

  onOverlayVisibility: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (event, visible) => callback(visible);
    ipcRenderer.on('overlay-visibility', subscription);
    return () => ipcRenderer.removeListener('overlay-visibility', subscription);
  },

  // Actions
  sendMediaControl: (actionData) => {
    if (!actionData || typeof actionData !== 'object') return;
    const allowed = ['play_pause', 'next', 'prev', 'seek'];
    if (allowed.includes(actionData.action)) {
      ipcRenderer.send('media-control', {
        action: actionData.action,
        position: typeof actionData.position === 'number' ? actionData.position : undefined
      });
    }
  },

  saveConfig: (newConfig) => {
    if (newConfig && typeof newConfig === 'object') {
      ipcRenderer.send('config-updated', newConfig);
    }
  },

  toggleClickThrough: (enabled) => {
    ipcRenderer.send('toggle-click-through', Boolean(enabled));
  },

  toggleAlwaysOnTop: (enabled) => {
    ipcRenderer.send('toggle-always-on-top', Boolean(enabled));
  },

  toggleStartup: (enabled) => {
    ipcRenderer.send('toggle-startup', Boolean(enabled));
  },

  openSettingsWindow: () => {
    ipcRenderer.send('open-settings');
  },

  // Async Invocations
  getInitialState: async () => {
    return await ipcRenderer.invoke('get-initial-state');
  },

  getDisplayRefreshRate: async () => {
    return await ipcRenderer.invoke('get-display-refresh-rate');
  },

  getGraphicsCapabilities: () => {
    try {
      const c = document.createElement('canvas');
      const gl2 = c.getContext('webgl2');
      if (gl2) {
        return {
          webgl2: true,
          webgl: true,
          canvas2d: true,
          maxTextureSize: gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 4096
        };
      }
      const gl1 = c.getContext('webgl');
      if (gl1) {
        return {
          webgl2: false,
          webgl: true,
          canvas2d: true,
          maxTextureSize: gl1.getParameter(gl1.MAX_TEXTURE_SIZE) || 2048
        };
      }
    } catch (e) {}
    return {
      webgl2: false,
      webgl: false,
      canvas2d: true,
      maxTextureSize: 2048
    };
  },

  toggleFavorite: async (track) => {
    if (!track || typeof track !== 'object') return false;
    return await ipcRenderer.invoke('toggle-favorite', track);
  },

  getFavorites: async () => {
    return await ipcRenderer.invoke('get-favorites');
  },

  removeFavorite: async (trackId) => {
    if (typeof trackId !== 'string') return false;
    return await ipcRenderer.invoke('remove-favorite', trackId);
  },

  getHistory: async () => {
    return await ipcRenderer.invoke('get-history');
  },

  clearHistory: async () => {
    return await ipcRenderer.invoke('clear-history');
  },

  getCustomGlowPresets: async () => {
    return await ipcRenderer.invoke('get-custom-glow-presets');
  },

  saveCustomGlowPreset: async (preset) => {
    if (!preset || typeof preset !== 'object') return null;
    return await ipcRenderer.invoke('save-custom-glow-preset', preset);
  },

  deleteCustomGlowPreset: async (id) => {
    if (typeof id !== 'string') return false;
    return await ipcRenderer.invoke('delete-custom-glow-preset', id);
  },

  renameCustomGlowPreset: async (id, newName) => {
    if (typeof id !== 'string' || typeof newName !== 'string') return false;
    return await ipcRenderer.invoke('rename-custom-glow-preset', { id, newName });
  },

  duplicateCustomGlowPreset: async (id, newName) => {
    if (typeof id !== 'string') return null;
    return await ipcRenderer.invoke('duplicate-custom-glow-preset', { id, newName: String(newName || '') });
  },

  searchLyrics: async (query) => {
    if (!query || typeof query !== 'object') return [];
    return await ipcRenderer.invoke('search-lyrics', query);
  },

  selectLyrics: async (candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    return await ipcRenderer.invoke('select-lyrics', candidate);
  },

  importLrcFile: async () => {
    return await ipcRenderer.invoke('import-lrc-file');
  },

  exportLrcFile: async (content, defaultName) => {
    if (typeof content !== 'string') return false;
    return await ipcRenderer.invoke('export-lrc-file', { content, defaultName: String(defaultName || 'lyrics') });
  },

  analyzeLyrics: async (lyricsText) => {
    if (typeof lyricsText !== 'string') return null;
    return await ipcRenderer.invoke('analyze-lyrics', lyricsText);
  },

  analyzeLyricsAI: async (lyricsText) => {
    if (typeof lyricsText !== 'string') return null;
    return await ipcRenderer.invoke('analyze-lyrics-ai', lyricsText);
  },

  getCustomFonts: async () => {
    return await ipcRenderer.invoke('get-custom-fonts');
  },

  importFontDialog: async () => {
    return await ipcRenderer.invoke('import-font-dialog');
  },

  deleteCustomFont: async (fontId) => {
    if (typeof fontId !== 'string') return false;
    return await ipcRenderer.invoke('delete-custom-font', fontId);
  },

  getFontFaceCss: async () => {
    return await ipcRenderer.invoke('get-font-face-css');
  },

  openExternalUrl: (url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      ipcRenderer.send('open-external-url', url);
    }
  }
});
