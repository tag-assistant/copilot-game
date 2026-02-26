import {
  getMonaSprites, getEnemySprites, getFurnitureSprites,
  SpriteAnimation, SpriteSet, FurnitureSprites,
  getFurnitureType, FurnitureType, getMonaFaceDataURL
} from './sprites';
import { setSoundEnabled, sfxType, sfxSave, sfxError, sfxBugDefeated, sfxLevelUp, sfxCopilot } from './sound';

// ===== Types =====
type AgentState = 'IDLE' | 'COPILOT_ACTIVE' | 'COPILOT_IDLE' | 'USER_ACTIVE';

interface GameEvent {
  type: string;
  agentState?: AgentState;
  file?: string;
  linesChanged?: number;
  linesDeleted?: number;
  errorCount?: number;
  warningCount?: number;
  config?: GameConfig;
  summary?: SessionSummary;
  stats?: any;
}

interface SessionSummary {
  filesVisited: string[];
  linesWritten: number;
  linesDeleted: number;
  terminalCommands: number;
  errorsEncountered: number;
  errorsFixed: number;
  durationMs: number;
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
  type?: 'normal' | 'confetti' | 'dust' | 'ring' | 'construction';
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
  linesWritten: number;
  linesDeleted: number;
  filesVisited: number;
  bugsDefeated: number;
  terminalCommands: number;
  sessionsCompleted: number;
  totalXP: number;
  level: number;
}

interface ActivityLogEntry {
  text: string;
  time: number;
  color: string;
}

interface FileNode {
  name: string;
  x: number;
  y: number;
  visited: boolean;
  active: boolean;
  lastVisit: number;
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
  statusText: string;
  statusTimer: number;
  shakeTimer: number;
  stats: Stats;
  levelUpTimer: number;
  levelUpText: string;
  errorBadge: number;
  attackCooldown: number;
  config: GameConfig;
  dustTimer: number;
  // New: Copilot agent state
  agentState: AgentState;
  activityLog: ActivityLogEntry[];
  fileMap: FileNode[];
  sessionTimer: number;
  sessionActive: boolean;
  sessionFilesCount: number;
  sessionLinesCount: number;
  copilotPulse: number; // for pulsing indicator
  summaryDisplay: SessionSummary | null;
  summaryTimer: number;
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
  H = canvas.parentElement!.clientHeight - 56;
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
  state: 'sleep',
  stateTimer: 0,
  prevState: 'idle',
  currentFile: 'Waiting for Copilot...',
  roomHue: 220,
  furnitureType: 'default',
  animFrame: 0,
  animTimer: 0,
  facingRight: true,
  particles: [],
  enemies: [],
  statusText: '😴 Waiting for Copilot...',
  statusTimer: 0,
  shakeTimer: 0,
  stats: { linesWritten: 0, linesDeleted: 0, filesVisited: 0, bugsDefeated: 0, terminalCommands: 0, sessionsCompleted: 0, totalXP: 0, level: 1 },
  levelUpTimer: 0,
  levelUpText: '',
  errorBadge: 0,
  attackCooldown: 0,
  config: { soundEnabled: false, monaSize: 64, showXPBar: true },
  dustTimer: 0,
  agentState: 'IDLE',
  activityLog: [],
  fileMap: [],
  sessionTimer: 0,
  sessionActive: false,
  sessionFilesCount: 0,
  sessionLinesCount: 0,
  copilotPulse: 0,
  summaryDisplay: null,
  summaryTimer: 0,
};

state.monaX = W / 2 - monaSize / 2;
state.monaY = H - monaSize - 20;
state.targetX = state.monaX;
state.targetY = state.monaY;

// ===== Activity Log =====
function addLog(text: string, color = '#79c0ff') {
  state.activityLog.push({ text, time: Date.now(), color });
  if (state.activityLog.length > 12) state.activityLog.shift();
}

// ===== File Map =====
function addFileToMap(filename: string) {
  const existing = state.fileMap.find((f) => f.name === filename);
  if (existing) {
    existing.visited = true;
    existing.active = true;
    existing.lastVisit = Date.now();
    // Deactivate others
    state.fileMap.forEach((f) => { if (f.name !== filename) f.active = false; });
    return;
  }
  // Position in a grid
  const idx = state.fileMap.length;
  const cols = Math.max(4, Math.floor(W / 80));
  const mapAreaX = W - Math.min(200, W * 0.4);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  state.fileMap.forEach((f) => (f.active = false));
  state.fileMap.push({
    name: filename,
    x: mapAreaX + col * 40 + 10,
    y: 70 + row * 25,
    visited: true,
    active: true,
    lastVisit: Date.now(),
  });
}

// ===== XP System =====
function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}

function addXP(amount: number) {
  state.stats.totalXP += amount;
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
  postMsg({ type: 'saveStats', stats: state.stats });
}

function updateXPBar(current: number, needed: number) {
  if (!xpBarEl) return;
  xpBarEl.style.width = `${Math.min(100, (current / needed) * 100)}%`;
  if (levelEl) levelEl.textContent = `Lv.${state.stats.level}`;
}

function updateStatsTooltip() {
  if (!statsTooltipEl) return;
  const s = state.stats;
  statsTooltipEl.textContent = `Written: ${s.linesWritten} | Deleted: ${s.linesDeleted} | Files: ${s.filesVisited} | Bugs: ${s.bugsDefeated} | Sessions: ${s.sessionsCompleted}`;
}

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
  ctx.fillStyle = `hsl(${h}, 30%, 15%)`;
  ctx.fillRect(0, 0, W, H);
  const tileSize = 32;
  for (let y = 0; y < H; y += tileSize) {
    for (let x = 0; x < W; x += tileSize) {
      const alt = ((x / tileSize | 0) + (y / tileSize | 0)) % 2;
      ctx.fillStyle = alt ? `hsl(${h}, 25%, 13%)` : `hsl(${h}, 30%, 16%)`;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  ctx.fillStyle = `hsl(${h}, 35%, 20%)`;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = `hsl(${h}, 40%, 25%)`;
  ctx.fillRect(0, 55, W, 8);

  if (furniture) {
    ctx.drawImage(furniture.door, 10, H - monaSize - 30, monaSize * 0.8, monaSize);
  }
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
  switch (ft) {
    case 'code':
      ctx.drawImage(furniture.desk, rightX, 65, fSize, fSize);
      ctx.drawImage(furniture.coffee, rightX - fSize * 0.4, H - fSize * 0.5 - 10, fSize * 0.5, fSize * 0.5);
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

// ===== Copilot Status Badge =====
function drawCopilotStatus() {
  const pulse = Math.sin(state.copilotPulse * 4) * 0.3 + 0.7;
  let color: string;
  let label: string;
  switch (state.agentState) {
    case 'COPILOT_ACTIVE':
      color = `rgba(46, 204, 113, ${pulse})`;
      label = '🤖 ACTIVE';
      break;
    case 'COPILOT_IDLE':
      color = `rgba(241, 196, 15, 0.7)`;
      label = '⏸️ IDLE';
      break;
    default:
      color = 'rgba(160, 160, 192, 0.4)';
      label = '😴 WAITING';
  }

  // Badge top-left
  ctx.save();
  ctx.fillStyle = 'rgba(13, 13, 26, 0.8)';
  ctx.fillRect(4, 4, 90, 18);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 90, 18);

  // Pulsing dot
  ctx.beginPath();
  ctx.arc(14, 13, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#e0e0e8';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(label, 22, 16);
  ctx.restore();
}

// ===== Activity Log (retro terminal in corner) =====
function drawActivityLog() {
  const logW = Math.min(220, W * 0.45);
  const logH = Math.min(140, H * 0.45);
  const logX = 4;
  const logY = H - logH - 4;

  ctx.save();
  ctx.fillStyle = 'rgba(13, 13, 26, 0.85)';
  ctx.fillRect(logX, logY, logW, logH);
  ctx.strokeStyle = '#2d2d5e';
  ctx.lineWidth = 1;
  ctx.strokeRect(logX, logY, logW, logH);

  // Header
  ctx.fillStyle = '#58a6ff';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('┌─ COPILOT LOG ─┐', logX + 4, logY + 10);

  // Entries
  ctx.font = '8px monospace';
  const maxLines = Math.floor((logH - 18) / 11);
  const visibleLog = state.activityLog.slice(-maxLines);
  for (let i = 0; i < visibleLog.length; i++) {
    const entry = visibleLog[i];
    const age = (Date.now() - entry.time) / 1000;
    ctx.globalAlpha = age < 1 ? 1 : Math.max(0.4, 1 - (age - 1) / 30);
    ctx.fillStyle = entry.color;
    const line = entry.text.length > 30 ? entry.text.slice(0, 28) + '..' : entry.text;
    ctx.fillText(`› ${line}`, logX + 6, logY + 22 + i * 11);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ===== File Map (top-right area) =====
function drawFileMap() {
  if (state.fileMap.length === 0) return;
  const now = Date.now();
  ctx.save();
  ctx.font = '7px monospace';
  for (const node of state.fileMap) {
    const age = (now - node.lastVisit) / 1000;
    const alpha = node.active ? 1 : Math.max(0.3, 1 - age / 60);
    ctx.globalAlpha = alpha;

    // Room box
    ctx.fillStyle = node.active ? '#1a3a2e' : '#1a1a2e';
    ctx.strokeStyle = node.active ? '#2ecc71' : '#3d3d5c';
    ctx.lineWidth = node.active ? 2 : 1;
    ctx.fillRect(node.x, node.y, 35, 18);
    ctx.strokeRect(node.x, node.y, 35, 18);

    // File name
    ctx.fillStyle = node.active ? '#2ecc71' : '#7a7a9e';
    const short = (node.name.split('/').pop() || '?').slice(0, 6);
    ctx.fillText(short, node.x + 2, node.y + 12);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ===== Progress Indicator =====
function drawProgress() {
  if (!state.sessionActive) return;
  ctx.save();
  ctx.font = '9px monospace';
  ctx.fillStyle = '#58a6ff';
  const elapsed = Math.floor(state.sessionTimer);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const timeStr = m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
  const txt = `📄${state.sessionFilesCount} ✏️${state.sessionLinesCount} ⏱${timeStr}`;
  ctx.fillText(txt, W / 2 - 50, 50);
  ctx.restore();
}

// ===== Session Summary Overlay =====
function drawSessionSummary() {
  if (!state.summaryDisplay || state.summaryTimer <= 0) return;
  const s = state.summaryDisplay;
  const alpha = Math.min(1, state.summaryTimer / 1);

  ctx.save();
  ctx.globalAlpha = alpha;

  const boxW = Math.min(260, W - 40);
  const boxH = 130;
  const boxX = (W - boxW) / 2;
  const boxY = (H - boxH) / 2 - 20;

  ctx.fillStyle = 'rgba(13, 13, 26, 0.92)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('✨ SESSION COMPLETE ✨', W / 2, boxY + 20);

  ctx.font = '9px monospace';
  ctx.fillStyle = '#e0e0e8';
  const dur = Math.floor(s.durationMs / 1000);
  const dm = Math.floor(dur / 60);
  const ds = dur % 60;
  const lines = [
    `📄 Files visited: ${s.filesVisited.length}`,
    `✏️ Lines written: ${s.linesWritten}  🗑️ Deleted: ${s.linesDeleted}`,
    `💻 Terminal commands: ${s.terminalCommands}`,
    `🐛 Errors: ${s.errorsEncountered} found, ${s.errorsFixed} fixed`,
    `⏱️ Duration: ${dm > 0 ? dm + 'm ' : ''}${ds}s`,
  ];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, boxY + 40 + i * 16);
  }
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.restore();
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
  spawnParticles(x, y, '#3498db', 3);
}

function spawnConstructionParticles() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY;
  const colors = ['#f1c40f', '#e67e22', '#ecf0f1'];
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + Math.random() * monaSize,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 4 - 1,
      life: 1, maxLife: 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 3,
      type: 'construction',
    });
  }
}

function spawnDemolishParticles() {
  const cx = state.monaX + monaSize / 2;
  const cy = state.monaY + monaSize / 2;
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 1,
      life: 1, maxLife: 0.8,
      color: '#e74c3c',
      size: 2 + Math.random() * 3,
      type: 'normal',
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
    dying: false, dyingTimer: 0,
    isWarning,
    speed: isWarning ? 20 : 30,
    flashTimer: 0,
    knockbackVx: 0,
  });
}

// ===== Event Handler =====
function handleEvent(ev: GameEvent) {
  switch (ev.type) {
    case 'agentStateChange': {
      state.agentState = ev.agentState || 'IDLE';
      if (state.agentState === 'COPILOT_ACTIVE') {
        state.sessionActive = true;
        state.sessionTimer = 0;
        state.sessionFilesCount = 0;
        state.sessionLinesCount = 0;
        state.summaryDisplay = null;
        state.summaryTimer = 0;
        setState('idle');
        setStatus('🤖 Copilot is working...');
        addLog('Agent started working', '#2ecc71');
      } else if (state.agentState === 'COPILOT_IDLE') {
        setState('idle');
        setStatus('⏸️ Copilot paused...');
        addLog('Agent paused', '#f1c40f');
      } else if (state.agentState === 'IDLE') {
        state.sessionActive = false;
        if (state.state !== 'celebrate') {
          setState('sleep');
          setStatus('😴 Waiting for Copilot...');
        }
      }
      break;
    }

    case 'agentFileOpen': {
      const file = ev.file || 'unknown';
      state.currentFile = file;
      state.roomHue = hashStr(file) % 360;
      state.furnitureType = getFurnitureType(file);
      state.targetX = W / 2 - monaSize / 2 + (Math.random() - 0.5) * 80;
      setState('walk');
      state.stats.filesVisited++;
      state.sessionFilesCount++;
      addXP(5);
      addLog(`Reading ${file.split('/').pop()}...`, '#58a6ff');
      addFileToMap(file);
      setStatus(`📂 Reading ${file.split('/').pop()}`);
      break;
    }

    case 'agentFileEdit': {
      const file = ev.file || 'unknown';
      const lines = ev.linesChanged || 1;
      if (file !== state.currentFile) {
        state.currentFile = file;
        state.roomHue = hashStr(file) % 360;
        state.furnitureType = getFurnitureType(file);
        addFileToMap(file);
        state.sessionFilesCount++;
      }
      state.stats.linesWritten += lines;
      state.sessionLinesCount += lines;
      addXP(2 * lines);
      setState('code', 2);
      spawnCodingParticles();
      sfxType();
      addLog(`Editing ${file.split('/').pop()} (+${lines} lines)`, '#79c0ff');
      setStatus(`⌨️ Editing ${file.split('/').pop()}...`);
      break;
    }

    case 'agentFileCreate': {
      const file = ev.file || 'unknown';
      state.currentFile = file;
      state.roomHue = hashStr(file) % 360;
      state.furnitureType = getFurnitureType(file);
      state.stats.filesVisited++;
      state.sessionFilesCount++;
      addXP(15);
      setState('celebrate', 1.5);
      spawnConstructionParticles();
      sfxCopilot();
      addLog(`Created ${file.split('/').pop()}`, '#2ecc71');
      addFileToMap(file);
      setStatus(`🏗️ Building ${file.split('/').pop()}`);
      break;
    }

    case 'agentCodeDelete': {
      const file = ev.file || 'unknown';
      const lines = ev.linesDeleted || 1;
      state.stats.linesDeleted += lines;
      addXP(1);
      setState('code', 1.5);
      spawnDemolishParticles();
      addLog(`Deleting from ${file.split('/').pop()} (-${lines})`, '#e74c3c');
      setStatus(`🗑️ Removing code...`);
      break;
    }

    case 'agentTerminal': {
      state.stats.terminalCommands++;
      addXP(8);
      setState('spell', 2);
      spawnTerminalCircle();
      addLog('Running terminal command...', '#9b59b6');
      setStatus('🔮 Running command...');
      break;
    }

    case 'errorsAppear': {
      const count = ev.errorCount || 1;
      state.errorBadge += count;
      for (let i = 0; i < Math.min(count, 3); i++) spawnEnemy(false);
      setState('fight', 4);
      state.shakeTimer = 0.4;
      sfxError();
      spawnParticles(W / 2, H / 2, '#e74c3c', 6);
      addLog(`${count} error${count > 1 ? 's' : ''} appeared!`, '#e74c3c');
      setStatus(`⚔️ ${count} bug${count > 1 ? 's' : ''} appeared!`);
      break;
    }

    case 'warningsAppear': {
      const count = ev.warningCount || 1;
      for (let i = 0; i < Math.min(count, 2); i++) spawnEnemy(true);
      setState('fight', 3);
      addLog(`${count} warning${count > 1 ? 's' : ''} appeared`, '#f1c40f');
      setStatus(`⚠️ ${count} warning${count > 1 ? 's' : ''}`);
      break;
    }

    case 'errorsCleared': {
      state.enemies.forEach((e) => {
        e.dying = true;
        e.dyingTimer = 0.5;
        spawnParticles(e.x, e.y, '#e74c3c', 5);
        sfxBugDefeated();
      });
      state.errorBadge = 0;
      setState('celebrate', 2);
      spawnConfetti();
      addXP(25);
      addLog('All errors fixed! 🎉', '#2ecc71');
      setStatus('🎉 All bugs defeated!');
      break;
    }

    case 'sessionSummary': {
      if (ev.summary) {
        state.summaryDisplay = ev.summary;
        state.summaryTimer = 8;
        state.stats.sessionsCompleted++;
        setState('celebrate', 3);
        spawnConfetti();
        spawnCopilotSparkles();
        addXP(30);
        addLog('Session complete!', '#f1c40f');
        setStatus('✨ Copilot session complete!');
      }
      break;
    }

    case 'configUpdate': {
      if (ev.config) applyConfig(ev.config);
      break;
    }

    case 'loadStats': {
      if (ev.stats) {
        Object.assign(state.stats, ev.stats);
        let xpInLevel = state.stats.totalXP;
        let lvl = 1;
        let req = xpForLevel(1);
        while (xpInLevel >= req) { xpInLevel -= req; lvl++; req = xpForLevel(lvl); }
        state.stats.level = lvl;
        updateXPBar(xpInLevel, req);
        updateStatsTooltip();
      }
      break;
    }
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
  state.copilotPulse += dt;

  // Session timer
  if (state.sessionActive) {
    state.sessionTimer += dt;
  }

  // Summary timer
  if (state.summaryTimer > 0) {
    state.summaryTimer -= dt;
    if (state.summaryTimer <= 0) state.summaryDisplay = null;
  }

  // State timer
  if (state.stateTimer > 0) {
    state.stateTimer -= dt;
    if (state.stateTimer <= 0) {
      if (state.agentState === 'COPILOT_ACTIVE') {
        setState('idle');
      } else if (state.state !== 'sleep') {
        setState(state.agentState === 'IDLE' ? 'sleep' : 'idle');
      }
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
      if (enemy.dyingTimer <= 0) state.enemies.splice(i, 1);
      continue;
    }
    const dx = (state.monaX + monaSize / 2) - enemy.x;
    if (Math.abs(dx) > 40) enemy.x += Math.sign(dx) * enemy.speed * dt;
    if (enemy.knockbackVx !== 0) {
      enemy.x += enemy.knockbackVx * dt;
      enemy.knockbackVx *= 0.9;
      if (Math.abs(enemy.knockbackVx) < 1) enemy.knockbackVx = 0;
    }
    enemy.bobOffset += dt * 3;
    if (enemy.flashTimer > 0) enemy.flashTimer -= dt;
  }

  if (state.state === 'fight' && state.enemies.filter((e) => !e.dying).length === 0) {
    setState('idle');
  }

  // Ambient dust
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

  // Shake
  if (state.shakeTimer > 0) state.shakeTimer -= dt;

  // Level up timer
  if (state.levelUpTimer > 0) state.levelUpTimer -= dt;

  // Status timer
  if (state.statusTimer > 0) state.statusTimer -= dt;
}

function draw() {
  ctx.save();
  if (state.shakeTimer > 0) {
    const intensity = state.shakeTimer * 15;
    ctx.translate(
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity
    );
  }

  drawRoom();

  // Enemies
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
    if (!enemy.dying) {
      const barW = enemy.isWarning ? 24 : 32;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x + 4, enemy.y - 8, barW, 4);
      ctx.fillStyle = enemy.isWarning ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(enemy.x + 4, enemy.y - 8, barW * (enemy.hp / enemy.maxHp), 4);
    }
    ctx.restore();
  }

  // Mona
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
    ctx.fillText(state.levelUpText, W / 2, H / 2 - (2.5 - state.levelUpTimer) * 20);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  ctx.restore(); // end shake transform

  // HUD overlays (not affected by shake)
  drawCopilotStatus();
  drawActivityLog();
  drawFileMap();
  drawProgress();
  drawSessionSummary();

  // HTML HUD
  const agentLabel = state.agentState === 'COPILOT_ACTIVE' ? '🤖 Copilot Working...'
    : state.agentState === 'COPILOT_IDLE' ? '⏸️ Copilot Paused'
    : '😴 Waiting for Copilot';
  fileEl.textContent = `📁 ${(state.currentFile || 'No file').split('/').pop()}`;
  statusEl.textContent = state.statusText;
  streakEl.textContent = state.sessionActive
    ? `📄${state.sessionFilesCount} ✏️${state.sessionLinesCount}`
    : agentLabel;
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
  handleEvent(e.data as GameEvent);
});

// Start
lastTime = performance.now();
requestAnimationFrame(gameLoop);
handleEvent({ type: 'init' } as any);
