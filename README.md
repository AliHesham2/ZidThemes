# ZidMirvela Storefront Theme

A Zid Vitrin storefront theme built for **Mirvela** (beauty retailer — Skincare, Makeup, Perfume, Organic Beauty).

## Architecture Overview

### Folder Structure

```
ZidMirvela/
├── layout.jinja                  # Base HTML wrapper (CSS vars, <head>, header/footer, bundles)
├── layout.schema.json            # Global theme editor settings schema (colors, fonts, radius)
├── layout.json                   # Draft default settings for dev preview
├── header.jinja / .schema.json   # Site header partial & schema (stub for Task 002)
├── footer.jinja / .schema.json   # Site footer partial & schema (stub for Task 002)
├── theme.json                    # Theme manifest metadata
│
├── templates/                    # Storefront page templates
│   └── home.jinja                # Homepage template with {% template_components %}
│
├── sections/                     # Merchant-configurable homepage sections (.jinja, .schema.json, .png)
├── components/                   # Reusable partials grouped by domain
│   ├── ui/                       # Domain-free primitives (breadcrumb, pagination, etc.)
│   ├── layout/                   # Sub-parts of header & footer
│   ├── products/                 # Product partials
│   │   └── headless/             # Unstyled BEM variants
│   ├── cart/                     # Cart page partials
│   ├── categories/               # Category partials
│   └── shared/                   # Cross-domain partials
│
├── assets/                       # Served over Zid CDN (fingerprinted)
│   ├── tailwindcss.css           # CSS entry point (@theme inline + imports)
│   ├── styles.css                # [GENERATED] Compiled CSS output (do not edit)
│   ├── css/                      # CSS source partials (base, layout, components)
│   ├── js/                       # JS source modules
│   │   ├── main.js               # Theme main JS bundle entry
│   │   ├── cart/controller.js    # Cart page JS bundle entry
│   │   └── utils/events.js       # Custom event helpers
│   └── dist/                     # [GENERATED] Vite IIFE JS bundles (theme.js, cart-controller.js)
│
├── locale/                       # Gettext translation catalogues
│   └── ar/LC_MESSAGES/messages.po# Arabic translation PO catalogue (6 plural forms)
└── package.json / vite.config.js # Build toolchain configuration
```

### CSS Architecture & Token Flow

All styling is strictly **global**:

```
layout.schema.json (Merchant Theme Editor)
       │
       ▼
layout.jinja (<style> block writes CSS variables onto :root)
       │
       ▼
assets/tailwindcss.css (@theme inline maps CSS variables to Tailwind design tokens)
       │
       ▼
Jinja Templates & CSS Recipes (bg-primary, text-foreground, rounded-md)
```

- **Type Scale**: Fluid `clamp()` scale base 18px for Arabic readability.
- **RTL-First**: Built with CSS logical properties (`margin-inline`, `padding-inline`, `start`/`end`).

### JavaScript Architecture

- **Two IIFE Bundles** (no ES modules at runtime):
  - `dist/theme.js`: Global site interaction module loaded on every page.
  - `dist/cart-controller.js`: Cart page dedicated logic loaded only on `/cart`.
- **Custom DOM Events**: Modules communicate via `content:loaded` and `products:updated`.

---

## Development & Build Commands

### Install Dependencies

```bash
npm install
```

### Run Watcher (Development)

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Format Code

```bash
npm run format
```
