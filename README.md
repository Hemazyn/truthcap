# TruthCap

**What you agreed, written down. Both keep a copy.**

TruthCap turns everyday agreements — a used item's condition, a repair quote, a delivery, a payment plan, or a handover — into a plain-language, timestamped record that both parties read and acknowledge. It sits between a chat screenshot (too weak) and a formal contract (too heavy).

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

## ✨ Features

- **Template-based agreements** - Five pre-built templates for the most common real-life scenarios
- **Plain-language records** - Write agreements in words both people understand, no legal jargon
- **Mutual acknowledgment** - Both parties must read and acknowledge with timestamped proof
- **Short share links** - An 8-character link (`/s/ab23cd45`) that opens the record on any device, no account required, plus a QR code on the record screens for scanning in person
- **Records page** - Every record saved in this browser, searchable and filterable by status
- **Local-first & private** - Records live in your browser's localStorage until Phase 3 backend arrives
- **Portable** - Copy as text, copy the link, or print/save as PDF
- **Clean, mobile-friendly** - Works great on any device

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/hemazyn/truthcap.git
cd truthcap

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 🛠️ Tech Stack

| Layer                | Technology                                                            | Purpose                                             |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org/)                                     | App Router: file routes, metadata and `/api/share`  |
| **UI**               | [React 19](https://react.dev/)                                        | UI library with latest features                     |
| **Language**         | [TypeScript 5](https://www.typescriptlang.org/)                       | Type-safe development                               |
| **Styling**          | [Tailwind CSS 4](https://tailwindcss.com/)                            | Utility-first CSS with design tokens                |
| **State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/)                            | Lightweight state with localStorage persistence     |
| **Animations**       | [Framer Motion](https://www.framer.com/motion/)                       | Smooth, accessible animations                       |
| **Icons**            | [Lucide React](https://lucide.dev/)                                   | Beautiful, consistent icons                         |
| **Short links**      | [Upstash Redis](https://upstash.com/)                                 | Stored records behind 8-character links, 90-day TTL |
| **Testing**          | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | Unit and E2E testing                                |

## 📁 Project Structure

```
truthcap/
├── public/              # Static assets (favicon, icons)
├── src/
│   ├── app/             # App Router: layout, one folder per route, /api/share
│   │   └── api/share/   # Short links and the acknowledgment channel
│   ├── components/      # React components (SiteShell carries the app chrome)
│   │   ├── ui/         # Reusable UI primitives
│   │   └── ...         # Feature components
│   ├── data/           # Template definitions
│   ├── lib/            # Utilities (routes, storage, validation, share payload)
│   ├── store/          # Zustand store
│   ├── types/          # TypeScript type definitions
│   └── index.css       # Global styles and design tokens
├── e2e/                # End-to-end tests
├── scripts/            # Repo tooling (brand image generation)
├── next.config.ts      # Next configuration
└── postcss.config.mjs  # Tailwind CSS 4
```

## 🗺️ Routes

| Route                | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `/`                  | Landing page with templates and how-it-works                      |
| `/create`            | Multi-step record creation flow                                   |
| `/records`           | Every record saved on this device, with search and status filters |
| `/acknowledge/:code` | Acknowledgment page for the other party                           |
| `/record/:id`        | View pending or completed record                                  |
| `/s/:id`             | Short link: fetches the stored record, then shows the shared copy |
| `/shared#<payload>`  | Read-only copy decoded from the link itself (offline fallback)    |
| `/api/share`         | `POST` stores a link or an acknowledgment; `GET` reads either     |

## 🔄 How It Works

1. **Pick a template** - Choose from five scenarios that match your agreement
2. **Fill in details** - Add the specifics: what, condition, price, dates, parties
3. **Share** - Send the short link or QR code, plus the 6-character code
4. **Acknowledge** - The other party reviews and confirms the agreement
5. **Keep copies** - Both parties have access to the timestamped final record

## 📜 Available Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start development server with hot reload             |
| `npm run build`        | Type-check and build for production                  |
| `npm run start`        | Serve the production build locally                   |
| `npm run lint`         | Run ESLint                                           |
| `npm run typecheck`    | Run TypeScript type checking                         |
| `npm run test`         | Run unit tests with Vitest                           |
| `npm run test:watch`   | Run tests in watch mode                              |
| `npm run test:e2e`     | Run E2E tests with Playwright                        |
| `npm run images`       | Regenerate `og-image.png` and `apple-touch-icon.png` |
| `npm run format`       | Format code with Prettier                            |
| `npm run format:check` | Check code formatting                                |

## 💾 Data Storage

Records live in your browser under `localStorage` key `truthcap.records.v1`.

**Short links.** When you share, the encoded record is sent to `POST /api/share`, stored under an 8-character id and returned as `/s/ab23cd45`. The record is kept there for **90 days** (`EX 7776000`), after which the link shows "We can't find that record". Anyone holding the link can read the record, exactly like a forwarded PDF — treat the link as the record itself.

**Offline fallback.** If the API is unreachable (no connection, or a deploy without the store configured), sharing falls back to the record travelling inside the URL fragment (`/shared#…`): nothing is stored on a server, the link is longer, and the app says so in the UI. Local development runs the same endpoint, so you only see the fallback when you are actually offline.

The payload itself (`src/lib/payload.ts`) is binary — template and choices as indexes, timestamps as varints, dates as three bytes, party roles left out because the template already has them — deflated and base64url-encoded. A typical record is ~220 characters before it is stored behind a short id.

**Acknowledgment channel.** The same endpoint carries acknowledgments: `POST /api/share` records one party's timestamp against the record id (guarded by the 6-character code) and `GET /api/share?record=…` reads them back, so each side sees the other's confirmation without sending a fresh link. The screens poll that channel while they are open, and the first code written for a record is pinned so a second code cannot take it over.

### Enabling short links

Local development needs nothing: `npm run dev` runs the real handler in `src/app/api/share/route.ts`, which keeps records in memory while `NODE_ENV` is development and no Redis is configured (the memory is cleared when the server restarts). Development and production therefore run the same validation, routing and acknowledgment code — only the storage differs.

For a deployment, create a Redis database on [Upstash](https://console.upstash.com) and set two environment variables in Vercel (and in `.env.local` if you want `vercel dev` to use them):

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

`src/app/api/share/route.ts` talks to Upstash over its HTTP REST API, so there is no client library or connection pool. A production deployment without these variables answers `503` (visible, rather than quietly pretending to work) and sharing falls back to the long self-contained links.

Known gap: `POST /api/share` validates size and rejects cross-origin writes, but is not rate limited. Anyone can create links until the Redis quota runs out; add Upstash's rate limiter before opening it to the public.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Conventions

- TypeScript strict mode - no `any` in application code
- Tailwind CSS utilities only - design tokens in `src/index.css`
- Use `cn()` utility for conditional class names
- All store mutations go through Zustand actions with persistence
- Follow the existing code style (enforced by ESLint and Prettier)

## 📄 License

This project is private and proprietary.
