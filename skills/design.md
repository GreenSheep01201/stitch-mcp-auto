---
name: design
description: AI-powered smart UI design generation. Create trendy designs instantly from simple descriptions.
arguments:
  - name: prompt
    description: Screen description (e.g., "login page", "dashboard")
    required: true
  - name: device
    description: Device type (MOBILE, DESKTOP, TABLET)
    required: false
  - name: style
    description: Design style (glassmorphism, dark, minimal, bento-grid, etc.)
    required: false
---

# /design - Smart UI Design Generation

Analyzes user's simple request to generate optimal UI design.

## Usage Examples

```
/design login page
/design dashboard, dark mode
/design e-commerce product list page glassmorphism style
/design mobile profile settings screen
```

## Workflow

### Step 1: Project Setup

First, check available projects:

```
mcp__stitch__list_projects
```

- If projects exist: Use the most recent project
- If no projects: Create "My Designs" project with `mcp__stitch__create_project`

### Step 2: Prompt Analysis & Enhancement

Analyze keywords from user prompt:

**Style Keyword Detection:**
- `dark` → Apply dark-mode trend
- `glass` → Apply glassmorphism trend
- `minimal` → Apply minimalist trend
- `bento` → Apply bento-grid trend
- `gradient` → Apply gradient-mesh trend
- `3d` → Apply 3d-elements trend

**Device Keyword Detection:**
- `mobile`, `app` → MOBILE
- `desktop`, `web` → DESKTOP
- `tablet`, `pad` → TABLET
- Default if not specified: MOBILE

### Step 3: Apply Trend (When Style Detected)

When style keyword is detected, call `mcp__stitch__suggest_trending_design`:

```json
{
  "projectId": "PROJECT_ID",
  "prompt": "User prompt",
  "trends": ["detected trends"],
  "intensity": "moderate",
  "deviceType": "detected device"
}
```

### Step 4: Generate Screen (No Style Detected)

If no style keyword, use default generation:

```json
{
  "projectId": "PROJECT_ID",
  "prompt": "Enhanced user prompt for professional UI design",
  "deviceType": "MOBILE"
}
```

**Prompt Enhancement Template:**
```
Create a modern, professional {screen type} with:
- Clean and intuitive layout
- Consistent spacing and alignment
- Clear visual hierarchy
- Modern UI components

User request: {original prompt}
```

### Step 5: Return Results

After generation completes:

1. Call `mcp__stitch__fetch_screen_image` to provide preview
2. Screen info summary:
   - Project ID
   - Screen ID
   - Applied style/trends
   - Preview image

## Response Format

```
✅ Design Generation Complete!

📱 Screen: {screen name}
🎨 Style: {applied trends}
📐 Device: {device type}

[Preview Image]

💡 Next Steps:
- View code: "Show me the code for this screen"
- Modify: "Change button color to blue"
- New screen: "/design signup page same style"
```

## Error Handling

- **Project creation failed**: Provide permission check guidance
- **Screen generation timeout**: Provide retry guidance (may take up to 3 minutes)
- **API error**: Show specific error message and resolution steps
