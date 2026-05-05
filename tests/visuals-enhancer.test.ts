import { expect, test, describe, beforeEach } from "bun:test";
import { VisualsEnhancerFeature } from "../src/features/visuals-enhancer";
import { createMockAPI, createMockContext } from "./mocks";

describe("VisualsEnhancerFeature Comprehensive Tests", () => {
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

  describe("Reasoning Extraction & UI Layout", () => {
    test("should extract multi-line goal and combine focus/next steps in one widget", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
I need to fix the bug.
Goal: Refactor the auth logic to support OAuth2
which requires updating the middleware and 
the session provider.

Plan:
1. Update middleware.ts
2. Update session.ts
3. Verify with tests
      `;
      
      await handler({ 
        message: { 
          role: "assistant", 
          content: [{ type: "thinking", thinking: thinkingText }] 
        } 
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      
      const lines = focusWidgetCall[1].map(l => l.trim());
      // Should start with "Focus: " and contain the multi-line goal
      expect(lines[0]).toBe("Focus: Refactor the auth logic to support OAuth2");
      expect(lines[1]).toBe("which requires updating the middleware and");
      expect(lines[2]).toBe("the session provider.");
      
      // Should have a blank line separator
      expect(lines.some(l => l === "")).toBe(true);
      
      // Should contain the next step
      expect(lines.some(l => l === "Next: 1. Update middleware.ts")).toBe(true);
    });

    test("should fallback to first paragraph if no explicit goal/plan is found", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
This is the first paragraph of my thinking.
It contains several lines of analysis.

This is the second paragraph.
      `;
      
      await handler({ 
        message: { 
          role: "assistant", 
          content: [{ type: "thinking", thinking: thinkingText }] 
        } 
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall[1][0]).toBe("Focus: This is the first paragraph of my thinking.");
    });

    test("should handle single step goals correctly", async () => {
      const handler = handlers["message_update"];
      const thinkingText = "Goal: Just one thing to do here.";
      
      await handler({ 
        message: { 
          role: "assistant", 
          content: [{ type: "thinking", thinking: thinkingText }] 
        } 
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      const lines = focusWidgetCall[1];
      expect(lines[0]).toBe("Focus: Just one thing to do here.");
      expect(lines.some(l => l === "Next: None")).toBe(true);
    });
  });

  describe("Sensitive Data Masking", () => {
    test("should mask sensitive data in tool call descriptions", async () => {
      const toolCallHandler = handlers["tool_call"];
      const messageUpdateHandler = handlers["message_update"];

      await toolCallHandler({ 
        toolName: "bash", 
        input: { command: "curl -H 'Authorization: Bearer sk-1234567890' https://api.example.com" } 
      }, mockCtx);

      await messageUpdateHandler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "testing" }] } 
      }, mockCtx);

      const toolWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-tool");
      expect(toolWidgetCall[1][0]).toContain("Bearer sk-12****");
      expect(toolWidgetCall[1][0]).not.toContain("sk-1234567890");
    });

    test("should mask sensitive data in full diffs", async () => {
      // Mock the tool result for an edit
      const toolResultHandler = handlers["tool_result"];
      
      await toolResultHandler({ 
        isError: false, 
        input: { path: "config.ts" }, 
        details: { diff: "- const KEY = 'secret-key-123'\n+ const KEY = 'new-secret-key-456'" } 
      }, mockCtx);

      // Trigger the command
      const commands = mockApi.__getCommands();
      const diffFullCmd = commands.get("diff-full").handler;
      await diffFullCmd([], mockCtx);

      const lastDiffWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "last-diff-full");
      expect(lastDiffWidgetCall[1].join("\n")).toContain("secret-key-****");
      expect(lastDiffWidgetCall[1].join("\n")).not.toContain("secret-key-123");
    });
  });

  describe("Complexity and Stats", () => {
    test("should not include tool count in stats widget", async () => {
      const handler = handlers["message_update"];
      
      // Simulate some tool calls to make sure toolCount > 0
      const toolResultHandler = handlers["tool_result"];
      await toolResultHandler({ toolName: "bash", details: {} }, mockCtx);
      await toolResultHandler({ toolName: "bash", details: {} }, mockCtx);

      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "thought" }] } 
      }, mockCtx);

      const statsWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-stats");
      const statsText = statsWidgetCall[1][0];
      
      expect(statsText).toContain("Complexity:");
      expect(statsText).toContain("Turns:");
      expect(statsText).not.toContain("Tools:");
    });
  });

  describe("Phase and Confidence Detection", () => {
    test("should detect Coding phase", async () => {
      const handler = handlers["message_update"];
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "I am now applying the fix to the file." }] } 
      }, mockCtx);

      const stateWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-state");
      expect(stateWidgetCall[1][0]).toContain("Coding");
    });

    test("should detect Low confidence", async () => {
      const handler = handlers["message_update"];
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "I am not sure if this is the right approach." }] } 
      }, mockCtx);

      const stateWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-state");
      expect(stateWidgetCall[1][0]).toContain("Confidence: Low");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty thinking content", async () => {
      const handler = handlers["message_update"];
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "" }] } 
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: No active step");
    });

    test("should handle turn start reset", async () => {
      const turnStartHandler = handlers["turn_start"];
      const toolResultHandler = handlers["tool_result"];
      const handler = handlers["message_update"];

      // Tool calls in turn 1
      await toolResultHandler({ toolName: "bash", details: {} }, mockCtx);
      await toolResultHandler({ toolName: "bash", details: {} }, mockCtx);
      
      await turnStartHandler({}, mockCtx);
      
      // Complexity calculation: (len / 500) + (turnToolCount * 2)
      // After turn_start, turnToolCount should be 0.
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: "thought" }] } 
      }, mockCtx);

      const statsWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-stats");
      // With toolCount = 0 and len = 7, complexity is Low.
      expect(statsWidgetCall[1][0]).toContain("Complexity: Low");
    });
  });

  describe("Complex Task Format Extraction", () => {
    test("should extract tasks from Plan header with numbered items", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Goal: Fix authentication bug

Plan:
1. Update middleware.ts
2. Update session.ts
3. Verify with tests
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      const lines = focusWidgetCall[1];
      
      expect(lines[0]).toBe("Focus: Fix authentication bug");
      expect(lines.some(l => l === "Next: 1. Update middleware.ts")).toBe(true);
    });

    test("should extract tasks from Goals header", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Objective: Improve performance

Goals:
1. Optimize database queries
2. Add caching layer
3. Reduce bundle size
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: Improve performance");
      expect(focusWidgetCall[1].some(l => l === "Next: 1. Optimize database queries")).toBe(true);
    });

    test("should extract tasks from bullet point lists", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Goal: Refactor the codebase

- Update error handling
- Add logging
- Improve documentation
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: Refactor the codebase");
      expect(focusWidgetCall[1].some(l => l.includes("Update error handling"))).toBe(true);
    });

    test("should extract tasks from keyword lists", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Goal: Deployment process

First, build the project
Then, run tests
Finally, deploy to production
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: Deployment process");
      expect(focusWidgetCall[1].some(l => l.includes("build the project"))).toBe(true);
    });

    test("should extract multi-line goal content", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `Goal: Implement OAuth2 authentication
which requires updating the middleware
and the session provider`;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      const lines = focusWidgetCall[1];
      
      expect(lines[0]).toBe("Focus: Implement OAuth2 authentication");
      expect(lines[1].trim()).toBe("which requires updating the middleware");
      expect(lines[2].trim()).toBe("and the session provider");
    });

    test("should extract from Steps header", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Goal: Complete feature

Steps:
1. Write unit tests
2. Implement feature
3. Run integration tests
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1].some(l => l.includes("Write unit tests"))).toBe(true);
    });

    test("should handle Task header", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Task: Fix critical bug

1. Reproduce the issue
2. Find root cause
3. Apply fix
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: Fix critical bug");
      expect(focusWidgetCall[1].some(l => l.includes("Reproduce the issue"))).toBe(true);
    });

    test("should handle Current goal header", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
Current goal: Update dependencies

1. Check for outdated packages
2. Update package.json
3. Run npm install
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall).toBeDefined();
      expect(focusWidgetCall[1][0]).toBe("Focus: Update dependencies");
    });

    test("should fallback to first paragraph when no explicit goal found", async () => {
      const handler = handlers["message_update"];
      const thinkingText = `
This is some thinking about the problem.
It has multiple lines of analysis.
      `;
      
      await handler({ 
        message: { role: "assistant", content: [{ type: "thinking", thinking: thinkingText }] }
      }, mockCtx);

      const focusWidgetCall = mockCtx.ui.setWidget.mock.calls.find((c: any) => c[0] === "agent-focus");
      expect(focusWidgetCall[1][0]).toBe("Focus: This is some thinking about the problem.");
    });
  });
});
