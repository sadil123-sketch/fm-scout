# FM Genie Scout

A React + Vite UI/UX prototype for the FM Genie Scout redesign. This project implements a modern, intuitive interface for Football Manager companion tools, featuring player/staff/club exploration, shortlist management, custom ratings, and "g" Edition premium features.

## Features

- **Dashboard** - Landing page with game status and quick actions
- **Player Explorer** - Search and filter 250k+ players with advanced filters
- **Staff Explorer** - Find coaches, scouts, and other staff
- **Club Explorer** - Browse clubs by reputation, finances, and facilities
- **Shortlist Management** - Import/export shortlists with tagging and notes
- **Rating Designer** - Customize player ratings with weighted attributes
- **History Points** - Track player development over time
- **Comparison Tool** - Compare multiple players side-by-side
- **"g" Edition Features** - Top Lists, Role Finder, Squad Gap Analyzer, and more

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
├── src/
│   ├── App.jsx          # Main application component with all screens
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS styles
├── attached_assets/     # Documentation files
│   ├── 01-user-flows_*.md              # User flow diagrams and specifications
│   ├── 02-component-specs_*.md         # Component specifications and design system
│   ├── 03-technical-architecture_*.md  # Technical architecture document
│   └── FM_Genie_Scout_UIX_*.pdf        # Development document v1.1
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── postcss.config.js    # PostCSS configuration
```

## Documentation

The `attached_assets/` directory contains detailed design and technical documentation:

- **User Flows** (`01-user-flows_*.md`) - Complete user journey mappings including application launch, player/staff/club search, shortlist management, player comparison, and "g" Edition gated flows
- **Component Specs** (`02-component-specs_*.md`) - Design system foundation with color tokens, typography, spacing, and detailed component specifications for all UI elements
- **Technical Architecture** (`03-technical-architecture_*.md`) - System architecture for Tauri 2.0 + React implementation, including IPC, state management, and performance optimizations
- **Development Document** (`FM_Genie_Scout_UIX_*.pdf`) - Comprehensive overview of pain points, feature breakdown, and design recommendations

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

## Design Principles

- Progressive disclosure for complexity management
- Real-time feedback for filter operations
- Virtualized rendering for large datasets (250k+ records)
- Consistent navigation patterns across entities
- Dark/Light theme support

## License

See [LICENSE](LICENSE) for details.
