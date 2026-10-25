# TruthCap

**What you agreed, written down. Both keep a copy.**

TruthCap turns everyday agreements — a used item's condition, a repair quote, a delivery, a payment plan, or a handover — into a plain-language, timestamped record that both parties read and acknowledge. It sits between a chat screenshot (too weak) and a formal contract (too heavy).

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

## ✨ Features

- **Template-based agreements** - Five pre-built templates for the most common real-life scenarios
- **Plain-language records** - Write agreements in words both people understand, no legal jargon
- **Mutual acknowledgment** - Both parties must read and acknowledge with timestamped proof
- **Share by link or code** - The share link carries the record itself, so it opens on any device, no account required
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

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

## 🛠️ Tech Stack

| Layer                | Technology                                                            | Purpose                                         |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **Framework**        | [React 19](https://react.dev/)                                        | UI library with latest features                 |
| **Language**         | [TypeScript 5](https://www.typescriptlang.org/)                       | Type-safe development                           |
| **Build Tool**       | [Vite 8](https://vitejs.dev/)                                         | Fast dev server and optimized builds            |
| **Styling**          | [Tailwind CSS 4](https://tailwindcss.com/)                            | Utility-first CSS with design tokens            |
| **State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/)                            | Lightweight state with localStorage persistence |
| **Animations**       | [Framer Motion](https://www.framer.com/motion/)                       | Smooth, accessible animations                   |
| **Icons**            | [Lucide React](https://lucide.dev/)                                   | Beautiful, consistent icons                     |
| **Testing**          | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | Unit and E2E testing                            |

## 📁 Project Structure

```
truthcap/
├── public/              # Static assets (favicon, icons)
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Reusable UI primitives
│   │   └── ...         # Feature components
│   ├── data/           # Template definitions
│   ├── lib/            # Utilities (router, storage, validation)
│   ├── store/          # Zustand store
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # App shell and routing
│   ├── index.css       # Global styles and design tokens
│   └── main.tsx        # Entry point
├── e2e/                # End-to-end tests
├── scripts/            # Repo tooling (brand image generation)
└── index.html          # HTML template
```

## 🗺️ Routes

| Route                | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `/`                  | Landing page with templates and how-it-works                      |
| `/create`            | Multi-step record creation flow                                   |
| `/records`           | Every record saved on this device, with search and status filters |
| `/acknowledge/:code` | Acknowledgment page for the other party                           |
| `/record/:id`        | View pending or completed record                                  |
| `/shared#<payload>`  | Read-only copy opened from a share link, decoded in the browser   |

## 🔄 How It Works

1. **Pick a template** - Choose from five scenarios that match your agreement
2. **Fill in details** - Add the specifics: what, condition, price, dates, parties
3. **Share** - Generate a share link and 6-character code for the other person
4. **Acknowledge** - The other party reviews and confirms the agreement
5. **Keep copies** - Both parties have access to the timestamped final record

## 📜 Available Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start development server with hot reload             |
| `npm run build`        | Type-check and build for production                  |
| `npm run preview`      | Preview production build locally                     |
| `npm run lint`         | Run ESLint                                           |
| `npm run typecheck`    | Run TypeScript type checking                         |
| `npm run test`         | Run unit tests with Vitest                           |
| `npm run test:watch`   | Run tests in watch mode                              |
| `npm run test:e2e`     | Run E2E tests with Playwright                        |
| `npm run images`       | Regenerate `og-image.png` and `apple-touch-icon.png` |
| `npm run format`       | Format code with Prettier                            |
| `npm run format:check` | Check code formatting                                |

## 💾 Data Storage

All records are stored locally in your browser under `localStorage` key `truthcap.records.v1`. Data never leaves your device in the current version.

Share links (`/shared#…`) carry a compressed (deflate-raw), base64url-encoded copy of the record in the URL fragment — about half the length of the plain JSON and never sent to a host — so the other person can open it on their device without a server. Older uncompressed links still open. Acknowledging a shared copy timestamps that copy on their device; syncing both copies requires the upcoming Phase 3 backend.

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
