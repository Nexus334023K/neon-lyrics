/**
 * NeonLyrics - AIIntelligenceService
 * High-level AI intelligence orchestrator supporting local heuristics and optional cloud adapters.
 * Guarantees zero-block asynchronous execution, result caching, and safe fallbacks.
 */

const { LocalHeuristicsProvider, MOOD_CATEGORIES, MOOD_RECOMMENDATIONS } = (typeof module !== 'undefined' && module.exports)
  ? require('./LocalHeuristicsProvider')
  : {
      LocalHeuristicsProvider: window.LocalHeuristicsProvider,
      MOOD_CATEGORIES: window.MOOD_CATEGORIES,
      MOOD_RECOMMENDATIONS: window.MOOD_RECOMMENDATIONS
    };

class AIIntelligenceService {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.provider = options.provider || 'local'; // 'local' | 'custom'
    this.apiEndpoint = options.apiEndpoint || '';
    this.apiKey = options.apiKey || '';
    this.autoMoodPresets = options.autoMoodPresets !== false;

    this.localProvider = new LocalHeuristicsProvider();
    this.cache = new Map();
    this._listeners = new Set();
  }

  applyConfig(config = {}) {
    if (config.enabled !== undefined) this.enabled = Boolean(config.enabled);
    if (config.provider) this.provider = config.provider;
    if (config.apiEndpoint !== undefined) this.apiEndpoint = config.apiEndpoint;
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.autoMoodPresets !== undefined) this.autoMoodPresets = Boolean(config.autoMoodPresets);
  }

  async analyzeTrack(trackMetadata = {}, lyricsText = '') {
    if (!this.enabled) return null;

    const trackKey = `${trackMetadata.artist || ''} - ${trackMetadata.title || ''}`.trim().toLowerCase();
    if (!trackKey || trackKey === '-') return null;

    // Return cached result if available
    if (this.cache.has(trackKey)) {
      return this.cache.get(trackKey);
    }

    let result = null;

    // Attempt cloud provider if configured and credentials exist
    if (this.provider === 'custom' && this.apiEndpoint && this.apiKey) {
      result = await this._callCloudProvider(trackMetadata, lyricsText);
    }

    // Default or fallback to offline local heuristics
    if (!result) {
      result = this.localProvider.analyze(trackMetadata, lyricsText);
    }

    result.trackKey = trackKey;
    result.timestamp = Date.now();

    this.cache.set(trackKey, result);
    this._emitAnalysis(result);

    return result;
  }

  async _callCloudProvider(trackMetadata, lyricsText) {
    try {
      const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          title: trackMetadata.title || '',
          artist: trackMetadata.artist || '',
          lyrics: (lyricsText || '').slice(0, 1000)
        }),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json();
        if (data && MOOD_CATEGORIES.includes(data.mood)) {
          return {
            mood: data.mood,
            confidence: data.confidence || 0.85,
            energy: typeof data.energy === 'number' ? data.energy : 0.6,
            sentiment: typeof data.sentiment === 'number' ? data.sentiment : 0.0,
            scores: data.scores || {},
            recommendation: MOOD_RECOMMENDATIONS[data.mood] || MOOD_RECOMMENDATIONS.dreamy,
            source: 'cloud'
          };
        }
      }
    } catch (err) {
      console.warn('[AIIntelligenceService] Cloud provider request failed, falling back to local heuristics:', err.message);
    }
    return null;
  }

  onAnalysisComplete(cb) {
    if (typeof cb === 'function') {
      this._listeners.add(cb);
      return () => this._listeners.delete(cb);
    }
    return () => {};
  }

  _emitAnalysis(result) {
    for (const cb of this._listeners) {
      try { cb(result); } catch (e) {}
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AIIntelligenceService,
    LocalHeuristicsProvider,
    MOOD_CATEGORIES,
    MOOD_RECOMMENDATIONS
  };
}
if (typeof window !== 'undefined') {
  window.AIIntelligenceService = AIIntelligenceService;
  window.LocalHeuristicsProvider = LocalHeuristicsProvider;
}

