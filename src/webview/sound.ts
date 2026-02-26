// Sound effects using Web Audio API oscillator (retro bleeps)

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (enabled && !audioCtx) {
    audioCtx = new AudioContext();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08) {
  if (!soundEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function sfxType() {
  playTone(800 + Math.random() * 200, 0.05, 'square', 0.03);
}

export function sfxSave() {
  playTone(523, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.06), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.06), 200);
}

export function sfxError() {
  playTone(200, 0.15, 'sawtooth', 0.06);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.06), 150);
}

export function sfxBugDefeated() {
  playTone(400, 0.08, 'square', 0.05);
  setTimeout(() => playTone(600, 0.08, 'square', 0.05), 80);
}

export function sfxLevelUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.15, 'sine', 0.07), i * 120);
  });
}

export function sfxCopilot() {
  playTone(880, 0.1, 'sine', 0.05);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.05), 100);
}
