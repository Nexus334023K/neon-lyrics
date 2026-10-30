/**
 * NeonLyrics - LocalHeuristicsProvider
 * Zero-latency offline music intelligence engine.
 * Classifies mood into 8 standard categories, estimates energy, computes lyric sentiment,
 * and generates matching visual preset recommendations.
 */

const MOOD_CATEGORIES = [
  'happy',
  'sad',
  'romantic',
  'calm',
  'energetic',
  'dreamy',
  'aggressive',
  'melancholic'
];

const MOOD_LEXICON = {
  happy: ['happy', 'joy', 'smile', 'dance', 'celebrate', 'light', 'shine', 'sun', 'bright', 'good', 'fun', 'paradise', 'cheer', 'lucky', 'laugh'],
  sad: ['cry', 'tears', 'sorrow', 'weep', 'alone', 'goodbye', 'pain', 'hurts', 'broken', 'grief', 'lonely', 'mourn', 'dying', 'bleed'],
  romantic: ['love', 'kiss', 'heart', 'forever', 'baby', 'darling', 'touch', 'hold', 'sweet', 'romance', 'tender', 'embrace', 'honey', 'passion'],
  calm: ['soft', 'slow', 'peaceful', 'quiet', 'breath', 'ocean', 'gentle', 'rain', 'sleep', 'relax', 'still', 'meditate', 'breeze', 'calm'],
  energetic: ['party', 'jump', 'fire', 'beat', 'power', 'run', 'loud', 'high', 'electro', 'bass', 'crazy', 'shake', 'wild', 'ignite', 'electric'],
  dreamy: ['clouds', 'stars', 'sky', 'float', 'dream', 'universe', 'space', 'galaxy', 'echo', 'astral', 'orbit', 'mystic', 'wonder', 'magic'],
  aggressive: ['fight', 'burn', 'blood', 'rage', 'destroy', 'hate', 'war', 'blast', 'break', 'roar', 'fury', 'enemy', 'smash', 'crush', 'scream'],
  melancholic: ['memories', 'shadows', 'dark', 'lost', 'yesterday', 'fade', 'cold', 'ghost', 'hollow', 'autumn', 'distance', 'regret', 'whisper']
};

const MOOD_RECOMMENDATIONS = {
  happy: { visualMode: 'fisheye-visual', glowPreset: 'aurora', theme: 'theme-aurora-green' },
  sad: { visualMode: 'clean', glowPreset: 'minimal-glow', theme: 'theme-diamond-white' },
  romantic: { visualMode: 'ship', glowPreset: 'deep-pink', theme: 'theme-neon-pink' },
  calm: { visualMode: 'clean', glowPreset: 'soft-neon', theme: 'theme-cyber' },
  energetic: { visualMode: 'fisheye', glowPreset: 'cyberpunk', theme: 'theme-cyber-volt' },
  dreamy: { visualMode: 'ship', glowPreset: 'electric-blue', theme: 'theme-electric-purple' },
  aggressive: { visualMode: 'fisheye', glowPreset: 'ultra-bloom', theme: 'theme-crimson-red' },
  melancholic: { visualMode: 'ship', glowPreset: 'cinematic-glow', theme: 'theme-sunset-amber' }
};

class LocalHeuristicsProvider {
  constructor() {}

  /**
   * Analyzes track metadata and lyric text.
   * Returns: { mood, confidence, energy, sentiment, scores, recommendation }
   */
  analyze(trackMetadata = {}, lyricsText = '') {
    const textCorpus = `${trackMetadata.title || ''} ${trackMetadata.artist || ''} ${trackMetadata.album || ''} ${lyricsText}`.toLowerCase();
    const words = textCorpus.match(/[a-z']+/g) || [];

    const scores = {};
    for (const mood of MOOD_CATEGORIES) {
      scores[mood] = 0;
    }

    for (const word of words) {
      for (const mood of MOOD_CATEGORIES) {
        if (MOOD_LEXICON[mood].includes(word)) {
          scores[mood]++;
        }
      }
    }

    // Determine top mood
    let dominantMood = 'calm';
    let maxScore = 0;
    let totalScore = 0;

    for (const mood of MOOD_CATEGORIES) {
      totalScore += scores[mood];
      if (scores[mood] > maxScore) {
        maxScore = scores[mood];
        dominantMood = mood;
      }
    }

    // Fallback based on track energy or title if no keywords matched
    if (maxScore === 0) {
      dominantMood = 'dreamy';
    }

    const confidence = totalScore > 0 ? Math.min(1.0, Math.round((maxScore / totalScore) * 100) / 100) : 0.5;

    // Energy calculation: high if energetic or aggressive, low if calm or sad
    const highEnergy = (scores.energetic + scores.aggressive + scores.happy);
    const lowEnergy = (scores.calm + scores.sad + scores.melancholic);
    const energy = Math.min(1.0, Math.max(0.1, 0.5 + (highEnergy - lowEnergy) * 0.08));

    // Sentiment calculation: [-1.0, 1.0]
    const positive = (scores.happy + scores.romantic * 0.8);
    const negative = (scores.sad + scores.aggressive * 0.8 + scores.melancholic * 0.5);
    const sentiment = Math.min(1.0, Math.max(-1.0, (positive - negative) / Math.max(1, positive + negative)));

    const recommendation = MOOD_RECOMMENDATIONS[dominantMood] || MOOD_RECOMMENDATIONS.dreamy;

    return {
      mood: dominantMood,
      confidence,
      energy: Math.round(energy * 100) / 100,
      sentiment: Math.round(sentiment * 100) / 100,
      scores,
      recommendation
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LocalHeuristicsProvider,
    MOOD_CATEGORIES,
    MOOD_RECOMMENDATIONS
  };
}
if (typeof window !== 'undefined') {
  window.LocalHeuristicsProvider = LocalHeuristicsProvider;
  window.MOOD_CATEGORIES = MOOD_CATEGORIES;
  window.MOOD_RECOMMENDATIONS = MOOD_RECOMMENDATIONS;
}

