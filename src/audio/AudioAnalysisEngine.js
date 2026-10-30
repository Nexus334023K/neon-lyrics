/**
 * NeonLyrics - AudioAnalysisEngine
 * Computes real-time frequency band decomposition (Bass, Mid, Treble),
 * energy metrics, and beat detection with configurable smoothing.
 */

class AudioAnalysisEngine {
  constructor(options = {}) {
    this.sensitivity = options.sensitivity || 1.0;
    this.smoothing = options.smoothing !== undefined ? options.smoothing : 0.8;
    this.bassIntensity = options.bassIntensity || 1.0;
    this.midIntensity = options.midIntensity || 0.8;
    this.trebleIntensity = options.trebleIntensity || 0.6;
    this.beatThreshold = options.beatThreshold || 1.25;
    this.reactionSpeed = options.reactionSpeed || 1.0;

    // Smoothed state
    this.bass = 0.0;
    this.mid = 0.0;
    this.treble = 0.0;
    this.energy = 0.0;
    this.isBeat = false;
    this.beatConfidence = 0.0;

    // Beat detection history buffer
    this._historySize = 30;
    this._energyHistory = new Float32Array(this._historySize);
    this._historyIdx = 0;
    this._historyCount = 0;
    this._lastBeatTime = 0;
    this._minBeatIntervalMs = 180; // Max ~330 BPM
  }

  updateConfig(config = {}) {
    if (typeof config.sensitivity === 'number') this.sensitivity = config.sensitivity;
    if (typeof config.smoothing === 'number') this.smoothing = config.smoothing;
    if (typeof config.bassIntensity === 'number') this.bassIntensity = config.bassIntensity;
    if (typeof config.midIntensity === 'number') this.midIntensity = config.midIntensity;
    if (typeof config.trebleIntensity === 'number') this.trebleIntensity = config.trebleIntensity;
    if (typeof config.beatThreshold === 'number') this.beatThreshold = config.beatThreshold;
    if (typeof config.reactionSpeed === 'number') this.reactionSpeed = config.reactionSpeed;
  }

  /**
   * Analyzes raw byte frequency array [0 - 255]
   * Returns: { bass, mid, treble, energy, isBeat, beatConfidence }
   */
  analyze(frequencyData, timestampMs = Date.now()) {
    if (!frequencyData || frequencyData.length === 0) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        energy: 0,
        isBeat: false,
        beatConfidence: 0
      };
    }

    const binCount = frequencyData.length;
    const bassEnd = Math.max(1, Math.floor(binCount * 0.15));
    const midEnd = Math.max(bassEnd + 1, Math.floor(binCount * 0.60));

    let rawBassSum = 0;
    let rawMidSum = 0;
    let rawTrebleSum = 0;

    for (let i = 0; i < binCount; i++) {
      const val = frequencyData[i] / 255.0;
      if (i < bassEnd) {
        rawBassSum += val;
      } else if (i < midEnd) {
        rawMidSum += val;
      } else {
        rawTrebleSum += val;
      }
    }

    const bassCount = bassEnd;
    const midCount = midEnd - bassEnd;
    const trebleCount = binCount - midEnd;

    let targetBass = (rawBassSum / bassCount) * this.sensitivity * this.bassIntensity;
    let targetMid = (rawMidSum / midCount) * this.sensitivity * this.midIntensity;
    let targetTreble = (rawTrebleSum / trebleCount) * this.sensitivity * this.trebleIntensity;

    targetBass = Math.min(1.0, Math.max(0.0, targetBass));
    targetMid = Math.min(1.0, Math.max(0.0, targetMid));
    targetTreble = Math.min(1.0, Math.max(0.0, targetTreble));

    const targetEnergy = (targetBass * 0.5 + targetMid * 0.3 + targetTreble * 0.2);

    // Apply Exponential Moving Average (EMA) smoothing
    const alpha = Math.min(1.0, Math.max(0.05, (1.0 - this.smoothing) * this.reactionSpeed));
    this.bass = this.bass * (1.0 - alpha) + targetBass * alpha;
    this.mid = this.mid * (1.0 - alpha) + targetMid * alpha;
    this.treble = this.treble * (1.0 - alpha) + targetTreble * alpha;
    this.energy = this.energy * (1.0 - alpha) + targetEnergy * alpha;

    // Beat Detection
    this._energyHistory[this._historyIdx] = targetBass;
    this._historyIdx = (this._historyIdx + 1) % this._historySize;
    if (this._historyCount < this._historySize) this._historyCount++;

    let avgBass = 0;
    for (let i = 0; i < this._historyCount; i++) {
      avgBass += this._energyHistory[i];
    }
    avgBass /= Math.max(1, this._historyCount);

    const timeSinceLastBeat = timestampMs - this._lastBeatTime;
    const beatCutoff = avgBass * this.beatThreshold;

    if (targetBass > beatCutoff && targetBass > 0.35 && timeSinceLastBeat >= this._minBeatIntervalMs) {
      this.isBeat = true;
      this.beatConfidence = Math.min(1.0, (targetBass - beatCutoff) / 0.5);
      this._lastBeatTime = timestampMs;
    } else {
      this.isBeat = false;
      this.beatConfidence = Math.max(0.0, this.beatConfidence - 0.1);
    }

    return {
      bass: this.bass,
      mid: this.mid,
      treble: this.treble,
      energy: this.energy,
      isBeat: this.isBeat,
      beatConfidence: this.beatConfidence
    };
  }

  reset() {
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.energy = 0;
    this.isBeat = false;
    this.beatConfidence = 0;
    this._energyHistory.fill(0);
    this._historyCount = 0;
    this._historyIdx = 0;
    this._lastBeatTime = 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioAnalysisEngine };
}
if (typeof window !== 'undefined') {
  window.AudioAnalysisEngine = AudioAnalysisEngine;
}

