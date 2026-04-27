import type { PiExtension } from "./pi-wrapper";

export abstract class Feature {
  constructor(protected readonly ext: PiExtension) {}
  
  /**
   * Initialize the feature by registering commands, tools, or event listeners
   */
  abstract init(): void;
}
