/**
 * NeonLyrics V3 - Glow Studio Presets
 * Conforms to Section 4.5 of Product Requirements.
 */

const GLOW_PRESETS = [
  {
    id: 'soft-neon',
    name: 'Soft Neon',
    intensity: 0.8,
    radius: 0.55,
    threshold: 0.3,
    exposure: 0.85,
    saturation: 1.1,
    opacity: 1.0,
    color: '#00f2fe',
    blendMode: 'screen',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.4, intensityMultiplier: 0.9, color: '#00f2fe' },
      { radiusMultiplier: 0.9, intensityMultiplier: 0.5, color: '#4facfe' },
      { radiusMultiplier: 1.8, intensityMultiplier: 0.25, color: '#00c6ff' }
    ]
  },
  {
    id: 'deep-pink',
    name: 'Deep Pink',
    intensity: 1.0,
    radius: 0.65,
    threshold: 0.25,
    exposure: 1.0,
    saturation: 1.3,
    opacity: 1.0,
    color: '#ff2a85',
    blendMode: 'screen',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.35, intensityMultiplier: 1.0, color: '#ff2a85' },
      { radiusMultiplier: 0.85, intensityMultiplier: 0.6, color: '#ff758c' },
      { radiusMultiplier: 1.7, intensityMultiplier: 0.3, color: '#7928ca' }
    ]
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    intensity: 1.1,
    radius: 0.7,
    threshold: 0.28,
    exposure: 0.95,
    saturation: 1.25,
    opacity: 1.0,
    color: '#00d2ff',
    blendMode: 'linear-dodge',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 1.1, color: '#00d2ff' },
      { radiusMultiplier: 0.75, intensityMultiplier: 0.6, color: '#3a7bd5' },
      { radiusMultiplier: 1.6, intensityMultiplier: 0.25, color: '#0052d4' }
    ]
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    intensity: 1.3,
    radius: 0.75,
    threshold: 0.22,
    exposure: 1.15,
    saturation: 1.4,
    opacity: 1.0,
    color: '#fcee0a',
    blendMode: 'add',
    quality: 'ultra',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 1.2, color: '#fcee0a' },
      { radiusMultiplier: 0.8, intensityMultiplier: 0.7, color: '#ff003c' },
      { radiusMultiplier: 1.9, intensityMultiplier: 0.35, color: '#00f0ff' }
    ]
  },
  {
    id: 'aurora',
    name: 'Aurora',
    intensity: 0.9,
    radius: 0.6,
    threshold: 0.32,
    exposure: 0.8,
    saturation: 1.2,
    opacity: 0.95,
    color: '#10b981',
    blendMode: 'screen',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.4, intensityMultiplier: 0.9, color: '#10b981' },
      { radiusMultiplier: 0.9, intensityMultiplier: 0.55, color: '#06b6d4' },
      { radiusMultiplier: 1.8, intensityMultiplier: 0.3, color: '#8b5cf6' }
    ]
  },
  {
    id: 'golden-aura',
    name: 'Golden Aura',
    intensity: 0.95,
    radius: 0.6,
    threshold: 0.3,
    exposure: 0.9,
    saturation: 1.15,
    opacity: 1.0,
    color: '#f59e0b',
    blendMode: 'screen',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.35, intensityMultiplier: 1.0, color: '#fbbf24' },
      { radiusMultiplier: 0.8, intensityMultiplier: 0.5, color: '#f59e0b' },
      { radiusMultiplier: 1.6, intensityMultiplier: 0.2, color: '#d97706' }
    ]
  },
  {
    id: 'pure-white',
    name: 'Pure White',
    intensity: 0.7,
    radius: 0.45,
    threshold: 0.4,
    exposure: 0.8,
    saturation: 0.0,
    opacity: 1.0,
    color: '#ffffff',
    blendMode: 'screen',
    quality: 'balanced',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 0.8, color: '#ffffff' },
      { radiusMultiplier: 0.7, intensityMultiplier: 0.4, color: '#e2e8f0' }
    ]
  },
  {
    id: 'ultra-bloom',
    name: 'Ultra Bloom',
    intensity: 1.6,
    radius: 1.1,
    threshold: 0.15,
    exposure: 1.4,
    saturation: 1.3,
    opacity: 1.0,
    color: '#ec4899',
    blendMode: 'add',
    quality: 'ultra',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 1.4, color: '#ec4899' },
      { radiusMultiplier: 0.7, intensityMultiplier: 0.9, color: '#a855f7' },
      { radiusMultiplier: 1.4, intensityMultiplier: 0.6, color: '#6366f1' },
      { radiusMultiplier: 2.2, intensityMultiplier: 0.35, color: '#3b82f6' }
    ]
  },
  {
    id: 'cinematic-glow',
    name: 'Cinematic Glow',
    intensity: 0.65,
    radius: 0.5,
    threshold: 0.38,
    exposure: 0.7,
    saturation: 0.95,
    opacity: 0.9,
    color: '#e0e7ff',
    blendMode: 'screen',
    quality: 'ultra',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 0.7, color: '#c7d2fe' },
      { radiusMultiplier: 0.8, intensityMultiplier: 0.35, color: '#818cf8' }
    ]
  },
  {
    id: 'minimal-glow',
    name: 'Minimal Glow',
    intensity: 0.35,
    radius: 0.25,
    threshold: 0.5,
    exposure: 0.5,
    saturation: 0.8,
    opacity: 0.8,
    color: '#38bdf8',
    blendMode: 'screen',
    quality: 'low',
    layers: [
      { radiusMultiplier: 0.3, intensityMultiplier: 0.4, color: '#38bdf8' }
    ]
  }
];

function getGlowPresetById(id) {
  if (!id) return null;
  return GLOW_PRESETS.find(p => p.id === id) || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GLOW_PRESETS, getGlowPresetById };
}
if (typeof window !== 'undefined') {
  window.GLOW_PRESETS = GLOW_PRESETS;
  window.getGlowPresetById = getGlowPresetById;
}

