# Copilot Game - Mona's Adventure 🐱

A VS Code extension that visualizes your coding activity as a pixel art game starring Mona the cat (GitHub's mascot).

## Features

- **Pixel art Mona** reacts to your editor activity in real-time
- **Room system** - each file is a unique room with its own color scheme
- **Coding streaks** - watch your combo counter grow as you type
- **Bug enemies** spawn when errors appear in your code
- **Spell casting** when using the terminal
- **Checkpoint saves** on file save
- **Particle effects** for all actions

## How Mona Reacts

| Editor Event | Mona's Action |
|---|---|
| Open/switch file | Walks to new room |
| Type code | Coding animation + particles |
| Save file | Checkpoint sparkles |
| Open terminal | Casts a spell |
| Errors appear | Bug enemies spawn, Mona fights |
| Errors fixed | Celebration dance |
| No activity (5s) | Idle animation |

## Install

```bash
cd copilot-game
npm install
npm run build
npx @vscode/vsce package --no-dependencies
code --install-extension copilot-game-0.1.0.vsix
```

## Usage

1. Open Command Palette (`Cmd+Shift+P`)
2. Run **"Open Copilot Game"**
3. Code away and watch Mona react!
