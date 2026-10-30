/**
 * NeonLyrics - InsightsStorage
 * Local persistence manager for verified listening time, track sessions, and streaks.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_INSIGHTS_DATA = {
  version: 1,
  totalSecondsListened: 0,
  dailyStats: {},   // 'YYYY-MM-DD': { seconds: 0, plays: 0 }
  songStats: {},    // 'artist - title': { artist, title, plays: 0, seconds: 0, lastPlayed: '' }
  artistStats: {},  // 'artist': { plays: 0, seconds: 0 }
  sessions: []      // Recent sessions list (capped at 200)
};

class InsightsStorage {
  constructor(options = {}) {
    this.filePath = options.filePath || null;
    this.data = { ...DEFAULT_INSIGHTS_DATA };
    this.load();
  }

  load() {
    if (!this.filePath) {
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('neon_music_insights');
          if (raw) this.data = JSON.parse(raw);
        } catch (e) {}
      }
      return this.data;
    }

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = {
            ...DEFAULT_INSIGHTS_DATA,
            ...parsed,
            dailyStats: parsed.dailyStats || {},
            songStats: parsed.songStats || {},
            artistStats: parsed.artistStats || {},
            sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
          };
          return this.data;
        }
      }
    } catch (err) {
      console.warn('[InsightsStorage] Error reading insights file, using defaults:', err.message);
    }
    this.data = { ...DEFAULT_INSIGHTS_DATA };
    return this.data;
  }

  save() {
    if (!this.filePath) {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('neon_music_insights', JSON.stringify(this.data));
        } catch (e) {}
      }
      return true;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
      return true;
    } catch (err) {
      console.warn('[InsightsStorage] Error writing insights file:', err.message);
      return false;
    }
  }

  recordListening(track, secondsListened = 1.0, timestamp = new Date()) {
    if (!track || !track.title || secondsListened <= 0) return;

    const artist = track.artist || 'Unknown Artist';
    const title = track.title;
    const trackKey = `${artist} - ${title}`.trim().toLowerCase();
    const dateKey = timestamp.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // 1. Total seconds
    this.data.totalSecondsListened = Math.round((this.data.totalSecondsListened + secondsListened) * 10) / 10;

    // 2. Daily stats
    if (!this.data.dailyStats[dateKey]) {
      this.data.dailyStats[dateKey] = { seconds: 0, plays: 0 };
    }
    this.data.dailyStats[dateKey].seconds = Math.round((this.data.dailyStats[dateKey].seconds + secondsListened) * 10) / 10;

    // 3. Song stats
    if (!this.data.songStats[trackKey]) {
      this.data.songStats[trackKey] = {
        artist,
        title,
        plays: 0,
        seconds: 0,
        lastPlayed: timestamp.toISOString()
      };
    }
    this.data.songStats[trackKey].seconds = Math.round((this.data.songStats[trackKey].seconds + secondsListened) * 10) / 10;
    this.data.songStats[trackKey].lastPlayed = timestamp.toISOString();

    // 4. Artist stats
    const artistKey = artist.trim().toLowerCase();
    if (!this.data.artistStats[artistKey]) {
      this.data.artistStats[artistKey] = {
        artist,
        plays: 0,
        seconds: 0
      };
    }
    this.data.artistStats[artistKey].seconds = Math.round((this.data.artistStats[artistKey].seconds + secondsListened) * 10) / 10;

    this.save();
  }

  recordTrackCompletion(track, timestamp = new Date()) {
    if (!track || !track.title) return;

    const artist = track.artist || 'Unknown Artist';
    const title = track.title;
    const trackKey = `${artist} - ${title}`.trim().toLowerCase();
    const dateKey = timestamp.toISOString().slice(0, 10);
    const artistKey = artist.trim().toLowerCase();

    // Increment play counts
    if (this.data.dailyStats[dateKey]) {
      this.data.dailyStats[dateKey].plays++;
    } else {
      this.data.dailyStats[dateKey] = { seconds: 0, plays: 1 };
    }

    if (this.data.songStats[trackKey]) {
      this.data.songStats[trackKey].plays++;
    }

    if (this.data.artistStats[artistKey]) {
      this.data.artistStats[artistKey].plays++;
    }

    // Add to recent sessions
    this.data.sessions.unshift({
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      trackKey,
      artist,
      title,
      timestamp: timestamp.toISOString()
    });

    if (this.data.sessions.length > 200) {
      this.data.sessions.length = 200;
    }

    this.save();
  }

  getData() {
    return this.data;
  }

  clear() {
    this.data = { ...DEFAULT_INSIGHTS_DATA };
    this.save();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InsightsStorage,
    DEFAULT_INSIGHTS_DATA
  };
}
if (typeof window !== 'undefined') {
  window.InsightsStorage = InsightsStorage;
}

