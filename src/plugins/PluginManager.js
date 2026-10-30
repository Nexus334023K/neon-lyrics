/**
 * NeonLyrics V3 - Plugin Manager
 * Orchestrates rendering plugins, validates contracts, enforces lifecycle,
 * and isolates errors to prevent third-party plugins from crashing the main renderer.
 */

const { GraphicsPlugin, PLUGIN_TYPES } = (typeof module !== 'undefined' && module.exports)
  ? require('./PluginInterface')
  : { GraphicsPlugin: window.GraphicsPlugin, PLUGIN_TYPES: window.PLUGIN_TYPES };

class PluginManager {
  constructor(renderer = null, capabilities = {}) {
    this.renderer = renderer;
    this.capabilities = capabilities;
    this.plugins = new Map();
    this.errorCounts = new Map();
    this.maxConsecutiveErrors = 3;
  }

  setRenderer(renderer, capabilities = {}) {
    this.renderer = renderer;
    this.capabilities = capabilities;
  }

  registerPlugin(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('[PluginManager] Invalid plugin: must be an object');
    }
    if (!plugin.id || typeof plugin.id !== 'string') {
      throw new Error('[PluginManager] Invalid plugin: id is required');
    }
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[PluginManager] Plugin with id "${plugin.id}" is already registered`);
    }
    if (!PLUGIN_TYPES.includes(plugin.type)) {
      throw new Error(`[PluginManager] Unsupported plugin type: "${plugin.type}". Expected one of: ${PLUGIN_TYPES.join(', ')}`);
    }
    if (typeof plugin.render !== 'function') {
      throw new Error('[PluginManager] Invalid plugin: render() function is required');
    }

    this.plugins.set(plugin.id, plugin);
    this.errorCounts.set(plugin.id, 0);

    if (plugin.enabled) {
      this.enablePlugin(plugin.id);
    }

    return true;
  }

  unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      if (plugin.isInitialized && typeof plugin.dispose === 'function') {
        plugin.dispose();
      }
    } catch (e) {
      console.warn(`[PluginManager] Error disposing plugin ${pluginId}:`, e.message);
    }

    this.plugins.delete(pluginId);
    this.errorCounts.delete(pluginId);
    return true;
  }

  enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.enabled = true;
    if (!plugin.isInitialized && typeof plugin.initialize === 'function') {
      try {
        plugin.initialize(this.renderer, this.capabilities);
        plugin.isInitialized = true;
      } catch (err) {
        console.error(`[PluginManager] Failed to initialize plugin "${pluginId}":`, err.message);
        plugin.enabled = false;
        return false;
      }
    }
    return true;
  }

  disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.enabled = false;
    if (plugin.isInitialized && typeof plugin.dispose === 'function') {
      try {
        plugin.dispose();
      } catch (err) {
        console.warn(`[PluginManager] Error disposing plugin "${pluginId}":`, err.message);
      }
      plugin.isInitialized = false;
    }
    return true;
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Safely executes all active plugins for a specific pipeline stage with error containment.
   */
  executeStage(stageType, context, inputTexture) {
    let currentTexture = inputTexture;

    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.enabled && plugin.type === stageType) {
        try {
          currentTexture = plugin.render(context, currentTexture);
          // Reset error count on successful execution
          this.errorCounts.set(id, 0);
        } catch (err) {
          console.error(`[PluginManager] Exception in plugin "${id}":`, err);
          const errors = (this.errorCounts.get(id) || 0) + 1;
          this.errorCounts.set(id, errors);

          if (errors >= this.maxConsecutiveErrors) {
            console.warn(`[PluginManager] Disabling unstable plugin "${id}" after ${errors} consecutive failures.`);
            this.disablePlugin(id);
          }
        }
      }
    }

    return currentTexture;
  }

  resize(width, height) {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && typeof plugin.resize === 'function') {
        try {
          plugin.resize(width, height);
        } catch (e) {
          console.warn(`[PluginManager] Resize error in plugin ${plugin.id}:`, e.message);
        }
      }
    }
  }

  disposeAll() {
    for (const id of Array.from(this.plugins.keys())) {
      this.unregisterPlugin(id);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PluginManager,
    GraphicsPlugin,
    PLUGIN_TYPES
  };
}
if (typeof window !== 'undefined') {
  window.PluginManager = PluginManager;
}

