# Stitch MCP Auto

**[English](README.md)** | **[한국어](README.ko.md)**

> **Just let AI handle everything.** - AI에게 모든 걸 맡기세요.

**💡 Just share this link with your AI:** `https://github.com/GreenSheep01201/stitch-mcp-auto`

One command setup, instant UI design generation. The most automated MCP server for Google Stitch.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.1.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen" alt="Node.js">
</p>

**Features:**
- **Auto Setup** - One command installs everything (gcloud auth, API enable, MCP config)
- **Multi-CLI Support** - Works with Claude Code, Gemini CLI, Codex CLI
- **22 Professional Tools** - Design generation, accessibility checks, design system export, AI image generation
- **7 Workflow Commands** - `/design`, `/design-system`, `/design-flow`, `/design-qa`, `/design-export`, `/generate-asset`, `/design-full`
- **🎨 AI Image Generation** - Generate logos, icons, hero images via Gemini 3 Pro (optional Antigravity OAuth)
- **🎭 Orchestration Mode** - One prompt to generate assets + complete UI design
- **🌐 i18n Support** - Auto-detects system language (English/Korean) for setup wizard and console messages

---

## Table of Contents

- [Quick Start (1 minute)](#-quick-start-1-minute)
- [Manual Installation](#-manual-installation)
  - [Step 1: Install Google Cloud CLI](#step-1-install-google-cloud-cli)
  - [Step 2: Run Auto Setup](#step-2-run-auto-setup)
  - [Step 3: Configure MCP Client](#step-3-configure-mcp-client)
- [Available Tools](#-available-tools)
- [Claude Code Skills](#-claude-code-skills)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)
- [Architecture](#-architecture)

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

> **🤖 AI Agent Note (WSL Environment):**
> If running in WSL, the browser cannot open automatically. You MUST open the URL in Windows browser using PowerShell:
> ```powershell
> # Run this in PowerShell (not WSL terminal)
> Start-Process "http://localhost:51121"
> ```
> Or instruct the user to manually open `http://localhost:51121` in their Windows browser.

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

#### Cursor

Go to **Settings > MCP > Add New Server** and add:
- Command: `npx`
- Args: `-y stitch-mcp-auto`
- Environment: `GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID`

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
│  Tool called without projectId                               │
│                    ↓                                         │
│  1. Check active session project                            │
│  2. If none → Load from .stitch-project.json                │
│  3. If none → Return "PROJECT_REQUIRED" with options        │
│                    ↓                                         │
│  User creates/selects project → Auto-saved to workspace     │
└─────────────────────────────────────────────────────────────┘
```

**Manual workspace tools (optional):**

| Tool | Description |
|------|-------------|
| `get_workspace_project` | 🔍 Check current workspace project status |
| `set_workspace_project` | 💾 Manually associate a project with the workspace |
| `clear_workspace_project` | 🗑️ Clear workspace project association |

### Core Stitch API Tools

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
| `generate_design_asset` | **Antigravity** | Generate design assets (logo, icon, illustration, hero image, wireframe) using Gemini models. **Requires Antigravity authentication.** Supports model selection (gemini-3-pro, gemini-2.5-pro). |
| `orchestrate_design` | Stitch + Antigravity | Full orchestration: auto-generates assets (logo, icons, hero) then creates complete UI. Stitch-only users can generate UI pages without custom assets. |
| `check_antigravity_auth` | None | Check Antigravity OAuth authentication status for image generation features. |

#### Supported Models for Image Generation

| Model | Status | Image Generation | Description |
|-------|--------|------------------|-------------|
| `gemini-3-pro` | ✅ Available | ✅ Supported | **Default.** Latest Gemini 3 Pro model with image generation |
| `gemini-2.5-pro` | ✅ Available | ✅ Supported | Gemini 2.5 Pro model with image generation |
| `gemini-3-flash` | ✅ Available | ❌ Text only | Fast response model, no image generation |
| `gemini-2.5-flash` | ✅ Available | ❌ Text only | Fast response model, no image generation |

> **💡 Model Selection:**
> You can specify a model when calling `generate_design_asset`:
> ```json
> {
>   "assetType": "logo",
>   "prompt": "Modern tech company logo",
>   "model": "gemini-3-pro"
> }
> ```

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

### Usage Examples

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
│           ┌──────────────┼──────────────┐                   │
│           ▼              ▼              ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ UI Design   │  │ Image Gen   │  │ Orchestrate │          │
│  │ (19 tools)  │  │ (3 tools)   │  │ (combined)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
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
├── index.js          # Main MCP server (with Antigravity OAuth)
├── setup.js          # Web-based auto setup wizard
├── auth.js           # OAuth helper utilities
├── package.json      # Dependencies and scripts
├── README.md         # This documentation
└── skills/           # Claude Code Skills
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
| `commands/` | `~/.claude/commands/` | Claude Code Commands (auto-installed) |
| `commands/stitch/` | `~/.gemini/commands/stitch/` | Gemini CLI Commands (auto-installed) |
| `skills/stitch/` | `~/.codex/skills/stitch/` | Codex CLI Skills (auto-installed) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npx -p stitch-mcp-auto stitch-mcp-auto-setup` | Run interactive setup wizard |
| `npx stitch-mcp-auto` | Start MCP server (used by editors) |
| `node auth.js --status` | Check authentication status |
| `node auth.js --login` | Manual login |
| `node auth.js --logout` | Clear saved tokens |

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

- **Author:** [Wongil Seo](https://github.com/GreenSheep01201)
- **Based on:** [stitch-mcp](https://github.com/Kargatharaakash/stitch-mcp) by [Kargatharaakash](https://github.com/Kargatharaakash)
- **Concept:** Automated implementation of the MCP (Model Context Protocol) file stitching system.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/GreenSheep01201/stitch-mcp-auto/issues)
- **Documentation:** [Google Stitch API](https://cloud.google.com/stitch)

---

*Built with love for the AI community*
