# Haru Portfolio

Personal portfolio website for **Haru** — Lead Full-Stack Software Engineer & College Instructor. Built with vanilla HTML, CSS, and JavaScript (ES modules) and bundled with [Vite](https://vite.dev/).

## Features

- **Portfolio Sections**: Hero, About Me, Experience timeline, Projects, tabbed Skills showcase, and Contact.
- **Dynamic Project Feeds**:
  - **Systems & Tools**: Fetches pinned repositories for `haruchanz64` from the GitHub API (`public/js/github.js`).
  - **Game Projects**: Renders itch.io game metadata from `public/data/itch-projects.json` (`public/js/itch.js`), kept up to date via `scripts/sync-itch.mjs`.
- **Contact Form**: Configured for Netlify Forms with a honeypot field, custom subject selector, character counter, and client-side spam/timing detection (`src/js/contact.js`, `src/js/spam-detector.js`).
- **Interactive UI**: Theme management, intersection-observer section tracking, URL hash synchronization, and tabbed skill categories.

## Tech Stack

- **Build Tool**: Vite (`^7.3.1`)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Icons & Fonts**: Font Awesome, Devicon, Simple Icons, Google Fonts (`Inter`, `Space Grotesk`, `JetBrains Mono`)
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

## Project Structure

```text
├── index.html                  # Main HTML entry point
├── package.json                # Project metadata and npm scripts
├── vite.config.js              # Vite configuration
├── license                     # MIT License
├── public/
│   ├── data/
│   │   └── itch-projects.json  # Synced itch.io game metadata
│   ├── js/                     # Static scripts (github.js, itch.js, paths.js)
│   ├── partials/               # HTML partials
│   └── res/                    # Images and favicon
├── scripts/
│   └── sync-itch.mjs           # Script to sync itch.io project metadata
├── src/
│   ├── style.css               # Main stylesheet
│   └── js/                     # ES module source files (contact, theme, nav, tabs, etc.)
└── tests/
    └── spam-detector.test.mjs  # Unit tests for contact form spam detection
```

## License

This project is licensed under the [MIT License](license).
