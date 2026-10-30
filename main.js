const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

const paths = require('./src/utils/paths');
const { logger } = require('./src/utils/logger');
const { storage } = require('./src/utils/storage');
const { parseLrc, serializeLrc } = require('./src/utils/lrcParser');
const { metadataService } = require('./src/utils/metadataService');
const { analyzeLyricsLocally, analyzeLyricsWithAI } = require('./src/utils/lyricAnalysis');
const { FontManager } = require('./src/utils/fontManager');

const fontManager = new FontManager(storage, paths.fontsDir);

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Enable transparent visuals
app.commandLine.appendSwitch('enable-transparent-visuals');

let overlayWindow = null;
let settingsWindow = null;
let pythonWorker = null;
let tray = null;
let workerRestartAttempts = 0;
let workerRestartTimer = null;
let currentPlaybackData = {
  title: '',
  artist: '',
  album: '',
  artwork: '',
  position: 0.0,
  duration: 0.0,
  state: 'stopped',
  lyrics: []
};
let currentTrackId = '';

const TRAY_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQADg9YWFhOMTIyHmXEp/AUE8Ofv3/+/e/s7PRB4XNycnrm5ub+AOMj6yck/v79+w8UHgR0dnZ+wGeA0QAYDeiGgX9/gQ5+8fPnTyOGUQMAABx2F32wD5v6AAAAAElFTkSuQmCC';

function clampWindowBounds(bounds) {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: pWidth, height: pHeight } = primaryDisplay.workAreaSize;

  const winWidth = Math.max(400, Math.min(bounds?.width || 1100, pWidth));
  const winHeight = Math.max(120, Math.min(bounds?.height || 240, pHeight));

  let posX = typeof bounds?.x === 'number' ? bounds.x : Math.round((pWidth - winWidth) / 2);
  let posY = typeof bounds?.y === 'number' ? bounds.y : Math.round(pHeight - winHeight - 60);

  // Check if coordinates land within at least one connected display
  const matchingDisplay = screen.getDisplayMatching({ x: posX, y: posY, width: winWidth, height: winHeight });
  if (matchingDisplay) {
    const area = matchingDisplay.workArea;
    if (posX < area.x) posX = area.x;
    if (posY < area.y) posY = area.y;
    if (posX + winWidth > area.x + area.width) posX = area.x + area.width - winWidth;
    if (posY + winHeight > area.y + area.height) posY = area.y + area.height - winHeight;
  } else {
    posX = Math.round((pWidth - winWidth) / 2);
    posY = Math.round(pHeight - winHeight - 60);
  }

  return { width: winWidth, height: winHeight, x: posX, y: posY };
}

function createOverlayWindow() {
  const config = storage.getConfig();
  const bounds = clampWindowBounds(config.windowBounds);

  overlayWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: Boolean(config.alwaysOnTop),
    resizable: true,
    hasShadow: false,
    skipTaskbar: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Secure navigation lock
  overlayWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  overlayWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
    }
  });

  if (config.isClickThrough) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  // Save bounds on move/resize with debounce
  let boundsDebounce = null;
  const saveBounds = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    clearTimeout(boundsDebounce);
    boundsDebounce = setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        const b = overlayWindow.getBounds();
        storage.saveConfig({ windowBounds: b });
      }
    }, 400);
  };

  overlayWindow.on('moved', saveBounds);
  overlayWindow.on('resized', saveBounds);

  // Overlay visibility events to pause/resume animation loop
  overlayWindow.on('hide', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('overlay-visibility', false);
    }
  });

  overlayWindow.on('show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('overlay-visibility', true);
    }
  });

  overlayWindow.on('minimize', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('overlay-visibility', false);
    }
  });

  overlayWindow.on('restore', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('overlay-visibility', true);
    }
  });

  overlayWindow.loadFile(path.join(__dirname, 'index.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    stopMediaWorker();
  });
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 680,
    height: 760,
    minWidth: 540,
    minHeight: 600,
    center: true,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    title: 'NeonLyrics v3 - Customization Studio',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  settingsWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function setClickThrough(enabled) {
  const isEnabled = Boolean(enabled);
  storage.saveConfig({ isClickThrough: isEnabled });

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(isEnabled, { forward: true });
    overlayWindow.webContents.send('apply-config', { isClickThrough: isEnabled });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('click-through-toggled', isEnabled);
  }
  updateTrayMenu();
}

function createTray() {
  if (tray) return;

  try {
    const iconPath = path.join(__dirname, 'build', 'icon.ico');
    let img;
    if (fs.existsSync(iconPath)) {
      img = nativeImage.createFromPath(iconPath);
    } else {
      img = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
    }
    tray = new Tray(img);
    tray.setToolTip('NeonLyrics v3 (Right-click for studio)');

    updateTrayMenu();

    tray.on('click', () => {
      openSettingsWindow();
    });
  } catch (e) {
    logger.error('Tray initialization error', e.message);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const config = storage.getConfig();
  const isAutoStart = app.getLoginItemSettings().openAtLogin;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '✨ NeonLyrics v3 Overlay',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🎨 Customization Studio & Settings...',
      click: () => openSettingsWindow()
    },
    {
      label: '🔮 Visualization Engine',
      submenu: [
        { label: 'Ship (Perspective 3D Wall)', type: 'radio', checked: (config.visualizationMode || 'ship') === 'ship', click: () => applyVisualizationMode('ship') },
        { label: 'Fisheye (Convex Lens)', type: 'radio', checked: config.visualizationMode === 'fisheye', click: () => applyVisualizationMode('fisheye') },
        { label: 'Fisheye Visual (Convex + Glyphs)', type: 'radio', checked: config.visualizationMode === 'fisheye-visual', click: () => applyVisualizationMode('fisheye-visual') },
        { label: 'Clean (Minimalist Elegance)', type: 'radio', checked: config.visualizationMode === 'clean', click: () => applyVisualizationMode('clean') }
      ]
    },
    {
      label: '🖼️ Transparent Wallpaper Mode',
      type: 'checkbox',
      checked: Boolean(config.wallpaperMode?.enabled),
      click: (item) => {
        const wp = { ...(config.wallpaperMode || {}), enabled: item.checked };
        storage.saveConfig({ wallpaperMode: wp });
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('apply-config', storage.getConfig());
        }
        updateTrayMenu();
      }
    },
    {
      label: '🎨 Quick Theme Presets',
      submenu: [
        { label: 'Cyber Aqua', click: () => applyThemePreset('theme-cyber') },
        { label: 'Neon Pink', click: () => applyThemePreset('theme-neon-pink') },
        { label: 'Aurora Mint', click: () => applyThemePreset('theme-aurora-green') },
        { label: 'Sunset Amber', click: () => applyThemePreset('theme-sunset-amber') },
        { label: 'Diamond White', click: () => applyThemePreset('theme-diamond-white') },
        { label: 'Electric Purple', click: () => applyThemePreset('theme-electric-purple') },
        { label: 'Cyber Volt', click: () => applyThemePreset('theme-cyber-volt') },
        { label: 'Crimson Red', click: () => applyThemePreset('theme-crimson-red') }
      ]
    },
    { type: 'separator' },
    {
      label: 'Always On Top',
      type: 'checkbox',
      checked: Boolean(config.alwaysOnTop),
      click: (item) => {
        storage.saveConfig({ alwaysOnTop: item.checked });
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.setAlwaysOnTop(item.checked);
        }
      }
    },
    {
      label: 'Ghost Mode (Click-Through)  [Ctrl+Alt+O]',
      type: 'checkbox',
      checked: Boolean(config.isClickThrough),
      click: (item) => setClickThrough(item.checked)
    },
    {
      label: 'Run on Windows Startup',
      type: 'checkbox',
      checked: isAutoStart,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: false
        });
        storage.saveConfig({ autoStart: item.checked });
        updateTrayMenu();
      }
    },
    {
      label: 'Show / Hide Floating Lyrics  [Ctrl+Alt+L]',
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          if (overlayWindow.isVisible()) overlayWindow.hide();
          else overlayWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit NeonLyrics',
      click: () => {
        stopMediaWorker();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function applyThemePreset(themeName) {
  storage.saveConfig({ isCustomColor: false, theme: themeName });
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', {
      isCustomColor: false,
      theme: themeName
    });
  }
}

function applyVisualizationMode(mode) {
  storage.saveConfig({ visualizationMode: mode });
  const fullConfig = storage.getConfig();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', fullConfig);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('apply-config', fullConfig);
  }
  updateTrayMenu();
}

function getWorkerCommand() {
  if (process.resourcesPath) {
    const packagedExe = path.join(process.resourcesPath, 'bin', 'media_worker', 'media_worker.exe');
    if (fs.existsSync(packagedExe)) {
      return { cmd: packagedExe, args: [] };
    }
  }

  const localExe = path.join(__dirname, 'py_dist', 'media_worker', 'media_worker.exe');
  if (fs.existsSync(localExe)) {
    return { cmd: localExe, args: [] };
  }

  return { cmd: 'python', args: ['-u', path.join(__dirname, 'media_worker.py')] };
}

function startMediaWorker() {
  if (pythonWorker) return;
  const worker = getWorkerCommand();
  logger.info(`Starting media worker using ${worker.cmd} ${worker.args.join(' ')}`);

  try {
    pythonWorker = spawn(worker.cmd, worker.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
  } catch (err) {
    logger.error('Failed to spawn media worker', err.message);
    scheduleWorkerRestart();
    return;
  }

  const rl = readline.createInterface({
    input: pythonWorker.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line || !overlayWindow || overlayWindow.isDestroyed()) return;
    try {
      const data = JSON.parse(line);
      const trackId = `${data.artist || 'Unknown'} - ${data.title || ''}`.trim();

      // If new track detected, enrich with async metadata (artwork, album) and record history
      if (data.title && trackId !== currentTrackId) {
        currentTrackId = trackId;
        workerRestartAttempts = 0; // Reset restart backoff on active data stream

        // Fetch artwork & metadata asynchronously in background
        metadataService.fetchTrackMetadata(data.artist, data.title).then((meta) => {
          if (meta) {
            if (!data.album && meta.album) data.album = meta.album;
            data.artwork = meta.artwork || '';
          }
          currentPlaybackData = { ...data, artwork: data.artwork || meta?.artwork || '' };

          // Record playback history
          storage.addToHistory({
            title: data.title,
            artist: data.artist,
            album: data.album,
            artwork: currentPlaybackData.artwork,
            duration: data.duration
          });

          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('playback-data', currentPlaybackData);
          }
        }).catch(() => {});
      } else {
        // Carry forward cached artwork for current track
        if (currentTrackId === trackId && currentPlaybackData.artwork) {
          data.artwork = currentPlaybackData.artwork;
        }
        currentPlaybackData = data;
      }

      overlayWindow.webContents.send('playback-data', currentPlaybackData);
    } catch (err) {
      // Ignore JSON parse blip
    }
  });

  pythonWorker.stderr.on('data', (data) => {
    const errText = data.toString().trim();
    if (errText) logger.warn(`Worker stderr: ${errText}`);
  });

  pythonWorker.on('exit', (code) => {
    logger.warn(`Media worker exited with code ${code}`);
    pythonWorker = null;
    scheduleWorkerRestart();
  });

  pythonWorker.on('error', (err) => {
    logger.error('Media worker process error', err.message);
  });
}

function scheduleWorkerRestart() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  clearTimeout(workerRestartTimer);
  workerRestartAttempts++;
  // Exponential backoff: 2s, 4s, 8s, up to max 25s
  const delayMs = Math.min(25000, Math.pow(2, Math.min(workerRestartAttempts, 4)) * 1000);
  logger.info(`Scheduling media worker restart (attempt ${workerRestartAttempts}) in ${delayMs / 1000}s`);
  workerRestartTimer = setTimeout(() => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      startMediaWorker();
    }
  }, delayMs);
}

function stopMediaWorker() {
  clearTimeout(workerRestartTimer);
  if (pythonWorker) {
    try {
      if (pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
        pythonWorker.stdin.write(JSON.stringify({ action: 'quit' }) + '\n');
      }
      setTimeout(() => {
        if (pythonWorker) {
          try { pythonWorker.kill(); } catch (e) {}
          pythonWorker = null;
        }
      }, 500);
    } catch (e) {
      try { pythonWorker.kill(); } catch (k) {}
      pythonWorker = null;
    }
  }
}

// ---------------- IPC HANDLERS ----------------

ipcMain.handle('get-initial-state', () => {
  return {
    config: storage.getConfig(),
    favorites: storage.getFavorites(),
    history: storage.getHistory(),
    lastPlayback: currentPlaybackData
  };
});

ipcMain.handle('get-display-refresh-rate', () => {
  try {
    const primary = screen.getPrimaryDisplay();
    return primary?.displayFrequency || null;
  } catch (e) {
    return null;
  }
});

ipcMain.on('config-updated', (event, newConfig) => {
  if (!newConfig || typeof newConfig !== 'object') return;
  storage.saveConfig(newConfig);
  const fullConfig = storage.getConfig();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', fullConfig);
  }
  if (settingsWindow && !settingsWindow.isDestroyed() && event?.sender !== settingsWindow.webContents) {
    settingsWindow.webContents.send('apply-config', fullConfig);
  }
});

ipcMain.on('toggle-click-through', (event, val) => {
  setClickThrough(val);
});

ipcMain.on('media-control', (event, data) => {
  if (pythonWorker && pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
    try {
      pythonWorker.stdin.write(JSON.stringify(data) + '\n');
    } catch (e) {}
  }
});

ipcMain.on('toggle-always-on-top', (event, val) => {
  const isTop = Boolean(val);
  storage.saveConfig({ alwaysOnTop: isTop });
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(isTop);
  }
  updateTrayMenu();
});

ipcMain.on('toggle-startup', (event, enable) => {
  const isEnable = Boolean(enable);
  app.setLoginItemSettings({
    openAtLogin: isEnable,
    openAsHidden: false
  });
  storage.saveConfig({ autoStart: isEnable });
  updateTrayMenu();
});

ipcMain.on('open-settings', () => {
  openSettingsWindow();
});

ipcMain.on('open-external-url', (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url).catch(() => {});
  }
});

ipcMain.handle('toggle-favorite', (event, track) => {
  if (!track || !track.title) return false;
  const trackId = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();
  const isFav = storage.isFavorite(trackId);
  if (isFav) {
    storage.removeFavorite(trackId);
  } else {
    storage.addFavorite(track);
  }
  const updatedFavs = storage.getFavorites();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('favorites-updated', updatedFavs);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('favorites-updated', updatedFavs);
  }
  return !isFav;
});

ipcMain.handle('get-favorites', () => storage.getFavorites());

ipcMain.handle('remove-favorite', (event, trackId) => {
  const ok = storage.removeFavorite(trackId);
  const updatedFavs = storage.getFavorites();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('favorites-updated', updatedFavs);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('favorites-updated', updatedFavs);
  }
  return ok;
});

ipcMain.handle('get-history', () => storage.getHistory());

ipcMain.handle('clear-history', () => storage.clearHistory());

// Glow Preset Handlers
ipcMain.handle('get-custom-glow-presets', () => storage.getCustomGlowPresets());

ipcMain.handle('save-custom-glow-preset', (event, preset) => storage.saveCustomGlowPreset(preset));

ipcMain.handle('delete-custom-glow-preset', (event, id) => storage.deleteCustomGlowPreset(id));

ipcMain.handle('rename-custom-glow-preset', (event, { id, newName }) => storage.renameCustomGlowPreset(id, newName));

ipcMain.handle('duplicate-custom-glow-preset', (event, { id, newName }) => storage.duplicateCustomGlowPreset(id, newName));

// Custom Fonts Handlers
ipcMain.handle('get-custom-fonts', () => fontManager.getCustomFonts());

ipcMain.handle('delete-custom-font', (event, fontId) => {
  const ok = fontManager.deleteFont(fontId);
  if (ok && overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', storage.getConfig());
  }
  return ok;
});

ipcMain.handle('get-font-face-css', () => {
  const fonts = fontManager.getCustomFonts();
  return fonts.map(f => fontManager.generateFontFaceCSS(f)).join('\n');
});

ipcMain.handle('import-font-dialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import Custom Font',
    filters: [
      { name: 'Fonts (TTF, OTF, WOFF, WOFF2)', extensions: ['ttf', 'otf', 'woff', 'woff2'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  try {
    const imported = fontManager.importFont(result.filePaths[0]);
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('apply-config', storage.getConfig());
    }
    return imported;
  } catch (err) {
    dialog.showErrorBox('Font Import Failed', err.message);
    return null;
  }
});

ipcMain.handle('search-lyrics', async (event, query) => {
  if (!query) return [];
  return await metadataService.searchLyricsAlternatives(query.artist || '', query.title || '');
});

ipcMain.handle('select-lyrics', async (event, candidate) => {
  if (!candidate) return false;
  let lrcText = candidate.syncedLyrics || candidate.plainLyrics || '';
  if (!lrcText && candidate.id) {
    const fetched = await metadataService.fetchLyricsById(candidate.id);
    if (fetched) {
      lrcText = fetched.syncedLyrics || fetched.plainLyrics || '';
    }
  }
  if (!lrcText) return false;

  const parsed = parseLrc(lrcText);
  if (currentPlaybackData) {
    currentPlaybackData.lyrics = parsed.lines;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('playback-data', currentPlaybackData);
    }
  }

  // Also notify worker of custom lyrics
  if (pythonWorker && pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
    try {
      pythonWorker.stdin.write(JSON.stringify({ action: 'load_custom_lyrics', lrcText }) + '\n');
    } catch (e) {}
  }
  return true;
});

ipcMain.handle('import-lrc-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import LRC Lyrics File',
    filters: [{ name: 'Lyrics Files', extensions: ['lrc', 'txt'] }],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = parseLrc(content);
    if (currentPlaybackData) {
      currentPlaybackData.lyrics = parsed.lines;
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('playback-data', currentPlaybackData);
      }
    }
    return { content, parsed, fileName: path.basename(result.filePaths[0]) };
  } catch (err) {
    logger.error('Failed to import LRC file', err.message);
    return null;
  }
});

ipcMain.handle('export-lrc-file', async (event, { content, defaultName }) => {
  if (!content) return false;
  const result = await dialog.showSaveDialog({
    title: 'Export LRC Lyrics File',
    defaultPath: `${defaultName || 'lyrics'}.lrc`,
    filters: [{ name: 'LRC Lyrics File', extensions: ['lrc'] }]
  });

  if (result.canceled || !result.filePath) return false;

  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    return true;
  } catch (err) {
    logger.error('Failed to export LRC file', err.message);
    return false;
  }
});

ipcMain.handle('analyze-lyrics', (event, lyricsText) => {
  return analyzeLyricsLocally(lyricsText);
});

ipcMain.handle('analyze-lyrics-ai', async (event, lyricsText) => {
  const config = storage.getConfig();
  if (!config.ai || !config.ai.enabled) {
    return { error: 'AI analysis is disabled in Settings.' };
  }
  try {
    return await analyzeLyricsWithAI(lyricsText, config.ai);
  } catch (err) {
    return { error: err.message };
  }
});

// App Lifecycle
app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  startMediaWorker();

  // Register Global Hotkeys
  try {
    globalShortcut.register('CommandOrControl+Alt+L', () => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (overlayWindow.isVisible()) {
          overlayWindow.hide();
          overlayWindow.webContents.send('overlay-visibility', false);
        } else {
          overlayWindow.show();
          overlayWindow.webContents.send('overlay-visibility', true);
        }
      }
    });

    globalShortcut.register('CommandOrControl+Alt+O', () => {
      const config = storage.getConfig();
      setClickThrough(!config.isClickThrough);
    });

    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (pythonWorker && pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
        pythonWorker.stdin.write(JSON.stringify({ action: 'play_pause' }) + '\n');
      }
    });

    globalShortcut.register('CommandOrControl+Alt+Right', () => {
      if (pythonWorker && pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
        pythonWorker.stdin.write(JSON.stringify({ action: 'next' }) + '\n');
      }
    });

    globalShortcut.register('CommandOrControl+Alt+Left', () => {
      if (pythonWorker && pythonWorker.stdin && !pythonWorker.stdin.destroyed) {
        pythonWorker.stdin.write(JSON.stringify({ action: 'prev' }) + '\n');
      }
    });
  } catch (err) {
    logger.error('Error registering global shortcuts', err.message);
  }

  // Windows Startup preference
  const config = storage.getConfig();
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(config.autoStart),
      openAsHidden: false
    });
  } catch (err) {}
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (e) {}
  stopMediaWorker();
});

app.on('window-all-closed', () => {
  // Keep running in tray
});
