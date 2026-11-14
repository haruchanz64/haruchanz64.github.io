# Haru Portfolio

Personal portfolio website for **Haru** — Lead Full-Stack Software Engineer & College Instructor. Built with vanilla HTML, CSS, and JavaScript (ES modules) and bundled with [Vite](https://vite.dev/).

## Features

- **Portfolio Sections**: Hero, About Me, Experience timeline, Projects, tabbed Skills showcase, and Contact.
- **Dynamic Project Feeds**:
  - **Systems & Tools**: Fetches pinned repositories for `haruchanz64` from the GitHub API (`src/js/github.js`).
  - **Game Projects**: Renders itch.io game metadata from `public/data/itch-projects.json` (`src/js/itch.js`), kept up to date via `scripts/sync-itch.mjs`.
- **Contact Form**: Submits to a Cloudflare Worker (`worker/contact.js`) backed by [Resend](https://resend.com/), with a honeypot field, custom subject selector, character counter, and client-side spam/timing detection (`src/js/contact.js`, `src/js/spam-detector.js`).
- **Interactive UI**: Theme management, intersection-observer section tracking, URL hash synchronization, and tabbed skill categories.

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

### Syncing itch.io Projects

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

- **Frontend (GitHub Pages)**: Automatically built and deployed to `https://haruchanz64.github.io` on push to `main` via `.github/workflows/deploy.yml`.
- **Contact Endpoint (Cloudflare Worker)**: `worker/contact.js` handles `POST /api/contact` with CORS enabled for `https://haruchanz64.github.io`. Configure the following runtime variables/secrets on the Cloudflare Worker:
  - `RESEND_API_KEY` *(Secret)* — Resend API key with Sending access
  - `CONTACT_TO_EMAIL` — Destination email address for contact submissions

## Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Pages build & deploy workflow
├── index.html                        # Main HTML entry point
├── package.json                      # Project metadata and npm scripts
├── vite.config.js                    # Vite configuration
├── wrangler.jsonc                    # Cloudflare Worker configuration
├── license                           # MIT License
├── public/
│   ├── data/
│   │   └── itch-projects.json        # Synced itch.io game metadata
│   └── res/                          # Images and favicon
├── scripts/
│   └── sync-itch.mjs                 # Script to sync itch.io project metadata
├── src/
│   ├── style.css                     # Main stylesheet
│   └── js/                           # ES module source files (contact, resume, github, itch, etc.)
├── tests/
│   ├── experience-duration.test.mjs  # Unit tests for experience duration formatting
│   ├── resume.test.mjs               # Unit tests for ATS resume generation
│   └── spam-detector.test.mjs        # Unit tests for contact form spam detection
└── worker/
    └── contact.js                    # Cloudflare Worker for POST /api/contact
```

## License

This project is licensed under the [MIT License](license).
