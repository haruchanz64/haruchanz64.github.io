# Contributing

Thanks for checking out **Haru Portfolio**! Contributions, bug reports, and localization improvements are welcome.

## Development Setup

1. **Prerequisites**: [Node.js](https://nodejs.org/) v18+ and npm.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the dev server**:
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

Pull requests targeting `main` automatically run `npm run lint`, `npm test`, and `npm run build` via `.github/workflows/ci.yml`.

## Adding or Updating Locales

Translation files live in `src/locales/` (`en_us.json`, `fil_ph.json`, `ja_jp.json`).

- Keep all translation keys in sync across every locale file.
- Run `npm test` to verify key parity (`tests/i18n.test.mjs`).

## Testing the Contact Worker Locally

The contact form endpoint lives in `worker/contact.js` and runs on Cloudflare Workers:

1. Copy `.dev.vars.example` to `.dev.vars` and fill in `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
2. Start the local worker:
   ```bash
   npx wrangler dev
   ```
3. Never commit `.dev.vars` (it is gitignored).
