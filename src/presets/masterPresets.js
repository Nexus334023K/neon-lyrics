/**
 * NeonLyrics - Master Presets
 * Complete definitions for the 15 specification-mandated visual presets.
 */

const MASTER_PRESETS = [
  {
    id: 'soft-neon',
    name: 'Soft Neon',
    description: 'Subtle cyan and violet luminescence for cozy listening.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#00f2fe',
      secondary: '#4facfe',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.0,
      radius: 20,
      spread: 0.6,
      threshold: 0.45,
      exposure: 1.0,
      saturation: 1.1,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 10, intensity: 0.8, color: '#00f2fe' },
        { radius: 25, intensity: 0.4, color: '#4facfe' }
      ]
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.02em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Crossfade',
      duration: 350
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.0,
      bassIntensity: 1.1,
      trebleIntensity: 0.9,
      reactionSpeed: 1.0
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 150
    }
  },
  {
    id: 'deep-pink',
    name: 'Deep Pink',
    description: 'Intense magenta bloom with energetic rhythm pulses.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#ff007f',
      secondary: '#ff758c',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.4,
      radius: 26,
      spread: 0.7,
      threshold: 0.35,
      exposure: 1.2,
      saturation: 1.4,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 12, intensity: 1.0, color: '#ff007f' },
        { radius: 30, intensity: 0.6, color: '#ff758c' }
      ]
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontScale: 1.05,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.01em',
      fontWeight: '700'
    },
    transitions: {
      wordEffect: 'Elastic',
      lineEffect: 'Elastic',
      duration: 400
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.2,
      bassIntensity: 1.4,
      trebleIntensity: 1.1,
      reactionSpeed: 1.2
    },
    threeD: {
      enabled: false,
      cameraMode: 'orbit',
      particleCount: 200
    }
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    description: 'Crisp azure lasers and vibrant blue energy trails.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#00d2ff',
      secondary: '#3a7bd5',
      activeWord: '#e0f7ff'
    },
    glow: {
      enabled: true,
      intensity: 1.3,
      radius: 24,
      spread: 0.65,
      threshold: 0.4,
      exposure: 1.15,
      saturation: 1.3,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 10, intensity: 0.9, color: '#00d2ff' },
        { radius: 28, intensity: 0.5, color: '#3a7bd5' }
      ]
    },
    typography: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.35,
      letterSpacing: '0.04em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'SlideBlur',
      lineEffect: 'SlideBlur',
      duration: 320
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.1,
      bassIntensity: 1.2,
      trebleIntensity: 1.2,
      reactionSpeed: 1.1
    },
    threeD: {
      enabled: true,
      cameraMode: 'orbit',
      particleCount: 250
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High contrast neon yellow and electric teal with chromatic dispersion.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#fcee0a',
      secondary: '#00f0ff',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.5,
      radius: 30,
      spread: 0.75,
      threshold: 0.3,
      exposure: 1.25,
      saturation: 1.5,
      blendMode: 'add',
      quality: 'high',
      layers: [
        { radius: 12, intensity: 1.2, color: '#fcee0a' },
        { radius: 32, intensity: 0.7, color: '#00f0ff' }
      ]
    },
    typography: {
      fontFamily: "'Syne', sans-serif",
      fontScale: 1.1,
      textAlign: 'center',
      lineHeight: 1.3,
      letterSpacing: '0.06em',
      fontWeight: '800'
    },
    transitions: {
      wordEffect: 'LetterReveal',
      lineEffect: 'VerticalReveal',
      duration: 300
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.3,
      bassIntensity: 1.5,
      trebleIntensity: 1.3,
      reactionSpeed: 1.3
    },
    threeD: {
      enabled: true,
      cameraMode: 'tunnel',
      particleCount: 300
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Mystical organic gradients of northern light greens and purple.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#00ff87',
      secondary: '#60efe0',
      activeWord: '#eafff5'
    },
    glow: {
      enabled: true,
      intensity: 1.1,
      radius: 28,
      spread: 0.7,
      threshold: 0.45,
      exposure: 1.05,
      saturation: 1.2,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 14, intensity: 0.8, color: '#00ff87' },
        { radius: 35, intensity: 0.4, color: '#60efe0' }
      ]
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.45,
      letterSpacing: '0.02em',
      fontWeight: '500'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Crossfade',
      duration: 450
    },
    audioReactive: {
      enabled: true,
      sensitivity: 0.9,
      bassIntensity: 1.0,
      trebleIntensity: 0.8,
      reactionSpeed: 0.9
    },
    threeD: {
      enabled: true,
      cameraMode: 'orbit',
      particleCount: 220
    }
  },
  {
    id: 'golden-aura',
    name: 'Golden Aura',
    description: 'Warm golden hues and amber glow for acoustic and warm records.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#ffd700',
      secondary: '#ff9a44',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.2,
      radius: 22,
      spread: 0.65,
      threshold: 0.4,
      exposure: 1.1,
      saturation: 1.3,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 10, intensity: 0.9, color: '#ffd700' },
        { radius: 26, intensity: 0.5, color: '#ff9a44' }
      ]
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.03em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Slide',
      duration: 380
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.0,
      bassIntensity: 1.1,
      trebleIntensity: 0.9,
      reactionSpeed: 1.0
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 180
    }
  },
  {
    id: 'liquid-chrome',
    name: 'Liquid Chrome',
    description: 'Mirror-like metallic reflections and silver luminance.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#e0e7ff',
      secondary: '#94a3b8',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.25,
      radius: 18,
      spread: 0.55,
      threshold: 0.35,
      exposure: 1.15,
      saturation: 0.8,
      blendMode: 'screen',
      quality: 'ultra',
      layers: [
        { radius: 8, intensity: 1.0, color: '#e0e7ff' },
        { radius: 20, intensity: 0.5, color: '#94a3b8' }
      ]
    },
    typography: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontScale: 1.05,
      textAlign: 'center',
      lineHeight: 1.35,
      letterSpacing: '0.05em',
      fontWeight: '700'
    },
    transitions: {
      wordEffect: 'Morph',
      lineEffect: 'Morph',
      duration: 340
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.15,
      bassIntensity: 1.25,
      trebleIntensity: 1.1,
      reactionSpeed: 1.15
    },
    threeD: {
      enabled: true,
      cameraMode: 'dynamic',
      particleCount: 260
    }
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Iridescent spectrum shifts and translucent futuristic typography.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#a855f7',
      secondary: '#06b6d4',
      activeWord: '#fdf4ff'
    },
    glow: {
      enabled: true,
      intensity: 1.35,
      radius: 25,
      spread: 0.7,
      threshold: 0.38,
      exposure: 1.2,
      saturation: 1.35,
      blendMode: 'screen',
      quality: 'ultra',
      layers: [
        { radius: 10, intensity: 1.0, color: '#a855f7' },
        { radius: 28, intensity: 0.6, color: '#06b6d4' }
      ]
    },
    typography: {
      fontFamily: "'Syne', sans-serif",
      fontScale: 1.05,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.04em',
      fontWeight: '700'
    },
    transitions: {
      wordEffect: 'ParticleDissolve',
      lineEffect: 'ParticleDissolve',
      duration: 400
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.2,
      bassIntensity: 1.3,
      trebleIntensity: 1.2,
      reactionSpeed: 1.2
    },
    threeD: {
      enabled: true,
      cameraMode: 'orbit',
      particleCount: 300
    }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Subdued elegant typography with warm filmic falloff.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#f59e0b',
      secondary: '#b45309',
      activeWord: '#fffbeb'
    },
    glow: {
      enabled: true,
      intensity: 0.85,
      radius: 16,
      spread: 0.5,
      threshold: 0.5,
      exposure: 0.95,
      saturation: 1.05,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 8, intensity: 0.7, color: '#f59e0b' },
        { radius: 22, intensity: 0.3, color: '#b45309' }
      ]
    },
    typography: {
      fontFamily: "'Cinzel', serif",
      fontScale: 1.1,
      textAlign: 'center',
      lineHeight: 1.5,
      letterSpacing: '0.08em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Crossfade',
      duration: 500
    },
    audioReactive: {
      enabled: false,
      sensitivity: 0.8,
      bassIntensity: 0.9,
      trebleIntensity: 0.7,
      reactionSpeed: 0.8
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 100
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean Swiss typography with zero visual distractions.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#ffffff',
      secondary: '#9ca3af',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: false,
      intensity: 0.0,
      radius: 0,
      spread: 0.0,
      threshold: 0.8,
      exposure: 1.0,
      saturation: 1.0,
      blendMode: 'screen',
      quality: 'low',
      layers: []
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.01em',
      fontWeight: '500'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Crossfade',
      duration: 250
    },
    audioReactive: {
      enabled: false,
      sensitivity: 0.5,
      bassIntensity: 0.5,
      trebleIntensity: 0.5,
      reactionSpeed: 0.8
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 0
    }
  },
  {
    id: 'dreamscape',
    name: 'Dreamscape',
    description: 'Ethereal pastel clouds with dreamy floating particles.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#f472b6',
      secondary: '#c084fc',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.15,
      radius: 26,
      spread: 0.7,
      threshold: 0.42,
      exposure: 1.05,
      saturation: 1.25,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 12, intensity: 0.8, color: '#f472b6' },
        { radius: 30, intensity: 0.45, color: '#c084fc' }
      ]
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.45,
      letterSpacing: '0.02em',
      fontWeight: '500'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'FadeBlur',
      duration: 480
    },
    audioReactive: {
      enabled: true,
      sensitivity: 0.95,
      bassIntensity: 1.05,
      trebleIntensity: 0.9,
      reactionSpeed: 0.95
    },
    threeD: {
      enabled: true,
      cameraMode: 'orbit',
      particleCount: 220
    }
  },
  {
    id: 'retro-crt',
    name: 'Retro CRT',
    description: 'Amber phosphors, scanline vibe, and vintage terminal atmosphere.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#22c55e',
      secondary: '#15803d',
      activeWord: '#86efac'
    },
    glow: {
      enabled: true,
      intensity: 1.4,
      radius: 22,
      spread: 0.65,
      threshold: 0.35,
      exposure: 1.2,
      saturation: 1.4,
      blendMode: 'add',
      quality: 'high',
      layers: [
        { radius: 10, intensity: 1.1, color: '#22c55e' },
        { radius: 24, intensity: 0.5, color: '#15803d' }
      ]
    },
    typography: {
      fontFamily: "'JetBrains Mono', monospace",
      fontScale: 1.0,
      textAlign: 'left',
      lineHeight: 1.35,
      letterSpacing: '0.05em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'LetterReveal',
      lineEffect: 'VerticalReveal',
      duration: 280
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.1,
      bassIntensity: 1.2,
      trebleIntensity: 1.3,
      reactionSpeed: 1.2
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 120
    }
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    description: '1980s neon highway with hot pink, ultraviolet, and grid motion.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#ff2a85',
      secondary: '#7928ca',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.45,
      radius: 30,
      spread: 0.72,
      threshold: 0.32,
      exposure: 1.25,
      saturation: 1.45,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 12, intensity: 1.1, color: '#ff2a85' },
        { radius: 32, intensity: 0.6, color: '#7928ca' }
      ]
    },
    typography: {
      fontFamily: "'Syne', sans-serif",
      fontScale: 1.05,
      textAlign: 'center',
      lineHeight: 1.35,
      letterSpacing: '0.05em',
      fontWeight: '700'
    },
    transitions: {
      wordEffect: 'SlideBlur',
      lineEffect: 'SlideBlur',
      duration: 350
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.25,
      bassIntensity: 1.45,
      trebleIntensity: 1.15,
      reactionSpeed: 1.25
    },
    threeD: {
      enabled: true,
      cameraMode: 'tunnel',
      particleCount: 280
    }
  },
  {
    id: 'pure-white',
    name: 'Pure White',
    description: 'Stark monochrome clarity with diamond-like brilliance.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.2,
      radius: 18,
      spread: 0.55,
      threshold: 0.45,
      exposure: 1.1,
      saturation: 0.0,
      blendMode: 'screen',
      quality: 'high',
      layers: [
        { radius: 8, intensity: 0.9, color: '#ffffff' },
        { radius: 22, intensity: 0.45, color: '#e2e8f0' }
      ]
    },
    typography: {
      fontFamily: "'Outfit', sans-serif",
      fontScale: 1.0,
      textAlign: 'center',
      lineHeight: 1.4,
      letterSpacing: '0.02em',
      fontWeight: '600'
    },
    transitions: {
      wordEffect: 'FadeBlur',
      lineEffect: 'Crossfade',
      duration: 320
    },
    audioReactive: {
      enabled: true,
      sensitivity: 0.9,
      bassIntensity: 1.0,
      trebleIntensity: 0.9,
      reactionSpeed: 0.9
    },
    threeD: {
      enabled: false,
      cameraMode: 'static',
      particleCount: 160
    }
  },
  {
    id: 'ultra-bloom',
    name: 'Ultra Bloom',
    description: 'Maximum multi-pass GPU bloom saturation for heavy electronic anthems.',
    author: 'NeonLyrics Core',
    version: '1.0.0',
    colors: {
      primary: '#00ffcc',
      secondary: '#ff00aa',
      activeWord: '#ffffff'
    },
    glow: {
      enabled: true,
      intensity: 1.8,
      radius: 36,
      spread: 0.85,
      threshold: 0.25,
      exposure: 1.4,
      saturation: 1.6,
      blendMode: 'add',
      quality: 'ultra',
      layers: [
        { radius: 14, intensity: 1.4, color: '#00ffcc' },
        { radius: 38, intensity: 0.85, color: '#ff00aa' }
      ]
    },
    typography: {
      fontFamily: "'Syne', sans-serif",
      fontScale: 1.1,
      textAlign: 'center',
      lineHeight: 1.35,
      letterSpacing: '0.04em',
      fontWeight: '800'
    },
    transitions: {
      wordEffect: 'Elastic',
      lineEffect: 'SlideBlur',
      duration: 360
    },
    audioReactive: {
      enabled: true,
      sensitivity: 1.4,
      bassIntensity: 1.6,
      trebleIntensity: 1.3,
      reactionSpeed: 1.4
    },
    threeD: {
      enabled: true,
      cameraMode: 'tunnel',
      particleCount: 350
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MASTER_PRESETS
  };
}
if (typeof window !== 'undefined') {
  window.MASTER_PRESETS = MASTER_PRESETS;
}

