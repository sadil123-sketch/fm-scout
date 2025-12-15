# FM Scout

A React + Vite UI/UX prototype for the FM Scout redesign. This project implements a modern, intuitive interface for Football Manager companion tools, featuring player/staff/club exploration, shortlist management, custom ratings, and "g" Edition premium features.

## Features

- **Dashboard** - Landing page with game status and quick actions
- **Player Explorer** - Search and filter 250k+ players with advanced filters
- **Staff Explorer** - Find coaches, scouts, and other staff
- **Club Explorer** - Browse clubs by reputation, finances, and facilities
- **Shortlist Management** - Import/export shortlists with tagging and notes
- **Rating Designer** - Customize player ratings with weighted attributes
- **History Points** - Track player development over time
- **Comparison Tool** - Compare multiple players side-by-side
- **Role Fit System** - FM26 phase-aware role scoring (IP/OOP)
- **"g" Edition Features** - Top Lists, Role Finder, Squad Gap Analyzer, and more

## Rating Engine (FM26)

The rating engine provides phase-aware role fit scoring based on FM26 role definitions:

### Key Components

- **`src/fm26RoleDefinitions.js`** - Complete FM26 role definitions with Key, Preferred, and Unnecessary attributes for all position groups (GK, D-C, D-LR, DM, M-C, AM-C, ST, etc.)
- **`src/roleFit.js`** - Scoring algorithm with normalization, configurable weights, and contribution tracking
- **`src/RoleFitPanel.jsx`** - UI component for displaying role fit scores with contribution breakdowns

### Scoring System

- **In Possession (IP)** and **Out of Possession (OOP)** roles are scored separately
- **Both mode** shows a 50/50 weighted overall score
- Attribute categories:
  - **KEY** - Essential attributes (default weight: 1.0)
  - **PREFERRED** - Important but not critical (default weight: 0.7)
  - **UNNECESSARY** - Ignored in scoring (weight: 0.0)
- Normalization enabled by default for consistent 0-20 scale scoring

### Settings

```javascript
{
  keyWeight: 1.0,        // Weight for KEY attributes
  preferredWeight: 0.7,  // Weight for PREFERRED attributes  
  normalizationEnabled: true,
  overallBlendIP: 0.5,   // IP weight in "Both" mode
  overallBlendOOP: 0.5   // OOP weight in "Both" mode
}
```

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
│   ├── App.jsx              # Main application component with all screens
│   ├── RoleFitPanel.jsx     # Role fit scoring UI component
│   ├── roleFit.js           # Scoring algorithm and utilities
│   ├── fm26RoleDefinitions.js # FM26 role attribute definitions
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind CSS styles
├── attached_assets/         # Documentation files
│   ├── 01-user-flows_*.md              # User flow diagrams and specifications
│   ├── 02-component-specs_*.md         # Component specifications and design system
│   ├── 03-technical-architecture_*.md  # Technical architecture document
│   └── FM_Scout_UIX_*.pdf        # Development document v1.1
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── postcss.config.js        # PostCSS configuration
```

## Documentation

The `attached_assets/` directory contains detailed design and technical documentation:

- **User Flows** (`01-user-flows_*.md`) - Complete user journey mappings including application launch, player/staff/club search, shortlist management, player comparison, and "g" Edition gated flows
- **Component Specs** (`02-component-specs_*.md`) - Design system foundation with color tokens, typography, spacing, and detailed component specifications for all UI elements
- **Technical Architecture** (`03-technical-architecture_*.md`) - System architecture for Tauri 2.0 + React implementation, including IPC, state management, and performance optimizations
- **Development Document** (`FM_Scout_UIX_*.pdf`) - Comprehensive overview of pain points, feature breakdown, and design recommendations

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
- Phase-aware role scoring (IP/OOP separation)

## License

See [LICENSE](LICENSE) for details.
