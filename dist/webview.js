"use strict";
(() => {
  // src/webview/sprites.ts
  var PAL = {
    transparent: "rgba(0,0,0,0)",
    black: "#1a1a2e",
    darkGray: "#3d3d5c",
    gray: "#7a7a9e",
    white: "#f0f0f8",
    skin: "#ffb570",
    skinDark: "#e09050",
    orange: "#ff8c42",
    orangeDark: "#d96a20",
    eye: "#2ecc71",
    eyeDark: "#1a9c54",
    pink: "#ff6b9d",
    pinkDark: "#d94a7a",
    purple: "#9b59b6",
    blue: "#3498db",
    yellow: "#f1c40f",
    red: "#e74c3c",
    green: "#2ecc71"
  };
  var C = {
    ".": PAL.transparent,
    "k": PAL.black,
    "d": PAL.darkGray,
    "g": PAL.gray,
    "w": PAL.white,
    "o": PAL.orange,
    "O": PAL.orangeDark,
    "e": PAL.eye,
    "E": PAL.eyeDark,
    "p": PAL.pink,
    "P": PAL.pinkDark,
    "s": PAL.skin,
    "S": PAL.skinDark,
    "u": PAL.purple,
    "b": PAL.blue,
    "y": PAL.yellow,
    "r": PAL.red,
    "G": PAL.green
  };
  var MONA_IDLE_1 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_IDLE_2 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koookkkkoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_WALK_1 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
..kkddddddddk..
..kk.kdddddk...
......kk.kk....
................
`;
  var MONA_WALK_2 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
...kddddddkk...
....kddddkk....
.....kk.kk.....
................
`;
  var MONA_WALK_3 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
...kdddddddkk..
....kddddk.kk..
.....kk.kk.....
................
`;
  var MONA_CODE_1 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
..bkkoooooook...
.bbbkdooooddk..
..b.kddddddddk.
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_CODE_2 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooookbb.
...kddoooodkkbbb
...kddddddddk.b.
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_SPELL_1 = `
.......yy.......
....kkkyykk.....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
..ukkoooooookuu.
.uuukdooooddkuuu
..u.kdddddddku..
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_SPELL_2 = `
......yyyy......
...y.kkkyykk....
...kooOkkOook.y.
...kooooooook...
..koooeekeoook..
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
.uukkoooooookuu.
uuuukdooooddkuuu
.uu.kdddddddkuu.
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_FIGHT_1 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..kooopPoooook..
...koooooooook..
...kkooooookk...
....koooooook.g.
...kddooooddk.gk
...kddddddddk.g.
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_FIGHT_2 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koooeekeoook..
..koookkkooook..
..kooopPoooook..
...koooooooook..
...kkooooookk..g
....koooooook.gk
...kddooooddk..g
...kddddddddk..
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_CELEBRATE_1 = `
........yy......
....kkk.yykk....
...kooOkkOook...
...koooooooook..
..koooweeweoook.
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
...kddddddddk..
....kdddddddk..
....kk.kk.kkk..
................
`;
  var MONA_CELEBRATE_2 = `
...yy......yy...
....kkk..kkk....
...kooOkkOook...
...koooooooook..
..koooweeweoook.
..koookkkooook..
..koooopoooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
..kddddddddk...
..kk.kdddddk...
......kk.kkk...
................
`;
  var MONA_DAMAGE_1 = `
................
....kkk..kkk....
...kooOkkOook...
...kooooooook...
..koookkkkoook..
..koookkkooook..
..kooooooooook..
...koooooooook..
...kkooooookk...
....koooooook...
...kddooooddk..
...kddddddddk..
..kddddddddk...
..kk.kdddddk...
......kk.kkk...
................
`;
  var MONA_DAMAGE_2 = `
................
.....kkk..kkk...
....kooOkkOook..
....kooooooook..
...koookkkkoook.
...koookkkooook.
...kooooooooook.
....koooooooook.
....kkooooookk..
.....koooooook..
....kddooooddk..
....kddddddddk.
...kddddddddk..
...kk.kdddddk..
.......kk.kkk..
................
`;
  var ENEMY_BUG = `
................
................
.....rr.rr......
....krrkrrk.....
...krrrrrrk.....
...krwkwrrk.....
...krrrrrrk.....
...krrrrrrkk....
....krrrrrk.....
....kkrrrkk.....
.....k.k.k.....
....k..k..k.....
................
................
................
................
`;
  function parseSprite(data) {
    return data.trim().split("\n").map(
      (row) => row.split("").map((ch) => C[ch] || C["."])
    );
  }
  function renderSpriteToCanvas(pixels, size) {
    const canvas2 = document.createElement("canvas");
    canvas2.width = size;
    canvas2.height = size;
    const ctx2 = canvas2.getContext("2d");
    const pixelW = size / pixels[0].length;
    const pixelH = size / pixels.length;
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        if (pixels[y][x] !== C["."]) {
          ctx2.fillStyle = pixels[y][x];
          ctx2.fillRect(Math.floor(x * pixelW), Math.floor(y * pixelH), Math.ceil(pixelW), Math.ceil(pixelH));
        }
      }
    }
    return canvas2;
  }
  var cachedSprites = null;
  var cachedEnemySprites = null;
  function getMonaSprites(size = 64) {
    if (cachedSprites)
      return cachedSprites;
    const r = (s) => renderSpriteToCanvas(parseSprite(s), size);
    cachedSprites = {
      idle: { frames: [r(MONA_IDLE_1), r(MONA_IDLE_2)], frameRate: 2, loop: true },
      walk: { frames: [r(MONA_WALK_1), r(MONA_WALK_2), r(MONA_WALK_3), r(MONA_WALK_2)], frameRate: 8, loop: true },
      code: { frames: [r(MONA_CODE_1), r(MONA_CODE_2)], frameRate: 4, loop: true },
      spell: { frames: [r(MONA_SPELL_1), r(MONA_SPELL_2)], frameRate: 3, loop: true },
      fight: { frames: [r(MONA_FIGHT_1), r(MONA_FIGHT_2)], frameRate: 6, loop: true },
      celebrate: { frames: [r(MONA_CELEBRATE_1), r(MONA_CELEBRATE_2)], frameRate: 4, loop: true },
      damage: { frames: [r(MONA_DAMAGE_1), r(MONA_DAMAGE_2)], frameRate: 6, loop: false }
    };
    return cachedSprites;
  }
  function getEnemySprites(size = 48) {
    if (cachedEnemySprites)
      return cachedEnemySprites;
    cachedEnemySprites = {
      bug: renderSpriteToCanvas(parseSprite(ENEMY_BUG), size)
    };
    return cachedEnemySprites;
  }
  var TILE_COLORS = {
    floor: "#2c2c54",
    floorAlt: "#34345c",
    wall: "#1a1a2e",
    wallTop: "#2d2d5e",
    door: "#5c3d2e",
    doorFrame: "#8b6914"
  };

  // src/webview/game.ts
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");
  var fileEl = document.getElementById("file");
  var streakEl = document.getElementById("streak");
  var W = 400;
  var H = 300;
  function resize() {
    W = canvas.parentElement.clientWidth;
    H = canvas.parentElement.clientHeight - 36;
    canvas.width = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener("resize", resize);
  var sprites = getMonaSprites(64);
  var enemySprites = getEnemySprites(48);
  var state = {
    monaX: W / 2 - 32,
    monaY: H - 120,
    targetX: W / 2 - 32,
    targetY: H - 120,
    state: "idle",
    stateTimer: 0,
    prevState: "idle",
    currentFile: "Welcome!",
    roomHue: 220,
    animFrame: 0,
    animTimer: 0,
    facingRight: true,
    particles: [],
    enemies: [],
    streak: 0,
    streakTimer: 0,
    statusText: "\u{1F431} Mona is ready!",
    statusTimer: 0,
    idleTimer: 0,
    shakeTimer: 0
  };
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (h << 5) - h + s.charCodeAt(i) | 0;
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
    ctx.fillStyle = `hsl(${h}, 50%, 60%)`;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const shortName = state.currentFile.split("/").pop() || state.currentFile;
    ctx.fillText(`\u{1F4C1} ${shortName}`, W / 2, 35);
    ctx.textAlign = "left";
  }
  function setState(newState, duration = 0) {
    if (state.state === newState)
      return;
    state.prevState = state.state;
    state.state = newState;
    state.stateTimer = duration;
    state.animFrame = 0;
    state.animTimer = 0;
  }
  function setStatus(text) {
    state.statusText = text;
    state.statusTimer = 3;
  }
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3
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
      dyingTimer: 0
    });
  }
  function handleEvent(ev) {
    state.idleTimer = 0;
    switch (ev.type) {
      case "init":
        setStatus("\u{1F431} Mona is ready to code!");
        break;
      case "fileOpen":
        state.currentFile = ev.file || "unknown";
        state.roomHue = hashStr(state.currentFile) % 360;
        state.targetX = W / 2 - 32 + (Math.random() - 0.5) * 80;
        setState("walk");
        setStatus(`\u{1F4C2} Entering ${state.currentFile.split("/").pop()}`);
        break;
      case "fileChange":
        state.streak++;
        state.streakTimer = 3;
        setState("code", 2);
        spawnParticles(state.monaX + 32, state.monaY + 20, "#3498db", 3);
        setStatus(`\u2328\uFE0F Coding... (${state.streak}x streak!)`);
        break;
      case "fileSave":
        spawnParticles(state.monaX + 32, state.monaY, "#f1c40f", 8);
        setStatus("\u{1F4BE} Checkpoint saved!");
        break;
      case "terminal":
        setState("spell", 2);
        spawnParticles(state.monaX + 32, state.monaY + 10, "#9b59b6", 6);
        setStatus("\u{1F52E} Casting terminal spell...");
        break;
      case "errorsAppear": {
        const count = ev.errorCount || 1;
        for (let i = 0; i < Math.min(count, 3); i++)
          spawnEnemy();
        setState("fight", 3);
        state.shakeTimer = 0.3;
        setStatus(`\u2694\uFE0F ${count} bug${count > 1 ? "s" : ""} appeared!`);
        break;
      }
      case "errorsCleared":
        state.enemies.forEach((e) => {
          e.dying = true;
          e.dyingTimer = 0.5;
        });
        setState("celebrate", 2);
        spawnParticles(state.monaX + 32, state.monaY, "#2ecc71", 12);
        setStatus("\u{1F389} Bugs defeated!");
        break;
      case "idle":
        setState("idle");
        setStatus("\u{1F634} Mona is waiting...");
        break;
    }
  }
  function getAnim() {
    return sprites[state.state] || sprites.idle;
  }
  var lastTime = 0;
  function update(dt) {
    if (state.stateTimer > 0) {
      state.stateTimer -= dt;
      if (state.stateTimer <= 0) {
        setState("idle");
      }
    }
    state.idleTimer += dt;
    if (state.idleTimer > 5 && state.state !== "idle") {
      setState("idle");
      setStatus("\u{1F634} Mona is waiting...");
    }
    if (state.state === "walk") {
      const dx = state.targetX - state.monaX;
      const speed = 120;
      if (Math.abs(dx) > 2) {
        state.monaX += Math.sign(dx) * speed * dt;
        state.facingRight = dx > 0;
      } else {
        state.monaX = state.targetX;
        setState("idle");
      }
    }
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
    for (const enemy of state.enemies) {
      if (enemy.dying) {
        enemy.dyingTimer -= dt;
        if (enemy.dyingTimer <= 0) {
          state.enemies.splice(state.enemies.indexOf(enemy), 1);
        }
        continue;
      }
      const dx = state.monaX + 32 - enemy.x;
      if (Math.abs(dx) > 50) {
        enemy.x += Math.sign(dx) * 30 * dt;
      }
      enemy.bobOffset += dt * 3;
      if (state.state === "fight" && Math.abs(dx) < 60) {
        enemy.hp -= dt * 2;
        if (enemy.hp <= 0) {
          enemy.dying = true;
          enemy.dyingTimer = 0.4;
          spawnParticles(enemy.x, enemy.y, "#e74c3c", 5);
        }
      }
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 3 * dt;
      p.life -= dt / p.maxLife;
      if (p.life <= 0)
        state.particles.splice(i, 1);
    }
    if (state.streakTimer > 0) {
      state.streakTimer -= dt;
    } else if (state.streak > 0 && state.idleTimer > 3) {
      state.streak = Math.max(0, state.streak - 1);
    }
    if (state.shakeTimer > 0)
      state.shakeTimer -= dt;
    if (state.statusTimer > 0)
      state.statusTimer -= dt;
  }
  function draw() {
    ctx.save();
    if (state.shakeTimer > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
    }
    drawRoom();
    for (const enemy of state.enemies) {
      const bob = Math.sin(enemy.bobOffset) * 4;
      ctx.save();
      if (enemy.dying) {
        ctx.globalAlpha = enemy.dyingTimer / 0.4;
      }
      ctx.drawImage(enemySprites.bug, enemy.x, enemy.y + bob);
      if (!enemy.dying) {
        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x + 8, enemy.y - 8, 32, 4);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(enemy.x + 8, enemy.y - 8, 32 * (enemy.hp / enemy.maxHp), 4);
      }
      ctx.restore();
    }
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
    for (const p of state.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    fileEl.textContent = `\u{1F4C1} ${(state.currentFile || "No file").split("/").pop()}`;
    statusEl.textContent = state.statusText;
    streakEl.textContent = state.streak > 0 ? `\u{1F525} ${state.streak}x` : "";
  }
  function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1e3, 0.1);
    lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }
  window.addEventListener("message", (e) => {
    handleEvent(e.data);
  });
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  handleEvent({ type: "init" });
})();
