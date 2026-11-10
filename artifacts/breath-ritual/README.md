# Breath Ritual

A private, browser-only mindful pause ritual. Start the app with `npm run dev` from this directory; create a production build with `npm run build`.

## Camera and microphone

Camera and microphone modes require a secure browser context (HTTPS, or localhost) and explicit permission after pressing their controls. Allow permissions in the browser prompt. If permission is declined, the device has no available camera/microphone, or access is unsupported, the visual experience remains usable in fallback mode with manual controls. Camera preview is mirrored. Camera and audio are processed locally in the browser and are never recorded, uploaded, or sent to a service.

Microphone mode uses the Web Audio API to react to sound-level bursts as a heuristic. It does not detect or measure breathing. Stop microphone mode with its button; leaving the page also stops active media and audio resources.

## Controls

- Begin your pause with the primary control; tap again during the inhale/hold prompts to release. Press Space on desktop to trigger the ritual.
- Use sound cue to enable a synthesized soft whoosh and choose Tune for cloud fullness, vapor softness, tint, and optional vibration.
- Turn on camera for a live mirrored background, or use sound cue for optional microphone-triggered ritual moments.
- The pause count is stored only in local browser storage. Reduced-motion preferences are respected.
