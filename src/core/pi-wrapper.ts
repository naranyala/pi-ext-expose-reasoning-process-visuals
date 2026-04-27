import type { ExtensionAPI, ExtensionContext, ExtensionHandler, ExtensionEvent, ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { TSchema } from "@sinclair/typebox";
import { beautifyError } from "../shared/error-utils";

/**
 * A wrapper around the Pi Extension API to provide a more structured 
 * and discoverable way to interact with the agent.
 * 
 * This class implements ExtensionAPI by proxying all calls to the underlying 
 * api instance, while adding high-level convenience methods.
 */
export class PiExtension implements ExtensionAPI {
  constructor(public readonly api: ExtensionAPI) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        // 1. Check if the property exists on the wrapper itself
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        // 2. Fallback to the underlying ExtensionAPI
        const value = Reflect.get(target.api, prop, receiver);
        if (typeof value === "function") {
          return (...args: any[]) => value.apply(target.api, args);
        }
        return value;
      },
    });
  }

  /**
   * Register a command with automatic error handling and logging
   */
  command(name: string, description: string, handler: (args: string, ctx: any) => Promise<void>) {
    this.api.registerCommand(name, {
      description,
      handler: async (args, ctx) => {
        try {
          await handler(args, ctx);
        } catch (error) {
          ctx.ui.notify(`Command /${name} failed: ${beautifyError(error)}`, "error");
          console.error(`Error in command /${name}:`, error);
        }
      }
    });
    return this;
  }

  /**
   * Register a tool with a simplified interface
   */
  tool<TParams extends TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>) {
    this.api.registerTool(tool);
    return this;
  }

  /**
   * Listen to Pi events
   */
  on<E extends ExtensionEvent["type"]>(event: E, handler: any) {
    this.api.on(event as any, handler);
    return this;
  }

  /**
   * Helper to set multiple status items at once
   */
  setStatuses(statuses: Record<string, string | undefined>, ctx: ExtensionContext) {
    for (const [key, value] of Object.entries(statuses)) {
      ctx.ui.setStatus(key, value);
    }
  }

  /**
   * Helper to notify user and log to console
   */
  log(message: string, ctx: ExtensionContext, type: "info" | "warning" | "error" = "info") {
    ctx.ui.notify(message, type);
    if (type === "error") {
      console.error(`[Extension] ${message}`);
    } else {
      console.log(`[Extension] ${message}`);
    }
  }
}
