const getAudioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

function playNotes(notes: [number, number, number][], type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(0.15, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {}
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
