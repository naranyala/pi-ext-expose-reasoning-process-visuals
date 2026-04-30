import { Feature } from "../core/feature";
import { isEditToolResult, type ToolResultEvent, type ExtensionContext, type ToolCallEvent } from "@mariozechner/pi-coding-agent";
import { makeDiffConcise } from "../shared/diff-utils";
import { beautifyError } from "../shared/error-utils";
import { maskSensitiveData } from "../shared/utils";

/**
 * Reasoning tiers for providing varied visual feedback based on thinking length.
 */
enum ReasoningTier {
  None = "none",
  Short = "short",
  Medium = "medium",
  Deep = "deep",
}

enum DiffMode {
  Concise = "concise",
  Full = "full",
}

const TIER_CONFIG = {
  [ReasoningTier.None]: { label: "" },
  [ReasoningTier.Short]: { label: "Thinking..." },
  [ReasoningTier.Medium]: { label: "Reasoning..." },
  [ReasoningTier.Deep]: { label: "Deep Dive..." },
};

const TIER_THRESHOLDS = [
  { tier: ReasoningTier.Deep, min: 1000 },
  { tier: ReasoningTier.Medium, min: 400 },
  { tier: ReasoningTier.Short, min: 1 },
];

export class VisualsEnhancerFeature extends Feature {
  private currentTier: ReasoningTier = ReasoningTier.None;
  private diffMode: DiffMode = DiffMode.Concise;
  private turnToolCount = 0;
  private totalTurnCount = 0;
  private currentComplexity: "Low" | "Medium" | "High" = "Low";
  private lastFullDiff: { path: string; diff: string } | null = null;
  private currentSummary: string | null = null;
  private currentToolExtension: string | null = null;
  private currentToolCallDescription: any = null;
  private currentAnalysisStuck: boolean = false;
  private lastThinkingLength = 0;
  private lastToolStatus: "success" | "error" | "idle" = "idle";
  private currentPhase: "Analysis" | "Planning" | "Coding" | "Verification" | "Idle" = "Idle";
  private previousPhase: string | null = null;
  private currentConfidence: "High" | "Medium" | "Low" = "Medium";
  private workingSet: Set<string> = new Set();
  private goalStack: string[] = [];
  private thinkingHistory: number[] = [];
  private conceptSet: Set<string> = new Set();

  init() {
    this.ext.api.on("turn_start", async () => {
      this.turnToolCount = 0;
      this.totalTurnCount++;
      this.workingSet.clear();
      this.conceptSet.clear();
    });

    this.ext.command("visuals", "Configure visual enhancements", async (_args, ctx) => {
      const choice = await ctx.ui.select(
        "Visual Enhancements Settings",
        [
          { value: DiffMode.Concise, label: `Diff Mode: Concise ${this.diffMode === DiffMode.Concise ? "" : ""}` },
          { value: DiffMode.Full, label: `Diff Mode: Full ${this.diffMode === DiffMode.Full ? "" : ""}` },
        ]
      );
      if (choice) {
        this.diffMode = choice as DiffMode;
        ctx.ui.notify(`Diff mode set to ${this.diffMode}`, "info");
      }
    });

    this.ext.command("diff-full", "Show the full diff of the last edit", async (_args, ctx) => {
      if (!this.lastFullDiff) {
        ctx.ui.notify("No recent edit operation to show.", "warning");
        return;
      }
      ctx.ui.notify(`Showing full diff for ${this.lastFullDiff.path}`, "info");
      ctx.ui.setWidget("last-diff-full", [
        `File: ${this.lastFullDiff.path}`,
        "-----------------------------------",
        maskSensitiveData(this.lastFullDiff.diff),
        "-----------------------------------",
        "(Run /visuals to return to concise mode)"
      ]);
    });

    this.ext.api.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
      const toolName = event.toolName;
      const allTools = this.ext.api.getAllTools();
      const toolInfo = allTools.find(t => t.name === toolName);
      if (toolInfo?.sourceInfo) {
        const pathParts = toolInfo.sourceInfo.path.split('/');
        const extensionName = [...pathParts].reverse().find(part => 
          part !== 'src' && part !== 'dist' && part !== 'node_modules' && part !== 'lib' && part !== 'core'
        ) || toolInfo.sourceInfo.path.split('/').pop() || "unknown";
        this.currentToolExtension = toolInfo.sourceInfo.source || extensionName;
      } else {
        this.currentToolExtension = "core";
      }
      const input = event.input as any;
      if (input?.path) this.workingSet.add(input.path);
      this.currentToolCallDescription = this.getToolCallDescription(event);
      this.lastToolStatus = "idle";
      this.turnToolCount++;
      this.updateAgentWidgets(ctx);
    });

    this.ext.api.on("tool_result", async (event: ToolResultEvent, ctx: ExtensionContext) => {
      this.currentToolExtension = null;
      this.currentToolCallDescription = null;
      this.lastToolStatus = event.isError ? "error" : "success";
      this.updateAgentWidgets(ctx);
      if (event.isError) {
        if (this.diffMode === DiffMode.Concise) {
          this.diffMode = DiffMode.Full;
          ctx.ui.notify("Tool error detected. Switched to Full Diff mode for debugging.", "warning");
        }
        if (event.details) {
          const beautified = beautifyError(event.details);
          if (beautified !== event.details) event.details = beautified as any;
        }
      }
      if (isEditToolResult(event)) {
        const originalDiff = event.details?.diff;
        const input = event.input as any;
        const path = input?.path ?? "unknown";
        if (typeof originalDiff === "string") {
          this.lastFullDiff = { path, diff: originalDiff };
          if (this.diffMode === DiffMode.Full) return;
          const conciseDiff = makeDiffConcise(originalDiff);
          if (conciseDiff !== originalDiff) {
            event.details = { ...event.details, diff: conciseDiff };
          }
        }
      }
    });

    this.ext.api.on("message_update", async (event: any, ctx: ExtensionContext) => {
      const assistantMsg = event.message;
      if (assistantMsg.role !== "assistant") return;
      const thinkingContent = assistantMsg.content.find((c: any) => c.type === "thinking");
      const text = String(thinkingContent?.thinking ?? "");
      const length = text.length;
      const tier = TIER_THRESHOLDS.find(t => length >= t.min)?.tier ?? ReasoningTier.None;
      const summary = this.extractSummary(text);
      const analysis = this.analyzeReasoning(text);
      const complexity = this.calculateComplexity(length);
      const phase = this.detectPhase(text);
      const confidence = this.detectConfidence(text);
      this.updateGoalStack(text);
      this.extractConcepts(text);
      this.thinkingHistory.push(length);
      if (this.thinkingHistory.length > 5) this.thinkingHistory.shift();
      if (tier !== this.currentTier || complexity !== this.currentComplexity || summary !== this.currentSummary || analysis.isStuck !== this.currentAnalysisStuck || phase !== this.currentPhase || confidence !== this.currentConfidence) {
        this.previousPhase = this.currentPhase;
        this.currentTier = tier;
        this.currentComplexity = complexity;
        this.currentSummary = summary;
        this.currentAnalysisStuck = analysis.isStuck;
        this.lastThinkingLength = length;
        this.currentPhase = phase;
        this.currentConfidence = confidence;
        this.updateAgentWidgets(ctx);
      }
    });
  }

  private detectPhase(text: string): "Analysis" | "Planning" | "Coding" | "Verification" | "Idle" {
    if (!text) return "Idle";
    const patterns = {
      Analysis: /investigating|looking at|searching for|exploring|trying to understand|analyzing/i,
      Planning: /plan is|will first|step 1|going to|outline|strategy/i,
      Coding: /applying the fix|writing the code|updating the file|implementing/i,
      Verification: /verifying|checking if|testing|validating|confirming/i,
    };
    for (const [phase, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return phase as any;
    }
    return "Analysis";
  }

  private detectConfidence(text: string): "High" | "Medium" | "Low" {
    if (!text) return "Medium";
    const markers = {
      High: /certainly|definitely|clearly|confident|(?<!not\s)sure/i,
      Low: /not sure|maybe|possibly|might be|i think|let me double check/i,
    };
    if (markers.Low.test(text)) return "Low";
    if (markers.High.test(text)) return "High";
    return "Medium";
  }

  private calculateComplexity(thinkingLength: number): "Low" | "Medium" | "High" {
    const score = (thinkingLength / 500) + (this.turnToolCount * 2);
    if (score > 10) return "High";
    if (score > 4) return "Medium";
    return "Low";
  }

  private analyzeReasoning(text: string): { isStuck: boolean } {
    if (!text) return { isStuck: false };
    const stuckPatterns = [/wait, let me rethink/i, /actually, that might be wrong/i, /I am confused/i, /let me try again/i, /wait, I just realized/i, /(.*)\n\1\n\1/];
    return { isStuck: stuckPatterns.some(p => p.test(text)) };
  }

  private extractSummary(text: string): string | null {
    if (!text) return null;
    const patterns = [/Goal:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i, /Plan:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i, /I will\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i, /Objective:\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
    if (paragraphs.length > 0) return paragraphs[0];
    return null;
  }

  private updateGoalStack(text: string) {
    const patterns = [/(?:Step \d+:)\s*([\s\S]*?)(?=\n\n|\nStep \d+:|$)/gi, /(\d\.\s[\s\S]*?)(?=\n\n|\n\d\.\s|$)/gi, /(?:First,|Then,|Finally,)\s*([\s\S]*?)(?=\n\n|\n(?:First,|Then,|Finally,)|$)/gi];
    let found = false;
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        this.goalStack = matches.map(m => m[1] || m[0]).map(s => s.trim());
        found = true;
        break;
      }
    }
    if (!found && this.currentSummary) this.goalStack = [this.currentSummary];
  }

  private extractConcepts(text: string) {
    const conceptRegex = /\b([A-Z][a-zA-Z0-9_]+|[a-z_][a-z0-9_]*[A-Z][a-zA-Z0-9_]*|[A-Z_]{3,})\b/g;
    const matches = text.match(conceptRegex);
    if (matches) matches.forEach(m => { if (m.length > 3) this.conceptSet.add(m); });
  }

  private updateAgentWidgets(ctx: ExtensionContext) {
    if (this.currentTier === ReasoningTier.None) {
      ctx.ui.setWidget("agent-status", []);
    } else {
      const { label } = TIER_CONFIG[this.currentTier];
      const status = this.currentAnalysisStuck ? `Stuck: Agent seems confused/looping...` : label;
      ctx.ui.setWidget("agent-status", [status]);
    }
    const phaseTransition = this.previousPhase && this.previousPhase !== this.currentPhase ? `${this.previousPhase} -> ${this.currentPhase}` : this.currentPhase;
    ctx.ui.setWidget("agent-state", [`Phase: ${phaseTransition} | Confidence: ${this.currentConfidence}`]);
    
    const currentFocus = this.currentSummary || this.goalStack[0] || "No active step";
    const nextFocus = this.currentSummary ? (this.goalStack[0] || "None") : (this.goalStack[1] || "None");
    
    const focusLines = currentFocus.split('\n').map((line, i) => i === 0 ? `Focus: ${line}` : `  ${line}`);
    const nextLines = nextFocus.split('\n').map((line, i) => i === 0 ? `Next: ${line}` : `  ${line}`);
    
    ctx.ui.setWidget("agent-focus", [...focusLines, "", ...nextLines]);
    ctx.ui.setWidget("agent-next", []);
    if (this.conceptSet.size > 0) {
      const concepts = Array.from(this.conceptSet).slice(0, 4).join(', ');
      ctx.ui.setWidget("agent-concepts", [`Concepts: ${concepts}`]);
    } else {
      ctx.ui.setWidget("agent-concepts", []);
    }
    if (this.workingSet.size > 0) {
      const files = Array.from(this.workingSet).map(f => f.split('/').pop()).join(', ');
      ctx.ui.setWidget("agent-context", [`Context: ${files}`]);
    } else {
      ctx.ui.setWidget("agent-context", []);
    }
    const stats = `Complexity: ${this.currentComplexity} | Turns: ${this.totalTurnCount}`;
    ctx.ui.setWidget("agent-stats", [stats]);
    if (this.currentToolExtension || this.currentToolCallDescription) {
      const ext = this.currentToolExtension ? `[${this.currentToolExtension}]` : "";
      const desc = this.currentToolCallDescription ? ` ${this.currentToolCallDescription}` : "";
      ctx.ui.setWidget("agent-tool", [`Tool: ${ext}${desc}`]);
    } else {
      ctx.ui.setWidget("agent-tool", []);
    }
  }

  private getToolCallDescription(event: ToolCallEvent): string {
    const toolName = event.toolName;
    const input = event.input as any;
    let description = "";
    switch (toolName) {
      case "bash": description = `run: ${input.command}`; break;
      case "read": description = `read: ${input.path}`; break;
      case "edit": description = `edit: ${input.path}`; break;
      case "write": description = `write: ${input.path}`; break;
      case "grep": description = `grep: ${input.pattern} in ${input.path}`; break;
      case "find": description = `find: ${input.pattern}`; break;
      case "ls": description = `ls: ${input.path}`; break;
      default:
        try {
          if (typeof input === 'object' && input !== null) {
            description = JSON.stringify(input);
          } else {
            description = String(input);
          }
        } catch {
          description = "unknown call";
        }
    }
    return maskSensitiveData(description);
  }
}
