# FM Genie Scout

## Overview

FM Genie Scout is a React + Vite UI/UX prototype for a Football Manager companion tool redesign. The application provides a modern interface for exploring players, staff, and clubs from Football Manager games, featuring advanced filtering, shortlist management, player comparison tools, and an FM26-compatible role fit scoring system. The prototype is designed to handle 250k+ player records with virtualized rendering and real-time filtering.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18** with Vite for fast development and HMR
- **Tailwind CSS** for utility-first styling with PostCSS/Autoprefixer
- **Lucide React** for iconography
- Single-page application with component-based architecture

### Core Features Architecture

**Entity Explorers**: Separate explorer views for Players, Staff, and Clubs with advanced filtering capabilities designed for large datasets (250k+ records).

**Rating Engine (FM26)**: Phase-aware role fit scoring system that evaluates players based on:
- Role definitions with Key, Preferred, and Unnecessary attributes
- In Possession (IP) and Out of Possession (OOP) phase scoring
- Configurable weights and normalization for consistent 0-20 scale scoring

**Shortlist System**: Import/export functionality with tagging and notes for player tracking.

**Player Profile Attributes Section**: Redesigned attributes display with:
- Auto-detection of GK vs Outfield player types (shows appropriate attribute groups automatically)
- Clean 3-column grid layout with no collapse/toggle controls
- Interactive tooltips with FM attribute definitions (hover on Info icon)
- Context-aware tooltips for shared attributes (e.g., First Touch/Passing have different descriptions for GK)

### Key Design Patterns

**Progressive Disclosure**: Complex features revealed gradually to manage UI complexity.

**Virtualized Rendering**: Required for handling 250k+ player records efficiently - implementation pending.

**Modular Role Definitions**: Role data separated in `fm26RoleDefinitions.js` with scoring logic in `roleFit.js` for maintainability.

### "g" Edition Features
Premium features gated behind edition check:
- Top Lists
- Role Finder
- Squad Gap Analyzer
- GS Stats Development Forecast
- In-Game Scout (IGS)

## External Dependencies

### Runtime Dependencies
- **React 18.3.1** - UI framework
- **React DOM 18.3.1** - DOM rendering
- **Lucide React 0.471.0** - Icon library

### Build Dependencies
- **Vite 5.4.10** - Build tool and dev server
- **@vitejs/plugin-react** - React plugin for Vite
- **Tailwind CSS 3.4.13** - CSS framework
- **PostCSS 8.4.47** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing

### Future Integration (from specs)
- **Tauri 2.0** - Desktop application wrapper (referenced in component specs but not yet implemented)
- **TypeScript** - Type system (referenced in specs but current implementation uses JavaScript)

### Development Server
- Runs on port 5000
- Host: 0.0.0.0 (accessible from any interface)