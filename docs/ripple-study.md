# Study 001 / Ripple — 投石涟漪

Date: 2026-10-01. Status: implemented and locally tested source; original Sites deployment not updated in this task.

## Outcome and scope

The approved direction is to extend the first demo into a throw-triggered audiovisual experience: simple beginning, increasing complexity, full-screen color, gradual diffusion, and layered musical development. This is distinct from a continuous-inertia interaction proposal.

The original mathematical engine, application modules, styles, tests, and hosting configuration are preserved. The new homepage is `dist/index.html`; the original index is copied byte-for-byte to `dist/outer-billiards.html`. Its historical source blob is `8b681827df5580fc2df1a05d3c2c4cb47478ff45`.

## What the build does

A click, touch, keyboard action, or drag-and-release launches a small sphere. Drag distance and speed determine strength. Normalized landing position and strength deterministically map to a seed outside a regular pentagon. The original `traceOrbit` computes up to 256 iterations; the first up to 16 vertex symbols supply the motif. Empty motifs do not receive fabricated replacement melodies.

| Age after impact | Visual development | Musical development |
| --- | --- | --- |
| 0–4 seconds | Sparse rings and a clear point of impact | Impact chime and sparse motif |
| 4–13 seconds | Growing fivefold pattern and interwoven lines | Bass and sustained harmony enter |
| 13–23 seconds | Layered colored field expands across the viewport | Melody, bass, pad, bell, and bloom layers |
| 23–38 seconds | Sharp lines soften into diffuse color and fade | Parts withdraw, leaving decaying notes and reverberation |

The 38-second envelope, 84 BPM pentatonic mapping, palette, synthesis, and four-drop concurrency cap are implementation choices for evaluation, not permanently approved product specifications. Reverb may outlast the visible envelope briefly. More throws can overlap; inputs are throttled and voices are capped. Pause freezes the shared transport. Mute, reset, keyboard aiming, emulated touch support, and reduced-motion behavior are implemented.

## Mathematical and artistic boundaries

The pale orbit layer is calculated by the unchanged Outer Billiards module. The colored field combines expanding radial fronts with angular sine/cosine terms of orders 5, 10, and 15. Orbit-derived phase and center offsets influence the field. This is a deliberately composed mathematical visual, not a physical water simulation and not a replacement diagram of the billiards trajectory.

The melody follows the real symbolic orbit. The harmonic progression, registers, note density, and timbres are composed mappings. The audio is synthesized in the browser, not prerecorded music or an orchestral sample library. Musical repetition is not proof of an orbit's mathematical periodicity.

## Implementation

- `dist/src/ripple/core.js`: deterministic gesture mapping, stage envelope, score events, flight interpolation.
- `dist/src/ripple/audio.js`: AudioContext timebase, independent look-ahead scheduler, five voice types, output control, delay and convolution, lifecycle controls.
- `dist/src/ripple/surface.js`: bounded-resolution Canvas2D wavefronts, harmonic ribbons, reduced-resolution bloom and haze.
- `dist/src/ripple/app.js`: gestures, animated sphere, original orbit overlay, controls, layout state, optional diagnostics at `?check`.
- `tests/ripple.test.mjs`: thirteen deterministic tests.

No external libraries, fonts, sound files, analytics, recording, uploads, accounts, or backend were introduced. Canvas blur is an enhancement; gradients and sharp paths remain available without it. Rendering density, fill resolution, concurrent drops, and voice counts are bounded; those bounds are design safeguards, not measured device-performance guarantees.

## Executed verification

`node --test tests/ripple.test.mjs`: **13/13 passed**. Coverage includes deterministic real orbit mapping, seed validity, motif derivation, input bounds, stages, envelopes, layered note events, finite pitches and gains, no fake motif fallback, and flight endpoints.

Chromium 144 browser run: **24/24 checks passed**, no page errors. Tests used an inline bundle of the same source modules through Playwright page content, rather than HTTP module loading. Desktop interactions and a 390 × 844 mobile viewport with touch emulation were checked. The opt-in diagnostics enabled timeline seeking for later-stage checks.

Checks included actual analyser output, pause/resume, mute, reset, five voice types, mouse drag, keyboard launch, concurrency bounds, final fade state, modal behavior, simulated visibility handling, mobile overflow and target sizing, touch launch, and reduced-motion detection. Full result values are in `ripple-browser-results.json`.

The onset sample peak was 0.0500217825 and RMS 0.0132229982; the sampled climax peak was 0.1128005534. No clipping occurred in those sampled windows. This is not a full-duration or all-input audio mastering guarantee.

## Not verified / remaining gates

- Real iPhone/iPad Safari and other browser engines were not tested.
- Touch and visibility checks are emulations, not native device lifecycle acceptance.
- Some later-stage checks use seeking, not a complete uninterrupted real-time run.
- Sustained frame rate, battery use, long-session stability, and complete accessibility acceptance were not measured.
- Original tests and original browser checks were not rerun locally during this session. The original browser checks must target `outer-billiards.html` after this entrypoint change.
- New Sites saved version, deployment, and inspection of the live URL are not completed. The last recorded publication remains version 1 from source `6efe8a58e5cf244fd06148fca6d82387dffaf447`.

## Handoff

Use this note and the current README for source status; the older single-Seed notes describe the baseline. Preserve the separate source, Sites-save, deployment, and real-device gates. Next release action is to save and deploy the exact reviewed source through the original Sites project, then test its actual URL and real iOS Safari. The presence of this commit is not deployment evidence.
