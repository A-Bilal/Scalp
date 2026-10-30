// Web Audio API synthesized audio alerts (no external audio assets required)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playBullishChime(volume = 0.6) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 upward arpeggio

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      const startTime = now + index * 0.08;
      const duration = 0.22;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
}

export function playSpikeChime(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Fast double pulse for urgent volatility spike
    const pulses = [
      { time: now, freq: 880 },        // A5
      { time: now + 0.12, freq: 1318.5 }, // E6
      { time: now + 0.24, freq: 1760 }   // A6
    ];

    pulses.forEach(({ time, freq }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * 0.45, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.2);
    });
  } catch (err) {
    console.warn('Spike audio failed:', err);
  }
}
