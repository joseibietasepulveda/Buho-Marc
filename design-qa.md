# Design QA — Buho Marc Dev · 24 Aug 2026

## Comparison target

- Dashboard KPI and calendar references: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-af30a0a1-c633-41f1-a47a-a4e292ffb251.png`, `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-2d5f27f8-7566-4c5b-85ff-f412ba4f5c31.png` and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-391a342c-b141-4935-8c43-9c51f644d464.png`.
- Coincidence table reference: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-cea74db9-79eb-4dfe-98c6-d1af9f5ed268.png`.
- Case drawer and board references: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-013221e7-2878-46ea-944c-5ed42530c87e.png` and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-d9907daf-01fe-4aee-a98b-0df073b42fd7.png`.
- Implementation: `http://127.0.0.1:3000/app` in the Codex in-app browser.
- Browser-rendered screenshots: `/tmp/buho-dashboard-1440.png`, `/tmp/buho-dashboard-1000.png`, `/tmp/buho-dashboard-default-final.png`, `/tmp/buho-matches-1440.png`, `/tmp/buho-cases-1440.png`, `/tmp/buho-case-match-overlay-1440.png` and `/tmp/buho-railway-dev-final.png`.
- Viewports: 1440 × 900 and 1000 × 900 CSS pixels.
- States compared: dashboard, previous/next calendar month, coincidence list, case board, case list, case drawer, superposed coincidence drawer and unlink confirmation.

## Visual comparison

- The warm grey workspace, off-white surfaces, dark fixed navigation and violet accent system remain unchanged.
- The KPI surface is vertically tighter. All four cards use identical title, number and subtitle tracks; at 1000 px their offsets are 13, 50 and 109 px respectively, including the two-line opposition subtitle.
- The KPI grid changes cleanly from four columns to two without document overflow.
- The dashboard match rows no longer contain the INAPI link. Similarity badges, followed brand and possible match now fit without overlap.
- The calendar month title is fully visible between compact arrow buttons and the two lower dashboard panels keep the requested equal split at desktop width.
- The coincidence table begins with Similitud and Estado, contains no Revisar column and fits its complete 1158 px container without horizontal overflow at the desktop viewport.
- The case board contains only Preparación, Presentado, Seguimiento and Concluido.
- No clipped headings, broken spacing, unintended black blocks or overlapping controls remain in the tested states.

## Interaction QA

- Calendar arrows changed Agosto de 2026 to Septiembre de 2026 and back without reloading the page.
- Match rows remain fully clickable and keyboard accessible after the column reordering.
- Opening Ver coincidencia from a case produced two stacked drawers; closing the match drawer left the case drawer open.
- Sacar de caso showed an explicit confirmation explaining that the match returns to pending review while the case remains open; Cancelar closed the confirmation without changing data.
- Legacy Evaluación values from local storage and PostgreSQL snapshots are normalized to Preparación, so no hidden fifth stage remains in board or list view.
- Case-list stage badges use distinct classes and colors for Preparación, Presentado, Seguimiento and Concluido.
- Browser console errors and warnings: none.

## Verification

- `npm test`: passed (includes production build and five automated tests).
- Focused ESLint check for the modified TypeScript files: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Railway Dev was checked after deployment: the complete month title is visible, the four case stages and reordered match headers are present, and the browser console has no warnings or errors.

final result: passed

---

## Design QA — Revisor de factibilidad · 28 Aug 2026

### Comparison target

- Source visual truth: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-6c82d82c-d4ab-4da9-841a-d694968f2d9d.png` (search structure, 2264 × 476 px) and `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-39a5a984-9f25-44a5-93b7-a07ff11d0388.png` (results table, 2454 × 608 px).
- Supporting brand assets: the four user-supplied Cafeteras Mistral, Cafeteras Las Delicias, Pisco Mistral and Museo Gabriela Mistral images, plus the public Hotel Mistral reference saved in `public/feasibility/`.
- Browser-rendered implementation: `reference-captures/feasibility-initial-final.png` and `reference-captures/feasibility-results-final-fit.png`, both 1280 × 720 px.
- Combined comparison evidence: `reference-captures/feasibility-comparison-final.png`, 2560 × 1440 px. Each source or implementation view was normalized to a 1280 × 720 cell without density scaling; browser viewport was 1280 × 720 CSS px at device density 1.
- States compared: prepared demo search and analyzed results with the first candidate expanded.

### Required fidelity surfaces

- Fonts and typography: the reference hierarchy was translated into the existing Geist/Geist Mono system; large app title, compact field labels, strong table headers and readable risk values remain consistent with Buho Marc rather than copying EUIPO styling.
- Spacing and layout rhythm: the search uses the reference's single horizontal composition and the table keeps its dense row rhythm. The result summary precedes the table as requested and the sidebar retains all eight destinations at the 720 px test height.
- Colors and visual tokens: the existing ink, warm surface and violet controls are preserved. Risk is not color-only: each value includes a percentage and probability label; green, gray and red semantics follow the 15% reference rule.
- Image quality and asset fidelity: all five candidate rows use real raster logo assets with `object-fit: contain`; no logo is reproduced as CSS, text art or a placeholder. The uploaded Cafeteras Mistral mark remains sharp in the input preview.
- Copy and content: no advanced-search control or trademark-office column remains. The table includes Niza classes, applicant name, application number, situation and similarity evidence; the summary distinguishes pre-publication formal observations from post-publication substantive objections and carries an explicit mock-data disclaimer.

### Interaction QA

- Sidebar order verified as Inicio → Revisor de factibilidad → Inscripción de marcas → Marcas registradas.
- Text entry, match-mode selector, image upload, case reset and analysis button are interactive.
- Selecting class 35 after classes 11, 30 and 43 produced a fourth numeric chip without replacing earlier choices; the uploaded filename and preview updated correctly.
- Analysis showed the loading state and then four ordered candidates. Row disclosure opened and closed the explanation without navigating away.
- Browser console errors and warnings: none. Production build and TypeScript check passed through `npm run build`.
- Railway Dev deployment `fd17c0b7-00ba-4c2b-871c-69ee81da297e` reached `SUCCESS`; the published flow returned four rows, its browser console remained clean and `/api/health` reported `database: connected`.

### Comparison history and resolved findings

- P2 persistent navigation: the first 1280 × 720 capture hid Usuarios below the viewport. Compact-height sidebar spacing, button heights and plan padding were reduced; the final capture shows all eight destinations and the plan.
- P2 result visibility: the initial table width hid applicant and similarity columns behind horizontal overflow at 1280 px. The desktop minimum width, cell padding, logo size and applicant width were tightened; the final evidence shows all requested columns and risk scores simultaneously.
- No actionable P0, P1 or P2 findings remain. The source screenshots are structural references from a different product, so their map illustration, colors and typography were intentionally not cloned.

### Follow-up polish

- P3: a production motor should add partial-result and source-unavailable states; these are documented in the backlog and do not block the curated demo.

final result: passed

---

## Design QA — Inscripción de marcas · 27 Aug 2026

### Comparison target

- Structural references: `/Users/rosariovial/Downloads/WhatsApp Image 2026-08-27 at 17.57.49.jpeg` and `/Users/rosariovial/Downloads/WhatsApp Image 2026-08-27 at 17.57.48.jpeg` (3024 × 4032 px). The whiteboard notes are treated as information architecture and workflow references, not as a visual style source.
- Existing-product visual source: the current Buho Marc navigation, Geist typography, warm neutral surfaces, compact borders and violet accent system in `app/app/buho-app.css`.
- Implementation captures: `reference-captures/registration-desktop.png`, `reference-captures/registration-detail.png` and `reference-captures/registration-history.png` at 1440 × 1000 CSS pixels, DPR 1.
- Combined comparison inputs: `reference-captures/registration-qa-canvas.png` and `reference-captures/registration-qa-detail.png`.
- Primary target: desktop. Tablet and mobile are compatibility surfaces only, as documented in the README.

### Visual comparison

- The complete Canvas presents the two macrofases in the requested sequence: INAPI first and Diario Oficial · desde la publicación second, with a directional transition between them.
- Closed cards preserve the rapid reading order marca → estado → vencimiento → días restantes. Legal days are separated from the state label and use the existing blue accent.
- Normal, próximo a vencer, vencido and terminal conditions use iconography and explicit text in addition to color.
- The Diario Oficial header explains that the workflow continues through opposition, substantive examination and INAPI resolution after publication.
- The detail drawer opens over the Canvas without changing its position. State is the first detail field; identity, application metadata, holder/client, Nice classes, registration information and expediente reference follow.
- The vertical history uses the exact event grammar, a visible downward connector and optional secondary context.
- The interface uses the app's real logo assets and Phosphor icons; no placeholder illustration or custom SVG substitute was introduced.
- No clipped headings, overlapping cards, unintended global footer styling or broken desktop grids remain in the final comparison.

### Interaction QA

- Sidebar order verified as Inicio → Inscripción de marcas → Marcas registradas.
- Search by TERRA reduced the Canvas to one matching card and clearing filters restored all 12 applications.
- The temporary status selector exposes all 17 requested statuses; moving TERRA SUR to a Diario Oficial state moved the card to the second macrofase, and moving it back restored the INAPI lane.
- Loading and empty demo states render independently and return to the Canvas state.
- Opening and closing the detail drawer preserves the Canvas URL and position.
- A fresh browser tab loaded all 12 cards with no browser errors or warnings; only normal Vite connection and React development messages were present.

### Resolved findings

- P1 behavior: a missing `Funnel` icon import initially prevented the Canvas from rendering; the import was added and a fresh-tab check passed.
- P1 layout: the app's global footer rules leaked into card footers; the card footer was explicitly scoped and the final desktop capture shows correct alignment.
- P2 content: a publication date could remain visible after moving a mock card back to INAPI; publication metadata is now shown on closed cards only in the Diario Oficial macrofase.
- P2 content: the timeline connector did not literally display the requested down arrow; the arrow is now visible between recorded events.
- P2 responsive navigation: compact navigation buttons had no visible labels; numeric labels 01, 02 and 03 remain visible for basic small-screen access, without changing the desktop-first product decision.

### Verification

- `npx tsc --noEmit`: passed with the project's stale generated `.next-local` cache isolated for the check, then restored unchanged.
- `git diff --check`: passed.
- Browser checks: desktop Canvas, detail drawer, vertical history, search, status movement, loading and empty states passed.
- Railway Dev deployment `5dad6892-9e25-4fbd-b17f-28401d9127a0`: `SUCCESS`; health check connected, 12 cards visible, both macrofases rendered side by side at 1280 px, exact sidebar order present and browser console clean.
- Focused ESLint did not complete in this repository and was stopped after hanging without output; no partial changes were produced.

final result: passed

---

## Focused QA — KPI deadline and match-table overflow

- Reference: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-14c27b34-3329-4c1b-b4b7-f419ebd50b57.png`.
- Local implementation screenshots: `/tmp/buho-dashboard-kpi-1280.png`, `/tmp/buho-matches-scrollbar-1280.png`, `/tmp/buho-matches-scrollbar-1000.png` and `/tmp/buho-matches-scrollbar-visible.png`.
- Viewports: 1280 × 900 and 1000 × 900 CSS pixels.
- The Casos activos subtitle reads `2 con vencimiento en menos de 14 días`; its card has no horizontal or vertical overflow at 1280 px.
- Similitud and Estado pills render at 10 px. Across all ten rows, both pills remain inside their own cells at both tested widths; the longest status, `En observación`, keeps 30.3 px of free space before its cell boundary.
- The table uses a fixed 1280 px layout inside a 977 px container at the desktop check and a 691 px container at the narrow check. Horizontal overflow is therefore deliberate and available at both widths.
- The horizontal scrollbar is visible with a violet thumb and was exercised from `scrollLeft = 0` to `286.11` using the browser UI.
- Visual comparison confirms that the overlap shown in the reference no longer occurs. Browser console errors and warnings: none.
- Railway Dev was checked after deployment at 1280 × 900: all ten live rows—including `En observación` and `Convertida en caso`—remain inside their cells at 10 px; the published table scrolls horizontally from `0` to `286.11` and its console has no warnings or errors.

final result: passed
