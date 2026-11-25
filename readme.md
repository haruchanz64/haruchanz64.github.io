# Haru Portfolio

[![Deploy to GitHub Pages](https://github.com/haruchanz64/haruchanz64.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/haruchanz64/haruchanz64.github.io/actions/workflows/deploy.yml)
[![CI](https://github.com/haruchanz64/haruchanz64.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/haruchanz64/haruchanz64.github.io/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](license)

Personal portfolio website for Haru, a Game Developer specializing in gameplay systems, Unity tooling, and technical game design, and a College Instructor under the BS EMC Game Development program. The site is built with vanilla HTML, JavaScript (ES modules), and [Tailwind CSS v4](https://tailwindcss.com/) compiled at build time with [Vite](https://vite.dev/).

**Live Demo:** [https://haruchanz64.github.io](https://haruchanz64.github.io)

## Engineering Highlights

- **Zero-Runtime-Dependency Architecture**: Built with native ES modules, browser APIs, and build-time Tailwind CSS v4 (`@tailwindcss/vite`) backed by CSS custom properties, without a frontend JS framework or runtime dependencies.
- **Client-Side ATS PDF Engine**: Generates a valid, paginated PDF 1.4 resume directly in the browser (`src/js/resume/pdf-builder.js`) with WinAnsi character encoding, Helvetica width tables, Selected Projects, and multi-line bullet justification, without a third-party PDF library.
- **Layered Spam & Bot Protection**: Combines honeypot fields, interaction-timing checks, cooldown rate limiting, and content-scoring heuristics (`src/js/contact/spam-detector.js`) before requests reach the Cloudflare Worker.
- **Tested Multi-Language Support (i18n)**: Supports `en_us` and `fil_ph` with lazy-loaded locale dictionaries, `localStorage` caching, and automated key-parity tests (`tests/i18n.test.mjs`).
- **Offline Asset Caching**: Uses a Service Worker (`public/sw.js`) alongside `localStorage` data-URL hydration (`src/js/core/cache.js`) for fast repeat loads.

## Features

- **Portfolio Sections**: Hero, About, Projects (with in-page breakdown modals), Experience timeline (with automatic duration calculation), tabbed Skills section, Education, and Contact.
- **Multi-Language Support (i18n)**: Supports English (`en_us`) and Filipino (`fil_ph`) via `src/js/core/i18n.js` and `src/locales/`, with browser language detection and `?locale=` / `?lang=` query parameter support.
- **ATS Resume Generator**: Client-side ATS-friendly PDF resume generation (`src/js/resume/resume.js`, `src/js/resume/pdf-builder.js`, `src/js/resume/resume-guard.js`) including Experience, Selected Projects, Technical Skills, and Education.
- **Dynamic Project Feeds & Breakdown Modals**:
  - **Game Projects**: Renders itch.io game metadata bundled from `src/data/itch-projects.json` (`src/js/projects/itch.js`, synced via `scripts/sync-itch.mjs`) supplemented with sync-safe role, engine, and design/systems breakdowns (`src/js/projects/project-details.js`, `src/js/projects/project-modal.js`).
  - **Unity Tools & Designer Workflows**: Displays Unity C# tool repositories (`haruchanz64`) via `src/js/projects/github.js` (with shared config in `src/js/projects/github-config.js`) and local caching (`src/js/core/cache.js`), backed by build-time synced fallback data in `src/data/github-projects.json` (`scripts/sync-github.mjs`).
- **Contact Form**: Submits to a Cloudflare Worker (`worker/contact.js`) backed by [Resend](https://resend.com/), with a honeypot field, custom subject selector, character counter, and client-side spam/timing detection (`src/js/contact/contact.js`, `src/js/contact/spam-detector.js`).
- **Interactive UI**: Theme management, hero loading transition, intersection-observer reveal tracking, URL hash synchronization, project breakdown & case study PDF modals, and tabbed skill categories (`src/js/ui/`).

## Tech Stack

- **Build Tool**: Vite (`^7.3.1`)
- **Frontend**: HTML5, Tailwind CSS v4 (`@tailwindcss/vite`), Vanilla JavaScript (ES Modules)
- **Linting & Formatting**: Biome (JavaScript, JSON, and Tailwind v4 CSS)
- **Hosting & Backend**: GitHub Pages (`.github/workflows/deploy.yml`) + Cloudflare Worker (`worker/contact.js`) with Resend
- **Icons & Fonts**: Devicon, Google Fonts (`Inter`, `Space Grotesk`, `JetBrains Mono`)
- **Testing**: Node.js built-in test runner (`node:test`)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended for native `fetch` and `node:test` support)
- npm

### Installation

```bash
npm install
```

### Development

Start the local Vite development server:

```bash
npm run dev
```

### Build & Preview

Build the production bundle to `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Syncing Project Feeds

Update `src/data/github-projects.json` with the latest repository metadata from GitHub:

```bash
npm run sync:github
```

Update `src/data/itch-projects.json` with the latest metadata from itch.io:

```bash
npm run sync:itch
```

### Running Tests & Linting

Run the unit tests (using Node's built-in test runner):

```bash
npm test
```

Run Biome lint and formatting checks:

```bash
npm run lint
```

Auto-format supported files:

```bash
npm run format
```

### Local Contact Worker Development

To test `worker/contact.js` locally with Wrangler:

1. Copy `.dev.vars.example` to `.dev.vars` and set `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
2. Start the local worker:

```bash
npx wrangler dev
```

## Deployment

- **Frontend (GitHub Pages)**: Automatically syncs GitHub projects (`npm run sync:github`), builds, and deploys to `https://haruchanz64.github.io` on push to `main` via `.github/workflows/deploy.yml`.
- **Contact Endpoint (Cloudflare Worker)**: `worker/contact.js` handles `POST /api/contact` with CORS enabled for `https://haruchanz64.github.io`, `https://haru-portfolio.haruchanz64.workers.dev`, and local Vite dev servers. The worker uses the following runtime variables/secrets:
  - `RESEND_API_KEY` *(Secret)*: Resend API key with Sending access
  - `CONTACT_TO_EMAIL`: Destination email address for contact submissions

## Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Pages sync, build & deploy workflow
├── index.html                        # Main HTML entry point
├── 404.html                          # Custom 404 page
├── package.json                      # Project metadata and npm scripts
├── vite.config.js                    # Vite configuration
├── wrangler.jsonc                    # Cloudflare Worker configuration
├── license                           # MIT License
├── public/
│   ├── sw.js                         # Service Worker for offline asset caching
│   └── res/                          # Images and favicon
├── scripts/
│   ├── sync-github.mjs               # Script to sync GitHub repositories
│   └── sync-itch.mjs                 # Script to sync itch.io project metadata
├── src/
│   ├── style.css                     # Tailwind CSS v4 entry point, theme tokens & base overrides
│   ├── data/
│   │   ├── github-projects.json      # Synced GitHub repository fallback metadata
│   │   └── itch-projects.json        # Synced itch.io game metadata
│   ├── locales/                      # i18n translation files (en_us, fil_ph)
│   └── js/
│       ├── main.js                   # Application entry point
│       ├── core/                     # Shared utilities (cache, dom, i18n, text)
│       ├── ui/                       # UI behaviors (theme, nav, tabs, hero-loader, observer, etc.)
│       ├── projects/                 # GitHub & itch.io project feeds and shared rendering
│       ├── contact/                  # Contact form handler & spam detector
│       └── resume/                   # ATS resume extraction, guard & PDF builder
├── tests/
│   ├── cache-and-theme.test.mjs      # Unit tests for caching, assets, and theme switching
│   ├── experience-duration.test.mjs  # Unit tests for experience duration formatting
│   ├── i18n.test.mjs                 # Unit tests for localization and key parity
│   ├── resume.test.mjs               # Unit tests for ATS resume generation
│   └── spam-detector.test.mjs        # Unit tests for contact form spam detection
└── worker/
    └── contact.js                    # Cloudflare Worker for POST /api/contact
```

## License

This project is licensed under the [MIT License](license).
