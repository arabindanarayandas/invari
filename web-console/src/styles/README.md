# Invari.ai Design System - CSS Architecture

Production-grade CSS architecture following the "Observational Blueprint" design system.

## 📁 Directory Structure

```
src/styles/
├── core/                    # Design tokens and primitives
│   ├── _variables.css      # All CSS custom properties
│   ├── _colors.css         # Semantic color system
│   ├── _typography.css     # Type scale and text styles
│   └── _animations.css     # Animation tokens & keyframes
├── base/                    # Foundation styles
│   ├── _reset.css          # Modern CSS reset
│   └── _base.css           # Base element styling
├── utilities/               # Utility classes (future)
├── components/              # Component styles (future)
├── patterns/                # Layout patterns (future)
├── themes/                  # Theme variations (future)
├── index.css               # Main entry point
└── README.md               # This file
```

## 🎨 Design Tokens

### Colors
- **Primary**: `#0052FF` - Cold technical blue for critical actions
- **Secondary/Repair**: `#D97706` - Industrial orange for warnings
- **Success**: `#059669` - Validation green

### Surface Hierarchy
- **Level 0 (Base)**: `#F9F9FF` - Blueprint desk
- **Level 1 (Sections)**: `#F0F3FF` - Global panels
- **Level 2 (Cards)**: `#FFFFFF` - Active work area
- **Hover**: `#E8ECFF` - Interactive states

### Typography
- **UI Font**: Inter - For all interface elements
- **Code Font**: JetBrains Mono - For technical data

### Spacing (4px Grid)
All spacing follows a 4px base unit:
- `--spacing-1`: 4px
- `--spacing-2`: 8px
- `--spacing-4`: 16px
- `--spacing-8`: 32px (row height)
- `--spacing-16`: 64px (collapsed sidebar)
- `--spacing-60`: 240px (expanded sidebar)

## 🔧 Usage

### Import in your main CSS
```css
@import "./styles/index.css";
```

### Using Design Tokens
```css
.my-component {
  background-color: var(--color-surface-container-lowest);
  padding: var(--spacing-4);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-sans);
}
```

### Using Utility Classes
```html
<div class="bg-surface-container-low text-on-surface p-4 rounded-sm">
  Content here
</div>
```

### Typography Scale
```html
<h1 class="text-display-lg">Large Display</h1>
<h2 class="text-heading-md">Medium Heading</h2>
<p class="text-body-md">Body text</p>
<code class="font-mono text-label-sm">Technical data</code>
```

## 🎯 Design Principles

### The "No-Line" Rule
- **No 1px borders** for major layout sections
- Use background color shifts (tonal layering) instead
- **Exception**: Data grids can use 1px vertical rules

### Sharp Edges
- Maximum border radius: `8px` (--radius-lg)
- Standard radius: `4px` (--radius-sm)
- Avoid rounded corners > 8px

### No Shadows
- Use tonal layering for depth
- **Exception**: "Ghost borders" for floating elements
- Glassmorphism for modals/overlays

### High Density
- 32px row height for data tables
- Compact spacing for clinical precision
- JetBrains Mono for all technical data

## 🚀 Performance Features

### CSS Layers
Organized cascade with `@layer`:
- `invari.tokens` - Design tokens
- `invari.reset` - CSS reset
- `invari.base` - Base styles
- `invari.colors` - Color system
- `invari.typography` - Type system
- `invari.animations` - Animations
- `utilities` - Utility classes

### Optimizations
- CSS Custom Properties for runtime theming
- Containment for paint/layout performance
- Content-visibility for lazy rendering
- GPU acceleration utilities
- Tree-shaking in production
- Minification with cssnano

### Accessibility
- Focus-visible for keyboard navigation
- Reduced motion support
- High contrast mode support
- Semantic color system

## 📝 Conventions

### Naming
- **Tokens**: `--category-subcategory-variant`
- **Utilities**: `.utility-value`
- **Components**: `.component-variant-state`

### Examples
```css
/* Tokens */
--color-primary-dark
--spacing-4
--type-heading-lg-size

/* Utilities */
.text-primary
.bg-surface
.rounded-sm

/* Components */
.button-primary
.card-elevated
.input-focus
```

## 🔄 Theme Support

The system supports runtime theming via CSS custom properties:

```css
[data-theme="dark"] {
  --color-surface-base: #0A0B0F;
  --color-text-primary: #F9FAFB;
  /* ... other dark mode tokens */
}
```

## 📊 Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- CSS Custom Properties required
- CSS Layers required (@layer)

## 🛠️ Development

### Building
```bash
# Development
pnpm dev

# Production build
pnpm build

# Preview build
pnpm preview
```

### PostCSS Pipeline
1. Tailwind CSS v4 processing
2. Autoprefixer for compatibility
3. cssnano for minification (production only)

## 📚 Resources

- [Design System Specification](/DESIGN.md)
- [Component Documentation](./components/)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

## 🎓 Best Practices

1. **Always use design tokens** - Never hardcode values
2. **Follow the 4px grid** - All spacing must be divisible by 4
3. **Prefer utilities** - Use utility classes before custom CSS
4. **Component isolation** - Use CSS layers for organization
5. **Performance first** - Use containment and content-visibility
6. **Accessibility** - Test keyboard navigation and screen readers

---

**Version**: 1.0.0
**License**: PolyForm-Noncommercial-1.0.0
**Maintained by**: Invari Team