# Digital Venue

A frontend-only prototype for exploring a top-down, seat-level venue map. The current slice renders a local-data Soldier Field overview with pan and zoom; seat-level selection is planned.

## Stack

- Vite, React, and TypeScript
- Tailwind CSS
- PixiJS for the WebGL-backed map
- Zod for local JSON validation
- Vitest and Testing Library
- Playwright

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Architecture

React will own product state and accessible DOM controls. PixiJS will own the map scene, camera transforms, and hit testing behind a narrow interface. See [ADR 0001](docs/adr/0001-render-the-map-with-pixijs-behind-react.md).

Venue geometry and event inventory are designed to live in separate local JSON files and be validated at runtime. The current venue overview uses validated local venue geometry; event inventory will be added with the offer-browsing slice.

The [Soldier Field overview reference](docs/references/soldier-field-overview.md) records the visual cues used for the schematic map.
