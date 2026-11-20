/**
 * Plays a gentle WebAudio chime when UI sounds are enabled.
 */
export function playCozyChime(enabled: boolean, kind: 'pop' | 'success'): void {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) {
    return;
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'success' ? 587.33 : 440, ctx.currentTime);
    if (kind === 'success') {
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    }
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
  } catch {
    // Ignore audio context restrictions.
  }
}
