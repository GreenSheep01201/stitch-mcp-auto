---
name: design-flow
description: Generate multiple screens for user flows with consistent style at once.
arguments:
  - name: flow
    description: "Flow description (e.g., onboarding: welcome -> signup -> complete)"
    required: true
  - name: device
    description: Device type (MOBILE, DESKTOP, TABLET)
    required: false
  - name: style
    description: Design style to apply
    required: false
---

# /design-flow - Batch User Flow Generation

Creates multiple related screens at once with consistent design.
Instantly implements complete user journeys like onboarding, purchase, or member flows.

## Usage Examples

```
/design-flow onboarding: welcome -> features -> signup -> complete
/design-flow ecommerce: product-list -> product-detail -> cart -> checkout -> complete
/design-flow login-flow: login -> 2FA -> home
/design-flow settings: main-settings -> profile -> notifications -> security
```

## Flow Syntax

```
[flow-name]: [screen1] -> [screen2] -> [screen3] -> ...
```

- **flow-name**: Project/theme name (optional)
- **->**: Screen separator
- **screen-name**: Brief description of each screen

### Flow Examples

| Flow Type | Syntax Example |
|-----------|----------------|
| Onboarding | `onboarding: splash -> intro1 -> intro2 -> signup -> complete` |
| E-commerce | `shopping: home -> category -> product-list -> product-detail -> cart -> checkout` |
| Social | `social-app: feed -> profile -> messages -> settings` |
| SaaS | `dashboard: login -> dashboard -> analytics -> settings -> team-management` |

## Workflow

### Step 1: Parse Flow

Analyze the input flow string:

```
Input: "ecommerce: product-list -> product-detail -> cart -> checkout"

Parsed result:
{
  "flowName": "ecommerce",
  "screens": [
    {"name": "product-list", "prompt": "E-commerce product list page"},
    {"name": "product-detail", "prompt": "E-commerce product detail page"},
    {"name": "cart", "prompt": "E-commerce cart page"},
    {"name": "checkout", "prompt": "E-commerce checkout page"}
  ]
}
```

### Step 2: Project Setup

```
mcp__stitch__list_projects → Check existing projects
If none → mcp__stitch__create_project (create with flow name)
```

### Step 3: Create First Screen & Extract Design Context

**Create first screen:**
```
mcp__stitch__generate_screen_from_text
- projectId: project ID
- prompt: first screen prompt (with style options)
- deviceType: specified device or MOBILE
```

**Extract design context:**
```
mcp__stitch__extract_design_context
- projectId: project ID
- screenId: first screen ID
- includeColors: true
- includeTypography: true
- includeSpacing: true
- includeComponents: true
```

### Step 4: Batch Generate Remaining Screens

```
mcp__stitch__batch_generate_screens
- projectId: project ID
- screens: [
    {"name": "product-detail", "prompt": "E-commerce product detail page with image gallery, price, buy button"},
    {"name": "cart", "prompt": "E-commerce cart page with product list, quantity controls, total"},
    {"name": "checkout", "prompt": "E-commerce checkout page with shipping info, payment methods, order confirmation"}
  ]
- sharedDesignContext: context extracted from first screen
- deviceType: specified device
```

### Step 5: Results Summary

```
✅ User Flow Generation Complete!

📱 Flow: {flow name}
🎯 Device: {device type}
📄 Screens Generated: {total count}

┌─────────────────────────────────────────┐
│  [1] Product List  →  [2] Detail  →  ...│
└─────────────────────────────────────────┘

Screen Status:
├─ ✅ Product List (screen_abc123)
├─ ✅ Product Detail (screen_def456)
├─ ✅ Cart (screen_ghi789)
└─ ✅ Checkout (screen_jkl012)

[Preview thumbnails for each screen]

💡 Next Steps:
- Modify screen: "Add coupon input field to cart screen"
- Add screen: "Add order complete screen with same style"
- Export code: "/design-export"
```

## Advanced Options

### Specify Style
```
/design-flow onboarding: welcome -> signup -> complete --style glassmorphism
```

### Desktop Flow
```
/design-flow saas-dashboard: login -> dashboard -> analytics --device DESKTOP
```

### Detailed Prompts
Add detailed description to each screen:
```
/design-flow shopping:
  product-list(grid layout, filter sidebar) ->
  product-detail(image gallery, reviews section) ->
  checkout(step indicator)
```

## Flow Templates

### Mobile App Onboarding
```
/design-flow app-onboarding: splash -> intro1 -> intro2 -> intro3 -> login-options -> signup-form -> complete
```

### E-commerce Purchase Flow
```
/design-flow purchase: home -> category -> product-list -> product-detail -> cart -> shipping -> payment -> complete
```

### SaaS Dashboard
```
/design-flow saas: landing -> login -> dashboard -> analytics -> reports -> settings -> team -> billing
```

### Social Media App
```
/design-flow social: feed -> search -> profile -> create-post -> message-list -> chat -> settings
```

## Error Handling

- **Partial screen generation failure**: Keep successful screens, provide retry guidance for failed ones
- **Timeout**: Retry with smaller batch size (3-4 at a time)
- **Consistency issues**: Suggest regenerating first screen and retry all
