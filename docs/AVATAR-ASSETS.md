# Avatar sculptures

Five original, procedural GLB prototypes: Zeus, Athena, Hermes, Poseidon, and Ares. Each has its own proportions, palette, face, hair, costume, and equipment. These are simplified web sculptures, not production-quality reproductions of the approved concept renders. Visual approval is still required before a production release.

## Build

```sh
npm run models:build
npm test
npm run test:avatars
```

The generator in `scripts/build-avatars.mjs` exports self-contained glTF 2.0 binaries and a content-hashed asset manifest. Geometry is merged by material and section. Skin forms are blended offline; none of the sculpting work runs in the browser. No external 3D service, runtime texture host, paid SDK, or new dependency is required.

The viewer loads only the selected character, caches it, renders on demand, and caps pixel density. The collection supports orbit interaction. The offering animation retains the turn-to-face interaction and reduced-motion behavior. These sculptures are not skeletal-rigged characters; limb and facial animation remain future work.

Generated concept artwork is stored as WebP for unavailable/failed WebGL fallback. The supplied stock reference illustrations are not redistributed. Concepts and generated models are not representations of human anatomy for exercise instruction.

## Replacement contract

Models face +Z with Y up. Feet rest near Y=0 and the highest accessories are below Y=4. Sections are named `Body`, `Head`, and `Cape`. Keep avatar IDs unchanged when replacing geometry so equipment, progress, and rewards remain compatible. Update the manifest with a new content-hashed filename; never overwrite a cached model URL with different content.

Review desktop/mobile framing, back and side views, scene failures, locked previews, equip persistence, and offerings before release. Browser checks use disposable local profiles and never modify a user's cloud journal.
