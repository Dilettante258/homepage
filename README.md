# Personal Homepage

A modern, bilingual personal homepage built with Astro, featuring smooth animations, dark mode, and interactive components.

## Features

- **🌐 Bilingual Support**: Full i18n implementation with English and Chinese translations
- **🌓 Dark/Light Theme**: Smooth theme switching with View Transitions API
- **✨ Animated Icons**: Pure CSS animated icon components with hover effects
- **📝 Blog System**: Dynamic blog with markdown support and syntax highlighting
- **🎨 Interactive Gallery**: Showcase of interactive UI components and experiments
- **📱 Responsive Design**: Mobile-first approach with optimized layouts
- **⚡ Fast Performance**: Static site generation with Astro for optimal speed
- **🔄 View Transitions**: Smooth page navigation with cross-document view transitions

## Tech Stack

- **Framework**: [Astro](https://astro.build) - Static Site Generator
- **Languages**: TypeScript, CSS
- **UI Libraries**: Solid.js, React (for interactive islands)
- **Styling**: Pure CSS with custom properties
- **Animations**: CSS @keyframes and View Transitions API

## Project Structure

```text
/
├── public/              # Static assets (fonts, images, favicon)
├── src/
│   ├── assets/          # Project images and media
│   ├── components/      # Reusable Astro components
│   │   ├── icons/       # Animated icon components
│   │   └── ...
│   ├── content/         # Content collections (blog posts, projects)
│   │   ├── blog/        # Blog markdown files
│   │   └── projects/    # Project markdown files
│   ├── data/            # Data files (gallery items, etc.)
│   ├── i18n/            # Internationalization strings
│   ├── layouts/         # Page layouts
│   ├── pages/           # File-based routing
│   │   └── [lang]/      # Language-specific pages
│   ├── styles/          # Global styles
│   └── utils/           # Utility functions
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The development server will be available at `http://localhost:4321`.

## Key Features

### Animated Icons

The project includes custom animated icon components with pure CSS animations:

- **GithubIcon**: Scale and tail wag animation on hover
- **MailIcon**: Envelope pulse with check mark draw effect
- **LinkIcon**: Chain shake animation with alternating segments
- **ArrowLeftIcon**: Bouncing arrow with flowing line effect

All icons are built as Astro components without external dependencies.

### Theme System

The theme toggle provides smooth transitions between light and dark modes:
- Sun/moon icon animation with rotation
- CSS custom properties for dynamic theming
- View Transitions for seamless color changes
- Persistent theme preference in localStorage

### Internationalization

Complete bilingual support with:
- Route-based language switching (`/en/*` and `/zh/*`)
- Centralized translation strings in `src/i18n/strings.ts`
- Language switcher component in navigation
- Automatic locale detection

### Gallery

Interactive component showcase featuring:
- Theme toggle display
- Filterable by tags (solid, react, css, ux, interaction)
- Responsive grid layout with aspect ratio preservation
- Smooth transitions and hover effects

## Content Management

### Adding Blog Posts

Create a new markdown file in `src/content/blog/`:

```markdown
---
title: 'Your Post Title'
description: 'Brief description'
pubDate: '2026-01-27'
tags: ['tag1', 'tag2']
---

Your content here...
```

### Adding Projects

Create a new markdown file in `src/content/projects/`:

```markdown
---
title: 'Project Name'
description: 'Project description'
tags: ['tech', 'stack']
link: 'https://project-url.com'
---

Project details...
```

### Adding Gallery Items

Edit `src/data/gallery.ts` to add new gallery items:

```typescript
{
  slug: 'component-name',
  title: { en: 'English Title', zh: '中文标题' },
  description: { en: 'Description', zh: '描述' },
  tags: ['css', 'interaction'],
  fallbackGradient: 'linear-gradient(120deg, #color1, #color2)',
  aspect: 'landscape' | 'portrait' | 'square',
  createdAt: '2026-01-27',
}
```

Then create the corresponding page at `src/pages/[lang]/gallery/component-name.astro`.

## Customization

### Colors

Theme colors are defined using CSS custom properties in `src/styles/global.css`:

```css
:root {
  --color-text: ...;
  --color-bg: ...;
  --color-accent: ...;
  /* ... */
}
```

### Fonts

Web fonts are loaded from `public/fonts/` and defined in `src/styles/fonts.css`.

## Performance

- Optimized build with Astro's static site generation
- Minimal JavaScript - only for interactive islands
- Efficient CSS animations with hardware acceleration
- Lazy-loaded images with aspect ratio preservation
- View Transitions for smooth navigation

## License

MIT License

## Acknowledgments

Built with [Astro](https://astro.build) and powered by modern web technologies.
