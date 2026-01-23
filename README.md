# Stitch MCP Auto

**[English](README.md)** | **[한국어](README.ko.md)**

> **Just let AI handle everything.** - AI에게 모든 걸 맡기세요.

**💡 Just share this link with your AI:** `https://github.com/GreenSheep01201/stitch-mcp-auto`

One command setup, instant UI design generation. The most automated MCP server for Google Stitch.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.2.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen" alt="Node.js">
</p>

**Features:**
- **Auto Setup** - One command installs everything (gcloud auth, API enable, MCP config)
- **Multi-CLI Support** - Works with Claude Code, Gemini CLI, Codex CLI
- **19 Custom Tools + Stitch Core** - Design generation, accessibility checks, tokens, responsive variants, and design system export
- **7 Workflow Commands** - `/design`, `/design-system`, `/design-flow`, `/design-qa`, `/design-export`, `/generate-asset`, `/design-full`
- **🎨 AI Image Generation** - Generate logos, icons, hero images via Gemini 3 Pro (optional Antigravity OAuth)
- **🎭 Orchestration Mode** - One prompt to generate assets + complete UI design
- **🌐 i18n Support** - Auto-detects system language (English/Korean) for setup wizard and console messages

---

## Table of Contents

- [Prerequisites (Install These First)](#prerequisites-install-these-first)
  - [1. Install Node.js (v18 or higher)](#1-install-nodejs-v18-or-higher)
  - [2. Install Google Cloud CLI (gcloud)](#2-install-google-cloud-cli-gcloud)
- [Quick Start](#quick-start)
- [AI Agent Quick Start (Semi-Automated)](#ai-agent-quick-start-semi-automated)
- [Manual Installation (Alternative)](#manual-installation-alternative)
  - [Step 1: Run Auto Setup](#step-1-run-auto-setup)
  - [Step 3: Configure MCP Client](#step-3-configure-mcp-client)
- [Available Tools](#available-tools)
  - [Automatic Project Management (NEW)](#automatic-project-management-new)
  - [Core Stitch Tools (API + convenience wrappers)](#core-stitch-tools-api--convenience-wrappers)
  - [Professional Web Design Tools](#professional-web-design-tools)
    - [Design Consistency Tools](#design-consistency-tools)
    - [Productivity Tools](#productivity-tools)
    - [Quality & Analysis Tools](#quality--analysis-tools)
    - [Design Enhancement Tools](#design-enhancement-tools)
  - [AI Image Generation Tools (v1.1.0)](#ai-image-generation-tools-v110)
    - [Supported Models for Image Generation](#supported-models-for-image-generation)
    - [Background Removal (NEW)](#background-removal-new)
- [MCP Prompts (Auto-Discovered)](#mcp-prompts-auto-discovered)
- [Custom Commands (Multi-CLI Support)](#custom-commands-multi-cli-support)
  - [Supported CLIs](#supported-clis)
  - [Available Commands](#available-commands)
  - [CLI Usage Examples](#cli-usage-examples)
  - [Commands Installation Location](#commands-installation-location)
- [Usage Examples](#usage-examples)
  - [Create a New Project](#create-a-new-project)
  - [Generate a Screen](#generate-a-screen)
  - [Generate with Specific Style](#generate-with-specific-style)
  - [Multi-language Support](#multi-language-support)
  - [The "Designer Flow"](#the-designer-flow)
  - [Using Design Tokens](#using-design-tokens)
  - [Trending Design Generation](#trending-design-generation)
  - [Batch Screen Generation](#batch-screen-generation)
  - [Accessibility Check](#accessibility-check)
  - [Design System Export](#design-system-export)
  - [AI Image Generation (NEW in v1.1.0)](#ai-image-generation-new-in-v110)
  - [Full Design Orchestration (NEW in v1.1.0)](#full-design-orchestration-new-in-v110)
- [Troubleshooting](#troubleshooting)
  - ["gcloud: command not found"](#gcloud-command-not-found)
  - ["Stitch API has not been used in project" Error](#stitch-api-has-not-been-used-in-project-error)
  - [Token Expired / Authentication Error](#token-expired--authentication-error)
  - ["Connection Refused" After Google Login](#connection-refused-after-google-login)
  - [Browser Doesn't Open Automatically (WSL)](#browser-doesnt-open-automatically-wsl)
  - [Full Reset](#full-reset)
- [Architecture](#architecture)
  - [File Structure](#file-structure)
  - [Configuration Files](#configuration-files)
- [Scripts](#scripts)
- [Requirements](#requirements)
- [License](#license)
- [Credits](#credits)
- [Support](#support)

---

## Prerequisites (Install These First)

### 1. Install Node.js (v18 or higher)

#### Windows
```powershell
# Using winget (Windows 10/11)
winget install OpenJS.NodeJS.LTS

# Or download installer from: https://nodejs.org/
```

#### macOS
```bash
# Using Homebrew
brew install node@22

# Or download installer from: https://nodejs.org/
```

#### Linux / WSL
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Or using apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify Node.js installation:**
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

---

### 2. Install Google Cloud CLI (gcloud)

#### Windows

**Option A: Installer (Recommended)**
1. Download from [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Run the installer (check "Run gcloud init" option)
3. Restart your terminal

**Option B: PowerShell**
```powershell
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:TEMP\gcloud.exe")
Start-Process "$env:TEMP\gcloud.exe" -Wait
# Restart terminal after installation
```

#### macOS
```bash
# Using Homebrew (Recommended)
brew install --cask google-cloud-sdk

# Or direct install
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### Linux / WSL
```bash
# Download and install
curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir=$HOME

# Add to PATH
echo 'export PATH="$HOME/google-cloud-sdk/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Verify gcloud installation:**
```bash
gcloud --version
# Should show: Google Cloud SDK xxx.x.x
```

---

## Quick Start

After installing Node.js and gcloud CLI:

```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

The setup wizard will:
1. Open a web-based setup page at `http://localhost:51121`
2. Guide you through Google login
3. Help you select or create a project
4. Enable the Stitch API
5. Save your configuration

> **Note:** When starting the MCP server directly (`npx stitch-mcp-auto` or via your editor), the setup wizard runs on `http://localhost:8086`.

> **🤖 AI Agent Note (WSL Environment):**
> If running in WSL, the browser cannot open automatically. Open the URL shown in the terminal (usually `http://localhost:51121` for `setup.js`, or `http://localhost:8086` when the MCP server starts) in your Windows browser:
> ```powershell
> # Run this in PowerShell (not WSL terminal)
> Start-Process "http://localhost:51121"
> # If you see 8086 instead:
> Start-Process "http://localhost:8086"
> ```
> Or instruct the user to manually open the shown URL in their Windows browser.

---

## AI Agent Quick Start (Semi-Automated)

This repo supports **semi-automated setup** with a few unavoidable manual steps (OAuth login).

**Checklist (agent-friendly):**
1. Run setup: `npm run setup` (or `npx -p stitch-mcp-auto stitch-mcp-auto-setup`)
2. Open the URL shown in terminal (usually `http://localhost:51121`)
3. Complete Google login in the browser (gcloud + Stitch API enable)
4. **⚠️ CRITICAL: Verify MCP registration** (see below)
5. Start server: `npm start` or let the editor launch it

**Manual-only steps:**
- Browser OAuth consent (Google login)
- WSL browser opening (must open URL manually)

**Environment-specific commands:**
- **Windows (PowerShell):**
  - Open setup URL: `Start-Process "http://localhost:51121"` (or `http://localhost:8086`)
- **macOS:**
  - Open setup URL: `open "http://localhost:51121"` (or `http://localhost:8086`)
- **Linux:**
  - Open setup URL: `xdg-open "http://localhost:51121"` (or `http://localhost:8086`)
- **WSL (Windows host):**
  - Run in Windows PowerShell: `Start-Process "http://localhost:51121"`

### ⚠️ Post-Installation MCP Verification (REQUIRED)

After setup completes, **always verify** that the MCP server is registered:

```bash
# Claude Code
claude mcp list | grep stitch

# Gemini CLI
gemini mcp list | grep stitch

# Codex CLI
codex mcp list | grep stitch
```

**If `stitch` is NOT listed**, manually register:

| CLI | Manual Registration Command |
|-----|----------------------------|
| Claude Code | `claude mcp add -e GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID -s user stitch -- npx -y stitch-mcp-auto` |
| Gemini CLI | `gemini mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID` |
| Codex CLI | `codex mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID` |

> **Why verification is needed:** The setup wizard writes directly to config files (`~/.claude.json`, `~/.gemini/settings.json`, `~/.codex/config.toml`), but verification ensures the configuration is correct. Always verify to avoid "MCP server not found" errors.

**Other Verification (optional):**
- `node auth.js --status` (shows token + project status)
- `npm start` (server boots and prints "Ready")

---

## Manual Installation (Alternative)

### Step 1: Run Auto Setup

```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

Or if you cloned the repository:
```bash
node setup.js
```

#### Setup Process

1. **Welcome Page** - Click "Login with Google" button
2. **Google Login** - A new browser window opens for authentication
   - After login, you may see "Connection refused" page - **just close it**
   - The setup page will automatically detect your login
3. **Project Selection** - Choose an existing project or create a new one
4. **API Activation** - Click the button to enable Stitch API
   - Wait for activation (may take a few seconds)
5. **Complete** - Copy the MCP configuration to your editor

> **⚠️ WSL Users - IMPORTANT:**
> WSL cannot open browsers directly. When the setup wizard starts:
> 1. Copy the URL `http://localhost:51121`
> 2. Open it manually in your **Windows browser** (Chrome, Edge, etc.)
> 3. Or run in PowerShell: `Start-Process "http://localhost:51121"`
>
> The authentication will work because WSL shares localhost with Windows.

---

### Step 3: Configure MCP Client

After setup completes, add the configuration to your MCP client.

#### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

#### Claude Code

**🌐 Method 1: CLI Command (Recommended)**

The setup wizard automatically writes to `~/.claude.json`.
To add manually via CLI:

```bash
claude mcp add -e GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID -s user stitch -- npx -y stitch-mcp-auto
```

Or edit `~/.claude.json` directly:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

**📁 Method 2: Per-project Settings**

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

#### Gemini CLI

**🌐 Method 1: CLI Command (Recommended)**

```bash
gemini mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

Or edit `~/.gemini/settings.json` directly:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

#### Codex CLI

**🌐 Method 1: CLI Command (Recommended)**

```bash
codex mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
```

Or edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.stitch]
command = "npx"
args = ["-y", "stitch-mcp-auto"]

[mcp_servers.stitch.env]
GOOGLE_CLOUD_PROJECT = "YOUR_PROJECT_ID"
```

#### Cursor

Go to **Settings > MCP > Add New Server** and add:
- Command: `npx`
- Args: `-y stitch-mcp-auto`
- Environment: `GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID`

**Optional:** `GOOGLE_CLOUD_PROJECT` is only used for Stitch image fallback and `auth.js --status`. The setup wizard stores the active project in `~/.stitch-mcp-auto/config.json`, and workspace tools save `.stitch-project.json` in your current folder.

---

## Available Tools

### 🔄 Automatic Project Management (NEW)

**No more manual projectId passing!** The server automatically manages project context:

1. **Auto-detection**: When you call tools like `generate_screen_from_text` without `projectId`, it automatically uses the workspace project
2. **Auto-save**: When you `create_project`, it's automatically saved to `.stitch-project.json` in your current folder
3. **Session continuity**: Return to the same folder later, and your project is automatically loaded

**How it works:**
```
┌─────────────────────────────────────────────────────────────┐
│  Tool called without projectId                              │
│                      ↓                                      │
│  1. Check active session project                            │
│  2. If none → Load from .stitch-project.json                │
│  3. If none → Return "PROJECT_REQUIRED" with options        │
│                      ↓                                      │
│  User creates/selects project → Auto-saved to workspace     │
└─────────────────────────────────────────────────────────────┘
```

**Manual workspace tools (optional):**

| Tool | Description |
|------|-------------|
| `get_workspace_project` | 🔍 Check current workspace project status |
| `set_workspace_project` | 💾 Manually associate a project with the workspace |
| `clear_workspace_project` | 🗑️ Clear workspace project association |

### Core Stitch Tools (API + convenience wrappers)

| Tool | Description |
|------|-------------|
| `create_project` | Creates a new Stitch project. A project is a container for UI designs and frontend code. |
| `get_project` | Retrieves the details of a specific Stitch project using its project name. |
| `list_projects` | Lists all Stitch projects accessible to the user. By default, it lists projects owned by the user. |
| `list_screens` | Lists all screens within a given Stitch project. |
| `get_screen` | Retrieves the details of a specific screen within a project. |
| `generate_screen_from_text` | Generates a new screen within a project from a text prompt. |
| `fetch_screen_code` | Retrieves the actual HTML/Code content of a screen. |
| `fetch_screen_image` | Retrieves the screenshot/preview image of a screen. |

### 🎨 Professional Web Design Tools

#### Design Consistency Tools

| Tool | Description |
|------|-------------|
| `extract_design_context` | Extracts design DNA (colors, typography, spacing, components) from an existing screen for visual consistency across multiple screens. |
| `apply_design_context` | Generates a new screen using a previously extracted design context to maintain visual consistency. |
| `compare_designs` | Compares two screens to identify design differences, inconsistencies, and suggest harmonization. |

#### Productivity Tools

| Tool | Description |
|------|-------------|
| `generate_design_tokens` | Generates design tokens (CSS variables, Tailwind config, SCSS, JSON) from a screen's design. |
| `generate_responsive_variant` | Creates responsive variants of an existing screen for different device types. |
| `batch_generate_screens` | Generates multiple related screens in a single operation with consistent design. |

#### Quality & Analysis Tools

| Tool | Description |
|------|-------------|
| `analyze_accessibility` | Analyzes a screen for WCAG 2.1 accessibility compliance with actionable recommendations. |
| `extract_components` | Extracts reusable UI component patterns (buttons, cards, forms) with their styles. |

#### Design Enhancement Tools

| Tool | Description |
|------|-------------|
| `suggest_trending_design` | Applies 2024-2025 UI trends (glassmorphism, bento-grid, gradient-mesh, etc.) to screen generation. |
| `generate_style_guide` | Generates a comprehensive style guide/design documentation from an existing design. |
| `export_design_system` | Exports a complete design system package (tokens, components, docs) for developer handoff. |

### 🎨 AI Image Generation Tools (v1.1.0)

These tools have different authentication requirements:

| Tool | Auth Required | Description |
|------|---------------|-------------|
| `generate_design_asset` | **Antigravity** | Generate design assets (logo, icon, illustration, hero, wireframe, background, pattern) using Gemini models. **Requires Antigravity authentication.** Supports model selection (gemini-3-pro, gemini-2.5-pro) and forced auth. |
| `orchestrate_design` | Stitch + Antigravity | Full orchestration: auto-generates assets (logo, icons, hero) then creates complete UI. Stitch-only users can generate UI pages without custom assets. |
| `check_antigravity_auth` | None | Check Antigravity OAuth authentication status for image generation features. |

#### Supported Models for Image Generation

| Model | Status | Image Generation | Description |
|-------|--------|------------------|-------------|
| `gemini-3-pro` | ✅ Available | ✅ Supported | **Default.** Latest Gemini 3 Pro model with image generation |
| `gemini-2.5-pro` | ✅ Available | ✅ Supported | Gemini 2.5 Pro model with image generation |

> **See also:** `ANTIGRAVITY-MODELS.md` (EN) / `ANTIGRAVITY-MODELS.ko.md` (KO) for the full model list, thinking variants, and endpoint details.

> **💡 Model Selection:**
> You can specify a model when calling `generate_design_asset`:
> ```json
> {
>   "assetType": "logo",
>   "prompt": "Modern tech company logo",
>   "model": "gemini-3-pro"
> }
> ```

**Key parameters (`generate_design_asset`):**
- `assetType`: logo, icon, illustration, hero, wireframe, background, pattern
- `aspectRatio`: 1:1, 16:9, 9:16, 4:3, 3:4
- `saveToFile`: `true` by default (saves to current directory)
- `forceAntigravityAuth`: `true` to trigger browser login

> **📋 Role Separation:**
> - **Stitch API (gcloud auth):** UI page/screen generation - available to all users
> - **Antigravity OAuth:** Image asset generation (logo, icon, hero) - requires separate authentication
>
> Stitch-only users can still create complete UI pages using `generate_screen_from_text`. Antigravity extends this with custom AI-generated assets.

#### 🔲 Background Removal (NEW)

`generate_design_asset` supports automatic background removal for transparent assets:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `removeBackground` | boolean | `false` | Enable automatic background removal |
| `backgroundRemovalMode` | `"white"` \| `"auto"` | `"white"` | `white`: Remove white backgrounds. `auto`: Auto-detect solid colors. |
| `backgroundThreshold` | number | `240` | Threshold for detection (0-255). Higher = more aggressive. |

**Example:**
```json
{
  "assetType": "logo",
  "prompt": "Modern tech company logo with abstract shapes",
  "removeBackground": true,
  "backgroundRemovalMode": "white",
  "backgroundThreshold": 240
}
```

This produces a transparent PNG, ideal for:
- **Logos** - No white border when placed on colored backgrounds
- **Icons** - Clean integration into UI designs
- **Illustrations** - Seamless overlay on any background

---

## MCP Prompts (Auto-Discovered)

MCP Prompts are **automatically available** when the server is connected - no installation required. These appear in your MCP client's prompt list.

| Prompt | Description |
|--------|-------------|
| `/stitch:design` | Smart UI design generation with automatic style detection |
| `/stitch:design-system` | Create new screens while maintaining design consistency |
| `/stitch:design-flow` | Generate multiple screens for complete user flows |
| `/stitch:design-qa` | Accessibility (WCAG 2.1) and design quality checks |
| `/stitch:design-export` | Export design system packages for developer handoff |

**Usage in Claude Code:**
```
/stitch:design login page with dark mode
/stitch:design-system settings page
/stitch:design-flow onboarding: welcome -> signup -> complete
/stitch:design-qa all --level AA
/stitch:design-export --token_format tailwind
```

> **Note:** MCP Prompts include detailed workflow instructions that guide the AI through complex design tasks automatically.

---

## Custom Commands (Multi-CLI Support)

When you run `npx -p stitch-mcp-auto stitch-mcp-auto-setup`, the setup wizard automatically installs **custom commands** for all major AI CLI tools - Claude Code, Gemini CLI, and Codex CLI.

### Supported CLIs

| CLI | Command Format | Installation Path |
|-----|----------------|-------------------|
| **Claude Code** | `/design` | `~/.claude/commands/` |
| **Gemini CLI** | `/stitch:design` | `~/.gemini/commands/stitch/` |
| **Codex CLI** | `$stitch-design` | `~/.codex/skills/stitch/` |

### Available Commands

| Command | Claude Code | Gemini CLI | Codex CLI | Description |
|---------|-------------|------------|-----------|-------------|
| design | `/design` | `/stitch:design` | `$stitch-design` | Smart UI design generation |
| design-system | `/design-system` | `/stitch:design-system` | `$stitch-design-system` | Maintain design consistency |
| design-flow | `/design-flow` | `/stitch:design-flow` | `$stitch-design-flow` | Generate user flows |
| design-qa | `/design-qa` | `/stitch:design-qa` | `$stitch-design-qa` | Accessibility & quality checks |
| design-export | `/design-export` | `/stitch:design-export` | `$stitch-design-export` | Export design system |
| generate-asset | `/generate-asset` | `/stitch:generate-asset` | `$stitch-generate-asset` | AI image generation (v1.1.0) |
| design-full | `/design-full` | `/stitch:design-full` | `$stitch-design-full` | Full orchestration mode (v1.1.0) |

### CLI Usage Examples

**Claude Code:**
```bash
/design login page dark mode
/design-system settings page
/design-flow onboarding: welcome -> signup -> complete
```

**Gemini CLI:**
```bash
/stitch:design login page dark mode
/stitch:design-system settings page
/stitch:design-flow onboarding: welcome -> signup -> complete
```

**Codex CLI:**
```bash
$stitch-design login page dark mode
$stitch-design-system settings page
$stitch-design-flow onboarding: welcome -> signup -> complete
```

### Commands Installation Location

Commands are automatically installed to all CLI directories:
```
~/.claude/commands/          # Claude Code (Markdown)
├── design.md
├── design-system.md
├── design-flow.md
├── design-qa.md
├── design-export.md
├── generate-asset.md        # NEW in v1.1.0
└── design-full.md           # NEW in v1.1.0

~/.gemini/commands/stitch/   # Gemini CLI (TOML)
├── design.toml
├── design-system.toml
├── design-flow.toml
├── design-qa.toml
├── design-export.toml
├── generate-asset.toml      # NEW in v1.1.0
└── design-full.toml         # NEW in v1.1.0

~/.codex/skills/stitch/      # Codex CLI (Skills)
├── design.md
├── design-system.md
├── design-flow.md
├── design-qa.md
├── design-export.md
├── generate-asset.md        # NEW in v1.1.0
└── design-full.md           # NEW in v1.1.0
```

---

## Usage Examples

### Create a New Project

```
Create a new Stitch project called "My App"
```

### Generate a Screen

```
Generate a login page with email and password fields,
a "Forgot Password" link, and social login buttons for Google and Apple.
Use a modern gradient background.
```

### Generate with Specific Style

```
Create a dashboard screen with:
- Dark theme
- Sidebar navigation
- 4 stat cards at the top
- A line chart showing weekly data
- A recent activity list
```

### Multi-language Support

```
Create a Korean e-commerce product detail page with:
- Product image carousel
- Price and discount badge
- Size selector
- Add to cart button
- Customer reviews section
```

### The "Designer Flow"

For consistent UI across multiple screens:

1. **Extract context from existing screen:**
   ```
   Get the design context from the Home Screen in project X
   ```

2. **Generate new screen with same style:**
   ```
   Using that design context, generate a Settings screen
   with the same visual style
   ```

### Using Design Tokens

Export design tokens for your development workflow:

```
Generate CSS variables from the dashboard screen's design
```

```
Create a Tailwind config based on the home screen
```

### Trending Design Generation

Apply modern UI/UX trends automatically:

```
Create a pricing page with glassmorphism and gradient-mesh effects
```

```
Design a dashboard using bento-grid layout and dark mode
```

### Batch Screen Generation

Create multiple screens at once with consistent styling:

```
Generate a complete onboarding flow: welcome, features, signup, and confirmation screens
```

### Accessibility Check

Ensure your designs are accessible:

```
Check the login page for WCAG AA compliance
```

### Design System Export

Export for developer handoff:

```
Export the complete design system from this project including tokens and components
```

### AI Image Generation (NEW in v1.1.0)

Generate design assets with AI:

```
/generate-asset logo "Eco-friendly organic food delivery service called GreenBite"
```

```
/generate-asset hero "Modern fintech app showing financial growth" --style gradient --ratio 16:9
```

```
/generate-asset icon "Shopping cart with checkmark" --style flat --colors "#4CAF50"
```

### Full Design Orchestration (NEW in v1.1.0)

One prompt to complete design - automatically generates assets and creates UI:

```
/design-full "친환경 유기농 식품 쇼핑몰 메인 페이지. 녹색 테마, 신선한 느낌, 모던한 디자인"
```

```
/design-full "AI-powered project management tool landing page. Professional, blue gradient theme, with pricing section"
```

> **Note:** The orchestration mode automatically:
> 1. Analyzes required assets (logo, hero, icons)
> 2. Generates each asset using Gemini 3 Pro (requires Antigravity auth)
> 3. Creates complete UI screen with Stitch API
> 4. Returns all assets + final UI in one response
>
> **Without Antigravity auth:** UI screen is still generated, but without custom image assets.

---

## Troubleshooting

### "gcloud: command not found"

**Linux/macOS/WSL:**
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
echo 'export PATH="$HOME/google-cloud-sdk/bin:$PATH"' >> ~/.bashrc
```

**Windows:** Restart your terminal after installing gcloud.

---

### "Stitch API has not been used in project" Error

Enable the API manually:
```bash
gcloud services enable stitch.googleapis.com --project=YOUR_PROJECT_ID
```

Or visit: `https://console.cloud.google.com/apis/library/stitch.googleapis.com?project=YOUR_PROJECT_ID`

---

### Token Expired / Authentication Error

Refresh your authentication:
```bash
gcloud auth login
```

Or re-run the setup:
```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

---

### "Connection Refused" After Google Login

This is **normal behavior**. After Google authentication completes, the browser redirects to `localhost:8085` which is a temporary callback server that gcloud uses. Once authentication is complete, this server closes.

**Solution:** Simply close this tab and return to the setup page. It will automatically detect your login.

---

### Browser Doesn't Open Automatically (WSL)

If the browser doesn't open automatically in WSL:

1. Copy the URL shown in the terminal
2. Paste it in your Windows browser manually
3. Complete the login
4. Return to the setup page

---

### Full Reset

If something goes wrong, reset everything:

```bash
# Remove stitch-mcp-auto config
rm -rf ~/.stitch-mcp-auto

# Revoke gcloud credentials
gcloud auth revoke --all

# Re-run setup
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        User Request                          │
│              "Create a login page with..."                   │
│              "/design-full eco-friendly shop"                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI Editor (Claude/Cursor)                 │
│                         MCP Client                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     stitch-mcp-auto                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ setup.js    │  │ index.js    │  │ auth.js     │           │
│  │ (Auto Setup)│  │ (MCP Server)│  │ (OAuth)     │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                          │                                   │
│           ┌──────────────┼──────────────┐                    │
│           ▼              ▼              ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ Design Tools│  │ Image Gen   │  │ Orchestrate │           │
│  │ (UI + QA)   │  │ (Antigrav.) │  │ (assets+UI) │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└──────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                                   ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   Google Cloud Platform     │   │   Antigravity (Optional)    │
│  ┌─────────┐  ┌─────────┐   │   │  ┌─────────────────────┐    │
│  │ gcloud  │  │ Stitch  │   │   │  │ Gemini 3 Pro        │    │
│  │ CLI     │  │ API     │   │   │  │ (Image Generation)  │    │
│  │ (Auth)  │  │ (UI Gen)│   │   │  │ FREE via OAuth      │    │
│  └─────────┘  └─────────┘   │   │  └─────────────────────┘    │
└─────────────────────────────┘   └─────────────────────────────┘
```

> **📋 Role Separation:**
> - **Stitch API (gcloud):** Handles all UI page/screen generation
> - **Antigravity OAuth:** Handles image asset generation (logo, icon, hero images)
>
> Without Antigravity authentication, `generate_design_asset` will return an error. Use Stitch's `generate_screen_from_text` for UI pages.

### File Structure

```
stitch-mcp-auto/
├── index.js               # Main MCP server (with Antigravity OAuth)
├── setup.js               # Web-based auto setup wizard
├── auth.js                # OAuth helper utilities
├── package.json           # Dependencies and scripts
├── README.md              # Documentation (EN)
├── README.ko.md           # Documentation (KO)
├── ANTIGRAVITY-MODELS.md  # Antigravity model list (EN)
├── ANTIGRAVITY-MODELS.ko.md # Antigravity model list (KO)
├── AGENTS.md              # Repository guidelines
└── skills/                # Command sources (Claude/Gemini/Codex)
    ├── design.md
    ├── design-system.md
    ├── design-flow.md
    ├── design-qa.md
    ├── design-export.md
    ├── generate-asset.md    # NEW: AI image generation
    └── design-full.md       # NEW: Full orchestration
```

### Configuration Files

| File/Directory | Location | Purpose |
|----------------|----------|---------|
| `tokens.json` | `~/.stitch-mcp-auto/` | OAuth access tokens (gcloud) |
| `antigravity_tokens.json` | `~/.stitch-mcp-auto/` | Antigravity OAuth tokens (optional) |
| `config.json` | `~/.stitch-mcp-auto/` | Project settings |
| `.stitch-project.json` | Workspace root (current folder) | Auto-saved project mapping for this workspace |
| **MCP Settings** | | |
| `.claude.json` | `~/` | Claude Code MCP servers (user scope) |
| `settings.json` | `~/.gemini/` | Gemini CLI MCP servers |
| `config.toml` | `~/.codex/` | Codex CLI MCP servers (TOML format) |
| **Commands** | | |
| `commands/` | `~/.claude/commands/` | Claude Code Commands (auto-installed) |
| `commands/stitch/` | `~/.gemini/commands/stitch/` | Gemini CLI Commands (auto-installed) |
| `skills/stitch/` | `~/.codex/skills/stitch/` | Codex CLI Skills (auto-installed) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start MCP server (`node index.js`) |
| `npm run setup` | Run setup wizard (`node setup.js`, opens `http://localhost:51121`) |
| `npm run auth -- --status|--login|--logout|--setup|--project <id>` | OAuth helper commands |
| `npx -p stitch-mcp-auto stitch-mcp-auto-setup` | Run interactive setup wizard |
| `npx stitch-mcp-auto` | Start MCP server (used by editors) |
| `node auth.js --status` | Check authentication status |
| `node auth.js --login` | Manual login |
| `node auth.js --logout` | Clear saved tokens |
| `node auth.js --setup` | Show OAuth setup guide |
| `node auth.js --project <id>` | Save project ID (optional) |

---

## Requirements

- **Node.js:** 18.0.0 or higher
- **Google Cloud CLI:** Latest version
- **Google Account:** With access to Google Cloud Console
- **MCP Client:** Claude Desktop, Claude Code, Cursor, or compatible editor

---

## License

**Apache 2.0** - Open source and free to use.

---

## Credits

- **Author:** [GreenSheep01201 (Wongil Seo)](https://github.com/GreenSheep01201)
- **Based on:** [stitch-mcp](https://github.com/Kargatharaakash/stitch-mcp) by [Kargatharaakash](https://github.com/Kargatharaakash)
- **Concept:** Automated implementation of the MCP (Model Context Protocol) file stitching system.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/GreenSheep01201/stitch-mcp-auto/issues)
- **Documentation:** [Google Stitch API](https://cloud.google.com/stitch)

---

*Built with love for the AI community*
