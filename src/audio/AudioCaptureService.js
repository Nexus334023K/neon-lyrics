/**
 * NeonLyrics - AudioCaptureService
 * Handles hardware loopback / microphone capture and provides seamless
 * simulated fallback when capture permission is not granted or in headless environments.
 */

class AudioCaptureService {
  constructor(options = {}) {
    this.source = options.source || 'system';
    this.fftSize = options.fftSize || 256;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.isCapturing = false;
    this.isSimulated = false;

    this._frequencyData = new Uint8Array(this.fftSize / 2);
    this._simulatedPhase = 0;
  }

  async start(source = this.source) {
    this.source = source;
    if (this.isCapturing) {
      this.stop();
    }

    if (source === 'simulated') {
      this._startSimulated();
      return true;
    }

    // Attempt real Web Audio capture
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API not supported');
        }

        this.audioContext = new AudioContextClass();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.8;

        const constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        };

        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.sourceNode.connect(this.analyser);

        this.isCapturing = true;
        this.isSimulated = false;
        return true;
      } catch (err) {
        console.warn('[AudioCaptureService] Real audio capture unavailable, falling back to simulated spectrum:', err.message);
      }
    }

    this._startSimulated();
    return true;
  }

  _startSimulated() {
    this.isCapturing = true;
    this.isSimulated = true;
  }

  stop() {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (e) {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.isCapturing = false;
    this.isSimulated = false;
  }

  getFrequencyData() {
    if (!this.isCapturing) {
      this._frequencyData.fill(0);
      return this._frequencyData;
    }

    if (!this.isSimulated && this.analyser) {
      this.analyser.getByteFrequencyData(this._frequencyData);
      return this._frequencyData;
    }

    // Generate simulated rhythm spectrum
    this._simulatedPhase += 0.05;
    const binCount = this._frequencyData.length;
    const beatPulse = Math.pow(Math.max(0, Math.sin(this._simulatedPhase * 2.0)), 4);

    for (let i = 0; i < binCount; i++) {
      const freqNorm = i / binCount;
      let val = 0;

      // Bass bins (first ~15%)
      if (freqNorm < 0.15) {
        val = (1.0 - freqNorm / 0.15) * beatPulse * 255;
      } else if (freqNorm < 0.6) {
        // Mid bins
        val = Math.sin(this._simulatedPhase + i * 0.3) * 0.5 + 0.5;
        val *= 160 * (1.0 + beatPulse * 0.4);
      } else {
        // Treble bins
        val = (Math.cos(this._simulatedPhase * 1.5 + i * 0.5) * 0.5 + 0.5) * 110;
      }

      this._frequencyData[i] = Math.max(0, Math.min(255, Math.round(val)));
    }

    return this._frequencyData;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioCaptureService };
}
if (typeof window !== 'undefined') {
  window.AudioCaptureService = AudioCaptureService;
}

