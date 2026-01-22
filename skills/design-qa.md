---
name: design-qa
description: Comprehensive design quality, accessibility, and consistency checks. Verifies WCAG 2.1 compliance.
arguments:
  - name: target
    description: Screen ID to check or 'all' (entire project)
    required: false
  - name: level
    description: WCAG compliance level (A, AA, AAA)
    required: false
  - name: aspects
    description: Check items (accessibility, consistency, components)
    required: false
---

# /design-qa - Design Quality Assurance

Comprehensively checks accessibility, design consistency, and component quality of screens.
Used for pre-release quality assurance and design system audits.

## Usage Examples

```
/design-qa
/design-qa screen_abc123
/design-qa all --level AAA
/design-qa --aspects accessibility,consistency
```

## Check Items

### 1. Accessibility

**WCAG 2.1 Compliance Checks:**

| Level | Check Items |
|-------|-------------|
| A | Image alt text, form labels, language attributes |
| AA | Color contrast (4.5:1), touch targets (44px), font size (16px+) |
| AAA | Color contrast (7:1), extended text requirements |

**Detailed Check Items:**
- `1.1.1` Image alternative text
- `1.3.1` Semantic HTML structure (H1 presence)
- `1.4.3` Color contrast ratio
- `2.4.4` Link/button text
- `3.1.1` Language attribute
- `3.3.2` Form labels

### 2. Consistency

**Design System Consistency Checks:**
- Color palette uniformity
- Typography system compliance
- Spacing/margin pattern consistency
- Component style uniformity
- Layout system (Grid/Flex)

### 3. Components

**UI Component Analysis:**
- Button variants count and styles
- Card component consistency
- Form element styles
- Navigation patterns

## Workflow

### Step 1: Collect Target Screens

**Specific screen specified:**
```
mcp__stitch__get_screen
- screenId: specified screen ID
```

**Entire project:**
```
mcp__stitch__list_screens
- projectId: current project
→ Collect all screen IDs
```

### Step 2: Accessibility Analysis

```
mcp__stitch__analyze_accessibility
- projectId: project ID
- screenId: screen ID
- level: specified WCAG level (default: AA)
- includeRecommendations: true
```

**Result Structure:**
```json
{
  "accessibilityScore": 85,
  "summary": {
    "totalIssues": 5,
    "critical": 1,
    "serious": 2,
    "moderate": 1,
    "minor": 1,
    "passes": 8
  },
  "issues": [...],
  "passes": [...]
}
```

### Step 3: Consistency Check (2+ screens)

```
mcp__stitch__compare_designs
- projectId: project ID
- screenId1: screen A
- screenId2: screen B
- compareAspects: ["colors", "typography", "spacing", "components", "layout"]
```

Perform comparison for all screen pairs to calculate overall consistency score.

### Step 4: Component Analysis

```
mcp__stitch__extract_components
- projectId: project ID
- screenId: screen ID
- componentTypes: ["all"]
- outputFormat: "json"
```

**Analysis Items:**
- Component types used
- Variant count for each component
- Style consistency

### Step 5: Generate Comprehensive Report

```
📊 Design QA Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Target: {screen count} screens
📅 Date: {date}
📏 WCAG Level: {AA}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overall Scores

| Item | Score | Status |
|------|-------|--------|
| Accessibility | 85/100 | ⚠️ Needs Improvement |
| Consistency | 92/100 | ✅ Good |
| Components | 78/100 | ⚠️ Needs Improvement |
| **Overall** | **85/100** | **⚠️** |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Accessibility Issues

### 🔴 Critical (1 issue)
- `1.1.1` 3 images missing alt text
  → Recommendation: Add descriptive alt text to all images

### 🟠 Serious (2 issues)
- `1.4.3` 2 text colors lack contrast (current 3.2:1, required 4.5:1)
  → Recommendation: Darken text or lighten background
- `3.3.2` Form inputs missing labels
  → Recommendation: Add connected labels to all input fields

### 🟡 Moderate (1 issue)
- `1.3.1` Duplicate H1 tags (2 found)
  → Recommendation: Use only one H1 per page

### ⚪ Minor (1 issue)
- Viewport meta tag missing
  → Recommendation: Add responsive viewport meta tag

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Consistency Analysis

### Colors
- Shared colors: 8 ✅
- Screen1 only: 2
- Screen2 only: 3
→ Recommendation: Review color palette integration

### Typography
- Font family match: ✅
- Font size variants: 6 (appropriate)

### Spacing
- Spacing consistency: 72%
→ Recommendation: Apply 8px base spacing system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Component Analysis

| Component | Count | Variants | Status |
|-----------|-------|----------|--------|
| Button | 8 | 3 | ✅ |
| Card | 5 | 4 | ⚠️ Needs consolidation |
| Input | 6 | 2 | ✅ |
| Navigation | 2 | 2 | ⚠️ Needs consolidation |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Priority Improvements

### 🔴 Fix Immediately (Critical)
1. Add alt text to all images

### 🟠 Quick Fixes (Serious)
2. Improve text color contrast
3. Add form labels

### 🟡 Recommended (Moderate)
4. Remove duplicate H1 tags
5. Consolidate card component styles
6. Consolidate navigation styles

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next Steps:
- "Add image alt text"
- "Improve color contrast"
- "/design-export" to export improved designs
```

## Auto-Fix Suggestions

Suggests auto-fixes for critical issues:

```
🔧 Auto-fixable issues found:
1. Add image alt text (3 items)
2. Auto-adjust color contrast (2 items)

Proceed with auto-fix? (yes/no)
```
