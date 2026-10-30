const fs = require('fs');
const path = require('path');
const paths = require('./paths');
const { logger } = require('./logger');

const CURRENT_SCHEMA_VERSION = 3;

const DEFAULT_CONFIG = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  version: 3,
  theme: 'theme-cyber',
  visualMode: 'ship',
  visualizationMode: 'ship', // 'ship' | 'fisheye' | 'fisheye-visual' | 'clean'
  autoSyncAlbumColors: true,
  manualColors: {
    primary: '#00f2fe',
    secondary: '#4facfe',
    activeWord: '#ffffff'
  },
  isCustomColor: false,
  primaryColor: '#00f2fe',
  secondaryColor: '#4facfe',
  activeWordColor: '#ffffff',
  sungWordColor: '#ffffff',
  glowIntensity: 1.0,
  fontScale: 1.0,
  fontFamily: "'Outfit', sans-serif",
  textAlign: 'center',
  lineMode: 2,
  syncOffset: 0.0,
  backdropOpacity: 0.0,
  backdropBlur: 16,
  showMiniPlayer: false,
  miniPlayerCollapsed: false,
  isClickThrough: false,
  alwaysOnTop: false,
  autoStart: true,
  windowBounds: {
    width: 1100,
    height: 240,
    x: null,
    y: null
  },
  // Wallpaper Mode
  wallpaperMode: {
    enabled: false,
    controlsOnHover: true,
    autoHideControls: true,
    preset: 'minimal' // 'minimal' | 'cinematic' | 'neon' | 'soft-glow' | 'custom'
  },
  // Native Deep Glow Engine Config
  glow: {
    enabled: true,
    intensity: 0.75,
    radius: 0.55,
    threshold: 0.35,
    exposure: 0.65,
    saturation: 1.0,
    opacity: 1.0,
    color: '#ff35b8',
    blendMode: 'screen', // 'screen' | 'add' | 'linear-dodge' | 'normal' | 'lighten'
    quality: 'balanced', // 'low' | 'balanced' | 'ultra'
    layers: []
  },
  // Word Transition Engine
  wordTransitions: {
    enabled: true,
    effect: 'slide-blur', // 'morph' | 'slide-blur' | 'particle-dissolve' | 'elastic' | 'letter-reveal' | 'fade-blur'
    duration: 300,
    easing: 'ease-out',
    direction: 'up',
    motionBlur: true,
    blurStrength: 0.35,
    glowDuringTransition: false,
    intensity: 1.0,
    overlap: 0.1,
    delay: 0
  },
  // Line Transition Engine
  lineTransitions: {
    enabled: true,
    effect: 'fade-blur', // 'crossfade' | 'morph' | 'slide' | 'slide-blur' | 'particle-dissolve' | 'elastic' | 'fade-blur' | 'vertical-reveal'
    duration: 450,
    easing: 'ease-in-out',
    direction: 'up',
    motionBlur: true,
    blurStrength: 0.4,
    stagger: 0.05,
    glow: true,
    opacity: 0.85,
    distance: 30
  },
  // Motion Blur & Animation Engine
  animation: {
    fps: 'auto',
    targetFps: 'auto', // 'auto' | 30 | 60 | 90 | 120
    speed: 1.0,
    animationSpeed: 1.0,
    performance: 'balanced',
    qualityPreset: 'smooth', // 'cinematic' | 'smooth' | 'balanced' | 'eco' | 'custom' | 'low' | 'ultra'
    reducedMotion: false,
    respectReducedMotion: true,
    motionBlur: true,
    motionBlurIntensity: 'medium', // 'off' | 'low' | 'medium' | 'high'
    gpuFallback: true,
    transitionDuration: 0.28,
    perspectiveDepth: 800
  },
  // Typography Studio
  typography: {
    fontFamily: 'Outfit',
    fontScale: 1.0,
    fontWeight: '600',
    letterSpacing: 0.0,
    lineHeight: 1.3,
    textAlign: 'center',
    wordSpacing: 0.0,
    activeWordFont: null,
    sungWordFont: null,
    upcomingWordFont: null,
    prevLineFont: null,
    activeLineFont: null,
    nextLineFont: null
  },
  // Album Art Color Sync
  albumSync: {
    enabled: true,
    autoSync: true,
    locked: false,
    primary: '#00f2fe',
    secondary: '#4facfe',
    accent: '#ff35b8'
  },
  // Custom Font Registry
  customFonts: [],
  // Plugins
  plugins: {
    enabled: []
  },
  spotify: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    connected: false
  },
  ai: {
    enabled: false,
    provider: 'local', // 'local' | 'custom'
    apiEndpoint: '',
    apiKey: '',
    autoAnalyze: false
  }
};

const VALID_VISUALIZATION_MODES = ['ship', 'fisheye', 'fisheye-visual', 'clean'];
const VALID_BLUR_INTENSITIES = ['off', 'low', 'medium', 'high'];
const VALID_TARGET_FPS = ['auto', 30, 60, 90, 120];
const VALID_QUALITY_PRESETS = ['cinematic', 'smooth', 'balanced', 'eco', 'custom', 'low', 'ultra'];
const VALID_BLEND_MODES = ['screen', 'add', 'linear-dodge', 'normal', 'lighten'];
const VALID_WORD_EFFECTS = ['morph', 'slide-blur', 'particle-dissolve', 'elastic', 'letter-reveal', 'fade-blur'];
const VALID_LINE_EFFECTS = ['crossfade', 'morph', 'slide', 'slide-blur', 'particle-dissolve', 'elastic', 'fade-blur', 'vertical-reveal'];

function validateAnimationConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.animation;
  if (!raw || typeof raw !== 'object') {
    return { ...defaults };
  }

  const motionBlur = typeof raw.motionBlur === 'boolean'
    ? raw.motionBlur
    : defaults.motionBlur;

  const motionBlurIntensity = VALID_BLUR_INTENSITIES.includes(raw.motionBlurIntensity)
    ? raw.motionBlurIntensity
    : defaults.motionBlurIntensity;

  let targetFps = defaults.targetFps;
  const rawFps = raw.targetFps !== undefined ? raw.targetFps : raw.fps;
  if (rawFps === 'auto' || rawFps === 'Auto') {
    targetFps = 'auto';
  } else {
    const parsed = parseInt(rawFps, 10);
    if ([30, 60, 90, 120].includes(parsed)) {
      targetFps = parsed;
    }
  }

  const qualityPreset = VALID_QUALITY_PRESETS.includes(raw.qualityPreset)
    ? raw.qualityPreset
    : (VALID_QUALITY_PRESETS.includes(raw.performance) ? raw.performance : defaults.qualityPreset);

  const respectReducedMotion = typeof raw.respectReducedMotion === 'boolean'
    ? raw.respectReducedMotion
    : (typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : defaults.respectReducedMotion);

  const gpuFallback = typeof raw.gpuFallback === 'boolean'
    ? raw.gpuFallback
    : defaults.gpuFallback;

  const rawSpeed = raw.animationSpeed !== undefined ? raw.animationSpeed : raw.speed;
  const animationSpeed = (typeof rawSpeed === 'number' && !isNaN(rawSpeed) && rawSpeed >= 0.25 && rawSpeed <= 3.0)
    ? rawSpeed
    : defaults.animationSpeed;

  const transitionDuration = (typeof raw.transitionDuration === 'number' && !isNaN(raw.transitionDuration) && raw.transitionDuration >= 0.05 && raw.transitionDuration <= 1.5)
    ? raw.transitionDuration
    : defaults.transitionDuration;

  const perspectiveDepth = (typeof raw.perspectiveDepth === 'number' && !isNaN(raw.perspectiveDepth) && raw.perspectiveDepth >= 200 && raw.perspectiveDepth <= 3000)
    ? raw.perspectiveDepth
    : defaults.perspectiveDepth;

  return {
    fps: targetFps,
    targetFps,
    speed: animationSpeed,
    animationSpeed,
    performance: qualityPreset,
    qualityPreset,
    reducedMotion: respectReducedMotion,
    respectReducedMotion,
    motionBlur,
    motionBlurIntensity,
    gpuFallback,
    transitionDuration,
    perspectiveDepth
  };
}

function validateGlowConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.glow;
  if (!raw || typeof raw !== 'object') return { ...defaults };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
    intensity: (typeof raw.intensity === 'number' && !isNaN(raw.intensity) && raw.intensity >= 0 && raw.intensity <= 3) ? raw.intensity : defaults.intensity,
    radius: (typeof raw.radius === 'number' && !isNaN(raw.radius) && raw.radius >= 0 && raw.radius <= 2) ? raw.radius : defaults.radius,
    threshold: (typeof raw.threshold === 'number' && !isNaN(raw.threshold) && raw.threshold >= 0 && raw.threshold <= 1) ? raw.threshold : defaults.threshold,
    exposure: (typeof raw.exposure === 'number' && !isNaN(raw.exposure) && raw.exposure >= 0 && raw.exposure <= 3) ? raw.exposure : defaults.exposure,
    saturation: (typeof raw.saturation === 'number' && !isNaN(raw.saturation) && raw.saturation >= 0 && raw.saturation <= 3) ? raw.saturation : defaults.saturation,
    opacity: (typeof raw.opacity === 'number' && !isNaN(raw.opacity) && raw.opacity >= 0 && raw.opacity <= 1) ? raw.opacity : defaults.opacity,
    color: typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : defaults.color,
    blendMode: VALID_BLEND_MODES.includes(raw.blendMode) ? raw.blendMode : defaults.blendMode,
    quality: ['low', 'balanced', 'ultra'].includes(raw.quality) ? raw.quality : defaults.quality,
    layers: Array.isArray(raw.layers) ? raw.layers : []
  };
}

function validateWordTransitionConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.wordTransitions;
  if (!raw || typeof raw !== 'object') return { ...defaults };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
    effect: VALID_WORD_EFFECTS.includes(raw.effect) ? raw.effect : defaults.effect,
    duration: (typeof raw.duration === 'number' && raw.duration >= 50 && raw.duration <= 3000) ? raw.duration : defaults.duration,
    easing: typeof raw.easing === 'string' ? raw.easing : defaults.easing,
    direction: ['up', 'down', 'left', 'right'].includes(raw.direction) ? raw.direction : defaults.direction,
    motionBlur: typeof raw.motionBlur === 'boolean' ? raw.motionBlur : defaults.motionBlur,
    blurStrength: (typeof raw.blurStrength === 'number' && raw.blurStrength >= 0 && raw.blurStrength <= 1) ? raw.blurStrength : defaults.blurStrength,
    glowDuringTransition: typeof raw.glowDuringTransition === 'boolean' ? raw.glowDuringTransition : defaults.glowDuringTransition,
    intensity: (typeof raw.intensity === 'number' && raw.intensity >= 0 && raw.intensity <= 2) ? raw.intensity : defaults.intensity,
    overlap: (typeof raw.overlap === 'number' && raw.overlap >= 0 && raw.overlap <= 1) ? raw.overlap : defaults.overlap,
    delay: (typeof raw.delay === 'number' && raw.delay >= 0 && raw.delay <= 1000) ? raw.delay : defaults.delay
  };
}

function validateLineTransitionConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.lineTransitions;
  if (!raw || typeof raw !== 'object') return { ...defaults };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
    effect: VALID_LINE_EFFECTS.includes(raw.effect) ? raw.effect : defaults.effect,
    duration: (typeof raw.duration === 'number' && raw.duration >= 50 && raw.duration <= 3000) ? raw.duration : defaults.duration,
    easing: typeof raw.easing === 'string' ? raw.easing : defaults.easing,
    direction: ['up', 'down'].includes(raw.direction) ? raw.direction : defaults.direction,
    motionBlur: typeof raw.motionBlur === 'boolean' ? raw.motionBlur : defaults.motionBlur,
    blurStrength: (typeof raw.blurStrength === 'number' && raw.blurStrength >= 0 && raw.blurStrength <= 1) ? raw.blurStrength : defaults.blurStrength,
    stagger: (typeof raw.stagger === 'number' && raw.stagger >= 0 && raw.stagger <= 1) ? raw.stagger : defaults.stagger,
    glow: typeof raw.glow === 'boolean' ? raw.glow : defaults.glow,
    opacity: (typeof raw.opacity === 'number' && raw.opacity >= 0 && raw.opacity <= 1) ? raw.opacity : defaults.opacity,
    distance: (typeof raw.distance === 'number' && raw.distance >= 0 && raw.distance <= 200) ? raw.distance : defaults.distance
  };
}

function validateTypographyConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.typography;
  if (!raw || typeof raw !== 'object') return { ...defaults };

  return {
    fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : defaults.fontFamily,
    fontScale: (typeof raw.fontScale === 'number' && raw.fontScale >= 0.5 && raw.fontScale <= 2.5) ? raw.fontScale : defaults.fontScale,
    fontWeight: typeof raw.fontWeight === 'string' || typeof raw.fontWeight === 'number' ? String(raw.fontWeight) : defaults.fontWeight,
    letterSpacing: typeof raw.letterSpacing === 'number' ? raw.letterSpacing : defaults.letterSpacing,
    lineHeight: typeof raw.lineHeight === 'number' ? raw.lineHeight : defaults.lineHeight,
    textAlign: ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : defaults.textAlign,
    wordSpacing: typeof raw.wordSpacing === 'number' ? raw.wordSpacing : defaults.wordSpacing,
    activeWordFont: typeof raw.activeWordFont === 'string' ? raw.activeWordFont : null,
    sungWordFont: typeof raw.sungWordFont === 'string' ? raw.sungWordFont : null,
    upcomingWordFont: typeof raw.upcomingWordFont === 'string' ? raw.upcomingWordFont : null,
    prevLineFont: typeof raw.prevLineFont === 'string' ? raw.prevLineFont : null,
    activeLineFont: typeof raw.activeLineFont === 'string' ? raw.activeLineFont : null,
    nextLineFont: typeof raw.nextLineFont === 'string' ? raw.nextLineFont : null
  };
}

function validateWallpaperConfig(raw = {}) {
  const defaults = DEFAULT_CONFIG.wallpaperMode;
  if (!raw || typeof raw !== 'object') return { ...defaults };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled,
    controlsOnHover: typeof raw.controlsOnHover === 'boolean' ? raw.controlsOnHover : defaults.controlsOnHover,
    autoHideControls: typeof raw.autoHideControls === 'boolean' ? raw.autoHideControls : defaults.autoHideControls,
    preset: ['minimal', 'cinematic', 'neon', 'soft-glow', 'custom'].includes(raw.preset) ? raw.preset : defaults.preset
  };
}

class StorageManager {
  constructor(options = {}) {
    this.paths = options.paths || paths;
    this.configFile = options.configFile || this.paths.configFile;
    this.favoritesFile = options.favoritesFile || this.paths.favoritesFile;
    this.historyFile = options.historyFile || this.paths.historyFile;
    this.glowPresetsFile = options.glowPresetsFile || this.paths.glowPresetsFile;
    this.ensureFiles();
  }

  ensureFiles() {
    try {
      this.paths.ensureDirectories?.();
    } catch (e) {}
  }

  safeReadJson(filePath, defaultValue) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      logger.warn(`Corrupted JSON detected in ${filePath}, recovering with default`, err.message);
      try {
        const backupPath = `${filePath}.corrupt.${Date.now()}`;
        fs.renameSync(filePath, backupPath);
      } catch (backupErr) {}
      return defaultValue;
    }
  }

  safeWriteJson(filePath, data) {
    try {
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (err) {
      logger.error(`Failed to write JSON to ${filePath}`, err.message);
      return false;
    }
  }

  // --- CONFIG ---
  getConfig() {
    const data = this.safeReadJson(this.configFile, DEFAULT_CONFIG);
    const merged = { ...DEFAULT_CONFIG, ...data };
    if (!merged.windowBounds) {
      merged.windowBounds = { ...DEFAULT_CONFIG.windowBounds };
    }
    if (!merged.spotify) {
      merged.spotify = { ...DEFAULT_CONFIG.spotify };
    }
    if (!merged.ai) {
      merged.ai = { ...DEFAULT_CONFIG.ai };
    }

    // Visual mode aliasing
    const vMode = data.visualMode || data.visualizationMode || DEFAULT_CONFIG.visualizationMode;
    merged.visualMode = VALID_VISUALIZATION_MODES.includes(vMode) ? vMode : DEFAULT_CONFIG.visualizationMode;
    merged.visualizationMode = merged.visualMode;

    if (typeof merged.autoSyncAlbumColors !== 'boolean') {
      merged.autoSyncAlbumColors = DEFAULT_CONFIG.autoSyncAlbumColors;
    }
    if (!merged.manualColors || typeof merged.manualColors !== 'object') {
      merged.manualColors = { ...DEFAULT_CONFIG.manualColors };
    } else {
      merged.manualColors = {
        primary: merged.manualColors.primary || DEFAULT_CONFIG.manualColors.primary,
        secondary: merged.manualColors.secondary || DEFAULT_CONFIG.manualColors.secondary,
        activeWord: merged.manualColors.activeWord || DEFAULT_CONFIG.manualColors.activeWord
      };
    }

    // V3 Glow validation & backward compatibility
    const rawGlow = data.glow || {};
    if (typeof data.glowIntensity === 'number' && rawGlow.intensity === undefined) {
      rawGlow.intensity = data.glowIntensity;
    }
    merged.glow = validateGlowConfig(rawGlow);
    merged.glowIntensity = merged.glow.intensity;

    // V3 Transitions
    merged.wordTransitions = validateWordTransitionConfig(data.wordTransitions);
    merged.lineTransitions = validateLineTransitionConfig(data.lineTransitions);

    // V3 Animation
    merged.animation = validateAnimationConfig(data.animation || {
      motionBlur: data.motionBlur,
      motionBlurIntensity: data.motionBlurIntensity,
      targetFps: data.targetFps || data.fps,
      qualityPreset: data.qualityPreset || data.performance,
      respectReducedMotion: data.respectReducedMotion !== undefined ? data.respectReducedMotion : data.reducedMotion,
      gpuFallback: data.gpuFallback,
      animationSpeed: data.animationSpeed || data.speed,
      transitionDuration: data.transitionDuration,
      perspectiveDepth: data.perspectiveDepth
    });

    // V3 Typography
    const rawTypography = data.typography || {};
    if (data.fontFamily && !rawTypography.fontFamily) {
      rawTypography.fontFamily = data.fontFamily;
    }
    if (typeof data.fontScale === 'number' && rawTypography.fontScale === undefined) {
      rawTypography.fontScale = data.fontScale;
    }
    if (data.textAlign && !rawTypography.textAlign) {
      rawTypography.textAlign = data.textAlign;
    }
    merged.typography = validateTypographyConfig(rawTypography);
    merged.fontFamily = merged.typography.fontFamily;
    merged.fontScale = merged.typography.fontScale;
    merged.textAlign = merged.typography.textAlign;

    // V3 Wallpaper Mode
    merged.wallpaperMode = validateWallpaperConfig(data.wallpaperMode);

    // V3 Album Sync
    merged.albumSync = {
      enabled: typeof data.albumSync?.enabled === 'boolean' ? data.albumSync.enabled : DEFAULT_CONFIG.albumSync.enabled,
      autoSync: typeof data.albumSync?.autoSync === 'boolean' ? data.albumSync.autoSync : merged.autoSyncAlbumColors,
      locked: typeof data.albumSync?.locked === 'boolean' ? data.albumSync.locked : DEFAULT_CONFIG.albumSync.locked,
      primary: data.albumSync?.primary || merged.primaryColor || DEFAULT_CONFIG.albumSync.primary,
      secondary: data.albumSync?.secondary || merged.secondaryColor || DEFAULT_CONFIG.albumSync.secondary,
      accent: data.albumSync?.accent || DEFAULT_CONFIG.albumSync.accent
    };
    merged.autoSyncAlbumColors = merged.albumSync.autoSync;

    // Custom fonts & Plugins
    merged.customFonts = Array.isArray(data.customFonts) ? data.customFonts : [];
    merged.plugins = data.plugins && Array.isArray(data.plugins.enabled) ? data.plugins : { enabled: [] };

    return merged;
  }

  saveConfig(partialConfig) {
    const current = this.getConfig();
    let newAnimation = current.animation;

    if (partialConfig.animation && typeof partialConfig.animation === 'object') {
      newAnimation = validateAnimationConfig({ ...current.animation, ...partialConfig.animation });
    } else if (
      partialConfig.motionBlur !== undefined ||
      partialConfig.motionBlurIntensity !== undefined ||
      partialConfig.targetFps !== undefined ||
      partialConfig.fps !== undefined ||
      partialConfig.qualityPreset !== undefined ||
      partialConfig.performance !== undefined ||
      partialConfig.respectReducedMotion !== undefined ||
      partialConfig.reducedMotion !== undefined ||
      partialConfig.gpuFallback !== undefined ||
      partialConfig.animationSpeed !== undefined ||
      partialConfig.speed !== undefined ||
      partialConfig.transitionDuration !== undefined ||
      partialConfig.perspectiveDepth !== undefined
    ) {
      newAnimation = validateAnimationConfig({
        ...current.animation,
        motionBlur: partialConfig.motionBlur !== undefined ? partialConfig.motionBlur : current.animation.motionBlur,
        motionBlurIntensity: partialConfig.motionBlurIntensity !== undefined ? partialConfig.motionBlurIntensity : current.animation.motionBlurIntensity,
        targetFps: partialConfig.targetFps !== undefined ? partialConfig.targetFps : (partialConfig.fps !== undefined ? partialConfig.fps : current.animation.targetFps),
        qualityPreset: partialConfig.qualityPreset !== undefined ? partialConfig.qualityPreset : (partialConfig.performance !== undefined ? partialConfig.performance : current.animation.qualityPreset),
        respectReducedMotion: partialConfig.respectReducedMotion !== undefined ? partialConfig.respectReducedMotion : (partialConfig.reducedMotion !== undefined ? partialConfig.reducedMotion : current.animation.respectReducedMotion),
        gpuFallback: partialConfig.gpuFallback !== undefined ? partialConfig.gpuFallback : current.animation.gpuFallback,
        animationSpeed: partialConfig.animationSpeed !== undefined ? partialConfig.animationSpeed : (partialConfig.speed !== undefined ? partialConfig.speed : current.animation.animationSpeed),
        transitionDuration: partialConfig.transitionDuration !== undefined ? partialConfig.transitionDuration : current.animation.transitionDuration,
        perspectiveDepth: partialConfig.perspectiveDepth !== undefined ? partialConfig.perspectiveDepth : current.animation.perspectiveDepth
      });
    }

    const newGlow = partialConfig.glow ? validateGlowConfig({ ...current.glow, ...partialConfig.glow }) : current.glow;
    if (partialConfig.glowIntensity !== undefined && !partialConfig.glow) {
      newGlow.intensity = partialConfig.glowIntensity;
    }

    const newWordTransitions = partialConfig.wordTransitions
      ? validateWordTransitionConfig({ ...current.wordTransitions, ...partialConfig.wordTransitions })
      : current.wordTransitions;

    const newLineTransitions = partialConfig.lineTransitions
      ? validateLineTransitionConfig({ ...current.lineTransitions, ...partialConfig.lineTransitions })
      : current.lineTransitions;

    const newTypography = partialConfig.typography
      ? validateTypographyConfig({ ...current.typography, ...partialConfig.typography })
      : current.typography;
    if (partialConfig.fontFamily) newTypography.fontFamily = partialConfig.fontFamily;
    if (partialConfig.fontScale) newTypography.fontScale = partialConfig.fontScale;
    if (partialConfig.textAlign) newTypography.textAlign = partialConfig.textAlign;

    const newWallpaperMode = partialConfig.wallpaperMode
      ? validateWallpaperConfig({ ...current.wallpaperMode, ...partialConfig.wallpaperMode })
      : current.wallpaperMode;

    const newVisualMode = partialConfig.visualMode || partialConfig.visualizationMode || current.visualMode;

    const updated = {
      ...current,
      ...partialConfig,
      visualMode: newVisualMode,
      visualizationMode: newVisualMode,
      glow: newGlow,
      glowIntensity: newGlow.intensity,
      wordTransitions: newWordTransitions,
      lineTransitions: newLineTransitions,
      typography: newTypography,
      fontFamily: newTypography.fontFamily,
      fontScale: newTypography.fontScale,
      textAlign: newTypography.textAlign,
      wallpaperMode: newWallpaperMode,
      animation: newAnimation,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      version: 3,
      updatedAt: new Date().toISOString()
    };
    return this.safeWriteJson(this.configFile, updated);
  }

  // --- FAVORITES ---
  getFavorites() {
    const list = this.safeReadJson(this.favoritesFile, []);
    return Array.isArray(list) ? list : [];
  }

  addFavorite(track) {
    if (!track || !track.title) return false;
    const favorites = this.getFavorites();
    const id = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();

    const existingIdx = favorites.findIndex(f => f.id === id);
    const item = {
      id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      artwork: track.artwork || '',
      duration: track.duration || 0,
      savedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      favorites[existingIdx] = { ...favorites[existingIdx], ...item };
    } else {
      favorites.unshift(item);
    }

    return this.safeWriteJson(this.favoritesFile, favorites);
  }

  removeFavorite(trackId) {
    if (!trackId) return false;
    const normalizedId = String(trackId).trim().toLowerCase();
    const favorites = this.getFavorites().filter(f => f.id !== normalizedId);
    return this.safeWriteJson(this.favoritesFile, favorites);
  }

  isFavorite(trackId) {
    if (!trackId) return false;
    const normalizedId = String(trackId).trim().toLowerCase();
    return this.getFavorites().some(f => f.id === normalizedId);
  }

  // --- PLAYBACK HISTORY ---
  getHistory(limit = 50) {
    const list = this.safeReadJson(this.historyFile, []);
    const arr = Array.isArray(list) ? list : [];
    return arr.slice(0, limit);
  }

  addToHistory(track) {
    if (!track || !track.title) return false;
    const history = this.getHistory(100);
    const id = `${track.artist || 'Unknown'} - ${track.title}`.trim().toLowerCase();

    // Prevent immediate consecutive duplicate
    if (history.length > 0 && history[0].id === id) {
      return true;
    }

    const entry = {
      id,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      duration: track.duration || 0,
      artwork: track.artwork || '',
      playedAt: new Date().toISOString()
    };

    history.unshift(entry);
    const trimmed = history.slice(0, 100);
    return this.safeWriteJson(this.historyFile, trimmed);
  }

  clearHistory() {
    return this.safeWriteJson(this.historyFile, []);
  }

  // --- GLOW PRESETS ---
  getCustomGlowPresets() {
    const list = this.safeReadJson(this.glowPresetsFile, []);
    return Array.isArray(list) ? list : [];
  }

  saveCustomGlowPreset(preset) {
    if (!preset || !preset.name) return null;
    const presets = this.getCustomGlowPresets();
    const id = preset.id || `custom-${Date.now()}`;
    const sanitizedGlow = validateGlowConfig(preset);

    const record = {
      ...sanitizedGlow,
      id,
      name: String(preset.name).trim() || 'Custom Glow',
      isCustom: true,
      updatedAt: new Date().toISOString()
    };

    const existingIdx = presets.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
      presets[existingIdx] = record;
    } else {
      presets.push(record);
    }

    const ok = this.safeWriteJson(this.glowPresetsFile, presets);
    return ok ? record : null;
  }

  deleteCustomGlowPreset(id) {
    if (!id) return false;
    const presets = this.getCustomGlowPresets().filter(p => p.id !== id);
    return this.safeWriteJson(this.glowPresetsFile, presets);
  }

  renameCustomGlowPreset(id, newName) {
    if (!id || !newName) return false;
    const presets = this.getCustomGlowPresets();
    const item = presets.find(p => p.id === id);
    if (!item) return false;
    item.name = String(newName).trim();
    item.updatedAt = new Date().toISOString();
    return this.safeWriteJson(this.glowPresetsFile, presets);
  }

  duplicateCustomGlowPreset(id, duplicateName) {
    if (!id) return null;
    const presets = this.getCustomGlowPresets();
    const source = presets.find(p => p.id === id);
    if (!source) return null;

    const newId = `custom-${Date.now()}`;
    const newName = duplicateName || `${source.name} (Copy)`;
    const newPreset = {
      ...source,
      id: newId,
      name: newName,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };
    presets.push(newPreset);
    const ok = this.safeWriteJson(this.glowPresetsFile, presets);
    return ok ? newPreset : null;
  }
}

const storage = new StorageManager();

module.exports = {
  StorageManager,
  storage,
  DEFAULT_CONFIG,
  validateAnimationConfig,
  validateGlowConfig,
  validateWordTransitionConfig,
  validateLineTransitionConfig,
  validateTypographyConfig,
  validateWallpaperConfig,
  VALID_VISUALIZATION_MODES,
  VALID_BLUR_INTENSITIES,
  VALID_TARGET_FPS,
  VALID_QUALITY_PRESETS,
  VALID_BLEND_MODES,
  VALID_WORD_EFFECTS,
  VALID_LINE_EFFECTS
};
