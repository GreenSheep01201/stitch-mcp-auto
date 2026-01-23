# Repository Guidelines

## Project Structure & Module Organization
- Root-level Node CLI package. Entry points are `index.js` (MCP server), `setup.js` (web setup wizard), and `auth.js` (OAuth helper CLI).
- `skills/` contains bundled CLI skill files installed by the setup script for Claude/Gemini/Codex.
- Docs live in `README.md`, `README.ko.md`, and `ANTIGRAVITY-MODELS.md`.
- Runtime config and tokens are stored in `~/.stitch-mcp-auto/` (not in-repo).

## Build, Test, and Development Commands
- `npm install` - install dependencies (Node.js >= 18 required).
- `npm start` - start the MCP server (`node index.js`).
- `npm run setup` - launch the setup wizard on `http://localhost:51121`.
- `npm run auth -- --status|--login|--logout` - check or manage OAuth credentials.
- `node setup.js` / `node index.js` - direct script execution when developing.
- `npx -p stitch-mcp-auto stitch-mcp-auto-setup` - run the published setup flow.

## Coding Style & Naming Conventions
- JavaScript (CommonJS `require`), 4-space indentation, semicolons, and `const`/`let`.
- `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants, `PascalCase` for classes.
- Keep user-facing strings inside the `i18n`/`logMessages` maps and update both `en` and `ko` entries.
- No formatter or linter is configured; preserve the existing style manually.

## Testing Guidelines
- No automated test framework or `tests/` directory is currently present.
- Manual smoke tests: run `npm run setup` to verify the wizard/OAuth flow, then `npm start` to confirm the server starts with saved config; use `npm run auth -- --status` to validate token state.
- If you add tests, place them under `tests/` with `*.test.js` names and add a script in `package.json`.

## Commit & Pull Request Guidelines
- Recent commits use short subjects like `feat: ...`, `Fix ...`, `Update README.md`, and versioned notes like `v1.1.0: ...` (English/Korean). Keep messages concise and descriptive; add a prefix when it clarifies intent.
- PRs should include: a short summary, steps to test, any config/CLI changes, and screenshots or screen recordings if the setup UI is modified.

## Security & Configuration Notes
- Never commit credentials or files under `~/.stitch-mcp-auto/`.
- Setup/auth flows use localhost port `51121`; document any port changes and verify they are free during tests.
- In WSL, the browser may not auto-open; open the setup URL manually when testing.
