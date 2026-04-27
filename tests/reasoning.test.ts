import { expect, test, describe, beforeEach } from "bun:test";
import { VisualsEnhancerFeature } from "../src/features/visuals-enhancer";
import { createMockAPI, createMockContext } from "./mocks";

describe("VisualsEnhancerFeature", () => {
  let feature: VisualsEnhancerFeature;
  let mockApi: any;
  let mockCtx: any;
  let handlers: Record<string, any> = {};

  beforeEach(() => {
    handlers = {};
    mockApi = createMockAPI();
    mockCtx = createMockContext();
    
    // Capture handlers registered with api.on
    mockApi.on.mockImplementation((event: string, handler: any) => {
      handlers[event] = handler;
    });

    // Mock the extension wrapper
    const mockExt = {
      api: mockApi,
      command: (name: string, description: string, handler: any) => {
        mockApi.registerCommand(name, { description, handler });
        return mockExt;
      }
    };
    
    // @ts-ignore - bypassing the strict PiExtension type for testing
    feature = new VisualsEnhancerFeature(mockExt as any);
    feature.init();
  });

  test("should update reasoning widget based on length tiers", async () => {
    const handler = handlers["message_update"];
    expect(handler).toBeDefined();

    const baseMsg = { role: "assistant", content: [] as any[] };

    // Case 1: Short reasoning
    await handler({ 
      message: { ...baseMsg, content: [{ type: "thinking", thinking: "a".repeat(100) }] } 
    }, mockCtx);
    expect(mockCtx.ui.setWidget).toHaveBeenCalledWith("reasoning-status", expect.arrayContaining([expect.stringContaining("💭")]));

    // Case 2: Medium reasoning
    await handler({ 
      message: { ...baseMsg, content: [{ type: "thinking", thinking: "a".repeat(500) }] } 
    }, mockCtx);
    expect(mockCtx.ui.setWidget).toHaveBeenCalledWith("reasoning-status", expect.arrayContaining([expect.stringContaining("🧠")]));

    // Case 3: Deep reasoning
    await handler({ 
      message: { ...baseMsg, content: [{ type: "thinking", thinking: "a".repeat(1100) }] } 
    }, mockCtx);
    expect(mockCtx.ui.setWidget).toHaveBeenCalledWith("reasoning-status", expect.arrayContaining([expect.stringContaining("🌌")]));

    // Case 4: No reasoning
    await handler({ 
      message: { ...baseMsg, content: [] } 
    }, mockCtx);
    expect(mockCtx.ui.setWidget).toHaveBeenCalledWith("reasoning-status", []);
  });

  test("should not update widget if tier has not changed (throttling)", async () => {
    const handler = handlers["message_update"];
    const baseMsg = { role: "assistant", content: [] as any[] };

    // First update (Short)
    await handler({ 
      message: { ...baseMsg, content: [{ type: "thinking", thinking: "a".repeat(100) }] } 
    }, mockCtx);
    const callCountAfterFirst = mockCtx.ui.setWidget.mock.calls.length;

    // Second update (still Short, just slightly longer)
    await handler({ 
      message: { ...baseMsg, content: [{ type: "thinking", thinking: "a".repeat(150) }] } 
    }, mockCtx);
    
    expect(mockCtx.ui.setWidget.mock.calls.length).toBe(callCountAfterFirst);
  });
});
