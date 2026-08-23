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

## Previous verification

- `npm run lint`: passed with one pre-existing `<img>` performance warning in `app/portada-3/page.tsx`.
- `npm test`: passed.
- Next.js production build: passed.

---

# Design QA — dashboard promocional de la landing de prueba

## Comparison target

- Source visual truth: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-503a8f26-2798-4f3f-80d2-737132585811.png`
- Source pixels: 2304 × 1492 px.
- Implementation route: `http://localhost:3000/landing-de-prueba-js#dashboard`
- Browser-rendered implementation screenshot: `/Users/rosariovial/Desktop/Nacho Business/Monitoreador Logos/dashboard-preview-qa-final.png`
- Combined comparison evidence: `/Users/rosariovial/Desktop/Nacho Business/Monitoreador Logos/dashboard-comparison.png`
- CSS viewport used for the desktop render: 1200 × 833 CSS px at device pixel ratio 1.2.
- Normalization: both dashboard regions were center-cropped/resized to 425 × 278 px for equal-density side-by-side comparison.
- State: default dashboard overview, no hover, focus, modal, or loading state.

## Full-view comparison evidence

The source and implementation preserve the same major composition: warm gray dashboard canvas, large greeting, attention strip, four-column metrics, and a two-column agenda/review area. The dashboard is presented inside the dark landing section without changing the surrounding landing visual language.

## Focused region comparison evidence

The combined comparison focuses on the complete dashboard surface at equal dimensions. Additional focused crops were not needed because the greeting, status chips, metric labels and values, calendar dates, agenda rows, match labels, and faux INAPI links remain readable in the normalized full-dashboard comparison.

## Required fidelity surfaces

- Fonts and typography: Geist Sans and Geist Mono reproduce the existing app hierarchy; weights, scale, tracking, and single-line metric labels are consistent with the source.
- Spacing and layout rhythm: the greeting, attention strip, metrics, and lower panels use the same vertical order and close proportional spacing. Rounded corners and dividers match the app design system.
- Colors and visual tokens: warm gray canvas, off-white cards, purple accents, and high/medium/low semantic colors match the source.
- Image quality and asset fidelity: the dashboard contains no raster imagery, logos, illustrations, or non-standard icons requiring asset replacement. UI surfaces remain sharp at the tested density.
- Copy and content: greeting, metrics, agenda entries, and coincidence data match the supplied dashboard reference.
- Accessibility and behavior: the preview contains zero anchors, buttons, form controls, or elements with `role="button"`; pointer interaction is disabled by structure rather than hidden controls. No console errors or warnings were found.
- Responsiveness: desktop, tablet, and mobile checks showed no document overflow; the lower dashboard grid changes to one column at narrower widths.

## Comparison history

### Iteration 1

- Finding: [P2] The initial promotional dashboard was taller and looser than the source, which reduced the source's compact operational feel.
- Fix: reduced dashboard padding, header height, metric-card height, calendar density, agenda-row height, and match-row height.
- Post-fix evidence: `dashboard-comparison.png` shows the refined implementation beside the normalized source with aligned proportions and hierarchy.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: the implementation keeps a subtle outer radius and shadow to integrate the dashboard into the landing section; this is an intentional presentation treatment rather than a change to the dashboard information architecture.

## Primary interactions tested

- Confirmed the preview contains no clickable or focusable dashboard controls.
- Confirmed the dashboard remains readable at desktop, tablet, and mobile breakpoints.
- Confirmed browser console errors and warnings: none.

## Implementation checklist

- [x] Replace the previous dark metrics board in the test landing.
- [x] Recreate the current dashboard overview from the supplied reference.
- [x] Keep all dashboard content non-interactive.
- [x] Preserve responsive behavior and prevent horizontal overflow.
- [x] Preserve the original landing and the real `/app` dashboard.

final result: passed
