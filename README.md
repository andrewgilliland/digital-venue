# Digital Venue

A frontend-only prototype for exploring a top-down, seat-level venue map. The current slice supports venue overview navigation, focused Section views, semantic zoom, and deterministic Row and Seat detail for representative Sections 110, 122, and 430.

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

Venue geometry loads from validated local JSON. Detailed Sections store concise Row arc paths; stable Seat positions and identifiers are generated deterministically at runtime. Event inventory will remain separate when Offer browsing is added.
