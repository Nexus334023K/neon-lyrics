# ✨ NeonLyrics v3

> A high-performance, borderless, transparent desktop karaoke lyrics overlay for Windows featuring Beautiful Lyrics-style syllable-by-syllable neon glow animations, rich music metadata, album artwork, and offline lyric intelligence.

![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue)
![Electron](https://img.shields.io/badge/Framework-Electron%2033-47848F?logo=electron&logoColor=white)
![Python](https://img.shields.io/badge/Backend-Python%203.12-3776AB?logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node-v20%2B-339933?logo=node.js&logoColor=white)
![Security](https://img.shields.io/badge/Security-ContextIsolated-success)
![License](https://img.shields.io/badge/License-MIT-green)

---

<p align="center">
  <a href="https://www.youtube.com/watch?v=MGOycckngbM" target="_blank">
    <img src="https://img.youtube.com/vi/MGOycckngbM/maxresdefault.jpg" alt="NeonLyrics Demo on YouTube" width="850" style="border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.6);">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=MGOycckngbM">▶️ <b>Watch the Demo on YouTube</b></a>
</p>

---

## 🌟 Key Features in v3.0

- **👻 Zero-Chrome Floating Lyrics**: Frameless and 100% transparent overlay that floats seamlessly above your wallpaper, games, and active applications.
- **🎤 Advanced Word-by-Word Karaoke Engine**:
  - Distinguishes authentic word timestamps (`<mm:ss.xx>`) from line-level timestamps without fabricating false precision.
  - Syllable-by-syllable neon glow alongside upcoming line previews.
  - Graceful handling of instrumental solos (`♪ Instrumental Interlude ♪`) and un-synced text.
  - Multi-timestamp line support (`[00:10.00][00:20.00]`) and metadata tag parsing (`[offset:+500]`).
- **🎛️ Interactive Glassmorphic Mini-Player**:
  - Live album artwork resolved via iTunes Search API with local disk caching.
  - Real-time scrubbable progress bar, track title, artist, and media controls.
  - Quick favorite button directly on the overlay.
  - Collapsible design with smooth sliding transitions.
- **🔍 Manual Lyric Search & Alternative Picker**:
  - Search alternative lyric versions directly from LRCLIB.
  - Preview plain vs. synced timestamps and apply preferred versions with one click.
  - Import external `.lrc` files or export current lyrics for offline use.
- **⭐ Playback History & Favorites System**:
  - Persistent favorite tracks manager.
  - Automatic playback history tracking with timestamps and album covers.
  - Safe, schema-versioned local JSON storage with automated corruption recovery.
- **🤖 Lyric Insights & Sentiment Intelligence**:
  - **100% Offline Local Analysis**: Instant detection of emotional mood, vocabulary richness, top themes (romance, nightlife, melancholy, triumph), and repeated song hooks.
  - **Optional External AI Provider**: Strict user opt-in support for OpenAI/Gemini-compatible endpoints with privacy warnings.
- **🔒 Hardened Electron Security**:
  - `contextIsolation: true` and `nodeIntegration: false`.
  - Secure `preload.js` with narrow allowlisted IPC bridge.
  - Strict payload validation, HTML sanitization, and URL protocol verification.
- **⚡ Windows GSMTC Bridge**:
  - High-performance media session listener tracking **Spotify Desktop, Chrome, Edge, Brave, YouTube, iTunes**, and Windows Media Player out of the box with zero logins.
  - Adaptive polling (100ms during playback, 600ms when idle) to minimize CPU usage.
  - Exponential backoff worker restart logic and clean shutdown.

---

## ⌨️ Global Hotkeys Cheatsheet

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> | Toggle Show / Hide Floating Lyrics Overlay |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>O</kbd> | Toggle Ghost Mode (Click-Through Pass-Through) |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Space</kbd> | Play / Pause Active Media Session |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>→</kbd> | Skip to Next Track |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>←</kbd> | Skip to Previous Track |

---

## 💾 Download Pre-built Windows Release

Download the standalone Windows NSIS installer from [GitHub Releases](https://github.com/Nexus334023K/neon-lyrics/releases/tag/v2.0.0):
- **`NeonLyrics Setup.exe`**
- Installs to Windows with Desktop and Start Menu shortcuts.
- Bundles the standalone media backend so it works out of the box on any Windows PC without installing Node.js or Python.

---

## 🛠️ Development & Building from Source

### Prerequisites
1. **Node.js** (v18 or higher; v20+ recommended)
2. **Python** (v3.10 or higher) with `winsdk` and `pyinstaller` installed:
   ```powershell
   pip install winsdk pyinstaller
   ```
3. Windows 10 or 11 (build 1809+ for GSMTC API support).

### Installation & Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nexus334023K/neon-lyrics.git
   cd neon-lyrics
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Run automated unit tests:**
   ```bash
   npm test
   ```

4. **Launch development mode:**
   ```bash
   npm start
   ```

### Packaging the Windows Installer
To build the standalone installer with the bundled Python worker:
```bash
npm run build
```
*(Executes `build:py` via PyInstaller, then compiles the Windows NSIS installer via `electron-builder` into `release/`)*

---

## 🔧 Architecture & Data Storage

All user configurations, caches, and logs are portably stored in your Windows AppData directory (`%APPDATA%/NeonLyrics`):
- `config.json`: Overlay coordinates, display mode, themes, custom colors, and hotkey states.
- `favorites.json`: Saved favorite tracks with metadata and artwork URLs.
- `history.json`: Recent playback history.
- `lyrics_cache/`: Cached `.lrc` files to avoid redundant network queries.
- `artwork_cache/`: High-resolution album artwork JSON and image assets.
- `logs/main.log`: Rotating application diagnostic log (capped at 2MB).

---

## 🎧 Spotify & Media Player Setup

1. **Native Windows Media Session (Default)**:
   - Make sure **"Show desktop overlay when using media keys"** or media reporting is enabled in your media player.
   - For Spotify Desktop: Open **Settings** → Enable **"Show desktop overlay when using media keys"**.
   - For Chrome / Edge: Enabled by default via the Media Session API.
2. **Spotify Web API (Optional)**:
   - For direct playlist or enhanced catalog queries, navigate to **Customization Studio** → **Spotify & Source** tab and enter your Spotify Developer Client ID.

---

## ❓ Troubleshooting

- **Lyrics aren't appearing for a song:**
  - Verify that your player is actively sending metadata to the Windows volume popup.
  - If a song has an unusual title (e.g. remaster suffixes), open **Customization Studio** → **Lyrics & Sync** tab and use **Manual Lyrics Search** to pick an alternate version.
- **Clicks are passing through the overlay and I cannot drag it:**
  - Ghost Mode is active! Press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>O</kbd> to toggle Ghost Mode off, or right-click the NeonLyrics icon in your Windows System Tray to uncheck it.
- **App window is off-screen after unplugging an external monitor:**
  - NeonLyrics automatically clamps coordinates to your primary display work area on launch. Restarting the app restores it to a visible screen area.

---

## 📄 License

MIT License © 2026 [Nexus334023K](https://github.com/Nexus334023K)
