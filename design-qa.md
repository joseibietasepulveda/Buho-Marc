# Design QA — Buho Marc Dev

Reference compared: dashboard screenshot supplied by the user on 22 Aug 2026.

Implementation checked: `http://127.0.0.1:3000/app#dashboard` in the Codex in-app browser at the default desktop viewport.

## Visual comparison

- The existing warm grey workspace, off-white surfaces, dark left navigation and violet accent system remain consistent with the supplied design.
- The left navigation stays fixed while the workspace scrolls independently. The active user is now near the top and the plan card remains visible at the bottom.
- The attention strip clearly separates Alta, Media and Baja counts using red, yellow and green count blocks.
- The four metric titles remain on one line and share a consistent baseline.
- The calendar and new-match panel now split the available width equally, with the calendar on the left.
- Table headers are bold, match-name values are slightly smaller, and filters are visibly boxed.
- No clipped headings, broken spacing, unintended black blocks or overlapping controls were observed in the inspected desktop state.

## Interaction QA

- Main navigation resets only the workspace scroll and does not move the sidebar.
- Brand lookup is disabled until a registration number is entered and searched; the dummy RUT, Marca, Titular, Clases de Niza and Estado then appear.
- Monitoring can be stopped and restarted from the state menu.
- Match rows are fully clickable and keyboard accessible.
- Match review contains Visual, Fonético, Conceptual, RUT, N.º registro (DO), N.º solicitud (INAPI) and Clases de Niza.
- A case was dragged from Seguimiento to Concluido and back without a page refresh.

## Verification

- `npm run lint`: passed with one pre-existing `<img>` performance warning in `app/portada-3/page.tsx`.
- `npm test`: passed.
- Next.js production build: passed.

final result: passed
