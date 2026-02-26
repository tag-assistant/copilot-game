// Pixel art sprite data for Mona the cat (32x32)
// Each sprite is defined as pixel data that gets rendered to canvas and cached

// Color palette
const PAL = {
  transparent: 'rgba(0,0,0,0)',
  black: '#1a1a2e',
  darkGray: '#3d3d5c',
  gray: '#7a7a9e',
  white: '#f0f0f8',
  skin: '#ffb570',
  skinDark: '#e09050',
  orange: '#ff8c42',
  orangeDark: '#d96a20',
  eye: '#2ecc71',
  eyeDark: '#1a9c54',
  pink: '#ff6b9d',
  pinkDark: '#d94a7a',
  purple: '#9b59b6',
  blue: '#3498db',
  yellow: '#f1c40f',
  red: '#e74c3c',
  green: '#2ecc71',
};

// Simple pixel art defined as string grids (. = transparent, letters = palette keys)
// Using single chars mapped to palette
const C: Record<string, string> = {
  '.': PAL.transparent,
  'k': PAL.black,
  'd': PAL.darkGray,
  'g': PAL.gray,
  'w': PAL.white,
  'o': PAL.orange,
  'O': PAL.orangeDark,
  'e': PAL.eye,
  'E': PAL.eyeDark,
  'p': PAL.pink,
  'P': PAL.pinkDark,
  's': PAL.skin,
  'S': PAL.skinDark,
  'u': PAL.purple,
  'b': PAL.blue,
  'y': PAL.yellow,
  'r': PAL.red,
  'G': PAL.green,
};

// 16x16 Mona sprites - cute cat with big eyes
// Each frame is a 16x16 grid

const MONA_IDLE_1 = `
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

const MONA_IDLE_2 = `
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

const MONA_WALK_1 = `
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

const MONA_WALK_2 = `
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

const MONA_WALK_3 = `
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

const MONA_CODE_1 = `
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

const MONA_CODE_2 = `
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

const MONA_SPELL_1 = `
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

const MONA_SPELL_2 = `
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

const MONA_FIGHT_1 = `
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

const MONA_FIGHT_2 = `
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

const MONA_CELEBRATE_1 = `
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

const MONA_CELEBRATE_2 = `
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

const MONA_DAMAGE_1 = `
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

const MONA_DAMAGE_2 = `
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

// Enemy bug sprite (12x12 centered in 16x16)
const ENEMY_BUG = `
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

function parseSprite(data: string): string[][] {
  return data.trim().split('\n').map(row =>
    row.split('').map(ch => C[ch] || C['.'])
  );
}

function renderSpriteToCanvas(pixels: string[][], size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pixelW = size / pixels[0].length;
  const pixelH = size / pixels.length;
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x] !== C['.']) {
        ctx.fillStyle = pixels[y][x];
        ctx.fillRect(Math.floor(x * pixelW), Math.floor(y * pixelH), Math.ceil(pixelW), Math.ceil(pixelH));
      }
    }
  }
  return canvas;
}

// Sprite animation definitions
export interface SpriteAnimation {
  frames: HTMLCanvasElement[];
  frameRate: number; // frames per second
  loop: boolean;
}

export interface SpriteSet {
  idle: SpriteAnimation;
  walk: SpriteAnimation;
  code: SpriteAnimation;
  spell: SpriteAnimation;
  fight: SpriteAnimation;
  celebrate: SpriteAnimation;
  damage: SpriteAnimation;
}

export interface EnemySprites {
  bug: HTMLCanvasElement;
}

let cachedSprites: SpriteSet | null = null;
let cachedEnemySprites: EnemySprites | null = null;

export function getMonaSprites(size = 64): SpriteSet {
  if (cachedSprites) return cachedSprites;
  const r = (s: string) => renderSpriteToCanvas(parseSprite(s), size);
  cachedSprites = {
    idle: { frames: [r(MONA_IDLE_1), r(MONA_IDLE_2)], frameRate: 2, loop: true },
    walk: { frames: [r(MONA_WALK_1), r(MONA_WALK_2), r(MONA_WALK_3), r(MONA_WALK_2)], frameRate: 8, loop: true },
    code: { frames: [r(MONA_CODE_1), r(MONA_CODE_2)], frameRate: 4, loop: true },
    spell: { frames: [r(MONA_SPELL_1), r(MONA_SPELL_2)], frameRate: 3, loop: true },
    fight: { frames: [r(MONA_FIGHT_1), r(MONA_FIGHT_2)], frameRate: 6, loop: true },
    celebrate: { frames: [r(MONA_CELEBRATE_1), r(MONA_CELEBRATE_2)], frameRate: 4, loop: true },
    damage: { frames: [r(MONA_DAMAGE_1), r(MONA_DAMAGE_2)], frameRate: 6, loop: false },
  };
  return cachedSprites;
}

export function getEnemySprites(size = 48): EnemySprites {
  if (cachedEnemySprites) return cachedEnemySprites;
  cachedEnemySprites = {
    bug: renderSpriteToCanvas(parseSprite(ENEMY_BUG), size),
  };
  return cachedEnemySprites;
}

// Tile colors for room backgrounds
export const TILE_COLORS = {
  floor: '#2c2c54',
  floorAlt: '#34345c',
  wall: '#1a1a2e',
  wallTop: '#2d2d5e',
  door: '#5c3d2e',
  doorFrame: '#8b6914',
};
