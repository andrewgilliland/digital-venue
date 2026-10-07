# Build a seat-level interactive digital venue map

## Problem Statement

Visitors evaluating seats at a venue need to understand where sections, rows, and individual seats sit relative to the field, compare availability and prices, and select adjacent seats. The current app is only a scaffold and has no interactive venue map. The prototype must work without a backend or map-service API key, using local JSON data.

## Solution

Build a responsive, top-down interactive Soldier Field map prototype. Visitors can zoom from a venue overview into a section and individual seats, review synthetic event offers and availability, select adjacent seats, and review a prototype reservation summary. Use an original neutral visual system and geometry informed by the supplied reference image, not a pixel-level copy or bundled third-party map assets.

## User Stories

1. As a visitor, I want to see an overview of the entire venue, so that I can orient myself before choosing a seating area.
2. As a visitor, I want the venue to be recognizable as Soldier Field, so that the map has useful context.
3. As a visitor, I want a neutral venue palette rather than team-specific branding, so that the interface represents the venue independently of a team.
4. As a visitor, I want a familiar map-first ticket-discovery workflow with original UI styling, so that it is easy to explore without copying another product's exact visual design.
5. As a visitor, I want to pan and zoom the top-down map, so that I can inspect venue areas at different scales.
6. As a visitor, I want the map to reveal progressively more detail as I zoom, so that section labels, rows, and seats remain legible at the appropriate scale.
7. As a visitor, I want to select a deck or section from the venue overview, so that I can focus on an area of interest.
8. As a visitor, I want selecting a detailed section to animate the map into that area, so that the transition from venue overview to seat choice is clear.
9. As a visitor, I want to inspect individual rows and seats in representative lower-sideline, end-zone, and upper-deck sections, so that I can understand the seat-level experience.
10. As a visitor, I want the broader venue represented even where individual seats are not modeled, so that I can compare detailed sample sections with the rest of the stadium.
11. As a visitor, I want stable section, row, and seat identifiers, so that seat details and offers can be understood consistently.
12. As a visitor, I want to see available and unavailable seats with distinguishable visual states, so that I can identify seats I can select.
13. As a visitor, I want status to be communicated with more than color alone, so that availability remains understandable to people with color-vision differences.
14. As a visitor, I want to see the lowest available per-seat price marker for a section, so that I can compare areas at a glance.
15. As a visitor, I want price markers to reflect the active filters and requested quantity, so that the overview agrees with the available offers.
16. As a visitor, I want to filter by deck or section, price range, and availability, so that I can narrow the displayed offers.
17. As a visitor, I want to choose a ticket quantity, defaulting to two, so that the map can help me find an appropriate group of seats.
18. As a visitor, I want the map to highlight adjacent available seat groups matching my quantity, so that I can quickly identify seats together.
19. As a visitor, I want to select specific available seats directly, so that I can control my own seat choice.
20. As a visitor, I want unavailable seats to remain visible but not selectable, so that row layouts and sold-out areas remain clear.
21. As a visitor, I want selected seat details—including deck, section, row, seat number, availability, and offer price—to be visible, so that I can verify my choice.
22. As a visitor, I want to adjust or clear my selection and return to the venue overview, so that I can change direction without restarting.
23. As a visitor, I want a summary showing the selected seats and per-seat and combined price, so that I can review the selection before confirming.
24. As a visitor, I want a confirmation action that clearly states it is a prototype and does not complete a real transaction, so that I am not misled into believing tickets were reserved.
25. As a keyboard user, I want keyboard-accessible map controls and selection, so that I can explore without a pointer.
26. As a screen-reader user, I want an accessible DOM seat-list alternative to the rendered map, so that I can find and select seats without relying on canvas content.
27. As an assistive-technology user, I want selection, availability, and focus changes to be exposed accessibly, so that I can understand current map state.
28. As a mobile visitor, I want a full-screen map with a draggable details sheet, so that seat details do not make the map unusable on a small screen.
29. As a desktop visitor, I want seat details in a persistent side panel, so that I can compare the map and selection at once.
30. As a visitor on a supported desktop or mobile browser, I want the map to resize and accept touch interaction, so that the experience works across the target devices.
31. As a visitor whose browser cannot create a WebGL context, I want a clear fallback message and access to the accessible seat list when possible, so that the failure is understandable and I can still inspect seat data.
32. As a developer, I want venue geometry and event inventory to load from separate local JSON files, so that physical layout and event-specific offers can evolve independently without a backend.
33. As a developer, I want malformed or inconsistent JSON to produce a readable error state, so that data problems are diagnosed rather than silently rendered incorrectly.
34. As a developer, I want seat positions generated deterministically from row geometry, so that the sample data stays concise and stable between runs.
35. As a developer, I want event offers to refer to stable seat identifiers and carry per-seat prices, so that offers do not duplicate venue geometry and group totals are calculated consistently.

## Implementation Decisions

- Build on the existing Vite, React, TypeScript, and Tailwind scaffold.
- Use PixiJS with browser WebGL for the top-down map. Do not use Mapbox GL or require a map API key.
- React owns product state and accessible DOM controls. A narrow imperative PixiJS map module owns rendered graphics, camera transforms, pan/zoom, semantic visibility, and pointer hit testing. Keep selection and venue rules independent of canvas display objects, consistent with ADR 0001.
- Use a single top-down orientation with pan, zoom, reset-view, and navigation back to the venue overview; map rotation is not part of the interaction.
- Render the whole venue schematically. Supply generated row and seat detail for three representative areas: section 110 (lower sideline), section 122 (end zone), and section 430 (upper deck), with approximately 300–600 seats total.
- Keep venue geometry separate from event-specific inventory in local JSON. Validate both at runtime with Zod. Geometry describes decks, sections, and rows; row paths generate seat positions deterministically. Event offers refer to stable seat IDs and store `pricePerSeat` and availability.
- Keep physical `Seat` identity independent from an `Event` and its `Offer`. Treat `selected` as temporary application state, not persisted inventory or an availability status in the static event data.
- Use synthetic event, availability, and pricing data. Overview markers show the lowest available per-seat price within the active criteria. Offer selection supports direct seat choice and adjacent groups matching the requested quantity.
- Use an original neutral palette and original interface details. The supplied image and public seating references inform approximate orientation and section arrangement; do not reproduce or bundle SeatGeek's map, logos, marks, or proprietary assets.
- Use a desktop side panel and mobile bottom sheet. Provide keyboard operation, visible focus, non-color status cues, and an accessible DOM-based seat-list alternative.
- A reservation confirmation is illustrative only; it performs no transaction, creates no persistent hold, and does not mutate the static inventory.

## Testing Decisions

- Tests should verify externally observable behavior and domain outcomes, not PixiJS display-object structure, internal component state, or implementation-specific rendering calls.
- Use the highest seam for acceptance: a Playwright browser journey through venue overview, section focus, selection of two adjacent seats, and reservation summary. Also verify relevant filter, keyboard, accessible-list, and responsive behaviors through user-visible effects.
- Use Vitest and Testing Library for focused schema-validation, deterministic seat-generation, adjacent-seat matching, price calculation, and accessible control behavior where that provides a faster diagnosis than the browser journey.
- Prior art is the existing Playwright app-shell smoke test and Vitest/Testing Library shell test. Extend these test surfaces rather than introducing another end-to-end framework.
- Verify error handling for invalid venue or event JSON and graceful behavior when WebGL is unavailable.

## Out of Scope

- Backend services, live inventory, accounts, authentication, persistence, payment, checkout, or a real reservation/seat hold.
- Exact surveyed or complete seat-level geometry for every Soldier Field section; the whole venue is shown schematically and only three representative sections receive detailed seats.
- First-person or panoramic seat-view imagery, a fully 3D stadium, map rotation, other venues, or production deployment.
- Using OpenGL as a native desktop API; the browser implementation uses WebGL through PixiJS.
- Scraping, bundling, or precisely tracing SeatGeek's proprietary map, listing, pricing, branding, or assets.

## Further Notes

- The glossary's canonical hierarchy is `Venue → Deck → Section → Row → Seat`; event-specific availability and pricing are modeled as `Event → Offer`, and the visitor's temporary choice is a `Selection`.
- The supplied screenshot is visual direction only. Approximate section naming and layout should be cross-checked against suitable public or licensed Soldier Field seating references.
- The linked SeatGeek event page was not retrievable during initial research, so its live listings and geometry are not a source of truth for this prototype.

Published as [GitHub issue #1](https://github.com/andrewgilliland/digital-venue/issues/1).
