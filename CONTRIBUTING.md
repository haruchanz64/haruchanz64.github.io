# Contributing

Thank you for your interest in Haru Portfolio. Contributions, bug reports, and localization improvements are welcome.

## Development Setup

1. Prerequisites: [Node.js](https://nodejs.org/) v18+ and npm.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Code Quality & Testing

Before opening a pull request, make sure all checks pass locally:

```bash
# Run Biome linter and formatting check
npm run lint

# Auto-format supported files
npm run format

# Run unit tests (Node.js built-in test runner)
npm test

# Verify production build
npm run build
```

Pull requests targeting `main` automatically run `npm run lint`, `npm test`, and `npm run build` via `.github/workflows/ci.yml`. Biome checks and formats JavaScript, JSON, and `src/style.css` (with Tailwind v4 directives enabled).

## Styling with Tailwind CSS v4

- Styles are built with Tailwind CSS v4 (`@tailwindcss/vite`) using utility-first classes in `index.html`, `404.html`, and DOM-rendering modules under `src/js/`.
- Theme tokens (`--bg-primary`, `--accent-primary`, etc.) are defined in `src/style.css` and mapped via `@theme inline` so `.light-theme` overrides work dynamically.
- **Preserve JS/test hook classes** (such as `nav-link`, `experience-item`, `experience-date`, `skill-tab`, `skill-name`, `social-links`, `form-field`, `form-error`, `resume-modal-close`, `light-theme`) when editing markup so interactive modules and unit tests keep working.
- Write complete utility class names as static string literals in JS modules rather than concatenating partial class names dynamically, so Tailwind's scanner includes them in the compiled CSS.

## Adding or Updating Locales

Translation files are stored in `src/locales/` (`en_us.json`, `fil_ph.json`, `ja_jp.json`).

- Keep all translation keys in sync across every locale file.
- Run `npm test` to verify key parity (`tests/i18n.test.mjs`).

## Testing the Contact Worker Locally

The contact form endpoint is in `worker/contact.js` and runs on Cloudflare Workers:

1. Copy `.dev.vars.example` to `.dev.vars` and set `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
2. Start the local worker:
   ```bash
   npx wrangler dev
   ```
3. Never commit `.dev.vars` (it is gitignored).
