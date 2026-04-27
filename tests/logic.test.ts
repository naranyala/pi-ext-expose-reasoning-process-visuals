import { expect, test, describe, beforeEach } from "bun:test";
import { VisualsEnhancerFeature } from "../src/features/visuals-enhancer";
import { createMockAPI, createMockContext } from "./mocks";
import { beautifyError } from "../src/shared/error-utils";

describe("Logic Tests", () => {
  let feature: VisualsEnhancerFeature;
  let mockApi: any;
  let mockCtx: any;
  let handlers: Record<string, any> = {};

  beforeEach(() => {
    handlers = {};
    mockApi = createMockAPI();
    mockCtx = createMockContext();
    
    mockApi.on.mockImplementation((event: string, handler: any) => {
      handlers[event] = handler;
    });

    const mockExt = {
      api: mockApi,
      command: (name: string, description: string, handler: any) => {
        mockApi.registerCommand(name, { description, handler });
        return mockExt;
      }
    };
    
    feature = new VisualsEnhancerFeature(mockExt as any);
    feature.init();
  });

  describe("beautifyError", () => {
    test("should handle strings", () => {
      expect(beautifyError("simple error")).toBe("simple error");
    });

    test("should parse JSON errors", () => {
      const jsonError = JSON.stringify({ message: "API Error", code: 500 });
      expect(beautifyError(jsonError)).toBe("API Error");
    });

    test("should handle nested JSON objects", () => {
      const errorObj = { details: { message: "Nested failure" } };
      expect(beautifyError(errorObj)).toBe("Nested failure");
    });

    test("should fallback to stringify for unknown objects", () => {
      const obj = { x: 1 };
      expect(beautifyError(obj)).toBe(JSON.stringify(obj));
    });
  });

  describe("Reasoning Analysis (via message_update)", () => {
    test("should detect goal/plan from thinking text", async () => {
      const handler = handlers["message_update"];
      const baseMsg = { role: "assistant", content: [
        { type: "thinking", thinking: "I will read the file index.ts.\nGoal: Refactor the code.\nPlan: Check imports first." }
      ]};

      await handler({ message: baseMsg }, mockCtx);
      
      const setWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "reasoning-status");
      expect(setWidgetCall[1][0]).toContain("🎯 Refactor the code.");
    });

    test("should detect stuck/looping agent", async () => {
      const handler = handlers["message_update"];
      const baseMsg = { role: "assistant", content: [
        { type: "thinking", thinking: "wait, let me rethink\nwait, let me rethink\nwait, let me rethink" }
      ]};

      await handler({ message: baseMsg }, mockCtx);
      
      const setWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "reasoning-status");
      expect(setWidgetCall[1][0]).toContain("⚠️ Agent seems confused/looping...");
    });
  });

  describe("Complexity Calculation", () => {
    test("should show complexity based on thinking length", async () => {
      const handler = handlers["message_update"];
      
      // Short thinking (Low complexity)
      await handler({ message: { role: "assistant", content: [{ type: "thinking", thinking: "small" }] } }, mockCtx);
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("Low");
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("🔥");

      // Long thinking (Medium complexity)
      await handler({ message: { role: "assistant", content: [{ type: "thinking", thinking: "a".repeat(3000) }] } }, mockCtx);
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("Medium");
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("🔥");
    });

    test("should increase complexity based on tool calls", async () => {
      const handler = handlers["message_update"];
      const turnStartHandler = handlers["turn_start"];
      const toolResultHandler = handlers["tool_result"];

      await turnStartHandler({}, mockCtx);
      
      // Simulate multiple tool calls
      for (let i = 0; i < 6; i++) {
        await toolResultHandler({ toolName: "bash", details: {} }, mockCtx);
      }

      await handler({ message: { role: "assistant", content: [{ type: "thinking", thinking: "thought" }] } }, mockCtx);
      // Complexity score = (thinkingLen / 500) + (toolCount * 2) = (7/500) + (6 * 2) = 0.014 + 12 = 12.014 > 10
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("High");
      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("🔥");
    });
  });

  describe("Tool Call Descriptions", () => {
    test("should describe common tools in reasoning widget", async () => {
      const toolCallHandler = handlers["tool_call"];
      const messageUpdateHandler = handlers["message_update"];

      // Simulate a bash tool call
      await toolCallHandler({ 
        toolName: "bash", 
        input: { command: "ls -la" } 
      }, mockCtx);

      // Trigger widget update
      await messageUpdateHandler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "executing" }] } 
      }, mockCtx);

      expect(mockCtx.ui.setWidget.mock.lastCall[1][0]).toContain("🛠️ [core] run: ls -la");
    });
  });
});
