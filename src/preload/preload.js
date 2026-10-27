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

  openExternalUrl: (url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      ipcRenderer.send('open-external-url', url);
    }
  }
});
