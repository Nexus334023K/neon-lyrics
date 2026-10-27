const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { logger } = require('./logger');

class MetadataService {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || paths.artworkCache;
    this.memoryCache = new Map();
    this.inFlightRequests = new Map();
  }

  cleanQuery(text) {
    if (!text) return '';
    return text
      .replace(/\(.*?(feat|ft|remaster|version|deluxe|live|edit|anniversary).*?\)/gi, '')
      .replace(/\[.*?(feat|ft|remaster|version|deluxe|live|edit|anniversary).*?\]/gi, '')
      .replace(/-.*?(remaster|live|edit|deluxe|anniversary).*$/gi, '')
      .trim();
  }

  getCacheKey(artist, title) {
    const safeArtist = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeTitle = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${safeArtist}___${safeTitle}`;
  }

  getCachedMetadata(artist, title) {
    const key = this.getCacheKey(artist, title);
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    try {
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.memoryCache.set(key, data);
        return data;
      }
    } catch (e) {}
    return null;
  }

  saveCachedMetadata(artist, title, data) {
    const key = this.getCacheKey(artist, title);
    this.memoryCache.set(key, data);
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify(data), 'utf8');
    } catch (e) {}
  }

  async fetchTrackMetadata(artist, title) {
    if (!title) return null;
    const cached = this.getCachedMetadata(artist, title);
    if (cached) return cached;

    const key = this.getCacheKey(artist, title);
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
    }

    const promise = (async () => {
      try {
        const cleanTitle = this.cleanQuery(title);
        const term = encodeURIComponent(`${artist} ${cleanTitle}`.trim());
        const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'NeonLyrics-App/3.0' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`iTunes API returned status ${res.status}`);
        }

        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          let artworkUrl = item.artworkUrl100 || '';
          if (artworkUrl) {
            artworkUrl = artworkUrl.replace('100x100bb', '600x600bb');
          }

          const result = {
            title: item.trackName || title,
            artist: item.artistName || artist,
            album: item.collectionName || '',
            artwork: artworkUrl,
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 0,
            genre: item.primaryGenreName || '',
            releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
            source: 'itunes'
          };

          this.saveCachedMetadata(artist, title, result);
          return result;
        }
      } catch (err) {
        logger.debug(`Metadata fetch failed for ${artist} - ${title}: ${err.message}`);
      }

      const fallback = {
        title: title,
        artist: artist || '',
        album: '',
        artwork: '',
        duration: 0,
        source: 'none'
      };
      this.saveCachedMetadata(artist, title, fallback);
      return fallback;
    })();

    this.inFlightRequests.set(key, promise);
    try {
      const res = await promise;
      return res;
    } finally {
      this.inFlightRequests.delete(key);
    }
  }

  async searchLyricsAlternatives(artist, title) {
    if (!title) return [];
    try {
      const cleanTitle = this.cleanQuery(title);
      const query = encodeURIComponent(`${artist} ${cleanTitle}`.trim());
      const url = `https://lrclib.net/api/search?q=${query}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NeonLyrics-App/3.0' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const results = await res.json();
      if (!Array.isArray(results)) return [];

      return results.map(item => ({
        id: item.id,
        trackName: item.trackName || '',
        artistName: item.artistName || '',
        albumName: item.albumName || '',
        duration: item.duration || 0,
        hasSynced: Boolean(item.syncedLyrics),
        hasPlain: Boolean(item.plainLyrics),
        syncedLyrics: item.syncedLyrics || '',
        plainLyrics: item.plainLyrics || ''
      }));
    } catch (err) {
      logger.warn(`Search lyrics alternatives error: ${err.message}`);
      return [];
    }
  }

  async fetchLyricsById(lrclibId) {
    if (!lrclibId) return null;
    try {
      const url = `https://lrclib.net/api/get/${encodeURIComponent(lrclibId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NeonLyrics-App/3.0' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      logger.warn(`Fetch lyrics by ID error: ${err.message}`);
      return null;
    }
  }
}

const metadataService = new MetadataService();

module.exports = {
  MetadataService,
  metadataService
};
