/**
 * NeonLyrics v3 - Renderer Process
 * Connects securely to the main process via window.neonLyricsApi.
 */

const api = window.neonLyricsApi || {
  onPlaybackData: () => () => {},
  onApplyConfig: () => () => {},
  onFavoritesUpdated: () => () => {},
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

let config = {
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
  autoStart: true
};

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
  if (config.isCustomColor) {
    document.body.className = `mode-${config.lineMode || 2}`;
    document.documentElement.style.setProperty('--glow-primary', config.primaryColor);
    document.documentElement.style.setProperty('--glow-secondary', config.secondaryColor);
    document.documentElement.style.setProperty('--word-active', config.activeWordColor);
    document.documentElement.style.setProperty('--word-sung', config.sungWordColor);
  } else {
    document.body.className = `${config.theme || 'theme-cyber'} mode-${config.lineMode || 2}`;
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
  document.documentElement.style.setProperty('--font-family', config.fontFamily || "'Outfit', sans-serif");

  document.documentElement.style.setProperty('--backdrop-opacity', config.backdropOpacity ?? 0.0);
  document.documentElement.style.setProperty('--backdrop-blur', (config.backdropBlur ?? 16) + 'px');

  if (stageEl) {
    stageEl.className = 'stage align-' + (config.textAlign || 'center');
  }

  if (miniPlayerEl) {
    miniPlayerEl.classList.toggle('hidden', !config.showMiniPlayer);
    miniPlayerEl.classList.toggle('collapsed', Boolean(config.miniPlayerCollapsed));
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

  // Artwork
  if (data.artwork) {
    playerArtEl.src = data.artwork;
    playerArtEl.style.display = 'block';
    playerArtPlaceholder.style.display = 'none';
  } else {
    playerArtEl.style.display = 'none';
    playerArtPlaceholder.style.display = 'flex';
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
    }
    return;
  }

  if (activeIdx !== currentLineIdx) {
    currentLineIdx = activeIdx;
    currentWordIdx = -1;

    // Past line
    if (currentLineIdx > 0 && lyrics[currentLineIdx - 1]) {
      pastLineEl.textContent = lyrics[currentLineIdx - 1].text || '';
    } else {
      pastLineEl.textContent = '';
    }

    // Active line
    const line = lyrics[currentLineIdx];
    if (line.isInstrumental) {
      activeLineEl.innerHTML = `<span class="word active instrumental">♪ Instrumental Interlude ♪</span>`;
    } else if (Array.isArray(line.words) && line.words.length > 0) {
      let html = '';
      line.words.forEach((w, idx) => {
        html += `<span class="word upcoming" id="w-${idx}">${escapeHtml(w.word)}</span> `;
      });
      activeLineEl.innerHTML = html;
    } else {
      activeLineEl.innerHTML = `<span class="word active">${escapeHtml(line.text)}</span>`;
    }

    // Next line
    if (currentLineIdx + 1 < lyrics.length) {
      nextLineEl.textContent = lyrics[currentLineIdx + 1].text || '';
    } else {
      nextLineEl.textContent = '';
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
          el.className = 'word ' + (idx < wordIdx ? 'sung' : (idx === wordIdx ? 'active' : 'upcoming'));
        }
      });
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
  applyConfig();
}

init();
