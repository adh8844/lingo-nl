let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Unlock audio on first user interaction (required by mobile browsers)
function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

if (typeof window !== 'undefined') {
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  const handler = () => {
    unlockAudio();
    events.forEach(e => document.removeEventListener(e, handler, true));
  };
  events.forEach(e => document.addEventListener(e, handler, true));
}

function playNotes(notes: [number, number, number][], type: OscillatorType = 'sine') {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(0.18, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch { /* ignore */ }
}

export function playInviteSound() {
  playNotes([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.3]], 'sine');
}

export function playAcceptSound() {
  playNotes([[440, 0, 0.1], [554, 0.1, 0.1], [659, 0.2, 0.1], [880, 0.3, 0.35]], 'triangle');
}

export function playRoundWinSound() {
  playNotes([[660, 0, 0.15], [880, 0.15, 0.25]], 'sine');
}

export function playRoundLoseSound() {
  playNotes([[400, 0, 0.2], [300, 0.2, 0.3]], 'sawtooth');
}
