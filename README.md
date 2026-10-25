# TruthCap

A shared, timestamped record of what two people agreed.

TruthCap turns a real-life agreement — a used item's condition, a repair quote, a delivery, a
payment plan, a handover — into a plain-language record that both sides read and acknowledge. It
sits between a chat screenshot (too weak) and a formal contract (too heavy). Both people keep a
copy.

**Current stage:** Phase 2 (durable records and real sharing) is complete. Records persist in the
browser, every screen has an address, and the acknowledge route restores from a share link. Phase 3
(backend and server acknowledgment) is next. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

| Layer      | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| UI         | React 19, TypeScript 5                                               |
| Build      | Vite 8 (`@vitejs/plugin-react`)                                      |
| Styling    | Tailwind CSS 4 via `@tailwindcss/vite`, design tokens in `@theme`    |
| State      | Zustand 5 with a versioned `localStorage` adapter                    |
| Icons      | lucide-react                                                         |
| Class util | `clsx` + `tailwind-merge` (`cn`)                                     |
| Formatting | Prettier 3 with `prettier-plugin-tailwindcss`                        |
| Linting    | ESLint 10 flat config, typescript-eslint, react-hooks, react-refresh |
| Unit tests | Vitest (node environment with storage stubs)                         |
| E2E tests  | Playwright against the local Chrome channel                          |

## Getting started

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

### Scripts

| Script                 | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Vite dev server with HMR                                     |
| `npm run build`        | Type-check the project (`tsc -b`) then build to `dist/`      |
| `npm run preview`      | Serve the production build                                   |
| `npm run lint`         | ESLint over source, tests and configs                        |
| `npm run typecheck`    | `tsc --noEmit`                                               |
| `npm run test`         | Vitest unit tests (store lifecycle, validation, formatting)  |
| `npm run test:watch`   | Vitest in watch mode                                         |
| `npm run test:e2e`     | Playwright smoke tests (starts the dev server automatically) |
| `npm run format`       | Prettier write, including Tailwind class sorting             |
| `npm run format:check` | Prettier check (use in CI)                                   |

Playwright uses the locally installed Chrome (`channel: "chrome"`), so no browser download is
required.

## Project structure

```
truthcap/
├── public/
│   └── icon.svg               # brand mark / favicon
├── src/
│   ├── App.tsx                # shell, routing, header and footer
│   ├── components/
│   │   ├── HomePage.tsx       # landing page content
│   │   ├── PhonePreview.tsx   # auto-playing hero widget
│   │   ├── TruthCreateStep.tsx# pick → fill → share step machine
│   │   ├── TruthTemplatePicker.tsx
│   │   ├── TruthCaptureForm.tsx
│   │   ├── TruthFieldInput.tsx
│   │   ├── TruthPendingCard.tsx    # pending record, code and share link
│   │   ├── TruthAcknowledgePage.tsx# /acknowledge/:code
│   │   ├── TruthRecordPage.tsx     # /record/:id
│   │   ├── TruthRecordCard.tsx     # final acknowledged document
│   │   ├── RecordSummary.tsx       # shared read-only value table
│   │   ├── PartyList.tsx           # parties with acknowledgment state
│   │   ├── RecordNotFound.tsx      # empty and error states
│   │   ├── TruthInstructions.tsx
│   │   └── ui/                     # Button, LogoMark
│   ├── data/templates.ts      # the five record templates
│   ├── lib/
│   │   ├── router.ts          # hash routes and navigation
│   │   ├── storage.ts         # versioned persistence adapter
│   │   ├── records.ts         # lookups, share URLs, party helpers
│   │   ├── validate.ts        # validation, currency and formatting
│   │   └── utils.ts           # cn()
│   ├── store/useTruthStore.ts # Zustand records, lifecycle actions, sync
│   ├── types/truth.ts         # domain types
│   ├── index.css              # Tailwind entry + design tokens
│   └── main.tsx
├── e2e/flow.spec.ts           # Playwright smoke coverage
├── docs/                      # PRD, technical spec, design, roadmap
├── eslint.config.js
├── playwright.config.ts
├── vitest.config.ts / vitest.setup.ts
└── index.html                 # fonts and metadata
```

## Routes

| Route                 | Screen                                                    |
| --------------------- | --------------------------------------------------------- |
| `#/`                  | Landing page                                              |
| `#/create`            | Create flow; resumes the stored draft at the right step   |
| `#/acknowledge/:code` | Read-only summary and acknowledgment for the other person |
| `#/record/:id`        | Pending or acknowledged record document                   |

## The flow

1. **Pick the moment** — one of five templates (item condition, work delivered, repair, payment
   schedule, handover).
2. **Fill in the details** — required fields validate inline; both parties can be named with an
   optional contact.
3. **Share it** — the record becomes pending and gets a six-character code plus a share link.
4. **Acknowledge** — the other person opens the link, reads the same summary, confirms the code, and
   acknowledges. Both sides are stamped with the same timestamp.
5. **Keep a copy** — the final record lives at `#/record/:id` and can be copied as text, copied as a
   link, or printed/saved as PDF.

State is persisted in `localStorage` under `truthcap.records.v1`, so a refresh, a new tab, or a
reopened URL returns to the same record. Cross-device acknowledgment requires the Phase 3 backend.

## Documentation

| Document                               | Purpose                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)             | Product requirements: users, jobs, requirements, metrics                |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Architecture, routing, persistence, state machine, tooling, limitations |
| [docs/DESIGN.md](docs/DESIGN.md)       | Brand, tokens, components, motion, voice and tone                       |
| [docs/ROADMAP.md](docs/ROADMAP.md)     | Phase-by-phase plan and the gate to move to the next phase              |

## Conventions

- TypeScript strict mode; no `any` in application code.
- Tailwind utilities only — no component CSS files; tokens live in `src/index.css`.
- Class strings go through `cn()` when conditional.
- Store changes go through actions that persist; never write to `localStorage` from components.
- Run `npm run lint`, `npm run test`, `npm run typecheck` and `npm run format` before committing.
- Copy is plain and calm. Never describe the product as a demo, prototype or mock.
