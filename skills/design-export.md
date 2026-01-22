---
name: design-export
description: Generate design system packages for developer handoff. Includes tokens, components, and documentation.
arguments:
  - name: screens
    description: List of screen IDs to export (comma-separated, all if omitted)
    required: false
  - name: token_format
    description: Token format (css-variables, tailwind, scss, json)
    required: false
  - name: component_format
    description: Component format (react, vue, html, json)
    required: false
  - name: include_docs
    description: Include documentation (true/false)
    required: false
---

# /design-export - Developer Handoff

Generates complete packages for delivering designs to developers.
Exports design tokens, component code, and usage documentation all at once.

## Usage Examples

```
/design-export
/design-export --token_format tailwind --component_format react
/design-export screen1,screen2,screen3
/design-export --include_docs true
```

## Output Package Structure

```
design-system-export/
├── tokens/
│   ├── variables.css       # CSS Custom Properties
│   ├── tailwind.config.js  # Tailwind Config
│   ├── _variables.scss     # SCSS Variables
│   └── tokens.json         # JSON Tokens
├── components/
│   ├── react/
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   └── index.js
│   ├── vue/
│   │   ├── Button.vue
│   │   ├── Card.vue
│   │   └── Input.vue
│   └── html/
│       ├── button.html
│       ├── card.html
│       └── input.html
├── screens/
│   ├── login/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── preview.png
│   └── dashboard/
│       ├── index.html
│       ├── styles.css
│       └── preview.png
└── docs/
    ├── README.md           # Getting Started Guide
    ├── style-guide.md      # Style Guide
    ├── colors.md           # Colors Documentation
    ├── typography.md       # Typography Documentation
    └── components.md       # Component Usage
```

## Workflow

### Step 1: Collect Target Screens

**Entire project:**
```
mcp__stitch__list_screens
- projectId: current project
```

**Specific screens:**
Use user-specified screen ID list

### Step 2: Generate Design Tokens

```
mcp__stitch__generate_design_tokens
- projectId: project ID
- screenId: first screen (or representative screen)
- format: specified format (default: css-variables)
- includeSemanticNames: true
```

**Generated Tokens:**

```css
/* CSS Variables */
:root {
  /* Colors */
  --color-primary-1: #667eea;
  --color-primary-2: #764ba2;
  --color-secondary-1: #f8f9ff;
  --color-neutral-1: #1a1a2e;
  --color-neutral-2: #555555;

  /* Font Sizes */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --font-size-2xl: 32px;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 16px;
  --spacing-4: 24px;
  --spacing-5: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```

### Step 3: Extract Components

```
mcp__stitch__extract_components
- projectId: project ID
- screenId: each screen
- componentTypes: ["all"]
- outputFormat: specified format (default: react)
```

**React Component Example:**
```jsx
// Button.jsx
export const Button = ({ children, variant = 'primary', ...props }) => (
  <button
    className={`btn btn-${variant}`}
    style={{
      padding: 'var(--spacing-3) var(--spacing-4)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-primary-1)',
      color: 'white',
      fontWeight: 600
    }}
    {...props}
  >
    {children}
  </button>
);
```

### Step 4: Generate Style Guide

```
mcp__stitch__generate_style_guide
- projectId: project ID
- screenId: representative screen
- sections: ["colors", "typography", "spacing", "components"]
- format: "documentation"
```

### Step 5: Collect Screen Assets

For each screen:
```
mcp__stitch__fetch_screen_code → HTML/CSS code
mcp__stitch__fetch_screen_image → Preview image
```

### Step 6: Create Integrated Package

```
mcp__stitch__export_design_system
- projectId: project ID
- screenIds: target screen list
- includeTokens: true
- includeComponents: true
- includeDocumentation: true
- tokenFormat: specified format
- componentFormat: specified format
```

### Step 7: Return Results

```
✅ Design System Export Complete!

📦 Package Contents:
├── 📁 tokens/
│   └── 4 files (CSS, Tailwind, SCSS, JSON)
├── 📁 components/
│   └── 8 components (React format)
├── 📁 screens/
│   └── 5 screens (HTML + preview)
└── 📁 docs/
    └── 5 documents

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Token Summary
- Colors: 10
- Font sizes: 6
- Spacing: 8
- Border-radius: 4

## Component List
- Button (3 variants)
- Card (2 variants)
- Input (2 variants)
- Navigation
- Modal

## Screen List
1. Login (login.html)
2. Dashboard (dashboard.html)
3. Profile (profile.html)
4. Settings (settings.html)
5. Checkout (checkout.html)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Files saved to current directory:
./design-system-export/

💡 How to Use:
1. Import tokens/variables.css into your project
2. Copy components/ folder to src/
3. See docs/README.md for detailed guide
```

## Format-Specific Output Examples

### Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#667eea',
        'primary-dark': '#764ba2',
        'secondary': '#f8f9ff',
        'neutral-dark': '#1a1a2e',
        'neutral': '#555555',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '16px',
        '4': '24px',
        '5': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
      }
    }
  }
};
```

### SCSS Variables
```scss
// _variables.scss
$color-primary: #667eea;
$color-primary-dark: #764ba2;
$color-secondary: #f8f9ff;

$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 16px;

$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 16px;

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 16px;
```

### Vue Component
```vue
<!-- Button.vue -->
<template>
  <button
    :class="['btn', `btn-${variant}`]"
    :style="buttonStyles"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: 'Button',
  props: {
    variant: {
      type: String,
      default: 'primary'
    }
  },
  computed: {
    buttonStyles() {
      return {
        padding: 'var(--spacing-3) var(--spacing-4)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-primary-1)',
        color: 'white',
        fontWeight: 600
      };
    }
  }
};
</script>
```

## Advanced Options

### Export Specific Screens Only
```
/design-export screen_login,screen_signup,screen_home
```

### Export Tokens Only
```
/design-export --component_format none --include_docs false
```

### Export All Formats
```
/design-export --token_format all --component_format all
```
