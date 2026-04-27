# Project Roadmap: Visuals Enhancer Extension

## 🏗️ Architecture & Abstractions

### Core Framework
- **`PiExtension` (Proxy Wrapper)**: A high-level wrapper around `ExtensionAPI` that uses JS Proxies for cleaner access to core methods and adds convenience methods for command registration and logging.
- **`Feature` / `Registry` Pattern**: Decoupled architecture where features are independent classes registered through a central registry, facilitating scalability and testing.
- **Shared Utilities**: Centralized logic for diffing (`diff-utils.ts`), error processing (`error-utils.ts`), and general helpers (`utils.ts`).

### Data Flow
1. **Turn Lifecycle**: Tracks `turn_start`, `tool_call`, `tool_result`, `message_update`, and `turn_end`.
2. **UI Updates**: Uses `ctx.ui.setWidget` for real-time reasoning status and `ctx.ui.notify` for lifecycle feedback.
3. **Diff Interception**: Hooks into `tool_result` to transform raw diffs from the `edit` tool into concise versions before they are rendered to the user.

## 🚀 Feature Set

### 1. Concise Diffs
- [x] **Smart Context Truncation**: Replaces non-essential context with `  ...` indicators.
- [x] **Change Isolation**: Keeps lines immediately adjacent to `+`/`-` changes for context.
- [x] **Persistence**: Stores the `lastFullDiff` for quick recovery via `/diff-full`.
- [x] **Dynamic Switching**: Automatically reverts to `Full` diff mode if a tool error occurs.

### 2. Reasoning Process Visuals
- [x] **Tiered Status**: Dynamic emojis based on thinking length (💭 $\rightarrow$ 🧠 $\rightarrow$ 🌌).
- [x] **Goal/Plan Extraction**: Heuristic extraction of "Goal:" or "Plan:" lines from thinking blocks.
- [x] **Complexity Heatmap**: Real-time estimation of turn complexity (Low/Medium/High) based on thinking length and cumulative tool calls.
- [x] **Stuck Detection**: Detects agent "loops" or hesitation patterns (e.g., "wait, let me rethink") and displays a warning ⚠️.
- [x] **Active Tool Feedback**: Shows the currently executing tool and its arguments (truncated) in the reasoning widget.

### 3. Interactive TUI
- [x] **Configuration**: `/visuals` command to toggle between `Concise` and `Full` diff modes.
- [x] **Recovery**: `/diff-full` to see the original diff of the last operation.

## 📊 Validation Status

### ✅ Confirmed Working
- **Real-time Updates**: Handlers for `message_update` and `tool_call` work without blocking the agent.
- **Error Robustness**: `beautifyError` handles complex nested JSON errors and raw string failures.
- **Testing Coverage**: 20+ tests covering diff edge cases, logic, and complexity calculations.

### ⚠️ Potential Bugs & Technical Debt
- [ ] **State Sync**: If the extension crashes or reloads, `lastFullDiff` is lost (it's in-memory).
- [ ] **Widget Overflow**: Very long tool descriptions or summaries might exceed terminal widget width limits.
- [ ] **Regex Fragility**: Summary extraction relies on specific patterns; might miss goals that don't use "Goal:" or "Plan:" prefixes.
- [ ] **Duplicate Edits**: If multiple `edit` calls happen in one turn, only the *last* one is recoverable via `/diff-full`.

### ❌ Confirmed Impossible
- **Direct Input Bar Styling**: Core TUI limits prevents changing prompt bar colors/fonts.
- **Tool Cancellation**: Cannot stop a tool call once issued by the agent.

## 📅 Future Roadmap

### Phase 1: Native Integration (Alternative)
- [ ] **🦀 Rust-Native CLI**:
  - Implement `makeDiffConcise` and `Reasoning Analysis` in a high-performance Rust binary.
  - Call via `std::process::Command` to reduce extension overhead.
  - Zero-dependency static build for portability.

### Phase 2: Intelligence Expansion
- [ ] **Token Usage Tracker**: Add real-time token consumption estimate to the reasoning widget.
- [ ] **Conflict Prediction**: Analyze diffs before applying to predict potential merge conflicts.

### Phase 3: Polishing
- [ ] Implement state-based throttling to prevent TUI flicker during high-speed reasoning.
- [ ] Add a "Diff History" browser to view previous turn changes.
