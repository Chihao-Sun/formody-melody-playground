// Native snapshot of verified Sites v51. See provenance.json.
const midiToHz = midi => 440 * 2 ** ((midi - 69) / 12);

// Only the tangent vertex selects pitch. Other geometry cannot secretly affect sound.
function makePhrase(orbit, options) {
  return Array.from({ length: options.phraseSteps }, (_, i) => {
    const vertex = orbit.symbols[i];
    if (vertex === undefined) return null;
    const midi = options.midiByVertex[vertex];
    return { vertex, midi, frequency: midiToHz(midi), orbitIndex: i,
      velocity: i % options.accentEvery === 0 ? 1 : 0.65 };
  });
}

module.exports={midiToHz,makePhrase};
