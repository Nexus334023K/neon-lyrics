/**
 * Lyric Analysis & Insights Engine
 * Provides 100% offline local heuristic analysis (sentiment, theme, vocabulary, repetitions)
 * and optional user-opt-in external AI provider integration.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', "can't", 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few',
  'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its',
  'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'yeah', 'oh', 'ooh', 'la', 'na'
]);

const THEME_CLUSTERS = {
  'Romance & Love': ['love', 'baby', 'heart', 'kiss', 'hold', 'touch', 'darling', 'together', 'eyes', 'beautiful', 'forever'],
  'Heartbreak & Loss': ['cry', 'tears', 'alone', 'lonely', 'break', 'broken', 'hurt', 'pain', 'goodbye', 'miss', 'bleed', 'lost'],
  'Nightlife & Celebration': ['party', 'club', 'drink', 'dance', 'lights', 'night', 'music', 'dj', 'bass', 'crazy', 'champagne'],
  'Motivation & Triumph': ['fight', 'win', 'rise', 'strong', 'power', 'champion', 'fire', 'dream', 'sky', 'fly', 'higher', 'alive'],
  'Introspection & Melancholy': ['mind', 'shadow', 'dark', 'fear', 'silence', 'cold', 'rain', 'ghost', 'memory', 'fade', 'sleep'],
  'Summer & Sunshine': ['sun', 'summer', 'beach', 'ocean', 'breeze', 'warm', 'golden', 'shine', 'wave']
};

const POSITIVE_WORDS = new Set(['good', 'great', 'love', 'happy', 'bright', 'shine', 'joy', 'smile', 'beautiful', 'blessed', 'alive', 'magic', 'dream', 'free']);
const NEGATIVE_WORDS = new Set(['bad', 'sad', 'hate', 'pain', 'cry', 'tears', 'hurt', 'dark', 'alone', 'broken', 'die', 'cold', 'bleed', 'fear', 'lost']);

function analyzeLyricsLocally(lyricsText) {
  if (!lyricsText || typeof lyricsText !== 'string') {
    return {
      wordCount: 0,
      uniqueWords: 0,
      lexicalDiversity: 0,
      sentiment: { label: 'Neutral', score: 0 },
      topThemes: [],
      topWords: [],
      repeatedPhrases: [],
      generated: false
    };
  }

  // Strip timestamps and tags
  const cleanText = lyricsText
    .replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
    .replace(/<\d+:\d+(?:\.\d+)?>/g, '')
    .replace(/\[[a-zA-Z]{2,6}:.*?\]/g, '')
    .replace(/♪/g, '')
    .toLowerCase();

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const words = cleanText.match(/\b[a-z]{2,}\b/g) || [];

  const wordCount = words.length;
  const wordFreq = new Map();
  let positiveScore = 0;
  let negativeScore = 0;

  for (const w of words) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    if (POSITIVE_WORDS.has(w)) positiveScore++;
    if (NEGATIVE_WORDS.has(w)) negativeScore++;
  }

  const uniqueWords = wordFreq.size;
  const lexicalDiversity = wordCount > 0 ? Number(((uniqueWords / wordCount) * 100).toFixed(1)) : 0;

  // Sentiment calculation
  const netScore = positiveScore - negativeScore;
  let sentimentLabel = 'Neutral / Balanced';
  if (netScore > 3) sentimentLabel = 'Positive & Uplifting';
  else if (netScore < -3) sentimentLabel = 'Melancholic / Somber';
  else if (positiveScore > 0 && negativeScore > 0) sentimentLabel = 'Emotional & Complex';

  // Top non-stop words
  const topWords = Array.from(wordFreq.entries())
    .filter(([w]) => !STOP_WORDS.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  // Detect themes
  const themeScores = [];
  for (const [theme, keywords] of Object.entries(THEME_CLUSTERS)) {
    let score = 0;
    for (const kw of keywords) {
      if (wordFreq.has(kw)) {
        score += wordFreq.get(kw);
      }
    }
    if (score > 0) {
      themeScores.push({ theme, score });
    }
  }
  themeScores.sort((a, b) => b.score - a.score);
  const topThemes = themeScores.slice(0, 3).map(t => t.theme);

  // Repeated phrases (hooks / refrains)
  const lineFreq = new Map();
  for (const l of lines) {
    if (l.length > 8) {
      lineFreq.set(l, (lineFreq.get(l) || 0) + 1);
    }
  }
  const repeatedPhrases = Array.from(lineFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase, count]) => ({ phrase, count }));

  return {
    wordCount,
    uniqueWords,
    lexicalDiversity,
    sentiment: {
      label: sentimentLabel,
      score: netScore
    },
    topThemes: topThemes.length > 0 ? topThemes : ['General / Narrative'],
    topWords,
    repeatedPhrases,
    generated: false
  };
}

/**
 * Opt-in AI Provider Analysis
 * Only triggered when explicitly initiated by user and configured in settings.
 */
async function analyzeLyricsWithAI(lyricsText, options = {}) {
  if (!options.enabled || !options.apiKey) {
    throw new Error('AI analysis is not enabled or API key is missing.');
  }

  const endpoint = options.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  const prompt = `Analyze the following song lyrics. Provide a brief 3-sentence summary of the song's meaning, primary emotional themes, and notable poetic metaphors. Keep response strictly objective and concise.\n\nLyrics:\n${lyricsText.slice(0, 2000)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(endpoint, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a poetic music analyst. Provide insightful, brief summaries of lyrics.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 250,
      temperature: 0.7
    })
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`AI Provider returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || 'No insights returned.';

  return {
    summary: content.trim(),
    generated: true,
    provider: options.provider || 'custom'
  };
}

module.exports = {
  analyzeLyricsLocally,
  analyzeLyricsWithAI
};
