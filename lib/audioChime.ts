/**
 * Web Audio API synthesized Temple Bell / Order Alert Chime
 * Generates an auspicious, harmonic bell tone without external audio files.
 */
export function playTempleBellChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonic frequencies for an auspicious brass bell / singing bowl
    const frequencies = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6 harmonics
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    masterGain.connect(ctx.destination);

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Natural acoustic bell decay
      const decayDuration = 2.0 - idx * 0.35;
      gain.gain.setValueAtTime(0.4 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + decayDuration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + decayDuration + 0.1);
    });
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}
