# UI Guide

Use this guide with the reference images in [`docs/design/`](./design/). The implementation tokens in `frontend/src/app/globals.css` are the source of truth.

## Layout

- Design for a 393 × 852 mobile viewport first.
- The desktop phone frame and reference status bar are development previews, not device UI.
- Keep primary actions reachable near the bottom of the screen.
- Preserve safe-area spacing for fixed footers and sheets.

## Content and formatting

| Item | Rule |
| --- | --- |
| Money | Store as integer satang and format through the shared formatter. |
| Date and time | Present in `Asia/Bangkok`; use Buddhist Era formatting where the product requires it. |
| Status | Use the shared deal-state mapping for label, color, action, and next actor. |
| Brand copy | Keep in `src/config/brand.ts`. |

## Components

- Use the shared UI primitives before creating a local variant.
- Use design tokens instead of literal colors, shadows, and spacing values in components.
- Give actions an explicit disabled or loading state while requests are pending.
- Keep irreversible or consequential actions behind clear confirmation UI.

## Accessibility and motion

- Maintain visible keyboard focus and semantic labels for controls.
- Do not rely on color alone to communicate status.
- Respect reduced-motion preferences.
- Keep text readable at browser zoom and avoid essential information in images.

## Visual review

Open `/dev/overlay?screen=<id>` to compare a local screen with the reference. Use `npm run test:visual` for repeatable checks and review every image diff before updating a baseline.
