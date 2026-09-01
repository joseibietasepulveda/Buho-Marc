# Design QA — escala interior y continuidad inferior

- Source visual truth: `/var/folders/f4/cbzkgm01331dq916d_pw6k6r0000gn/T/codex-clipboard-a95274fb-cffb-47eb-9faf-52dba772f891.png`
- Implementation screenshot: `/tmp/buho-matches-reference-ratio-normalized.png`
- Combined comparison: `/tmp/buho-bottom-comparison.png`
- Viewport: 2874 × 590 CSS px, escritorio, sección Coincidencias desplazada al final.
- Source pixels: 2874 × 590.
- Implementation pixels: 2874 × 590 after normalizing the in-app browser capture to its CSS viewport; density 1× for comparison.
- State: Coincidencias, final de la tabla; barra lateral visible.

## Full-view comparison evidence

The combined comparison confirms that the table ends inside the independently scrolling workspace while the sidebar keeps its full viewport height. The prior full-width strip below both regions no longer appears. The workspace background remains continuous below the final row.

## Focused region comparison evidence

The bottom edge was inspected at the exact aspect ratio of the supplied reference. The workspace has no horizontal overflow (`scrollWidth === clientWidth`), the sidebar remains at `top: 0` and its height equals the viewport, and the page body remains exactly the viewport size. The table may keep its own internal horizontal scrolling at narrow breakpoints, which does not displace the application shell.

## Required fidelity surfaces

- Fonts and typography: unchanged on Inicio and the sidebar; compact scaling applies only to internal non-dashboard content.
- Spacing and layout rhythm: Inicio keeps its original scale; the other five modules render at 90% inside the workspace without changing the shell dimensions.
- Colors and visual tokens: existing sidebar and workspace gradients are preserved; no new color discontinuity is introduced.
- Image quality and asset fidelity: this screen contains no raster product imagery; existing UI assets and marks are unchanged.
- Copy and content: unchanged by this correction.

## Findings

No actionable P0, P1 or P2 mismatch remains for the requested scope.

## Comparison history

- Earlier finding [P1]: the 90% zoom affected the entire application and expanded its dimensions, producing a visible bottom discontinuity and changing Inicio/sidebar scale.
- Fix: moved the compact scale to a nested content wrapper activated only outside Inicio; removed the expanded viewport dimensions.
- Post-fix evidence: Inicio reports zoom `1`; Coincidencias reports zoom `0.9`; the workspace has no shell-level horizontal overflow; sidebar and body dimensions match the viewport.

## Follow-up polish

No P3 item is required for this scoped correction.

final result: passed
