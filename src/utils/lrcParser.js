/**
 * Advanced LRC Parser & Synchronizer for NeonLyrics
 * Supports standard LRC, enhanced word-level LRC (<mm:ss.xx>),
 * multi-timestamp lines, offset tags, metadata tags, and instrumental interludes.
 */

function parseTimestamp(minStr, secStr, fracStr = '') {
  const min = parseInt(minStr, 10) || 0;
  const sec = parseInt(secStr, 10) || 0;
  let frac = 0;
  if (fracStr) {
    frac = parseFloat(`0.${fracStr}`);
  }
  return Number((min * 60 + sec + frac).toFixed(3));
}

function formatTimestamp(seconds) {
  const s = Math.max(0, seconds || 0);
  const min = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2);
  const padMin = String(min).padStart(2, '0');
  const padSec = sec.padStart(5, '0');
  return `[${padMin}:${padSec}]`;
}

function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') {
    return { metadata: {}, lines: [] };
  }

  const rawLines = lrcText.split(/\r?\n/);
  const metadata = {
    title: '',
    artist: '',
    album: '',
    by: '',
    offsetMs: 0
  };

  const parsedLines = [];

  // Metadata tag regex: [tag:value]
  const metaRegex = /^\[(ar|ti|al|by|offset):(.*?)\]$/i;
  // Multi-timestamp line regex: one or more [mm:ss.xx] followed by text
  const timeTagRegex = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
  // Enhanced word-level timestamp: <mm:ss.xx>word
  const wordTagRegex = /<(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?>\s*([^<]*)/g;

  for (let raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Check metadata tags
    const metaMatch = trimmed.match(metaRegex);
    if (metaMatch) {
      const tag = metaMatch[1].toLowerCase();
      const val = metaMatch[2].trim();
      if (tag === 'ti') metadata.title = val;
      else if (tag === 'ar') metadata.artist = val;
      else if (tag === 'al') metadata.album = val;
      else if (tag === 'by') metadata.by = val;
      else if (tag === 'offset') metadata.offsetMs = parseInt(val, 10) || 0;
      continue;
    }

    // Check for timestamps
    timeTagRegex.lastIndex = 0;
    const timestamps = [];
    let match;
    let lastIndex = 0;

    while ((match = timeTagRegex.exec(trimmed)) !== null) {
      const timeSec = parseTimestamp(match[1], match[2], match[3]);
      timestamps.push(timeSec);
      lastIndex = timeTagRegex.lastIndex;
    }

    if (timestamps.length === 0) {
      // Un-synced line (no timestamp)
      continue;
    }

    const content = trimmed.substring(lastIndex).trim();

    // Check if line represents an instrumental section
    const isInstrumental = /^\s*(\[|\()?(music|instrumental|solo|interlude)(\]|\))?\s*$/i.test(content) || content === '♪' || content === '...';

    // Parse word-level timings if available (<mm:ss.xx>)
    wordTagRegex.lastIndex = 0;
    const rawWords = [];
    let wMatch;
    let hasWordTimings = false;

    while ((wMatch = wordTagRegex.exec(content)) !== null) {
      const wTime = parseTimestamp(wMatch[1], wMatch[2], wMatch[3]);
      const wWord = (wMatch[4] || '').trim();
      if (wWord) {
        hasWordTimings = true;
        rawWords.push({
          time: wTime,
          endTime: wTime + 0.5,
          word: wWord,
          verified: true
        });
      }
    }

    // For each timestamp on a multi-timestamp line, duplicate line entry
    for (const baseTime of timestamps) {
      const offsetSeconds = (metadata.offsetMs || 0) / 1000;
      const lineTime = Math.max(0, Number((baseTime + offsetSeconds).toFixed(3)));

      let words = [];
      if (hasWordTimings) {
        // Adjust word timestamps by offset
        words = rawWords.map((w, idx, arr) => {
          const adjTime = Math.max(0, Number((w.time + offsetSeconds).toFixed(3)));
          const nextAdj = idx < arr.length - 1 ? Math.max(adjTime, Number((arr[idx + 1].time + offsetSeconds).toFixed(3))) : adjTime + 0.6;
          return {
            time: adjTime,
            endTime: nextAdj,
            word: w.word,
            verified: true
          };
        });
      } else {
        // Line-only timestamp: clean bracket tags and split into words
        const cleanText = content.replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').trim();
        const tokens = cleanText.split(/\s+/).filter(Boolean);
        words = tokens.map((token) => ({
          time: lineTime,
          endTime: lineTime,
          word: token,
          verified: false
        }));
      }

      const displayText = isInstrumental
        ? '♪ (Instrumental) ♪'
        : (words.length > 0 ? words.map(w => w.word).join(' ') : content);

      parsedLines.push({
        time: lineTime,
        endTime: 0,
        text: displayText,
        words: words,
        isInstrumental: isInstrumental,
        hasWordTimings: hasWordTimings
      });
    }
  }

  // Sort chronologically
  parsedLines.sort((a, b) => a.time - b.time);

  // Compute realistic endTimes for each line and smooth unverified word intervals
  for (let i = 0; i < parsedLines.length; i++) {
    const current = parsedLines[i];
    const nextTime = i < parsedLines.length - 1 ? parsedLines[i + 1].time : current.time + 4.5;
    current.endTime = Number(nextTime.toFixed(3));

    const lineDuration = Math.max(0.5, current.endTime - current.time);

    // If words are not verified, distribute evenly across line duration
    if (!current.hasWordTimings && current.words.length > 0) {
      const perWord = lineDuration / current.words.length;
      for (let j = 0; j < current.words.length; j++) {
        current.words[j].time = Number((current.time + j * perWord).toFixed(3));
        current.words[j].endTime = Number((current.time + (j + 1) * perWord).toFixed(3));
      }
    }
  }

  return {
    metadata,
    lines: parsedLines
  };
}

/**
 * Serialize lines back to standard LRC format
 */
function serializeLrc(lines, metadata = {}) {
  const out = [];
  if (metadata.title) out.push(`[ti:${metadata.title}]`);
  if (metadata.artist) out.push(`[ar:${metadata.artist}]`);
  if (metadata.album) out.push(`[al:${metadata.album}]`);
  if (metadata.by) out.push(`[by:${metadata.by}]`);
  if (metadata.offsetMs) out.push(`[offset:${metadata.offsetMs}]`);

  for (const line of lines) {
    const ts = formatTimestamp(line.time);
    if (line.hasWordTimings && Array.isArray(line.words)) {
      const wordsStr = line.words.map(w => `<${formatTimestamp(w.time).slice(1, -1)}>${w.word}`).join(' ');
      out.push(`${ts}${wordsStr}`);
    } else {
      out.push(`${ts} ${line.text}`);
    }
  }
  return out.join('\n');
}

/**
 * Given a timestamp and parsed lines, find the active line and active word indices
 */
function findActiveIndices(lines, currentTime) {
  if (!lines || lines.length === 0) {
    return { lineIndex: -1, wordIndex: -1 };
  }

  let lineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].time) {
      lineIndex = i;
      break;
    }
  }

  if (lineIndex === -1) {
    return { lineIndex: -1, wordIndex: -1 };
  }

  const activeLine = lines[lineIndex];
  let wordIndex = -1;
  if (activeLine && activeLine.words && activeLine.words.length > 0) {
    for (let j = activeLine.words.length - 1; j >= 0; j--) {
      if (currentTime >= activeLine.words[j].time) {
        wordIndex = j;
        break;
      }
    }
  }

  return { lineIndex, wordIndex };
}

module.exports = {
  parseLrc,
  serializeLrc,
  parseTimestamp,
  formatTimestamp,
  findActiveIndices
};
