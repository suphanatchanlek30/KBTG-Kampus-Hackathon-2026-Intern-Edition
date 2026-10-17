# Frontend

Next.js application for the K Sure prototype.

## Start locally

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To use the local Go API, start the stack from the repository root with `make up` and set `NEXT_PUBLIC_USE_MOCK=false`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm test` | Run unit tests. |
| `npm run typecheck` | Generate Next types and run TypeScript checks. |
| `npm run lint` | Run ESLint. |
| `npm run format:check` | Check Prettier formatting. |
| `npm run test:e2e` | Run Playwright end-to-end tests. |
| `npm run test:visual` | Compare screens with visual baselines. |

## Development tools

Development-only routes return `404` in production:

| Route | Purpose |
| --- | --- |
| `/dev/components` | Browse component variants and tokens. |
| `/dev/overlay?screen=L1` | Overlay a reference screen at 393 × 852. |

Use `O` to toggle the reference image, `[` and `]` to change opacity, and `D` for difference mode.

## Conventions

- Use tokens from `src/app/globals.css`; do not introduce component-level color literals.
- Store money as integer satang and format it with `@/lib/format/money`.
- Use `@/lib/format/date` for Bangkok and Buddhist Era date presentation.
- Keep brand copy in `src/config/brand.ts`.
- Keep data loading in screens and renderable UI in view components.

See the repository [README](../README.md) and [documentation](../docs/) for setup, flows, and API details.
