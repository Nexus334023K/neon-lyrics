const { ipcRenderer } = require('electron');

let currentTrackId = '';
let lyrics = [];
let currentLineIdx = -1;
let currentWordIdx = -1;
let lastPlaybackState = null;

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

// Mini Player Elements
const miniPlayerEl = document.getElementById('mini-player');
const playerToggleBtn = document.getElementById('player-toggle-btn');
const playerTitleEl = document.getElementById('player-title');
const playerArtistEl = document.getElementById('player-artist');
const btnPrev = document.getElementById('btn-prev');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnNext = document.getElementById('btn-next');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const timeCurrentEl = document.getElementById('time-current');
const timeTotalEl = document.getElementById('time-total');

function loadConfig() {
  try {
    const saved = localStorage.getItem('neon_lyrics_config');
    if (saved) config = { ...config, ...JSON.parse(saved) };
  } catch (e) {}
  applyConfig();
}

function saveConfig() {
  try {
    localStorage.setItem('neon_lyrics_config', JSON.stringify(config));
    ipcRenderer.send('config-updated', config);
  } catch (e) {}
}

function applyConfig() {
  // Theme & Colors
  if (config.isCustomColor) {
    document.body.className = `mode-${config.lineMode || 2}`;
    document.documentElement.style.setProperty('--glow-primary', config.primaryColor);
    document.documentElement.style.setProperty('--glow-secondary', config.secondaryColor);
    document.documentElement.style.setProperty('--word-active', config.activeWordColor);
    document.documentElement.style.setProperty('--word-sung', config.sungWordColor);
  } else {
    document.body.className = `${config.theme} mode-${config.lineMode || 2}`;
    document.documentElement.style.removeProperty('--glow-primary');
    document.documentElement.style.removeProperty('--glow-secondary');
    document.documentElement.style.removeProperty('--word-active');
    document.documentElement.style.removeProperty('--word-sung');
  }

  if (lastPlaybackState && lastPlaybackState.state === 'playing') {
    document.body.classList.add('is-playing');
  }

  // Typography & Scaling
  document.documentElement.style.setProperty('--font-scale', config.fontScale);
  document.documentElement.style.setProperty('--glow-intensity', config.glowIntensity);
  document.documentElement.style.setProperty('--font-family', config.fontFamily || "'Outfit', sans-serif");

  // Backdrop
  document.documentElement.style.setProperty('--backdrop-opacity', config.backdropOpacity ?? 0.0);
  document.documentElement.style.setProperty('--backdrop-blur', (config.backdropBlur ?? 16) + 'px');

  // Alignment
  stageEl.className = 'stage align-' + (config.textAlign || 'center');

  // Mini Player State
  miniPlayerEl.classList.toggle('hidden', !config.showMiniPlayer);
  miniPlayerEl.classList.toggle('collapsed', Boolean(config.miniPlayerCollapsed));
}

ipcRenderer.on('apply-config', (event, newConfig) => {
  config = { ...config, ...newConfig };
  try {
    localStorage.setItem('neon_lyrics_config', JSON.stringify(config));
  } catch (e) {}
  applyConfig();
});

ipcRenderer.on('playback-data', (event, data) => {
  lastPlaybackState = data;
  updatePlayback(data);
});

function updatePlayback(data) {
  const isPlaying = data.title && (data.state === 'playing' || data.state === 'paused');
  const trackId = `${data.artist} - ${data.title}`;

  // Update Mini Player metadata
  if (data.title) {
    playerTitleEl.textContent = data.title;
    playerArtistEl.textContent = data.artist || 'Unknown Artist';
  } else {
    playerTitleEl.textContent = 'Waiting for music...';
    playerArtistEl.textContent = 'Spotify / Windows Media';
  }

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
      }
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

    // Past line (for 3-line mode)
    if (currentLineIdx > 0 && lyrics[currentLineIdx - 1]) {
      pastLineEl.textContent = lyrics[currentLineIdx - 1].text || '';
    } else {
      pastLineEl.textContent = '';
    }

    // Active line
    const line = lyrics[currentLineIdx];
    let html = '';
    line.words.forEach((w, idx) => {
      html += `<span class="word upcoming" id="w-${idx}">${escapeHtml(w.word)}</span>`;
    });
    activeLineEl.innerHTML = html;

    // Next line
    if (currentLineIdx + 1 < lyrics.length) {
      nextLineEl.textContent = lyrics[currentLineIdx + 1].text || '';
    } else {
      nextLineEl.textContent = '';
    }
  }

  const line = lyrics[currentLineIdx];
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

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Media Controls Event Listeners
btnPlayPause.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('media-control', { action: 'play_pause' });
});

btnNext.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('media-control', { action: 'next' });
});

btnPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  ipcRenderer.send('media-control', { action: 'prev' });
});

// Scrubbable Progress Bar
progressContainer.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!lastPlaybackState || !lastPlaybackState.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const targetSec = pct * lastPlaybackState.duration;
  ipcRenderer.send('media-control', { action: 'seek', position: targetSec });
});

// Toggle Player Collapse (Hide / Unhide bar)
playerToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  config.miniPlayerCollapsed = !config.miniPlayerCollapsed;
  miniPlayerEl.classList.toggle('collapsed', config.miniPlayerCollapsed);
  saveConfig();
});

loadConfig();
