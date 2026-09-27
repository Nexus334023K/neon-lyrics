const { ipcRenderer } = require('electron');

let currentTrackId = '';
let lyrics = [];
let currentLineIdx = -1;
let currentWordIdx = -1;

let config = {
  theme: 'theme-cyber',
  isCustomColor: false,
  primaryColor: '#00f2fe',
  secondaryColor: '#4facfe',
  activeWordColor: '#ffffff',
  sungWordColor: '#ffffff',
  glowIntensity: 1.0,
  fontScale: 1.0,
  alwaysOnTop: false,
  autoStart: true
};

const activeLineEl = document.getElementById('active-line');
const nextLineEl = document.getElementById('next-line');

function loadConfig() {
  try {
    const saved = localStorage.getItem('neon_lyrics_config');
    if (saved) config = { ...config, ...JSON.parse(saved) };
  } catch (e) {}
  applyConfig();
}

function applyConfig() {
  if (config.isCustomColor) {
    document.body.className = '';
    document.documentElement.style.setProperty('--glow-primary', config.primaryColor);
    document.documentElement.style.setProperty('--glow-secondary', config.secondaryColor);
    document.documentElement.style.setProperty('--word-active', config.activeWordColor);
    document.documentElement.style.setProperty('--word-sung', config.sungWordColor);
  } else {
    document.body.className = config.theme;
    document.documentElement.style.removeProperty('--glow-primary');
    document.documentElement.style.removeProperty('--glow-secondary');
    document.documentElement.style.removeProperty('--word-active');
    document.documentElement.style.removeProperty('--word-sung');
  }

  document.documentElement.style.setProperty('--font-scale', config.fontScale);
  document.documentElement.style.setProperty('--glow-intensity', config.glowIntensity);
}

ipcRenderer.on('apply-config', (event, newConfig) => {
  config = { ...config, ...newConfig };
  try {
    localStorage.setItem('neon_lyrics_config', JSON.stringify(config));
  } catch (e) {}
  applyConfig();
});

ipcRenderer.on('playback-data', (event, data) => {
  updatePlayback(data);
});

function updatePlayback(data) {
  const isPlaying = data.title && (data.state === 'playing' || data.state === 'paused');
  const trackId = `${data.artist} - ${data.title}`;

  if (isPlaying) {
    if (trackId !== currentTrackId) {
      currentTrackId = trackId;
      currentLineIdx = -1;
      currentWordIdx = -1;
      lyrics = data.lyrics || [];

      if (lyrics.length === 0) {
        activeLineEl.innerHTML = `<span class="word active">${escapeHtml(data.title)}</span>`;
        nextLineEl.textContent = data.artist || "";
      }
    }

    if (lyrics.length > 0) {
      syncLyrics(data.position);
    }
  } else {
    if (currentTrackId !== "") {
      currentTrackId = "";
      lyrics = [];
      currentLineIdx = -1;
      currentWordIdx = -1;
      activeLineEl.innerHTML = "";
      nextLineEl.textContent = "";
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
      activeLineEl.innerHTML = `<span class="word upcoming">...</span>`;
      nextLineEl.textContent = lyrics[0] ? lyrics[0].text : "";
    }
    return;
  }

  if (activeIdx !== currentLineIdx) {
    currentLineIdx = activeIdx;
    currentWordIdx = -1;

    const line = lyrics[currentLineIdx];
    let html = '';
    line.words.forEach((w, idx) => {
      html += `<span class="word upcoming" id="w-${idx}">${escapeHtml(w.word)}</span>`;
    });
    activeLineEl.innerHTML = html;

    if (currentLineIdx + 1 < lyrics.length) {
      nextLineEl.textContent = lyrics[currentLineIdx + 1].text;
    } else {
      nextLineEl.textContent = "";
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

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadConfig();
