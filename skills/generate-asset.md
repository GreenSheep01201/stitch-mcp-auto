# /generate-asset

Generate design assets (logo, icon, illustration, hero image, wireframe) using Gemini 3 Pro via Antigravity OAuth.

## Overview

This command generates various design assets using Google's Gemini 3 Pro model through Antigravity authentication. It's completely free with your Google account.

## Usage

```
/generate-asset <asset_type> <description> [options]
```

## Asset Types

| Type | Description | Best For |
|------|-------------|----------|
| `logo` | Brand logo, logotype | Company branding, app icons |
| `icon` | UI icons, symbols | Navigation, buttons, features |
| `illustration` | Artistic illustrations | Marketing, storytelling |
| `hero` | Hero/banner images | Landing pages, headers |
| `wireframe` | Low-fidelity sketches | Early prototyping |
| `background` | Background patterns | UI backgrounds |
| `pattern` | Seamless patterns | Textures, decorations |

## Options

- `--style`: Visual style (minimal, modern, playful, corporate, organic, flat, 3d, gradient, auto)
- `--colors`: Color scheme hint (e.g., "blue gradient", "earth tones", "#4CAF50")
- `--ratio`: Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)

## Examples

### Generate a Logo
```
/generate-asset logo "Eco-friendly organic food delivery service called GreenBite"
```

### Generate an Icon
```
/generate-asset icon "Shopping cart with checkmark for completed purchase" --style flat --colors "#4CAF50"
```

### Generate a Hero Image
```
/generate-asset hero "Modern fintech app showing financial growth" --ratio 16:9 --style gradient
```

### Generate a Wireframe
```
/generate-asset wireframe "E-commerce checkout page with payment options"
```

## Workflow

1. **Check Authentication**
   - If not authenticated, browser will open for Google login
   - Use Antigravity OAuth (same as Google IDE)

2. **Generate Image**
   - Call `generate_design_asset` tool with parameters
   - Gemini 3 Pro generates the image

3. **Save & Display**
   - Image saved to current directory
   - Base64 image data returned for preview

## Authentication

First-time usage requires Antigravity OAuth authentication:

1. Browser opens automatically
2. Log in with your Google account
3. Grant permissions
4. Authentication saved for future use

To check authentication status:
```
Use the check_antigravity_auth tool
```

## Tips

- Be specific in descriptions for better results
- Include color preferences when brand consistency matters
- Use wireframe type for quick prototyping before detailed design
- Generated images are saved with timestamps to avoid overwrites

## Related Commands

- `/design` - Generate complete UI screens with Stitch
- `/design-full` - Orchestrated design with auto-generated assets
- `/design-system` - Maintain design consistency across screens
