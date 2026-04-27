import { expect, mock } from "bun:test";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

export const createMockUI = () => ({
  notify: mock(() => {}),
  confirm: mock(() => Promise.resolve(true)),
  select: mock(() => Promise.resolve("")),
  input: mock(() => Promise.resolve("")),
  setStatus: mock(() => {}),
  setWidget: mock(() => {}),
});

export const createMockContext = () => ({
  ui: createMockUI(),
  cwd: "/mock/cwd",
  sessionManager: {},
  signal: new AbortController().signal,
  hasUI: true,
  isIdle: mock(() => true),
  abort: mock(() => {}),
  hasPendingMessages: mock(() => false),
  shutdown: mock(() => {}),
  getContextUsage: mock(() => ({ tokens: 0 })),
  compact: mock(() => {}),
  getSystemPrompt: mock(() => ""),
});

export const createMockAPI = () => {
  const api = {
    _commands: new Map(),
    _tools: new Map(),
    _events: new Map(),

    on: mock((event: string, handler: any) => {
      const existing = api._events.get(event) || [];
      existing.push(handler);
      api._events.set(event, existing);
    }),

    registerTool: mock((tool: any) => {
      api._tools.set(tool.name, tool);
    }),

    registerCommand: mock((name: string, options: any) => {
      api._commands.set(name, options);
    }),

    registerShortcut: mock(() => {}),
    registerFlag: mock(() => {}),
    sendMessage: mock(() => {}),
    sendUserMessage: mock(() => {}),
    appendEntry: mock(() => {}),
    setSessionName: mock(() => {}),
    getSessionName: mock(() => ""),
    setLabel: mock(() => {}),
    getCommands: mock(() => []),
    getActiveTools: mock(() => []),
    getAllTools: mock(() => []),
    setActiveTools: mock(() => {}),
    exec: mock(() => Promise.resolve({ stdout: "", stderr: "", code: 0, killed: false })),
    setModel: mock(() => Promise.resolve(true)),
    getThinkingLevel: mock(() => "off"),
    setThinkingLevel: mock(() => {}),
    registerProvider: mock(() => {}),
    unregisterProvider: mock(() => {}),
    getFlag: mock(() => undefined),

    // Helper methods for tests
    __getCommands() { return this._commands; },
    __getTools() { return this._tools; },
    __getEvents() { return this._events; },
  };
  return api;
};

// Alias for compatibility with template tests
export const createMockPi = createMockAPI;
