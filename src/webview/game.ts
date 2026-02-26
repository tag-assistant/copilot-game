import {
  getMonaSprites, getEnemySprites, getFurnitureSprites,
  SpriteAnimation, SpriteSet, FurnitureSprites,
  getFurnitureType, FurnitureType, getMonaFaceDataURL
} from './sprites';
import { setSoundEnabled, sfxType, sfxSave, sfxError, sfxBugDefeated, sfxLevelUp, sfxCopilot } from './sound';

// ===== Types =====
interface GameEvent {
  type: 'fileOpen' | 'fileChange' | 'fileSave' | 'terminal' | 'errorsAppear' | 'errorsCleared'
    | 'warningsAppear' | 'idle' | 'init' | 'copilotAssist' | 'configUpdate';
  file?: string;
  errorCount?: number;
  warningCount?: number;
  config?: GameConfig;
}

interface GameConfig {
  soundEnabled?: boolean;
  monaSize?: number;
  showXPBar?: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  type?: 'normal' | 'confetti' | 'dust' | 'ring';
  angle?: number;
}

interface Enemy {
  x: number; y: number;
  hp: number; maxHp: number;
  bobOffset: number;
  dying: boolean; dyingTimer: number;
  isWarning: boolean;
  speed: number;
  flashTimer: number;
  knockbackVx: number;
}

type MonaState = 'idle' | 'walk' | 'code' | 'spell' | 'fight' | 'celebrate' | 'damage' | 'sleep';

interface Stats {
  linesCoded: number;
  filesVisited: number;
  bugsDefeated: number;
  savesMade: number;
  copilotAssists: number;
  totalXP: number;
  level: number;
}

interface GameState {
  monaX: number;
  monaY: number;
  targetX: number;
  targetY: number;
  state: MonaState;
  stateTimer: number;
  prevState: MonaState;
  currentFile: string;
  roomHue: number;
  furnitureType: FurnitureType;
  animFrame: number;
  animTimer: number;
  facingRight: boolean;
  particles: Particle[];
  enemies: Enemy[];
  streak: number;
  streakTimer: number;
  statusText: string;
  statusTimer: number;
  idleTimer: number;
  deepIdleTimer: number;
  shakeTimer: number;
  stats: Stats;
  levelUpTimer: number;
  levelUpText: string;
  errorBadge: number;
  attackCooldown: number;
  config: GameConfig;
  dustTimer: number;
}

// ===== Canvas Setup =====
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const statusEl = document.getElementById('status')!;
const fileEl = document.getElementById('file')!;
const streakEl = document.getElementById('streak')!;
const xpBarEl = document.getElementById('xp-bar-fill') as HTMLElement;
const xpBarContainer = document.getElementById('xp-bar') as HTMLElement;
const levelEl = document.getElementById('level')!;
const stateIconEl = document.getElementById('state-icon')!;
const statsTooltipEl = document.getElementById('stats-tooltip')!;

let W = 400, H = 300;
let monaSize = 64;

function resize() {
  W = canvas.parentElement!.clientWidth;
  H = canvas.parentElement!.clientHeight - 56; // HUD + XP bar
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

let sprites: SpriteSet;
let enemySprites: ReturnType<typeof getEnemySprites>;
let furniture: FurnitureSprites;

function initSprites(size: number) {
  monaSize = size;
  sprites = getMonaSprites(size);
  enemySprites = getEnemySprites(Math.floor(size * 0.75));
  furniture = getFurnitureSprites(size);
}
initSprites(64);

// ===== State =====
const state: GameState = {
  monaX: 0, monaY: 0,
  targetX: 0, targetY: 0,
  state: 'idle',
  stateTimer: 0,
  prevState: 'idle',
  currentFile: 'Welcome!',
  roomHue: 220,
  furnitureType: 'default',
  animFrame: 0,
  animTimer: 0,
  facingRight: true,
  particles: [],
  enemies: [],
  streak: 0,
  streakTimer: 0,
  statusText: '🐱 Mona is ready!',
  statusTimer: 0,
  idleTimer: 0,
  deepIdleTimer: 0,
  shakeTimer: 0,
  stats: { linesCoded: 0, filesVisited: 0, bugsDefeated: 0, savesMade: 0, copilotAssists: 0, totalXP: 0, level: 1 },
  levelUpTimer: 0,
  levelUpText: '',
  errorBadge: 0,
  attackCooldown: 0,
  config: { soundEnabled: false, monaSize: 64, showXPBar: true },
  dustTimer: 0,
};

// Position Mona after first resize
state.monaX = W / 2 - monaSize / 2;
state.monaY = H - monaSize - 20;
state.targetX = state.monaX;
state.targetY = state.monaY;

// ===== XP System =====
function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}

function addXP(amount: number) {
  state.stats.totalXP += amount;
  const needed = xpForLevel(state.stats.level);
  let xpInLevel = state.stats.totalXP;
  let lvl = 1;
  let req = xpForLevel(1);
  while (xpInLevel >= req) {
    xpInLevel -= req;
    lvl++;
    req = xpForLevel(lvl);
  }
  if (lvl > state.stats.level) {
    state.stats.level = lvl;
    state.levelUpTimer = 2.5;
    state.levelUpText = `Level ${lvl}!`;
    spawnLevelUpParticles();
    sfxLevelUp();
  }
  state.stats.level = lvl;
  updateXPBar(xpInLevel, req);
  updateStatsTooltip();
  // Persist
  postToExtension({ type: 'saveStats', stats: state.stats });
}

function updateXPBar(current: number, needed: number) {
  if (!xpBarEl) return;
  const pct = Math.min(100, (current / needed) * 100);
  xpBarEl.style.width = `${pct}%`;
  if (levelEl) levelEl.textContent = `Lv.${state.stats.level}`;
}

function updateStatsTooltip() {
  if (!statsTooltipEl) return;
  const s = state.stats;
  statsTooltipEl.textContent = `Lines: ${s.linesCoded} | Files: ${s.filesVisited} | Bugs: ${s.bugsDefeated} | Saves: ${s.savesMade} | Copilot: ${s.copilotAssists}`;
}

function postToExtension(msg: any) {
  try {
    (window as any).acquireVsCodeApi?.()?.postMessage?.(msg);
  } catch { /* webview may not have vscode api */ }
}

// Lazily acquire vscode API once
const vscodeApi = (() => {
  try { return (window as any).acquireVsCodeApi(); } catch { return null; }
})();
function postMsg(msg: any) {
  vscodeApi?.postMessage?.(msg);
}

// ===== Room Drawing =====
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function drawRoom() {
  const h = state.roomHue;
  // Floor
  ctx.fillStyle = `hsl(${h}, 30%, 15%)`;
  ctx.fillRect(0, 0, W, H);
  // Tile pattern
  const tileSize = 32;
  for (let y = 0; y < H; y += tileSize) {
    for (let x = 0; x < W; x += tileSize) {
      const alt = ((x / tileSize | 0) + (y / tileSize | 0)) % 2;
      ctx.fillStyle = alt ? `hsl(${h}, 25%, 13%)` : `hsl(${h}, 30%, 16%)`;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  // Wall
  ctx.fillStyle = `hsl(${h}, 35%, 20%)`;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = `hsl(${h}, 40%, 25%)`;
  ctx.fillRect(0, 55, W, 8);

  // Door on left wall
  if (furniture) {
    ctx.drawImage(furniture.door, 10, H - monaSize - 30, monaSize * 0.8, monaSize);
  }

  // Furniture based on file type
  drawFurniture();

  // Room name
  ctx.fillStyle = `hsl(${h}, 50%, 60%)`;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  const shortName = state.currentFile.split('/').pop() || state.currentFile;
  ctx.fillText(`📁 ${shortName}`, W / 2, 35);
  ctx.textAlign = 'left';
}

function drawFurniture() {
  if (!furniture) return;
  const ft = state.furnitureType;
  const fSize = monaSize * 0.8;
  const rightX = W - fSize - 20;
  const bottomY = H - fSize - 10;

  switch (ft) {
    case 'code':
      ctx.drawImage(furniture.desk, rightX, 65, fSize, fSize);
      ctx.drawImage(furniture.coffee, rightX - fSize * 0.4, bottomY, fSize * 0.5, fSize * 0.5);
      break;
    case 'data':
      ctx.drawImage(furniture.cabinet, rightX, 65, fSize, fSize);
      break;
    case 'docs':
      ctx.drawImage(furniture.bookshelf, rightX, 65, fSize, fSize);
      break;
    case 'design':
      ctx.drawImage(furniture.easel, rightX, 65, fSize, fSize);
      break;
    default:
      ctx.drawImage(furniture.desk, rightX, 65, fSize, fSize);
      break;
  }
}

// ===== State Management =====
function setState(newState: MonaState, duration = 0) {
  if (state.state === newState && duration === 0) return;
  state.prevState = state.state;
  state.state = newState;
  state.stateTimer = duration;
  state.animFrame = 0;
  state.animTimer = 0;
  updateStateIcon();
}

function updateStateIcon() {
  if (!stateIconEl) return;
  const icons: Record<MonaState, string> = {
    idle: '😊', walk: '🚶', code: '⌨️', spell: '🔮',
    fight: '⚔️', celebrate: '🎉', damage: '💥', sleep: '😴'
  };
  stateIconEl.textContent = icons[state.state] || '🐱';
}

function setStatus(text: string) {
  state.statusText = text;
  state.statusTimer = 3;
}

// ===== Particles =====
function spawnParticles(x: number, y: number, color: string, count: number, type: Particle['type'] = 'normal') {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * (type === 'confetti' ? 6 : 4),
      vy: type === 'confetti' ? -Math.random() * 4 - 2 : -Math.random() * 3 - 1,
      life: 1,
      maxLife: type === 'confetti' ? 1.5 : 0.5 + Math.random() * 0.5,
      color,
      size: type === 'confetti' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      type: type || 'normal',
    });
  }
}

function spawnDustMotes() {
  if (state.particles.length > 100) return;
  state.particles.push({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.1 - Math.random() * 0.2,
    life: 1,
    maxLife: 3 + Math.random() * 3,
    color: `hsl(${state.roomHue}, 20%, 50%)`,
    size: 1 + Math.random() * 1.5,
    type: 'dust',
  });
}

function spawnCodingParticles() {
  const x = state.monaX + monaSize / 2 + (Math.random() - 0.5) * 20;
  const y = state.monaY + monaSize * 0.6;
  spawnParticles(x, y, '#3498db', 2);
}

function spawnSaveWave() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY + monaSize / 2;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    state.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      life: 1, maxLife: 0.8,
      color: '#f1c40f',
      size: 3,
      type: 'ring',
      angle,
    });
  }
}

function spawnTerminalCircle() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY + monaSize;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    state.particles.push({
      x: cx + Math.cos(angle) * 20,
      y: cy + Math.sin(angle) * 8,
      vx: 0, vy: -0.5,
      life: 1, maxLife: 1.5,
      color: '#9b59b6',
      size: 2 + Math.random() * 2,
      type: 'ring',
      angle,
    });
  }
}

function spawnLevelUpParticles() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY + monaSize / 2;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    state.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      life: 1, maxLife: 1.2,
      color: i % 2 === 0 ? '#f1c40f' : '#f39c12',
      size: 3 + Math.random() * 3,
      type: 'ring',
    });
  }
}

function spawnConfetti() {
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
  for (let i = 0; i < 30; i++) {
    state.particles.push({
      x: Math.random() * W,
      y: -10,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      life: 1, maxLife: 2 + Math.random(),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      type: 'confetti',
    });
  }
}

function spawnCopilotSparkles() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY;
  const colors = ['#58a6ff', '#79c0ff', '#a5d6ff'];
  for (let i = 0; i < 8; i++) {
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + Math.random() * monaSize,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 1,
      life: 1, maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 3,
      type: 'normal',
    });
  }
}

// ===== Enemies =====
function spawnEnemy(isWarning = false) {
  const side = Math.random() > 0.5 ? W + 20 : -20;
  state.enemies.push({
    x: side,
    y: H - monaSize - 20 - Math.random() * 40,
    hp: isWarning ? 1.5 : 3,
    maxHp: isWarning ? 1.5 : 3,
    bobOffset: Math.random() * Math.PI * 2,
    dying: false,
    dyingTimer: 0,
    isWarning,
    speed: isWarning ? 20 : 30,
    flashTimer: 0,
    knockbackVx: 0,
  });
}

// ===== Events =====
function handleEvent(ev: GameEvent) {
  state.idleTimer = 0;
  state.deepIdleTimer = 0;

  switch (ev.type) {
    case 'init':
      setStatus('🐱 Mona is ready to code!');
      if (ev.config) applyConfig(ev.config);
      // Load persisted stats if available
      break;

    case 'configUpdate':
      if (ev.config) applyConfig(ev.config);
      break;

    case 'fileOpen':
      state.currentFile = ev.file || 'unknown';
      state.roomHue = hashStr(state.currentFile) % 360;
      state.furnitureType = getFurnitureType(state.currentFile);
      state.targetX = W / 2 - monaSize / 2 + (Math.random() - 0.5) * 80;
      setState('walk');
      state.stats.filesVisited++;
      addXP(5);
      setStatus(`📂 Entering ${state.currentFile.split('/').pop()}`);
      break;

    case 'fileChange':
      state.streak++;
      state.streakTimer = 3;
      state.stats.linesCoded++;
      addXP(1);
      setState('code', 2);
      spawnCodingParticles();
      sfxType();
      setStatus(`⌨️ Coding... (${state.streak}x streak!)`);
      break;

    case 'fileSave':
      state.stats.savesMade++;
      addXP(10);
      spawnSaveWave();
      sfxSave();
      setStatus('💾 Checkpoint saved!');
      break;

    case 'terminal':
      setState('spell', 2);
      spawnTerminalCircle();
      setStatus('🔮 Casting terminal spell...');
      break;

    case 'errorsAppear': {
      const count = ev.errorCount || 1;
      state.errorBadge += count;
      for (let i = 0; i < Math.min(count, 3); i++) spawnEnemy(false);
      setState('fight', 4);
      state.shakeTimer = 0.4;
      sfxError();
      // Red flash
      spawnParticles(W / 2, H / 2, '#e74c3c', 6);
      setStatus(`⚔️ ${count} bug${count > 1 ? 's' : ''} appeared!`);
      break;
    }

    case 'warningsAppear': {
      const count = ev.warningCount || 1;
      for (let i = 0; i < Math.min(count, 2); i++) spawnEnemy(true);
      setState('fight', 3);
      setStatus(`⚠️ ${count} warning${count > 1 ? 's' : ''} appeared!`);
      break;
    }

    case 'errorsCleared':
      state.enemies.forEach(e => {
        e.dying = true;
        e.dyingTimer = 0.5;
        spawnParticles(e.x, e.y, '#e74c3c', 5);
        sfxBugDefeated();
      });
      state.errorBadge = 0;
      setState('celebrate', 2);
      spawnConfetti();
      addXP(25);
      setStatus('🎉 All bugs defeated!');
      break;

    case 'copilotAssist':
      state.stats.copilotAssists++;
      addXP(15);
      spawnCopilotSparkles();
      sfxCopilot();
      setStatus('✨ Copilot assisted!');
      break;

    case 'idle':
      if (state.state !== 'fight') {
        setState('idle');
        setStatus('😊 Mona is waiting...');
      }
      break;
  }
}

function applyConfig(config: GameConfig) {
  if (config.soundEnabled !== undefined) {
    state.config.soundEnabled = config.soundEnabled;
    setSoundEnabled(config.soundEnabled);
  }
  if (config.monaSize && config.monaSize !== monaSize) {
    state.config.monaSize = config.monaSize;
    initSprites(config.monaSize);
  }
  if (config.showXPBar !== undefined) {
    state.config.showXPBar = config.showXPBar;
    if (xpBarContainer) xpBarContainer.style.display = config.showXPBar ? 'block' : 'none';
  }
}

// ===== Animation =====
function getAnim(): SpriteAnimation {
  return sprites[state.state] || sprites.idle;
}

let lastTime = 0;

function update(dt: number) {
  // State timer
  if (state.stateTimer > 0) {
    state.stateTimer -= dt;
    if (state.stateTimer <= 0 && state.state !== 'sleep') {
      setState('idle');
    }
  }

  // Idle -> deep idle (sleep)
  state.idleTimer += dt;
  if (state.state === 'idle') {
    state.deepIdleTimer += dt;
    if (state.deepIdleTimer > 30) {
      setState('sleep');
      setStatus('😴 Mona is napping... ZZZ');
    }
  }

  // Walking
  if (state.state === 'walk') {
    const dx = state.targetX - state.monaX;
    const speed = 120;
    if (Math.abs(dx) > 2) {
      state.monaX += Math.sign(dx) * speed * dt;
      state.facingRight = dx > 0;
    } else {
      state.monaX = state.targetX;
      setState('idle');
    }
  }

  // Keep Mona in bounds
  state.monaX = Math.max(10, Math.min(W - monaSize - 10, state.monaX));
  state.monaY = H - monaSize - 20;

  // Animation frames
  const anim = getAnim();
  state.animTimer += dt;
  const frameDur = 1 / anim.frameRate;
  if (state.animTimer >= frameDur) {
    state.animTimer -= frameDur;
    state.animFrame++;
    if (state.animFrame >= anim.frames.length) {
      state.animFrame = anim.loop ? 0 : anim.frames.length - 1;
    }
  }

  // Auto-attack in fight state
  if (state.state === 'fight') {
    state.attackCooldown -= dt;
    if (state.attackCooldown <= 0) {
      state.attackCooldown = 0.5;
      // Damage nearest enemy
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of state.enemies) {
        if (e.dying) continue;
        const dx = Math.abs((state.monaX + monaSize / 2) - e.x);
        if (dx < nearestDist) { nearestDist = dx; nearest = e; }
      }
      if (nearest && nearestDist < monaSize * 1.5) {
        nearest.hp -= 1;
        nearest.flashTimer = 0.1;
        nearest.knockbackVx = Math.sign(nearest.x - state.monaX - monaSize / 2) * 40;
        if (nearest.hp <= 0) {
          nearest.dying = true;
          nearest.dyingTimer = 0.4;
          state.stats.bugsDefeated++;
          state.errorBadge = Math.max(0, state.errorBadge - 1);
          addXP(10);
          spawnParticles(nearest.x, nearest.y, nearest.isWarning ? '#f1c40f' : '#e74c3c', 8);
          sfxBugDefeated();
        }
      }
    }
  }

  // Enemies
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.dying) {
      enemy.dyingTimer -= dt;
      if (enemy.dyingTimer <= 0) {
        state.enemies.splice(i, 1);
      }
      continue;
    }
    // Move toward Mona
    const dx = (state.monaX + monaSize / 2) - enemy.x;
    if (Math.abs(dx) > 40) {
      enemy.x += Math.sign(dx) * enemy.speed * dt;
    }
    // Knockback
    if (enemy.knockbackVx !== 0) {
      enemy.x += enemy.knockbackVx * dt;
      enemy.knockbackVx *= 0.9;
      if (Math.abs(enemy.knockbackVx) < 1) enemy.knockbackVx = 0;
    }
    enemy.bobOffset += dt * 3;
    if (enemy.flashTimer > 0) enemy.flashTimer -= dt;
  }

  // No more enemies -> end fight
  if (state.state === 'fight' && state.enemies.filter(e => !e.dying).length === 0) {
    setState('idle');
    if (state.enemies.length === 0) {
      setStatus('😊 All clear!');
    }
  }

  // Ambient dust motes
  state.dustTimer += dt;
  if (state.dustTimer > 2) {
    state.dustTimer = 0;
    spawnDustMotes();
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.type === 'confetti') {
      p.vy += 2 * dt;
      p.vx *= 0.99;
    } else if (p.type !== 'dust') {
      p.vy += 3 * dt;
    }
    p.life -= dt / p.maxLife;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Streak decay
  if (state.streakTimer > 0) {
    state.streakTimer -= dt;
  } else if (state.streak > 0 && state.idleTimer > 3) {
    state.streak = Math.max(0, state.streak - 1);
  }

  // Shake
  if (state.shakeTimer > 0) state.shakeTimer -= dt;

  // Level up timer
  if (state.levelUpTimer > 0) state.levelUpTimer -= dt;

  // Status timer
  if (state.statusTimer > 0) state.statusTimer -= dt;
}

function draw() {
  ctx.save();
  // Screen shake
  if (state.shakeTimer > 0) {
    const intensity = state.shakeTimer * 15;
    ctx.translate(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity
    );
  }

  drawRoom();

  // Draw enemies
  for (const enemy of state.enemies) {
    const bob = Math.sin(enemy.bobOffset) * 4;
    ctx.save();
    if (enemy.dying) {
      const scale = enemy.dyingTimer / 0.4;
      ctx.globalAlpha = scale;
      const cx = enemy.x + (enemy.isWarning ? 16 : 24);
      const cy = enemy.y + (enemy.isWarning ? 16 : 24) + bob;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }
    if (enemy.flashTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(enemy.flashTimer * 60) * 0.5;
    }
    const sprite = enemy.isWarning ? enemySprites.warning : enemySprites.bug;
    ctx.drawImage(sprite, enemy.x, enemy.y + bob);
    // HP bar
    if (!enemy.dying) {
      const barW = enemy.isWarning ? 24 : 32;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x + 4, enemy.y - 8, barW, 4);
      ctx.fillStyle = enemy.isWarning ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(enemy.x + 4, enemy.y - 8, barW * (enemy.hp / enemy.maxHp), 4);
    }
    ctx.restore();
  }

  // Draw Mona
  const anim = getAnim();
  const frame = anim.frames[state.animFrame] || anim.frames[0];
  ctx.save();
  if (!state.facingRight) {
    ctx.translate(state.monaX + monaSize, state.monaY);
    ctx.scale(-1, 1);
    ctx.drawImage(frame, 0, 0);
  } else {
    ctx.drawImage(frame, state.monaX, state.monaY);
  }
  ctx.restore();

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (p.type === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle || 0) + p.life * 5);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Error badge
  if (state.errorBadge > 0) {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(W - 25, 75, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.errorBadge}`, W - 25, 79);
    ctx.textAlign = 'left';
  }

  // Level up text
  if (state.levelUpTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.levelUpTimer);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    const yOff = (2.5 - state.levelUpTimer) * 20;
    ctx.fillText(state.levelUpText, W / 2, H / 2 - yOff);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  ctx.restore();

  // HUD updates
  fileEl.textContent = `📁 ${(state.currentFile || 'No file').split('/').pop()}`;
  statusEl.textContent = state.statusText;
  streakEl.textContent = state.streak > 0 ? `🔥 ${state.streak}x` : '';
}

function gameLoop(time: number) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

// Listen for messages from extension
window.addEventListener('message', (e: MessageEvent) => {
  const data = e.data;
  if (data.type === 'loadStats') {
    Object.assign(state.stats, data.stats);
    // Recalculate XP bar
    let xpInLevel = state.stats.totalXP;
    let lvl = 1;
    let req = xpForLevel(1);
    while (xpInLevel >= req) { xpInLevel -= req; lvl++; req = xpForLevel(lvl); }
    state.stats.level = lvl;
    updateXPBar(xpInLevel, req);
    updateStatsTooltip();
  } else {
    handleEvent(data as GameEvent);
  }
});

// Start
lastTime = performance.now();
requestAnimationFrame(gameLoop);
handleEvent({ type: 'init' });
