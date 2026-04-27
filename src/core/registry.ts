import type { PiExtension } from "./pi-wrapper";
import type { Feature } from "./feature";

export class FeatureRegistry {
  private features: Feature[] = [];

  constructor(private readonly ext: PiExtension) {}

  /**
   * Register a feature class
   */
  register(FeatureClass: new (ext: PiExtension) => Feature) {
    const feature = new FeatureClass(this.ext);
    feature.init();
    this.features.push(feature);
    return this;
  }

  /**
   * Register multiple features at once
   */
  registerAll(featureClasses: (new (ext: PiExtension) => Feature)[]) {
    for (const FeatureClass of featureClasses) {
      this.register(FeatureClass);
    }
    return this;
  }

  /**
   * Support for third-party plugins that might not follow the Feature class pattern
   * but provide a register function.
   */
  registerExternal(plugin: { name: string, register: (ext: PiExtension) => void }) {
    console.log(`[Registry] Loading third-party plugin: ${plugin.name}`);
    try {
      plugin.register(this.ext);
    } catch (error) {
      console.error(`[Registry] Failed to load plugin ${plugin.name}:`, error);
    }
    return this;
  }
}
