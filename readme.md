# Haru Portfolio

My personal portfolio website — I'm **Haru**, a Lead Full-Stack Software Engineer & College Instructor. Built with vanilla HTML, CSS, and JavaScript (ES modules) and bundled with [Vite](https://vite.dev/).

## Features

- **Portfolio Sections**: Hero, About Me, Experience timeline (with automatic duration calculation), Projects, tabbed Skills showcase, and Contact.
- **Multi-Language Support (i18n)**: Supports English (`en_us`), Filipino (`fil_ph`), and Japanese (`ja_jp`) via `src/js/i18n.js` and `src/locales/`, with browser language detection and `?locale=` / `?lang=` query parameter support.
- **ATS Resume Generator**: Client-side ATS-friendly PDF resume generation (`src/js/resume.js`, `src/js/pdf-builder.js`).
- **Dynamic Project Feeds**:
  - **Systems & Tools**: Displays pinned repositories (`haruchanz64`) via `src/js/github.js` with local caching (`src/js/cache.js`) and build-time sync to `public/data/github-projects.json` (`scripts/sync-github.mjs`).
  - **Game Projects**: Renders itch.io game metadata from `public/data/itch-projects.json` (`src/js/itch.js`), kept up to date via `scripts/sync-itch.mjs`.
- **Contact Form**: Submits to a Cloudflare Worker (`worker/contact.js`) backed by [Resend](https://resend.com/), with a honeypot field, custom subject selector, character counter, and client-side spam/timing detection (`src/js/contact.js`, `src/js/spam-detector.js`).
- **Interactive UI**: Theme management, intersection-observer reveal tracking, URL hash synchronization, and tabbed skill categories.

## Tech Stack

- **Build Tool**: Vite (`^7.3.1`)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES Modules)
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

Update `public/data/github-projects.json` with the latest pinned repository metadata from GitHub:

```bash
npm run sync:github
```

Update `public/data/itch-projects.json` with the latest metadata from itch.io:

```bash
npm run sync:itch
```

### Running Tests

Run the unit tests (using Node's built-in test runner):

```bash
node --test
```

## Deployment

- **Frontend (GitHub Pages)**: Automatically syncs GitHub projects (`npm run sync:github`), builds, and deploys to `https://haruchanz64.github.io` on push to `main` via `.github/workflows/deploy.yml`.
- **Contact Endpoint (Cloudflare Worker)**: `worker/contact.js` handles `POST /api/contact` with CORS enabled for `https://haruchanz64.github.io`, `https://haru-portfolio.haruchanz64.workers.dev`, and local Vite dev servers. The worker uses the following runtime variables/secrets:
  - `RESEND_API_KEY` *(Secret)* — Resend API key with Sending access
  - `CONTACT_TO_EMAIL` — Destination email address for contact submissions

## Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Pages sync, build & deploy workflow
├── index.html                        # Main HTML entry point
├── package.json                      # Project metadata and npm scripts
├── vite.config.js                    # Vite configuration
├── wrangler.jsonc                    # Cloudflare Worker configuration
├── license                           # MIT License
├── public/
│   ├── data/
│   │   ├── github-projects.json      # Synced GitHub pinned repository metadata
│   │   └── itch-projects.json        # Synced itch.io game metadata
│   └── res/                          # Images and favicon
├── scripts/
│   ├── sync-github.mjs               # Script to sync GitHub pinned repositories
│   └── sync-itch.mjs                 # Script to sync itch.io project metadata
├── src/
│   ├── style.css                     # Main stylesheet
│   ├── locales/                      # i18n translation files (en_us, fil_ph, ja_jp)
│   └── js/                           # ES modules (i18n, resume, pdf-builder, contact, github, itch, etc.)
├── tests/
│   ├── experience-duration.test.mjs  # Unit tests for experience duration formatting
│   ├── i18n.test.mjs                 # Unit tests for localization and key parity
│   ├── resume.test.mjs               # Unit tests for ATS resume generation
│   └── spam-detector.test.mjs        # Unit tests for contact form spam detection
└── worker/
    └── contact.js                    # Cloudflare Worker for POST /api/contact
```

## License

This project is licensed under the [MIT License](license).
