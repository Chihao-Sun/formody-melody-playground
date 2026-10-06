// PROPOSED prototype defaults; none of these constitutes final VI/music rules.
export const config = {
  math: { vertices: 5, radius: 1, rotation: Math.PI / 2, maxSteps: 512 },
  initialSeed: { x: 1.2, y: 1.22 },
  music: {
    bpm: 96, stepsPerBeat: 2, phraseSteps: 16,
    midiByVertex: [60, 62, 63, 67, 70],
    accentEvery: 4, lookAhead: 0.12, pollMs: 25,
    voice: { waveform: 'triangle', attack: 0.008, decay: 0.62, cutoff: 2600, gain: 0.18 },
    delay: { seconds: 0.3125, feedback: 0.23, wet: 0.14 },
  },
  visual: {
    background: '#07090e', polygon: '#a0abc8', trajectory: '#a3afff',
    seed: '#d8e6bd', active: '#e0e6ff', warning: '#ddbd85',
    visibleSteps: 512, pixelRatioCap: 2,
  },
};
