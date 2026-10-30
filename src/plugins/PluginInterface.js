/**
 * NeonLyrics V3 - Plugin Interface
 * Contract definition for extensible rendering plugins (glow, blur, distortion, particles, transitions).
 */

const PLUGIN_TYPES = [
  'glow',
  'blur',
  'distortion',
  'color',
  'particle',
  'transition',
  'typography'
];

class GraphicsPlugin {
  constructor(metadata = {}) {
    this.id = metadata.id || 'unnamed-plugin';
    this.name = metadata.name || 'Unnamed Plugin';
    this.type = PLUGIN_TYPES.includes(metadata.type) ? metadata.type : 'color';
    this.version = metadata.version || '1.0.0';
    this.author = metadata.author || 'NeonLyrics Contributor';
    this.description = metadata.description || '';
    this.enabled = Boolean(metadata.enabled);
    this.isInitialized = false;
  }

  /**
   * Initializes the plugin with the renderer context and GPU capabilities.
   */
  initialize(renderer, capabilities) {
    this.isInitialized = true;
    return true;
  }

  /**
   * Renders the effect. Returns modified texture or context output.
   */
  render(context, inputTexture) {
    return inputTexture;
  }

  /**
   * Updates user-configured settings for this plugin.
   */
  updateSettings(settings) {}

  /**
   * Called when renderer or window resizes.
   */
  resize(width, height) {}

  /**
   * Cleans up GPU buffers, shaders, or timers.
   */
  dispose() {
    this.isInitialized = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GraphicsPlugin,
    PLUGIN_TYPES
  };
}
if (typeof window !== 'undefined') {
  window.GraphicsPlugin = GraphicsPlugin;
  window.PLUGIN_TYPES = PLUGIN_TYPES;
}

