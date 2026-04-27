import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { PiExtension } from "./core/pi-wrapper";
import { FeatureRegistry } from "./core/registry";
import { VisualsEnhancerFeature } from "./features/visuals-enhancer";

/**
 * Main Extension Entry Point
 * 
 * This extension focuses on enhancing the visual experience of the reasoning process
 * and providing concise code-change diffs.
 */
export default async function (api: ExtensionAPI) {
  const ext = new PiExtension(api);
  const registry = new FeatureRegistry(ext);

  // Register the core visual enhancer feature
  registry.registerAll([
    VisualsEnhancerFeature,
  ]);
}
