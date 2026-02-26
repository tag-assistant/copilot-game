# 🐱 Copilot Game - Mona's Adventure

A pixel art coding companion that lives in your VS Code editor! Watch **Mona the cat-topus** (a cat with octopus tentacles) react to your coding in real-time.

## ✨ Features

### 🎮 Living Pixel Art Pet
- **Mona** is a hand-drawn 20x20 pixel art character with smooth 4-frame animations
- She reacts to everything you do: coding, saving, opening files, using the terminal
- Tentacles wave and animate with each action
- Falls asleep (curled up with ZZZ) after 30 seconds of idle

### ⚔️ Bug Combat System
- **Errors** in your code spawn red bugs that walk toward Mona
- **Warnings** spawn smaller yellow bugs
- Mona auto-attacks with tentacle swipes when fighting
- Hit effects: white flash, knockback, death animation with particles
- Error count badge in the corner

### 📊 XP & Leveling System
- Earn XP for: coding (1 XP), visiting files (5 XP), saving (10 XP), defeating bugs (10 XP), Copilot assists (15 XP)
- Level up with golden sparkle animations and fanfare
- XP bar at the top of the panel
- Stats persist across sessions

### 🏠 Dynamic Room Environments
- Each file gets a unique room with hue based on filename
- **Furniture changes by file type:**
  - `.ts/.js` → Computer desk, monitors, coffee cup
  - `.json/.yaml` → Filing cabinet
  - `.md/.txt` → Bookshelf
  - `.css/.html` → Paint easel
- Door sprite for room transitions
- Ambient floating dust motes

### ✨ Particle Effects
- **Coding:** Blue sparkles float from keyboard area
- **Terminal:** Purple magic circle under Mona
- **Save:** Golden pulse wave radiates outward
- **Errors:** Red flash + screen shake
- **Celebrate:** Confetti shower
- **Level Up:** Expanding ring of golden particles
- **Copilot:** Special blue sparkle effect

### 🤖 Copilot Integration
- Detects Copilot suggestion accepts (large text insertions)
- Special sparkle effect + "✨ Copilot assisted!" status
- Copilot assists tracked as a separate stat

### 🔊 Retro Sound Effects (Optional)
- Web Audio API oscillator bleeps
- Typing clicks, save dings, error tones, bug pop, level-up fanfare
- Disabled by default — enable in settings

### 📺 HUD
- XP progress bar (gradient: blue → green → gold)
- Level indicator
- Current state icon (⌨️ ⚔️ 🔮 😴)
- Streak counter
- Hover for full stats tooltip

## ⌨️ Usage

1. **Open the game:** `Ctrl+Shift+M` / `Cmd+Shift+M` or click "Mona" in the status bar
2. **Code normally** — Mona reacts to everything
3. **Fix bugs** — watch Mona fight error bugs with her tentacles
4. **Level up** — track your coding progress

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `copilotGame.autoOpen` | `false` | Open panel on VS Code start |
| `copilotGame.soundEnabled` | `false` | Enable retro sound effects |
| `copilotGame.monaSize` | `64` | Sprite size: 48, 64, or 96 |
| `copilotGame.showXPBar` | `true` | Show XP progress bar |

## 🛠️ Development

```bash
npm run build     # Build extension + webview
npm run watch     # Watch mode
npm run package   # Create .vsix
```

## 📦 Install

Install the `.vsix` file:
1. Open VS Code
2. `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the `.vsix` file

## License

MIT
