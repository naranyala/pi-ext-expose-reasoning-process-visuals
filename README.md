# 🎨 Visuals Enhancer for Pi

Enhance your terminal-based AI pair programming experience. This extension reduces visual noise from code diffs and provides real-time, high-fidelity insights into the agent's reasoning process—all within your existing TUI.

---

## 🌟 Key Features

### 1. 🔍 Concise Diffs
Tired of scrolling through 50 lines of unchanged code just to see a 2-line fix?
- **Smart Truncation**: Automatically hides irrelevant context lines, replacing them with subtle `  ...` indicators.
- **Context Awareness**: Intelligently preserves lines immediately adjacent to changes so you never lose the "where."
- **One-Key Recovery**: Use `/diff-full` to instantly view the complete, original diff if you need the full picture.
- **Error Protection**: Automatically switches back to "Full Diff" mode if an operation fails, ensuring you have all the data for debugging.

### 2. 🧠 Reasoning Intelligence
Go beyond a static "Thinking..." spinner. Get a real-time pulse on the agent's brain:
- **Tiered Feedback**: Visual cues evolve as the agent thinks deeper (💭 $\rightarrow$ 🧠 $\rightarrow$ 🌌).
- **Goal Extraction**: Automatically identifies and displays the agent's current **🎯 Goal** or **Plan** directly in a status widget.
- **Complexity Heatmap**: See a "Complexity Score" (Low/Medium/High) calculated from thinking duration and tool usage intensity.
- **Stuck Detection**: Real-time analysis detects if the agent is confused or looping (e.g., "wait, let me rethink...") and alerts you with a `⚠️`.
- **Live Tool Tracking**: See exactly which tool is running and its key arguments without checking logs.

### 3. 🛠️ Interactive Control
- `/visuals`: Open a TUI menu to toggle between Concise and Full diff modes.
- `/diff-full`: Recover the last modified file's full diff.

---

## 🚀 Quick Start

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/pi-visuals-enhancer.git
   cd pi-visuals-enhancer
   ```

2. **Install dependencies**:
   ```bash
   bun install  # or npm install
   ```

3. **Run with Pi**:
   ```bash
   pi -e src/index.ts
   ```

Alternatively, copy the project to your local Pi extensions directory:
```bash
mkdir -p ~/.pi/extensions/visuals-enhancer
cp -r . ~/.pi/extensions/visuals-enhancer
```

---

## 🏗️ Architecture

This extension is built with a focus on **extensibility** and **zero-dependency** performance:

- **Proxy-Based API**: Uses a `PiExtension` wrapper with JS Proxies to provide a cleaner, more discoverable developer experience.
- **Feature/Registry Pattern**: Core logic is decoupled into independent `Feature` modules. Adding a new visual enhancement is as simple as creating a new class and registering it.
- **Automated Testing**: Robust test suite using `bun test` covering edge cases in diff processing, error beautification, and reasoning heuristics.

---

## 📅 Roadmap

- [ ] **🦀 Rust-Native CLI (Alternative)**: Porting heavy diff processing and NLP heuristics to a high-speed Rust binary for sub-millisecond updates.
- [ ] **Token Usage Tracker**: Real-time estimation of session token costs in the status widget.
- [ ] **Diff History**: A browsable history of concise diffs across the entire session.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built for the [Pi Coding Agent](https://pi.mariozechner.dev).*
