# Repository Guidelines

## 🤖 AI Agent Installation Guide (IMPORTANT)

When installing this MCP server via GitHub link, **you MUST verify MCP registration** after setup completes.

### Installation Steps

```bash
# 1. Run setup wizard
npx -p stitch-mcp-auto stitch-mcp-auto-setup

# 2. Complete OAuth in browser (manual step required)

# 3. CRITICAL: Verify MCP registration for your CLI
```

### Post-Installation Verification (REQUIRED)

After setup completes, verify MCP server is registered:

**Claude Code:**
```bash
claude mcp list | grep stitch
# Expected: "stitch: ..." entry should appear
```

**Gemini CLI:**
```bash
gemini mcp list | grep stitch
# Expected: "stitch" entry should appear
```

**Codex CLI:**
```bash
codex mcp list | grep stitch
# Or check: cat ~/.codex/config.toml | grep stitch
```

### If MCP Not Registered (Manual Fix)

If the verification fails, manually register:

**Claude Code:**
```bash
claude mcp add -e GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID -s user stitch -- npx -y stitch-mcp-auto
```

**Gemini CLI:**
```bash
gemini mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

**Codex CLI:**
```bash
codex mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

### MCP Configuration Files

| CLI | Config Location | Format |
|-----|-----------------|--------|
| Claude Code | `~/.claude.json` | JSON |
| Gemini CLI | `~/.gemini/settings.json` | JSON |
| Codex CLI | `~/.codex/config.toml` | TOML |

> **📝 Note:** The setup wizard writes directly to config files (`~/.claude.json`, `~/.gemini/settings.json`, `~/.codex/config.toml`) without using CLI commands. Always verify registration after setup to ensure the configuration is correct.

---

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
