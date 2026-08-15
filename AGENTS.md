# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable Design Direction

- The selected visual source is `/Users/xllin/小异空间/工作/项目/TT/docs/ui-concepts/live-classroom-pixel-animals.png`.
- Keep the product cute, warm, and 16-bit pixel styled, with chunky dark outlines, warm paper, mint green, coral, gold, and wood tones.
- Students are always the six animal classmates: white rabbit, red panda, orange kitten, little fox, brown bear cub, and hamster. Do not replace them with human student characters.
- The child user role-plays as the teacher. The UI should make teaching feel like a game while the learning remains real.
