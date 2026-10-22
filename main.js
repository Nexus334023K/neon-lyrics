const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

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
let isAlwaysOnTop = false; // Default: Desktop layer (behind active apps)
let isClickThrough = false; // Ghost mode (pass clicks through)

const TRAY_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQADg9YWFhOMTIyHmXEp/AUE8Ofv3/+/e/s7PRB4XNycnrm5ub+AOMj6yck/v79+w8UHgR0dnZ+wGeA0QAYDeiGgX9/gQ5+8fPnTyOGUQMAABx2F32wD5v6AAAAAElFTkSuQmCC';

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const winWidth = 1100;
  const winHeight = 240;
  const posX = Math.round((screenWidth - winWidth) / 2);
  const posY = Math.round(screenHeight - winHeight - 60);

  overlayWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: isAlwaysOnTop,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true, // Only show in system tray!
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isClickThrough) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }

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
    width: 620,
    height: 720,
    center: true,
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    title: 'NeonLyrics - Customization Studio',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function setClickThrough(enabled) {
  isClickThrough = Boolean(enabled);
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    overlayWindow.webContents.send('apply-config', { isClickThrough });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('click-through-toggled', isClickThrough);
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
    tray.setToolTip('NeonLyrics (Right-click for settings)');

    updateTrayMenu();

    tray.on('click', () => {
      openSettingsWindow();
    });
  } catch (e) {
    console.error('Tray error:', e);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const isAutoStart = app.getLoginItemSettings().openAtLogin;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🎵 NeonLyrics Desktop',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '🎨 Customization Studio & Settings...',
      click: () => {
        openSettingsWindow();
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
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked;
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.setAlwaysOnTop(isAlwaysOnTop);
        }
      }
    },
    {
      label: 'Ghost Mode (Click-Through)  [Ctrl+Alt+O]',
      type: 'checkbox',
      checked: isClickThrough,
      click: (item) => {
        setClickThrough(item.checked);
      }
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
        updateTrayMenu();
      }
    },
    {
      label: 'Show / Hide Floating Lyrics  [Ctrl+Alt+L]',
      click: () => {
        if (overlayWindow) {
          if (overlayWindow.isVisible()) overlayWindow.hide();
          else overlayWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopMediaWorker();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function applyThemePreset(themeName) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', {
      isCustomColor: false,
      theme: themeName
    });
  }
}

function getWorkerCommand() {
  // 1. In packaged app: resources/bin/media_worker/media_worker.exe
  if (process.resourcesPath) {
    const packagedExe = path.join(process.resourcesPath, 'bin', 'media_worker', 'media_worker.exe');
    if (fs.existsSync(packagedExe)) {
      return { cmd: packagedExe, args: [] };
    }
  }

  // 2. In local dev with compiled binary: py_dist/media_worker/media_worker.exe
  const localExe = path.join(__dirname, 'py_dist', 'media_worker', 'media_worker.exe');
  if (fs.existsSync(localExe)) {
    return { cmd: localExe, args: [] };
  }

  // 3. Fallback to python script
  return { cmd: 'python', args: ['-u', path.join(__dirname, 'media_worker.py')] };
}

function startMediaWorker() {
  const worker = getWorkerCommand();
  pythonWorker = spawn(worker.cmd, worker.args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  const rl = readline.createInterface({
    input: pythonWorker.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (!line || !overlayWindow || overlayWindow.isDestroyed()) return;
    try {
      const data = JSON.parse(line);
      overlayWindow.webContents.send('playback-data', data);
    } catch (err) {}
  });

  pythonWorker.on('exit', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      setTimeout(startMediaWorker, 2000);
    }
  });
}

function stopMediaWorker() {
  if (pythonWorker) {
    try {
      pythonWorker.kill();
    } catch (e) {}
    pythonWorker = null;
  }
}

// IPC from Settings & Overlay
ipcMain.on('config-updated', (event, newConfig) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('apply-config', newConfig);
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
  isAlwaysOnTop = typeof val === 'boolean' ? val : !isAlwaysOnTop;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(isAlwaysOnTop);
  }
  updateTrayMenu();
});

ipcMain.on('toggle-startup', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: false
  });
  updateTrayMenu();
});

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  startMediaWorker();

  // Register Global Hotkeys
  try {
    globalShortcut.register('CommandOrControl+Alt+L', () => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (overlayWindow.isVisible()) overlayWindow.hide();
        else overlayWindow.show();
      }
    });

    globalShortcut.register('CommandOrControl+Alt+O', () => {
      setClickThrough(!isClickThrough);
    });
  } catch (err) {
    console.error('Error registering global shortcuts:', err);
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: true,
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
  // Keep running in tray even if settings is closed
});
