---
name: design-system
description: Create new screens while maintaining existing design style. Ensures design consistency.
arguments:
  - name: prompt
    description: Description of the new screen to create
    required: true
  - name: reference
    description: Reference screen ID (uses most recent screen if omitted)
    required: false
  - name: verify
    description: Whether to perform consistency verification (true/false)
    required: false
---

# /design-system - Design Consistency

Extracts design DNA from existing screens and generates new screens with the same style.
Ensures brand consistency and unified user experience.

## Usage Examples

```
/design-system settings page
/design-system checkout screen, reference:abc123
/design-system profile page --verify
```

## Workflow

### Step 1: Select Reference Screen

**When reference screen is specified:**
```
mcp__stitch__get_screen
- projectId: current project
- screenId: specified reference screen
```

**When reference screen is not specified:**
```
mcp__stitch__list_screens
- projectId: current project
→ Auto-select most recently created screen
```

### Step 2: Extract Design DNA

```
mcp__stitch__extract_design_context
- projectId: project ID
- screenId: reference screen ID
- includeColors: true
- includeTypography: true
- includeSpacing: true
- includeComponents: true
```

**Extracted Design Elements:**

| Category | Extracted Items |
|----------|-----------------|
| Colors | Primary, Secondary, Neutral, Accent colors |
| Typography | Font families, sizes, weights, line-heights |
| Spacing | Margins, paddings, gaps |
| Border | Border-radius values |
| Effects | Box-shadows |
| Components | Button, card, form, navigation styles |

### Step 3: Generate with Applied Context

```
mcp__stitch__apply_design_context
- projectId: project ID
- designContext: extracted design context
- prompt: user request
- deviceType: same as reference screen
```

Internally generated enhanced prompt:
```
{user request}

IMPORTANT: Apply the following design system for visual consistency:
- Primary colors: {extracted primary colors}
- Secondary colors: {extracted secondary colors}
- Fonts: {extracted font families}
- Border radius style: {extracted border-radius}
- Shadow style: {extracted box-shadow}

Maintain the same visual language, spacing rhythm, and component styles.
```

### Step 4: Consistency Verification (Optional)

When `--verify` option is enabled:

```
mcp__stitch__compare_designs
- projectId: project ID
- screenId1: reference screen
- screenId2: newly created screen
- compareAspects: ["colors", "typography", "spacing", "components", "layout"]
```

**Verification Results:**
- Consistency score (0-100%)
- Similarities list
- Differences list
- Improvement recommendations

### Step 5: Return Results

```
✅ Design System Applied!

🎨 Reference Screen: {reference screen ID}
📱 New Screen: {new screen ID}

Applied Design DNA:
├─ 🎨 Colors: {count} primary, {count} secondary
├─ 📝 Typography: {count} font families
├─ 📐 Spacing: {count} patterns
└─ 🧩 Components: {component types}

[Preview Image]

{When verify option used}
📊 Consistency Score: {score}%
✓ {count} items matched
△ {count} items different
```

## Advanced Usage

### Reference Screen from Different Project
```
/design-system dashboard, reference:projects/other-project/screens/abc123
```

### Extract Only Specific Elements
```
"Create settings page using only colors and button styles from the home screen"
→ Enable only includeColors: true, includeComponents: true
```

## Design Context Reuse

Extracted design context can be reused within conversation:
```
1. /design-system login page (design context extracted)
2. "Create signup page with the same style" (context reused)
3. "Also forgot password page" (context continues reused)
```
