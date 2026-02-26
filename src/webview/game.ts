import { getMonaSprites, getEnemySprites, SpriteAnimation, TILE_COLORS } from './sprites';

// Types for messages from extension
interface GameEvent {
  type: 'fileOpen' | 'fileChange' | 'fileSave' | 'terminal' | 'errorsAppear' | 'errorsCleared' | 'idle' | 'init';
  file?: string;
  errorCount?: number;
}

// Particle system
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

// Enemy
interface Enemy {
  x: number; y: number;
  hp: number; maxHp: number;
  bobOffset: number;
  dying: boolean; dyingTimer: number;
}

// Game state
type MonaState = 'idle' | 'walk' | 'code' | 'spell' | 'fight' | 'celebrate' | 'damage';

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
  shakeTimer: number;
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const statusEl = document.getElementById('status')!;
const fileEl = document.getElementById('file')!;
const streakEl = document.getElementById('streak')!;

let W = 400, H = 300;
function resize() {
  W = canvas.parentElement!.clientWidth;
  H = canvas.parentElement!.clientHeight - 36;
  canvas.width = W;
  canvas.height = H;
}
resize();
window.addEventListener('resize', resize);

const sprites = getMonaSprites(64);
const enemySprites = getEnemySprites(48);

const state: GameState = {
  monaX: W / 2 - 32,
  monaY: H - 120,
  targetX: W / 2 - 32,
  targetY: H - 120,
  state: 'idle',
  stateTimer: 0,
  prevState: 'idle',
  currentFile: 'Welcome!',
  roomHue: 220,
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
  shakeTimer: 0,
};

// Room background based on filename hash
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
  // Wall at top
  ctx.fillStyle = `hsl(${h}, 35%, 20%)`;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = `hsl(${h}, 40%, 25%)`;
  ctx.fillRect(0, 55, W, 8);
  // Room name
  ctx.fillStyle = `hsl(${h}, 50%, 60%)`;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  const shortName = state.currentFile.split('/').pop() || state.currentFile;
  ctx.fillText(`📁 ${shortName}`, W / 2, 35);
  ctx.textAlign = 'left';
}

function setState(newState: MonaState, duration = 0) {
  if (state.state === newState) return;
  state.prevState = state.state;
  state.state = newState;
  state.stateTimer = duration;
  state.animFrame = 0;
  state.animTimer = 0;
}

function setStatus(text: string) {
  state.statusText = text;
  state.statusTimer = 3;
}

function spawnParticles(x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnEnemy() {
  const side = Math.random() > 0.5 ? W + 20 : -20;
  state.enemies.push({
    x: side,
    y: H - 100 - Math.random() * 60,
    hp: 3,
    maxHp: 3,
    bobOffset: Math.random() * Math.PI * 2,
    dying: false,
    dyingTimer: 0,
  });
}

// Handle events from extension
function handleEvent(ev: GameEvent) {
  state.idleTimer = 0;
  switch (ev.type) {
    case 'init':
      setStatus('🐱 Mona is ready to code!');
      break;
    case 'fileOpen':
      state.currentFile = ev.file || 'unknown';
      state.roomHue = hashStr(state.currentFile) % 360;
      // Walk to new position
      state.targetX = W / 2 - 32 + (Math.random() - 0.5) * 80;
      setState('walk');
      setStatus(`📂 Entering ${state.currentFile.split('/').pop()}`);
      break;
    case 'fileChange':
      state.streak++;
      state.streakTimer = 3;
      setState('code', 2);
      spawnParticles(state.monaX + 32, state.monaY + 20, '#3498db', 3);
      setStatus(`⌨️ Coding... (${state.streak}x streak!)`);
      break;
    case 'fileSave':
      spawnParticles(state.monaX + 32, state.monaY, '#f1c40f', 8);
      setStatus('💾 Checkpoint saved!');
      break;
    case 'terminal':
      setState('spell', 2);
      spawnParticles(state.monaX + 32, state.monaY + 10, '#9b59b6', 6);
      setStatus('🔮 Casting terminal spell...');
      break;
    case 'errorsAppear': {
      const count = ev.errorCount || 1;
      for (let i = 0; i < Math.min(count, 3); i++) spawnEnemy();
      setState('fight', 3);
      state.shakeTimer = 0.3;
      setStatus(`⚔️ ${count} bug${count > 1 ? 's' : ''} appeared!`);
      break;
    }
    case 'errorsCleared':
      // Kill all enemies
      state.enemies.forEach(e => { e.dying = true; e.dyingTimer = 0.5; });
      setState('celebrate', 2);
      spawnParticles(state.monaX + 32, state.monaY, '#2ecc71', 12);
      setStatus('🎉 Bugs defeated!');
      break;
    case 'idle':
      setState('idle');
      setStatus('😴 Mona is waiting...');
      break;
  }
}

// Animation
function getAnim(): SpriteAnimation {
  return sprites[state.state] || sprites.idle;
}

let lastTime = 0;
function update(dt: number) {
  // State timer
  if (state.stateTimer > 0) {
    state.stateTimer -= dt;
    if (state.stateTimer <= 0) {
      setState('idle');
    }
  }

  // Idle timer
  state.idleTimer += dt;
  if (state.idleTimer > 5 && state.state !== 'idle') {
    setState('idle');
    setStatus('😴 Mona is waiting...');
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

  // Enemies
  for (const enemy of state.enemies) {
    if (enemy.dying) {
      enemy.dyingTimer -= dt;
      if (enemy.dyingTimer <= 0) {
        state.enemies.splice(state.enemies.indexOf(enemy), 1);
      }
      continue;
    }
    // Move toward Mona
    const dx = (state.monaX + 32) - enemy.x;
    if (Math.abs(dx) > 50) {
      enemy.x += Math.sign(dx) * 30 * dt;
    }
    enemy.bobOffset += dt * 3;
    // Fight interaction
    if (state.state === 'fight' && Math.abs(dx) < 60) {
      enemy.hp -= dt * 2;
      if (enemy.hp <= 0) {
        enemy.dying = true;
        enemy.dyingTimer = 0.4;
        spawnParticles(enemy.x, enemy.y, '#e74c3c', 5);
      }
    }
  }

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 3 * dt; // gravity
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

  // Status timer
  if (state.statusTimer > 0) state.statusTimer -= dt;
}

function draw() {
  ctx.save();
  // Screen shake
  if (state.shakeTimer > 0) {
    ctx.translate(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6
    );
  }

  drawRoom();

  // Draw enemies
  for (const enemy of state.enemies) {
    const bob = Math.sin(enemy.bobOffset) * 4;
    ctx.save();
    if (enemy.dying) {
      ctx.globalAlpha = enemy.dyingTimer / 0.4;
    }
    ctx.drawImage(enemySprites.bug, enemy.x, enemy.y + bob);
    // HP bar
    if (!enemy.dying) {
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x + 8, enemy.y - 8, 32, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(enemy.x + 8, enemy.y - 8, 32 * (enemy.hp / enemy.maxHp), 4);
    }
    ctx.restore();
  }

  // Draw Mona
  const anim = getAnim();
  const frame = anim.frames[state.animFrame] || anim.frames[0];
  ctx.save();
  if (!state.facingRight) {
    ctx.translate(state.monaX + 64, state.monaY);
    ctx.scale(-1, 1);
    ctx.drawImage(frame, 0, 0);
  } else {
    ctx.drawImage(frame, state.monaX, state.monaY);
  }
  ctx.restore();

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // UI
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
window.addEventListener('message', (e: MessageEvent<GameEvent>) => {
  handleEvent(e.data);
});

// Start
lastTime = performance.now();
requestAnimationFrame(gameLoop);
handleEvent({ type: 'init' });
