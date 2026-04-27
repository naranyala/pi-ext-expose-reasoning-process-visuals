import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

export type PiAPI = ExtensionAPI;
export type PiContext = ExtensionContext;
export type PiCommandContext = ExtensionCommandContext;

export interface ExtensionModule {
  register(pi: PiAPI): void;
}
