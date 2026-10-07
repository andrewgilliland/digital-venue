# Digital Venue

A frontend-only prototype for exploring a top-down, seat-level venue map. The project is scaffolded but the venue map and product workflows have not been implemented yet.

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

Venue geometry and event inventory will be stored separately as local JSON and validated at runtime. Their schemas and sample data are intentionally deferred until implementation begins.
