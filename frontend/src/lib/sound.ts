let audioContext: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

export function playOrderNotification(): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const ring = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.setValueAtTime(0.3, start + duration * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    ring(900, now, 0.25);
    ring(1100, now + 0.45, 0.25);
    ring(900, now + 0.9, 0.25);
  } catch {
    /* audio not supported */
  }
}
