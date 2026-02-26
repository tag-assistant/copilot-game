# 🐱 Copilot Game — Agent Visualizer

**Watch Copilot work as a pixel art adventure!**

Mona the cat-topus is Copilot's avatar. She visualizes what Copilot agent mode is doing in real-time — reading files, writing code, running terminal commands, and fighting bugs.

## ✨ What It Does

When Copilot (or any AI agent in VS Code) starts working, Mona comes alive:

- 📂 **Agent reads a file** → Mona walks into that room
- ⌨️ **Agent edits code** → Mona codes (building animation + particles)
- 🏗️ **Agent creates a file** → Mona builds a new room (construction particles)
- 🗑️ **Agent deletes code** → Mona demolishes (breaking animation)
- 🔮 **Agent runs terminal commands** → Mona casts spells
- 🐛 **Errors appear** → Bugs spawn, Mona fights them
- 🎉 **Errors fixed** → Bugs die, celebration!
- 😴 **Agent stops** → Mona sleeps, session summary appears

## 🤖 Smart Agent Detection

Uses pure VS Code extension API heuristics to distinguish agent activity from human typing:

- Document changes in non-focused files → agent
- Large block insertions (>20 chars at once) → agent
- Rapid multi-file edits (<2s between files) → agent
- Files opening without user click → agent
- Terminal activity without user focus → agent

Works with **any** AI agent: GitHub Copilot, Claude, Cursor, etc.

## 🎮 Features

- **Activity Log** — Retro terminal showing Copilot's actions in real-time
- **File Map** — Visual showing files as rooms with Mona's path
- **Session Summary** — Stats when Copilot finishes (files, lines, time)
- **Copilot Status Badge** — Pulsing indicator (ACTIVE / IDLE / WAITING)
- **XP & Leveling** — Mona levels up as Copilot works
- **Bug Combat** — Errors spawn as pixel art enemies
- **Particle Effects** — Coding sparkles, construction dust, spell circles
- **8 Sprite Animations** — idle, walk, code, spell, fight, celebrate, damage, sleep

## 📦 Install

1. Download the `.vsix` from [Releases](https://github.com/tag-assistant/copilot-game/releases)
2. In VS Code: `Ctrl+Shift+P` → "Install from VSIX..."
3. Open with `Ctrl+Shift+M` / `Cmd+Shift+M` or click the Mona status bar icon

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `copilotGame.autoOpen` | `false` | Auto-open when VS Code starts |
| `copilotGame.soundEnabled` | `false` | Enable retro sound effects |
| `copilotGame.monaSize` | `64` | Sprite size (48, 64, or 96) |
| `copilotGame.showXPBar` | `true` | Show XP progress bar |

## 🔧 Technical

- Zero dependencies beyond VS Code API
- No MCP tools registered (doesn't waste Copilot context)
- Pure heuristic-based detection
- Performant canvas rendering with pixel art sprites

## License

MIT
