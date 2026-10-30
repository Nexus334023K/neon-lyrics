const path = require('path');
const os = require('os');
const fs = require('fs');

let electronApp = null;
try {
  const electron = require('electron');
  electronApp = electron.app;
} catch (e) {
  // Running in standard Node test or worker context
}

function getUserDataDir() {
  if (electronApp && typeof electronApp.getPath === 'function') {
    try {
      return electronApp.getPath('userData');
    } catch (e) {}
  }
  const appData = process.env.APPDATA || (
    process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config')
  );
  return path.join(appData, 'NeonLyrics');
}

const userDataDir = getUserDataDir();

const paths = {
  userData: userDataDir,
  lyricsCache: path.join(userDataDir, 'lyrics_cache'),
  artworkCache: path.join(userDataDir, 'artwork_cache'),
  logs: path.join(userDataDir, 'logs'),
  configFile: path.join(userDataDir, 'config.json'),
  favoritesFile: path.join(userDataDir, 'favorites.json'),
  historyFile: path.join(userDataDir, 'history.json'),
  glowPresetsFile: path.join(userDataDir, 'glow_presets.json'),
  fontsDir: path.join(userDataDir, 'fonts'),
  ensureDirectories() {
    [userDataDir, this.lyricsCache, this.artworkCache, this.logs, this.fontsDir].forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (e) {
        // Fallback or ignore
      }
    });
  }
};

paths.ensureDirectories();

module.exports = paths;
