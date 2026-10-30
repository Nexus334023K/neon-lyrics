/**
 * NeonLyrics v3 - Renderer Process
 * Connects securely to the main process via window.neonLyricsApi.
 */

const api = window.neonLyricsApi || {
  onPlaybackData: () => () => {},
  onApplyConfig: () => () => {},
  onFavoritesUpdated: () => () => {},
  onOverlayVisibility: () => () => {},
  getDisplayRefreshRate: async () => null,
  sendMediaControl: () => {},
  saveConfig: () => {},
  toggleClickThrough: () => {},
  toggleAlwaysOnTop: () => {},
  toggleStartup: () => {},
  openSettingsWindow: () => {},
  getInitialState: async () => ({ config: {}, favorites: [], history: [] }),
  toggleFavorite: async () => false
};

let currentTrackId = '';
let lyrics = [];
let currentLineIdx = -1;
let currentWordIdx = -1;
let lastPlaybackState = null;
let currentFavorites = [];
let currentAlbumPalette = null;
let currentArtworkUrl = '';

let config = {
  theme: 'theme-cyber',
  visualizationMode: 'ship',
  autoSyncAlbumColors: true,
  manualColors: {
    primary: '#00f2fe',
    secondary: '#4facfe',
    activeWord: '#ffffff'
  },
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
  showMiniPlayer: false,
  miniPlayerCollapsed: false,
  isClickThrough: false,
  alwaysOnTop: false,
  autoStart: true,
  animation: {
    motionBlur: true,
    motionBlurIntensity: 'medium',
    targetFps: 'auto',
    qualityPreset: 'smooth',
    respectReducedMotion: true,
    gpuFallback: true,
    animationSpeed: 1.0,
    transitionDuration: 0.28,
    perspectiveDepth: 800
  }
};

// Initialize Palette Extractor
const PaletteExtractorClass = window.PaletteExtractor || class {
  constructor() {}
  async extractFromImageUrl() { return null; }
};
const paletteExtractor = new PaletteExtractorClass();

// Initialize Motion Blur Engine & Frame Rate Scheduler
const MotionEngineClass = window.MotionBlurEngine || class {
  constructor() {
    this.scheduler = {
      start: () => {},
      pause: () => {},
      resume: () => {},
      destroy: () => {},
      setTargetFps: () => {},
      setDisplayRefreshRate: () => {},
      register: () => () => {}
    };
  }
  applyConfig() {}
  triggerTransition(opts) {
    if (opts.pastEl) opts.pastEl.textContent = opts.pastContent || '';
    if (opts.activeEl) opts.activeEl.innerHTML = opts.activeContent || '';
    if (opts.nextLineEl) opts.nextLineEl.textContent = opts.nextContent || '';
  }
  isReducedMotionPreferred() { return false; }
  resume() {}
  pause() {}
  destroy() {}
};

const motionEngine = new MotionEngineClass({
  motionBlur: config.animation?.motionBlur ?? true,
  motionBlurIntensity: config.animation?.motionBlurIntensity || 'medium',
  targetFps: config.animation?.targetFps || 'auto',
  qualityPreset: config.animation?.qualityPreset || 'smooth',
  respectReducedMotion: config.animation?.respectReducedMotion !== false,
  gpuFallback: config.animation?.gpuFallback !== false,
  animationSpeed: config.animation?.animationSpeed || 1.0,
  transitionDuration: config.animation?.transitionDuration || 0.28,
  perspectiveDepth: config.animation?.perspectiveDepth || 800,
  visualizationMode: config.visualizationMode || 'ship'
});

const scheduler = motionEngine.scheduler;
if (scheduler && typeof scheduler.start === 'function') {
  scheduler.start();
}

// Word Transition Controller
const WordControllerClass = window.WordTransitionController || class {
  constructor() {}
  applyConfig() {}
  onWordChange() {}
  seekReconcile() {}
  destroy() {}
};
const wordTransitionController = new WordControllerClass(config.wordTransitions);

// Line Transition Controller
const LineControllerClass = window.LineTransitionController || class {
  constructor() {}
  applyConfig() {}
  triggerTransition(opts) {
    if (opts.pastEl) opts.pastEl.textContent = opts.pastContent || '';
    if (opts.activeEl) opts.activeEl.innerHTML = opts.activeContent || '';
    if (opts.nextLineEl) opts.nextLineEl.textContent = opts.nextContent || '';
  }
  settleLines() {}
  destroy() {}
};
const lineTransitionController = new LineControllerClass(config.lineTransitions);

const pastLineEl = document.getElementById('past-line');
const activeLineEl = document.getElementById('active-line');
const nextLineEl = document.getElementById('next-line');
const stageEl = document.getElementById('stage');
const lyricsContainerEl = document.getElementById('lyrics-container');
const lyricsBadgeEl = document.getElementById('lyrics-badge');

// Mini Player Elements
const miniPlayerEl = document.getElementById('mini-player');
const playerToggleBtn = document.getElementById('player-toggle-btn');
const playerTitleEl = document.getElementById('player-title');
const playerArtistEl = document.getElementById('player-artist');
const playerArtEl = document.getElementById('player-art');
const playerArtPlaceholder = document.getElementById('player-art-placeholder');
const btnPrev = document.getElementById('btn-prev');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnNext = document.getElementById('btn-next');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const timeCurrentEl = document.getElementById('time-current');
const timeTotalEl = document.getElementById('time-total');

// Header tool buttons
const btnQuickSearch = document.getElementById('btn-quick-search');
const btnFavorite = document.getElementById('btn-favorite');
const iconStarOutline = document.getElementById('icon-star-outline');
const iconStarFilled = document.getElementById('icon-star-filled');
const btnOpenSettings = document.getElementById('btn-open-settings');

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyConfig() {
  const visMode = config.visualizationMode || 'ship';
  const lineModeClass = `mode-${config.lineMode || 2}`;
  const visModeClass = `mode-vis-${visMode}`;

  if (config.autoSyncAlbumColors && currentAlbumPalette) {
    document.body.className = `${lineModeClass} ${visModeClass}`;
    document.documentElement.style.setProperty('--glow-primary', currentAlbumPalette.primary);
    document.documentElement.style.setProperty('--glow-secondary', currentAlbumPalette.secondary);
    document.documentElement.style.setProperty('--word-active', currentAlbumPalette.activeWord);
    document.documentElement.style.setProperty('--word-sung', currentAlbumPalette.activeWord);
  } else if (config.isCustomColor) {
    document.body.className = `${lineModeClass} ${visModeClass}`;
    const pColor = config.manualColors?.primary || config.primaryColor || '#00f2fe';
    const sColor = config.manualColors?.secondary || config.secondaryColor || '#4facfe';
    const aWord = config.manualColors?.activeWord || config.activeWordColor || '#ffffff';
    document.documentElement.style.setProperty('--glow-primary', pColor);
    document.documentElement.style.setProperty('--glow-secondary', sColor);
    document.documentElement.style.setProperty('--word-active', aWord);
    document.documentElement.style.setProperty('--word-sung', config.sungWordColor || aWord);
  } else {
    document.body.className = `${config.theme || 'theme-cyber'} ${lineModeClass} ${visModeClass}`;
    document.documentElement.style.removeProperty('--glow-primary');
    document.documentElement.style.removeProperty('--glow-secondary');
    document.documentElement.style.removeProperty('--word-active');
    document.documentElement.style.removeProperty('--word-sung');
  }

  if (lastPlaybackState && lastPlaybackState.state === 'playing') {
    document.body.classList.add('is-playing');
  } else {
    document.body.classList.remove('is-playing');
  }

  document.documentElement.style.setProperty('--font-scale', config.fontScale ?? 1.0);
  document.documentElement.style.setProperty('--glow-intensity', config.glowIntensity ?? 1.0);
  
  // Typography Engine variables
  const typo = config.typography || {};
  const baseFont = typo.fontFamily || config.fontFamily || "'Outfit', sans-serif";
  document.documentElement.style.setProperty('--font-family', baseFont);
  document.documentElement.style.setProperty('--font-weight', typo.fontWeight || '700');
  document.documentElement.style.setProperty('--letter-spacing', typo.letterSpacing !== undefined ? `${typo.letterSpacing}px` : '0px');
  document.documentElement.style.setProperty('--line-height', typo.lineHeight || 1.35);
  document.documentElement.style.setProperty('--word-spacing', typo.wordSpacing !== undefined ? `${typo.wordSpacing}px` : '0px');
  document.documentElement.style.setProperty('--active-word-font', typo.activeWordFont || baseFont);
  document.documentElement.style.setProperty('--sung-word-font', typo.sungWordFont || baseFont);
  document.documentElement.style.setProperty('--upcoming-word-font', typo.upcomingWordFont || baseFont);
  document.documentElement.style.setProperty('--prev-line-font', typo.prevLineFont || baseFont);
  document.documentElement.style.setProperty('--active-line-font', typo.activeLineFont || baseFont);
  document.documentElement.style.setProperty('--next-line-font', typo.nextLineFont || baseFont);

  document.documentElement.style.setProperty('--perspective-depth', (config.animation?.perspectiveDepth || 800) + 'px');

  document.documentElement.style.setProperty('--backdrop-opacity', config.backdropOpacity ?? 0.0);
  document.documentElement.style.setProperty('--backdrop-blur', (config.backdropBlur ?? 16) + 'px');

  if (stageEl) {
    stageEl.className = `stage align-${config.textAlign || 'center'} mode-vis-${visMode}`;
  }

  if (miniPlayerEl) {
    miniPlayerEl.classList.toggle('hidden', !config.showMiniPlayer);
    miniPlayerEl.classList.toggle('collapsed', Boolean(config.miniPlayerCollapsed));
  }

  // Motion Blur & Animation Engine Config
  if (config.animation) {
    motionEngine.applyConfig({
      ...config.animation,
      visualizationMode: visMode
    });
    const reduced = config.animation.respectReducedMotion && motionEngine.isReducedMotionPreferred();
    document.body.classList.toggle('reduced-motion-active', Boolean(reduced));
  }

  if (config.wordTransitions) {
    wordTransitionController.applyConfig(config.wordTransitions);
  }

  if (config.lineTransitions) {
    lineTransitionController.applyConfig(config.lineTransitions);
  }

  // Wallpaper Mode desktop integration
  const WallpaperModeClass = window.WallpaperMode || (typeof WallpaperMode !== 'undefined' ? WallpaperMode : null);
  if (WallpaperModeClass) {
    if (!window.wallpaperModeInstance) {
      window.wallpaperModeInstance = new WallpaperModeClass(config.wallpaperMode || {});
      window.wallpaperModeInstance.attach(document.body, miniPlayerEl);
    } else {
      window.wallpaperModeInstance.updateConfig(config.wallpaperMode || {});
    }
    document.body.classList.toggle('wallpaper-mode', Boolean(config.wallpaperMode?.enabled));
  }
}

function updateFavoriteButton(track) {
  if (!btnFavorite) return;
  if (!track || !track.title) {
    btnFavorite.style.display = 'none';
    return;
  }
  btnFavorite.style.display = 'inline-flex';
  const id = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();
  const isFav = currentFavorites.some(f => f.id === id);

  if (isFav) {
    iconStarOutline.style.display = 'none';
    iconStarFilled.style.display = 'block';
    btnFavorite.title = 'Remove from Favorites';
  } else {
    iconStarOutline.style.display = 'block';
    iconStarFilled.style.display = 'none';
    btnFavorite.title = 'Add to Favorites';
  }
}

function updatePlayback(data) {
  lastPlaybackState = data;
  const isPlaying = Boolean(data.title && (data.state === 'playing' || data.state === 'paused'));
  const trackId = `${data.artist || 'Unknown'} - ${data.title || ''}`.trim();

  // Mini Player Metadata
  if (data.title) {
    playerTitleEl.textContent = data.title;
    playerArtistEl.textContent = data.artist || 'Unknown Artist';
  } else {
    playerTitleEl.textContent = 'Waiting for music...';
    playerArtistEl.textContent = 'Spotify / Windows Media';
  }

  // Artwork & Reactive Color Extraction
  if (data.artwork) {
    playerArtEl.src = data.artwork;
    playerArtEl.style.display = 'block';
    playerArtPlaceholder.style.display = 'none';

    if (data.artwork !== currentArtworkUrl) {
      currentArtworkUrl = data.artwork;
      if (config.autoSyncAlbumColors !== false) {
        paletteExtractor.extractFromImageUrl(data.artwork, trackId).then((pal) => {
          if (pal && currentArtworkUrl === data.artwork) {
            currentAlbumPalette = pal;
            applyConfig();
          }
        }).catch(() => {});
      }
    }
  } else {
    playerArtEl.style.display = 'none';
    playerArtPlaceholder.style.display = 'flex';
    if (currentArtworkUrl !== '') {
      currentArtworkUrl = '';
      currentAlbumPalette = null;
      applyConfig();
    }
  }

  updateFavoriteButton(data);

  // Play / Pause Icon
  if (data.state === 'playing') {
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
    document.body.classList.add('is-playing');
  } else {
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    document.body.classList.remove('is-playing');
  }

  // Progress Bar & Timers
  if (data.duration > 0) {
    const pct = Math.min(100, Math.max(0, (data.position / data.duration) * 100));
    progressFill.style.width = pct.toFixed(1) + '%';
    timeCurrentEl.textContent = formatTime(data.position);
    timeTotalEl.textContent = formatTime(data.duration);
  } else {
    progressFill.style.width = '0%';
    timeCurrentEl.textContent = '0:00';
    timeTotalEl.textContent = '0:00';
  }

  // Synchronize Lyrics
  if (isPlaying) {
    if (trackId !== currentTrackId) {
      currentTrackId = trackId;
      currentLineIdx = -1;
      currentWordIdx = -1;
      lyrics = data.lyrics || [];

      if (lyrics.length === 0) {
        pastLineEl.textContent = '';
        activeLineEl.innerHTML = `<span class="word active">${escapeHtml(data.title)}</span>`;
        nextLineEl.textContent = data.artist || '';
        if (lyricsBadgeEl) {
          lyricsBadgeEl.textContent = 'No Synced Lyrics';
          lyricsBadgeEl.className = 'lyrics-badge warning';
        }
      } else {
        const hasWords = lyrics.some(l => l.hasWordTimings);
        if (lyricsBadgeEl) {
          lyricsBadgeEl.textContent = hasWords ? '⚡ Word Glow' : '♪ Synced';
          lyricsBadgeEl.className = 'lyrics-badge active';
        }
      }
    } else if (data.lyrics && data.lyrics !== lyrics && data.lyrics.length > 0) {
      // Dynamic update of lyrics (e.g. from manual search selection)
      lyrics = data.lyrics;
      currentLineIdx = -1;
      currentWordIdx = -1;
    }

    if (lyrics.length > 0) {
      const effectivePos = Math.max(0, data.position + (parseFloat(config.syncOffset) || 0));
      syncLyrics(effectivePos);
    }
  } else {
    if (currentTrackId !== '') {
      currentTrackId = '';
      lyrics = [];
      currentLineIdx = -1;
      currentWordIdx = -1;
      pastLineEl.textContent = '';
      activeLineEl.innerHTML = '';
      nextLineEl.textContent = '';
      if (lyricsBadgeEl) {
        lyricsBadgeEl.textContent = 'Idle';
        lyricsBadgeEl.className = 'lyrics-badge';
      }
    }
  }
}

function syncLyrics(pos) {
  let activeIdx = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (pos >= lyrics[i].time) {
      activeIdx = i;
      break;
    }
  }

  if (activeIdx < 0) {
    if (currentLineIdx !== -1) {
      currentLineIdx = -1;
      currentWordIdx = -1;
      pastLineEl.textContent = '';
      activeLineEl.innerHTML = `<span class="word upcoming">...</span>`;
      nextLineEl.textContent = lyrics[0] ? lyrics[0].text : '';
      pastLineEl.className = 'line past-line line-settled';
      activeLineEl.className = 'line active-line line-settled';
      nextLineEl.className = 'line next-line line-settled';
    }
    return;
  }

  if (activeIdx !== currentLineIdx) {
    const isFirstLoad = currentLineIdx === -1;
    const direction = activeIdx > currentLineIdx ? 'forward' : 'backward';
    const isLargeSeek = Math.abs(activeIdx - currentLineIdx) > 3;
    currentLineIdx = activeIdx;
    currentWordIdx = -1;

    // Past line content
    const pastText = (currentLineIdx > 0 && lyrics[currentLineIdx - 1])
      ? lyrics[currentLineIdx - 1].text || ''
      : '';

    // Active line content
    const line = lyrics[currentLineIdx];
    let activeHtml = '';
    if (line.isInstrumental) {
      activeHtml = `<span class="word active instrumental">♪ Instrumental Interlude ♪</span>`;
    } else if (Array.isArray(line.words) && line.words.length > 0) {
      let html = '';
      line.words.forEach((w, idx) => {
        html += `<span class="word upcoming word-token" id="w-${idx}">${escapeHtml(w.word)}</span> `;
      });
      activeHtml = html;
    } else {
      activeHtml = `<span class="word active word-token">${escapeHtml(line.text)}</span>`;
    }

    // Next line content
    const nextText = (currentLineIdx + 1 < lyrics.length)
      ? lyrics[currentLineIdx + 1].text || ''
      : '';

    if (isFirstLoad || isLargeSeek) {
      wordTransitionController.seekReconcile();
      lineTransitionController.triggerTransition({
        pastEl: pastLineEl,
        activeEl: activeLineEl,
        nextLineEl: nextLineEl,
        pastContent: pastText,
        activeContent: activeHtml,
        nextContent: nextText,
        direction,
        isSeek: true
      });
      pastLineEl.className = 'line past-line line-settled';
      activeLineEl.className = 'line active-line line-settled';
      nextLineEl.className = 'line next-line line-settled';
    } else {
      lineTransitionController.triggerTransition({
        pastEl: pastLineEl,
        activeEl: activeLineEl,
        nextLineEl: nextLineEl,
        pastContent: pastText,
        activeContent: activeHtml,
        nextContent: nextText,
        direction,
        duration: config.lineTransitions?.duration || 450,
        isSeek: false
      });
      motionEngine.triggerTransition({
        pastEl: pastLineEl,
        activeEl: activeLineEl,
        nextLineEl: nextLineEl,
        pastContent: pastText,
        activeContent: activeHtml,
        nextContent: nextText,
        direction,
        visualizationMode: config.visualizationMode || 'ship',
        duration: config.animation?.transitionDuration || 0.28
      });
    }
  }

  const line = lyrics[currentLineIdx];
  if (line && line.words && line.words.length > 0 && !line.isInstrumental) {
    let wordIdx = -1;
    for (let i = line.words.length - 1; i >= 0; i--) {
      if (pos >= line.words[i].time) {
        wordIdx = i;
        break;
      }
    }

    if (wordIdx !== currentWordIdx) {
      currentWordIdx = wordIdx;
      line.words.forEach((_, idx) => {
        const el = document.getElementById(`w-${idx}`);
        if (el) {
          el.className = 'word word-token ' + (idx < wordIdx ? 'sung' : (idx === wordIdx ? 'active' : 'upcoming'));
        }
      });
      wordTransitionController.onWordChange(currentLineIdx, wordIdx, activeLineEl);
    }
  }
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Media Controls Listeners
btnPlayPause?.addEventListener('click', (e) => {
  e.stopPropagation();
  api.sendMediaControl({ action: 'play_pause' });
});

btnNext?.addEventListener('click', (e) => {
  e.stopPropagation();
  api.sendMediaControl({ action: 'next' });
});

btnPrev?.addEventListener('click', (e) => {
  e.stopPropagation();
  api.sendMediaControl({ action: 'prev' });
});

progressContainer?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!lastPlaybackState || !lastPlaybackState.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const targetSec = pct * lastPlaybackState.duration;
  api.sendMediaControl({ action: 'seek', position: targetSec });
});

playerToggleBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  config.miniPlayerCollapsed = !config.miniPlayerCollapsed;
  miniPlayerEl.classList.toggle('collapsed', config.miniPlayerCollapsed);
  api.saveConfig({ miniPlayerCollapsed: config.miniPlayerCollapsed });
});

btnOpenSettings?.addEventListener('click', (e) => {
  e.stopPropagation();
  api.openSettingsWindow();
});

btnFavorite?.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (lastPlaybackState && lastPlaybackState.title) {
    await api.toggleFavorite(lastPlaybackState);
  }
});

btnQuickSearch?.addEventListener('click', (e) => {
  e.stopPropagation();
  api.openSettingsWindow();
});

// Allow right-clicking anywhere on the overlay to open settings since header buttons are hidden
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  api.openSettingsWindow();
});

// Setup IPC Listeners
api.onPlaybackData((data) => {
  updatePlayback(data);
});

api.onApplyConfig((newConfig) => {
  config = { ...config, ...newConfig };
  applyConfig();
});

api.onFavoritesUpdated((favorites) => {
  currentFavorites = favorites || [];
  if (lastPlaybackState) {
    updateFavoriteButton(lastPlaybackState);
  }
});

// Initial boot
async function init() {
  try {
    const state = await api.getInitialState();
    if (state) {
      if (state.config) config = { ...config, ...state.config };
      if (state.favorites) currentFavorites = state.favorites;
      if (state.lastPlayback) updatePlayback(state.lastPlayback);
    }
  } catch (err) {}

  // Query display refresh rate for Auto mode pacing
  try {
    const refreshHz = await api.getDisplayRefreshRate();
    if (refreshHz && scheduler) {
      scheduler.setDisplayRefreshRate(refreshHz);
    }
  } catch (err) {}

  // Pause/resume animation loop on overlay window visibility change (saves GPU/CPU)
  api.onOverlayVisibility((visible) => {
    if (visible) {
      motionEngine.resume();
    } else {
      motionEngine.pause();
    }
  });

  // Pause/resume animation loop on document visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      motionEngine.pause();
    } else {
      motionEngine.resume();
    }
  });

  // Mini player progress smooth interpolation using delta time
  scheduler.register('mini-player-progress', (dt) => {
    if (!lastPlaybackState || lastPlaybackState.state !== 'playing' || !lastPlaybackState.duration) return;
    lastPlaybackState.position += dt;
    if (lastPlaybackState.position > lastPlaybackState.duration) {
      lastPlaybackState.position = lastPlaybackState.duration;
    }
    const pct = Math.min(100, Math.max(0, (lastPlaybackState.position / lastPlaybackState.duration) * 100));
    if (progressFill) progressFill.style.width = pct.toFixed(1) + '%';
    if (timeCurrentEl) timeCurrentEl.textContent = formatTime(lastPlaybackState.position);
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    motionEngine.destroy();
  });

  await loadCustomFontFaceRules();
  applyConfig();
}

async function loadCustomFontFaceRules() {
  if (typeof api !== 'undefined' && typeof api.getFontFaceCss === 'function') {
    try {
      const css = await api.getFontFaceCss();
      if (css) {
        let styleTag = document.getElementById('custom-fonts-style');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'custom-fonts-style';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = css;
      }
    } catch (e) {}
  }
}

init();
