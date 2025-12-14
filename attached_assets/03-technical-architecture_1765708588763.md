# FM Genie Scout UI/UX Redesign
## Technical Architecture Document

**Version:** 1.0  
**Date:** December 2025  
**Author:** Product Team  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Tauri Backend Architecture](#tauri-backend-architecture)
6. [React Frontend Architecture](#react-frontend-architecture)
7. [Inter-Process Communication (IPC)](#inter-process-communication-ipc)
8. [Data Layer Architecture](#data-layer-architecture)
9. [State Management](#state-management)
10. [Performance Architecture](#performance-architecture)
11. [Security Architecture](#security-architecture)
12. [Build & Deployment](#build--deployment)
13. [Testing Strategy](#testing-strategy)
14. [Development Workflow](#development-workflow)

---

## Football Manager Directory Structure

### Critical Paths

The application relies on four key FM directories:

| Directory | Path | Purpose |
|-----------|------|---------|
| **User Data** | `\Sports Interactive\Football Manager 26` | Base directory for user-generated content |
| **Saved Games** | `\Sports Interactive\Football Manager 26\games` | Location of `.fm` save files |
| **Shortlists** | `\Sports Interactive\Football Manager 26\shortlists` | FM shortlist files (`.slf`) |
| **Language Database** | `\steamapps\common\Football Manager 26\shared\data\database\db\2600\2600_fm\lang_db.dat` | Translation database for internal IDs to human-readable names |

### Platform-Specific Base Paths

| Platform | User Data Base | Steam Base |
|----------|----------------|------------|
| **Windows** | `%USERPROFILE%\Documents\Sports Interactive\Football Manager 26` | `C:\Program Files (x86)\Steam\steamapps\common\Football Manager 26` |
| **macOS** | `~/Library/Application Support/Sports Interactive/Football Manager 26` | `~/Library/Application Support/Steam/steamapps/common/Football Manager 26` |

### Directory Structure Diagram

```
Documents/
└── Sports Interactive/
    └── Football Manager 26/           ← User Data Directory
        ├── games/                      ← Saved Games Directory
        │   ├── MySave.fm
        │   ├── CareerMode.fm
        │   └── autosave.fm
        ├── shortlists/                 ← Shortlist Directory
        │   ├── Wonderkids.slf
        │   ├── Transfer Targets.slf
        │   └── Scouted Players.slf
        ├── skins/
        ├── graphics/
        │   ├── faces/                  ← Player face packs
        │   ├── logos/                  ← Club logo packs
        │   └── kits/                   ← Kit packs
        └── editor data/

Steam/
└── steamapps/
    └── common/
        └── Football Manager 26/        ← FM Installation Directory
            ├── fm.exe
            └── shared/
                └── data/
                    └── database/
                        └── db/
                            └── 2600/
                                └── 2600_fm/
                                    └── lang_db.dat  ← Language Database
```

### Language Database (lang_db.dat)

The `lang_db.dat` file is essential for translating internal FM database IDs into human-readable strings:

- **Player names**: Internal ID → Display name
- **Club names**: Internal ID → Localized club name
- **Competition names**: Internal ID → League/cup names
- **Nationality names**: Internal ID → Country names
- **Attribute names**: Internal ID → "Dribbling", "Passing", etc.

Without this file, the application would only display numeric IDs instead of actual names.

---

## Executive Summary

This document outlines the technical architecture for the FM Genie Scout UI/UX redesign. The application is built using **Tauri 2.0** for the desktop framework and **React 18** for the frontend, providing a cross-platform solution that runs on Windows and macOS with superior performance compared to Electron-based alternatives.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop Framework | Tauri 2.0 | ~10MB bundle vs 150MB+ Electron, native OS APIs, Rust backend for performance |
| Frontend Framework | React 18 | Mature ecosystem, TypeScript support, extensive component libraries |
| State Management | Zustand | Simple API, minimal boilerplate, excellent TypeScript support |
| Styling | Tailwind CSS + Radix UI | Utility-first approach, accessible primitives |
| Data Tables | TanStack Table | Virtualization support for 250k+ records |
| Charts | Recharts + D3.js | Flexible visualization options |
| Local Database | SQLite via rusqlite | Fast queries, no external dependencies |

---

## Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FM Genie Scout                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        React Frontend (WebView)                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │   UI Layer   │  │ State Layer  │  │    Service Layer         │   │    │
│  │  │  Components  │◄─┤   Zustand    │◄─┤  IPC Bridge (invoke)     │   │    │
│  │  │  Pages       │  │   Stores     │  │  Event Listeners         │   │    │
│  │  └──────────────┘  └──────────────┘  └───────────┬──────────────┘   │    │
│  └──────────────────────────────────────────────────┼──────────────────┘    │
│                                                      │                       │
│                            ┌─────────────────────────┼─────────────────────┐ │
│                            │          Tauri IPC Bridge                     │ │
│                            │    (Commands, Events, State Sync)             │ │
│                            └─────────────────────────┼─────────────────────┘ │
│                                                      │                       │
│  ┌───────────────────────────────────────────────────┼──────────────────┐    │
│  │                      Rust Backend (Tauri Core)    │                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────▼──────────────┐   │    │
│  │  │   Commands   │  │   Services   │  │    Data Access Layer     │   │    │
│  │  │  Handlers    │◄─┤  FM Parser   │◄─┤    SQLite + Indexes      │   │    │
│  │  │              │  │  GS STATS    │  │    File System           │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Operating System Layer                         │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │   │ FM Process  │  │ File System │  │  Clipboard  │  │  Registry  │  │   │
│  │   │ Detection   │  │   Access    │  │   Access    │  │  (Win)     │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  FM Save     │────►│ Rust Parser  │────►│ SQLite DB    │────►│ React UI     │
│  (.fm file)  │     │ (Memory Read)│     │ (Indexed)    │     │ (Virtualized)│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                    │                     │
                            ▼                    ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                     │ Background   │     │ Query Engine │     │ State Store  │
                     │ Processing   │     │ (Filtered)   │     │ (Zustand)    │
                     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Desktop Framework | Tauri | 2.0 | Cross-platform desktop app, native OS access |
| Backend Language | Rust | 1.75+ | High-performance backend, memory safety |
| Frontend Framework | React | 18.2 | UI component library |
| Type System | TypeScript | 5.3+ | Static typing for JavaScript |
| Build Tool | Vite | 5.0 | Fast development server and bundler |
| Package Manager | pnpm | 8.0+ | Efficient dependency management |

### Frontend Libraries

| Category | Library | Version | Purpose |
|----------|---------|---------|---------|
| State Management | Zustand | 4.4+ | Global state management |
| Routing | React Router | 6.20+ | Client-side routing |
| UI Primitives | Radix UI | 1.0+ | Accessible component primitives |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS framework |
| Data Tables | TanStack Table | 8.10+ | Headless table with virtualization |
| Virtualization | TanStack Virtual | 3.0+ | Virtual scrolling for large lists |
| Charts | Recharts | 2.10+ | React chart components |
| D3 | D3.js | 7.8+ | Custom visualizations |
| Icons | Lucide React | 0.300+ | Icon library |
| Forms | React Hook Form | 7.48+ | Form state management |
| Validation | Zod | 3.22+ | Schema validation |
| Date Handling | date-fns | 2.30+ | Date utilities |

### Rust Crates

| Category | Crate | Version | Purpose |
|----------|-------|---------|---------|
| Framework | tauri | 2.0 | Desktop application framework |
| Database | rusqlite | 0.30+ | SQLite bindings |
| Serialization | serde | 1.0 | JSON serialization |
| Async Runtime | tokio | 1.35 | Asynchronous runtime |
| HTTP Client | reqwest | 0.11 | HTTP requests (GS STATS API) |
| Process | sysinfo | 0.30 | System/process information |
| File Watcher | notify | 6.0 | File system monitoring |
| Compression | flate2 | 1.0 | FM save decompression |

---

## Project Structure

```
fm-genie-scout/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI pipeline
│       ├── release.yml            # Release automation
│       └── test.yml               # Test automation
├── src-tauri/                     # Rust backend
│   ├── Cargo.toml                 # Rust dependencies
│   ├── Cargo.lock
│   ├── tauri.conf.json            # Tauri configuration
│   ├── capabilities/              # Permission capabilities
│   │   └── default.json
│   ├── icons/                     # Application icons
│   │   ├── icon.ico
│   │   ├── icon.icns
│   │   └── icon.png
│   └── src/
│       ├── main.rs                # Application entry point
│       ├── lib.rs                 # Library exports
│       ├── commands/              # IPC command handlers
│       │   ├── mod.rs
│       │   ├── paths.rs           # FM path detection commands
│       │   ├── game.rs            # Game loading commands
│       │   ├── players.rs         # Player queries
│       │   ├── staff.rs           # Staff queries
│       │   ├── clubs.rs           # Club queries
│       │   ├── shortlists.rs      # Shortlist management
│       │   ├── ratings.rs         # Rating system
│       │   ├── history.rs         # History points
│       │   ├── export.rs          # Export functionality
│       │   └── settings.rs        # User preferences
│       ├── services/              # Business logic
│       │   ├── mod.rs
│       │   ├── fm_paths.rs        # FM directory detection
│       │   ├── fm_parser.rs       # FM save file parser
│       │   ├── fm_process.rs      # FM process detection
│       │   ├── lang_db.rs         # Language database parser
│       │   ├── gs_stats.rs        # GS STATS API client
│       │   ├── database.rs        # SQLite operations
│       │   ├── indexer.rs         # Search indexing
│       │   └── subscription.rs    # g Edition licensing
│       ├── models/                # Data models
│       │   ├── mod.rs
│       │   ├── player.rs
│       │   ├── staff.rs
│       │   ├── club.rs
│       │   ├── shortlist.rs
│       │   ├── filter.rs
│       │   └── rating.rs
│       ├── database/              # Database layer
│       │   ├── mod.rs
│       │   ├── schema.rs          # Table definitions
│       │   ├── migrations/        # DB migrations
│       │   └── queries.rs         # Prepared queries
│       └── utils/
│           ├── mod.rs
│           ├── error.rs           # Error types
│           └── config.rs          # Configuration
├── src/                           # React frontend
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Root component
│   ├── vite-env.d.ts
│   ├── assets/                    # Static assets
│   │   ├── fonts/
│   │   └── images/
│   ├── components/                # React components
│   │   ├── ui/                    # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── index.ts
│   │   ├── layout/                # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── ContentArea.tsx
│   │   ├── navigation/            # Navigation components
│   │   │   ├── NavMenu.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   └── TabNavigation.tsx
│   │   ├── dashboard/             # Dashboard components
│   │   │   ├── GameStatusCard.tsx
│   │   │   ├── QuickAccessCard.tsx
│   │   │   └── RecentActivityList.tsx
│   │   ├── filters/               # Filter components
│   │   │   ├── UnifiedFilterPanel.tsx
│   │   │   ├── PlayerFilters.tsx
│   │   │   ├── StaffFilters.tsx
│   │   │   ├── ClubFilters.tsx
│   │   │   ├── FilterPresets.tsx
│   │   │   ├── RangeSlider.tsx
│   │   │   ├── AttributeGrid.tsx
│   │   │   └── SearchableSelect.tsx
│   │   ├── data-display/          # Data display components
│   │   │   ├── VirtualizedTable.tsx
│   │   │   ├── ColumnCustomizer.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   └── AbilityBar.tsx
│   │   ├── player/                # Player-specific components
│   │   │   ├── PlayerProfileModal.tsx
│   │   │   ├── ProfileHeader.tsx
│   │   │   ├── AttributeRadarChart.tsx
│   │   │   ├── HiddenAttributesTable.tsx
│   │   │   ├── PositionHeatmap.tsx
│   │   │   ├── TransferCard.tsx
│   │   │   └── RoleSuitabilityList.tsx
│   │   ├── staff/                 # Staff components
│   │   │   ├── StaffCard.tsx
│   │   │   ├── StaffProfileModal.tsx
│   │   │   └── StarRating.tsx
│   │   ├── club/                  # Club components
│   │   │   ├── ClubCard.tsx
│   │   │   ├── ClubProfileModal.tsx
│   │   │   └── FormationBoard.tsx
│   │   ├── shortlist/             # Shortlist components
│   │   │   ├── ShortlistPanel.tsx
│   │   │   ├── ShortlistPlayerRow.tsx
│   │   │   └── TagSelector.tsx
│   │   ├── comparison/            # Comparison components
│   │   │   ├── ComparisonView.tsx
│   │   │   └── ComparisonAttributeTable.tsx
│   │   ├── ratings/               # Rating system components
│   │   │   ├── RatingDesigner.tsx
│   │   │   └── WeightSlider.tsx
│   │   ├── history/               # History components
│   │   │   ├── HistoryTimeline.tsx
│   │   │   └── SnapshotComparison.tsx
│   │   ├── export/                # Export components
│   │   │   └── ExportDialog.tsx
│   │   └── g-edition/             # g Edition components
│   │       ├── GEditionGate.tsx
│   │       ├── UpgradePrompt.tsx
│   │       ├── DevelopmentForecast.tsx
│   │       ├── RoleFinder.tsx
│   │       ├── TopListsView.tsx
│   │       ├── DevProbabilityIndicator.tsx
│   │       └── ProgressRateGauge.tsx
│   ├── pages/                     # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Players.tsx
│   │   ├── Staff.tsx
│   │   ├── Clubs.tsx
│   │   ├── Shortlists.tsx
│   │   ├── RatingDesigner.tsx
│   │   ├── HistoryManager.tsx
│   │   ├── TopLists.tsx           # g Edition
│   │   ├── RoleFinder.tsx         # g Edition
│   │   └── Settings.tsx
│   ├── stores/                    # Zustand stores
│   │   ├── index.ts
│   │   ├── appStore.ts            # Core app state
│   │   ├── databaseStore.ts       # Database state
│   │   ├── filterStore.ts         # Filter state
│   │   ├── shortlistStore.ts      # Shortlist state
│   │   ├── preferencesStore.ts    # User preferences
│   │   └── subscriptionStore.ts   # g Edition state
│   ├── services/                  # Frontend services
│   │   ├── ipc.ts                 # IPC wrapper
│   │   ├── storage.ts             # Local storage utils
│   │   └── analytics.ts           # Usage analytics
│   ├── hooks/                     # Custom React hooks
│   │   ├── useDatabase.ts
│   │   ├── useFilter.ts
│   │   ├── useVirtualization.ts
│   │   ├── useDebounce.ts
│   │   ├── useKeyboard.ts
│   │   └── useTheme.ts
│   ├── lib/                       # Utility functions
│   │   ├── utils.ts               # General utilities
│   │   ├── formatters.ts          # Data formatters
│   │   ├── validators.ts          # Validation helpers
│   │   └── constants.ts           # App constants
│   ├── types/                     # TypeScript types
│   │   ├── index.ts
│   │   ├── player.ts
│   │   ├── staff.ts
│   │   ├── club.ts
│   │   ├── filter.ts
│   │   ├── rating.ts
│   │   └── ipc.ts                 # IPC message types
│   └── styles/
│       ├── globals.css            # Global styles
│       └── tailwind.css           # Tailwind imports
├── public/                        # Static public files
│   └── favicon.ico
├── tests/                         # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                       # Build/dev scripts
│   ├── build.ts
│   └── dev.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## Tauri Backend Architecture

### Entry Point (main.rs)

```rust
// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::sync::Mutex;

mod commands;
mod database;
mod models;
mod services;
mod utils;

use commands::paths::FmPathsState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(FmPathsState(Mutex::new(None)))
        .setup(|app| {
            // Initialize database
            let app_data_dir = app.path().app_data_dir()?;
            database::init(&app_data_dir)?;
            
            // Auto-detect FM paths on startup
            let paths = services::fm_paths::FmPaths::detect();
            *app.state::<FmPathsState>().0.lock().unwrap() = Some(paths);
            
            // Initialize other services
            services::init(app.handle())?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Path detection commands
            commands::paths::detect_fm_paths,
            commands::paths::get_fm_paths,
            commands::paths::set_custom_path,
            commands::paths::get_save_files,
            commands::paths::get_shortlist_files,
            commands::paths::validate_paths,
            
            // Game commands
            commands::game::detect_fm_process,
            commands::game::load_save,
            commands::game::load_save_from_file,
            commands::game::get_load_progress,
            commands::game::cancel_load,
            
            // Player commands
            commands::players::get_players,
            commands::players::get_player_by_id,
            commands::players::search_players,
            commands::players::get_player_count,
            
            // Staff commands
            commands::staff::get_staff,
            commands::staff::get_staff_by_id,
            commands::staff::search_staff,
            
            // Club commands
            commands::clubs::get_clubs,
            commands::clubs::get_club_by_id,
            commands::clubs::search_clubs,
            
            // Shortlist commands
            commands::shortlists::get_shortlists,
            commands::shortlists::create_shortlist,
            commands::shortlists::delete_shortlist,
            commands::shortlists::add_to_shortlist,
            commands::shortlists::remove_from_shortlist,
            commands::shortlists::update_annotation,
            commands::shortlists::import_shortlist,
            commands::shortlists::export_shortlist,
            commands::shortlists::sync_fm_shortlist,
            
            // Rating commands
            commands::ratings::get_rating_schemes,
            commands::ratings::save_rating_scheme,
            commands::ratings::delete_rating_scheme,
            commands::ratings::calculate_player_rating,
            
            // History commands
            commands::history::get_history_points,
            commands::history::create_history_point,
            commands::history::delete_history_point,
            commands::history::compare_history_points,
            
            // Export commands
            commands::export::export_to_html,
            commands::export::export_to_excel,
            commands::export::export_to_csv,
            
            // Settings commands
            commands::settings::get_preferences,
            commands::settings::save_preferences,
            commands::settings::get_saved_directories,
            commands::settings::save_directory_path,
            
            // g Edition commands
            commands::gs_stats::get_player_projections,
            commands::gs_stats::get_development_probability,
            commands::gs_stats::get_progress_rate,
            commands::gs_stats::get_top_lists,
            commands::subscription::check_subscription,
            commands::subscription::activate_subscription,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Command Handler Example

```rust
// src-tauri/src/commands/players.rs

use crate::database;
use crate::models::{Player, PlayerFilter, PlayerSummary};
use crate::utils::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct PlayerQueryResult {
    pub players: Vec<PlayerSummary>,
    pub total_count: usize,
    pub page: usize,
    pub page_size: usize,
}

#[tauri::command]
pub async fn get_players(
    filter: PlayerFilter,
    page: usize,
    page_size: usize,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PlayerQueryResult, AppError> {
    let db = database::get_connection()?;
    
    // Build query based on filter
    let (query, params) = build_player_query(&filter, page, page_size, &sort_by, &sort_order);
    
    // Execute query
    let players = db.query_map(&query, params, |row| {
        Ok(PlayerSummary {
            id: row.get("id")?,
            name: row.get("name")?,
            age: row.get("age")?,
            nationality: row.get("nationality")?,
            club_name: row.get("club_name")?,
            position: row.get("position")?,
            current_ability: row.get("current_ability")?,
            potential_ability: row.get("potential_ability")?,
            value: row.get("value")?,
            wage: row.get("wage")?,
        })
    })?;
    
    // Get total count for pagination
    let total_count = get_filtered_count(&filter)?;
    
    Ok(PlayerQueryResult {
        players,
        total_count,
        page,
        page_size,
    })
}

#[tauri::command]
pub async fn get_player_by_id(player_id: String) -> Result<Player, AppError> {
    let db = database::get_connection()?;
    
    let player = db.query_row(
        "SELECT * FROM players WHERE id = ?",
        [&player_id],
        |row| Player::from_row(row),
    )?;
    
    Ok(player)
}

#[tauri::command]
pub async fn search_players(
    query: String,
    limit: usize,
) -> Result<Vec<PlayerSummary>, AppError> {
    let db = database::get_connection()?;
    
    // Use FTS5 for full-text search
    let players = db.query_map(
        "SELECT p.* FROM players p 
         JOIN players_fts fts ON p.id = fts.id 
         WHERE players_fts MATCH ? 
         LIMIT ?",
        [&query, &limit.to_string()],
        |row| PlayerSummary::from_row(row),
    )?;
    
    Ok(players)
}

#[tauri::command]
pub async fn get_player_count(filter: PlayerFilter) -> Result<usize, AppError> {
    get_filtered_count(&filter)
}

fn build_player_query(
    filter: &PlayerFilter,
    page: usize,
    page_size: usize,
    sort_by: &Option<String>,
    sort_order: &Option<String>,
) -> (String, Vec<String>) {
    let mut conditions: Vec<String> = vec![];
    let mut params: Vec<String> = vec![];
    
    // Position filter
    if !filter.positions.is_empty() {
        let placeholders: Vec<&str> = filter.positions.iter().map(|_| "?").collect();
        conditions.push(format!("position IN ({})", placeholders.join(",")));
        params.extend(filter.positions.clone());
    }
    
    // Age filter
    if let Some((min, max)) = &filter.age_range {
        conditions.push("age BETWEEN ? AND ?".to_string());
        params.push(min.to_string());
        params.push(max.to_string());
    }
    
    // CA/PA filter
    if let Some((min, max)) = &filter.ca_range {
        conditions.push("current_ability BETWEEN ? AND ?".to_string());
        params.push(min.to_string());
        params.push(max.to_string());
    }
    
    if let Some((min, max)) = &filter.pa_range {
        conditions.push("potential_ability BETWEEN ? AND ?".to_string());
        params.push(min.to_string());
        params.push(max.to_string());
    }
    
    // Build final query
    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };
    
    let order_clause = match (sort_by, sort_order) {
        (Some(col), Some(ord)) => format!("ORDER BY {} {}", col, ord),
        (Some(col), None) => format!("ORDER BY {} ASC", col),
        _ => "ORDER BY current_ability DESC".to_string(),
    };
    
    let offset = page * page_size;
    
    let query = format!(
        "SELECT * FROM players {} {} LIMIT ? OFFSET ?",
        where_clause, order_clause
    );
    
    params.push(page_size.to_string());
    params.push(offset.to_string());
    
    (query, params)
}
```

### FM Save Parser Service

```rust
// src-tauri/src/services/fm_parser.rs

use crate::models::{Player, Staff, Club};
use crate::utils::error::AppError;
use flate2::read::ZlibDecoder;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use tauri::{AppHandle, Emitter};

pub struct FmParser {
    app_handle: AppHandle,
}

impl FmParser {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
    
    pub async fn parse_save(&self, path: &Path) -> Result<ParsedData, AppError> {
        // Emit progress event
        self.emit_progress("Initializing...", 0);
        
        // Open and decompress save file
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut decoder = ZlibDecoder::new(reader);
        let mut data = Vec::new();
        decoder.read_to_end(&mut data)?;
        
        self.emit_progress("Reading players...", 10);
        
        // Parse players
        let players = self.parse_players(&data)?;
        self.emit_progress(&format!("Parsed {} players", players.len()), 40);
        
        // Parse staff
        let staff = self.parse_staff(&data)?;
        self.emit_progress(&format!("Parsed {} staff", staff.len()), 60);
        
        // Parse clubs
        let clubs = self.parse_clubs(&data)?;
        self.emit_progress(&format!("Parsed {} clubs", clubs.len()), 80);
        
        // Build indexes
        self.emit_progress("Building indexes...", 90);
        
        self.emit_progress("Complete!", 100);
        
        Ok(ParsedData {
            players,
            staff,
            clubs,
            fm_version: self.detect_fm_version(&data)?,
        })
    }
    
    fn parse_players(&self, data: &[u8]) -> Result<Vec<Player>, AppError> {
        // FM save parsing logic
        // This would contain the actual binary parsing code
        // specific to Football Manager save format
        todo!("Implement FM-specific player parsing")
    }
    
    fn parse_staff(&self, data: &[u8]) -> Result<Vec<Staff>, AppError> {
        todo!("Implement FM-specific staff parsing")
    }
    
    fn parse_clubs(&self, data: &[u8]) -> Result<Vec<Club>, AppError> {
        todo!("Implement FM-specific club parsing")
    }
    
    fn detect_fm_version(&self, data: &[u8]) -> Result<String, AppError> {
        // Detect FM version from save header
        todo!("Implement FM version detection")
    }
    
    fn emit_progress(&self, status: &str, percentage: u32) {
        let _ = self.app_handle.emit("load-progress", LoadProgress {
            status: status.to_string(),
            percentage,
        });
    }
}

#[derive(Debug, serde::Serialize)]
pub struct LoadProgress {
    pub status: String,
    pub percentage: u32,
}

#[derive(Debug)]
pub struct ParsedData {
    pub players: Vec<Player>,
    pub staff: Vec<Staff>,
    pub clubs: Vec<Club>,
    pub fm_version: String,
}
```

### FM Path Detection Service

```rust
// src-tauri/src/services/fm_paths.rs

use crate::utils::error::AppError;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

/// Detected FM directory paths
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FmPaths {
    /// Base user data directory: Sports Interactive/Football Manager 26
    pub user_data_dir: Option<PathBuf>,
    /// Saved games directory: Sports Interactive/Football Manager 26/games
    pub saves_dir: Option<PathBuf>,
    /// Shortlists directory: Sports Interactive/Football Manager 26/shortlists
    pub shortlists_dir: Option<PathBuf>,
    /// Graphics directory: Sports Interactive/Football Manager 26/graphics
    pub graphics_dir: Option<PathBuf>,
    /// FM installation directory (Steam)
    pub install_dir: Option<PathBuf>,
    /// Language database file: steamapps/common/Football Manager 26/shared/data/database/db/2600/2600_fm/lang_db.dat
    pub lang_db_path: Option<PathBuf>,
    /// Detected FM version
    pub fm_version: Option<String>,
}

impl FmPaths {
    /// Auto-detect all FM paths
    pub fn detect() -> Self {
        let mut paths = FmPaths {
            user_data_dir: None,
            saves_dir: None,
            shortlists_dir: None,
            graphics_dir: None,
            install_dir: None,
            lang_db_path: None,
            fm_version: None,
        };
        
        // Detect user data directory
        if let Some(user_data) = Self::detect_user_data_dir() {
            paths.saves_dir = Some(user_data.join("games"));
            paths.shortlists_dir = Some(user_data.join("shortlists"));
            paths.graphics_dir = Some(user_data.join("graphics"));
            paths.user_data_dir = Some(user_data);
        }
        
        // Detect Steam installation
        if let Some(install_dir) = Self::detect_steam_install() {
            // Detect FM version from installation
            paths.fm_version = Self::detect_version_from_install(&install_dir);
            
            // Build lang_db path based on version
            if let Some(ref version) = paths.fm_version {
                let version_code = Self::version_to_code(version);
                let lang_db = install_dir
                    .join("shared")
                    .join("data")
                    .join("database")
                    .join("db")
                    .join(&version_code)
                    .join(format!("{}_fm", version_code))
                    .join("lang_db.dat");
                
                if lang_db.exists() {
                    paths.lang_db_path = Some(lang_db);
                }
            }
            
            paths.install_dir = Some(install_dir);
        }
        
        paths
    }
    
    /// Detect user data directory based on platform
    fn detect_user_data_dir() -> Option<PathBuf> {
        // FM version years to check (newest first)
        let fm_versions = ["26", "25", "24", "23"];
        
        #[cfg(target_os = "windows")]
        {
            // Windows: Documents/Sports Interactive/Football Manager XX
            if let Some(docs) = dirs::document_dir() {
                for version in &fm_versions {
                    let path = docs
                        .join("Sports Interactive")
                        .join(format!("Football Manager {}", version));
                    if path.exists() {
                        return Some(path);
                    }
                }
            }
        }
        
        #[cfg(target_os = "macos")]
        {
            // macOS: ~/Library/Application Support/Sports Interactive/Football Manager XX
            if let Some(app_support) = dirs::data_dir() {
                for version in &fm_versions {
                    let path = app_support
                        .join("Sports Interactive")
                        .join(format!("Football Manager {}", version));
                    if path.exists() {
                        return Some(path);
                    }
                }
            }
        }
        
        None
    }
    
    /// Detect Steam installation directory
    fn detect_steam_install() -> Option<PathBuf> {
        let fm_versions = ["26", "25", "24", "23"];
        
        // Common Steam library paths
        let steam_paths = Self::get_steam_library_paths();
        
        for steam_path in steam_paths {
            for version in &fm_versions {
                let fm_path = steam_path
                    .join("steamapps")
                    .join("common")
                    .join(format!("Football Manager {}", version));
                
                if fm_path.exists() {
                    return Some(fm_path);
                }
            }
        }
        
        None
    }
    
    /// Get potential Steam library paths
    fn get_steam_library_paths() -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        #[cfg(target_os = "windows")]
        {
            // Default Steam installation
            paths.push(PathBuf::from("C:\\Program Files (x86)\\Steam"));
            paths.push(PathBuf::from("C:\\Program Files\\Steam"));
            
            // Check for additional library folders from libraryfolders.vdf
            if let Some(additional) = Self::parse_steam_library_folders() {
                paths.extend(additional);
            }
        }
        
        #[cfg(target_os = "macos")]
        {
            if let Some(home) = dirs::home_dir() {
                paths.push(home.join("Library/Application Support/Steam"));
            }
        }
        
        paths
    }
    
    /// Parse Steam's libraryfolders.vdf to find additional library locations
    fn parse_steam_library_folders() -> Option<Vec<PathBuf>> {
        #[cfg(target_os = "windows")]
        {
            let vdf_path = PathBuf::from("C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf");
            if let Ok(content) = fs::read_to_string(&vdf_path) {
                let mut paths = Vec::new();
                // Simple parsing - look for "path" entries
                for line in content.lines() {
                    if line.contains("\"path\"") {
                        if let Some(path_str) = line.split('"').nth(3) {
                            let path = PathBuf::from(path_str.replace("\\\\", "\\"));
                            if path.exists() {
                                paths.push(path);
                            }
                        }
                    }
                }
                if !paths.is_empty() {
                    return Some(paths);
                }
            }
        }
        None
    }
    
    /// Detect FM version from installation directory
    fn detect_version_from_install(install_dir: &PathBuf) -> Option<String> {
        // Extract version from directory name
        let dir_name = install_dir.file_name()?.to_str()?;
        if dir_name.starts_with("Football Manager ") {
            return Some(dir_name.replace("Football Manager ", ""));
        }
        None
    }
    
    /// Convert version string to database code (e.g., "26" -> "2600")
    fn version_to_code(version: &str) -> String {
        format!("{}00", version)
    }
    
    /// Validate that all required paths exist
    pub fn validate(&self) -> Result<(), AppError> {
        if self.saves_dir.as_ref().map_or(true, |p| !p.exists()) {
            return Err(AppError::PathNotFound("Saved games directory not found".into()));
        }
        
        if self.lang_db_path.as_ref().map_or(true, |p| !p.exists()) {
            return Err(AppError::PathNotFound("Language database not found. Is FM installed?".into()));
        }
        
        Ok(())
    }
    
    /// Get list of available save files
    pub fn get_save_files(&self) -> Result<Vec<SaveFileInfo>, AppError> {
        let saves_dir = self.saves_dir.as_ref()
            .ok_or(AppError::PathNotFound("Saves directory not configured".into()))?;
        
        let mut saves = Vec::new();
        
        for entry in fs::read_dir(saves_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map_or(false, |ext| ext == "fm") {
                let metadata = entry.metadata()?;
                saves.push(SaveFileInfo {
                    name: path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                        .to_string(),
                    path: path.clone(),
                    size: metadata.len(),
                    modified: metadata.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                });
            }
        }
        
        // Sort by modified date (newest first)
        saves.sort_by(|a, b| b.modified.cmp(&a.modified));
        
        Ok(saves)
    }
    
    /// Get list of available shortlist files
    pub fn get_shortlist_files(&self) -> Result<Vec<ShortlistFileInfo>, AppError> {
        let shortlists_dir = self.shortlists_dir.as_ref()
            .ok_or(AppError::PathNotFound("Shortlists directory not configured".into()))?;
        
        // Create directory if it doesn't exist
        if !shortlists_dir.exists() {
            fs::create_dir_all(shortlists_dir)?;
        }
        
        let mut shortlists = Vec::new();
        
        for entry in fs::read_dir(shortlists_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // FM shortlist files have .slf extension
            if path.extension().map_or(false, |ext| ext == "slf") {
                shortlists.push(ShortlistFileInfo {
                    name: path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                        .to_string(),
                    path: path.clone(),
                });
            }
        }
        
        Ok(shortlists)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFileInfo {
    pub name: String,
    pub path: PathBuf,
    pub size: u64,
    pub modified: Option<u64>, // Unix timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortlistFileInfo {
    pub name: String,
    pub path: PathBuf,
}
```

### Language Database Parser

```rust
// src-tauri/src/services/lang_db.rs

use crate::utils::error::AppError;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

/// Language database for translating FM internal IDs to human-readable strings
pub struct LangDb {
    /// Map of internal ID to localized string
    strings: HashMap<u32, String>,
}

impl LangDb {
    /// Load language database from file
    pub fn load(path: &Path) -> Result<Self, AppError> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        
        let strings = Self::parse_lang_db(&mut reader)?;
        
        Ok(Self { strings })
    }
    
    /// Get localized string by ID
    pub fn get(&self, id: u32) -> Option<&String> {
        self.strings.get(&id)
    }
    
    /// Get localized string or return fallback
    pub fn get_or(&self, id: u32, fallback: &str) -> String {
        self.strings.get(&id)
            .cloned()
            .unwrap_or_else(|| fallback.to_string())
    }
    
    /// Parse the binary lang_db.dat file
    fn parse_lang_db<R: Read>(reader: &mut R) -> Result<HashMap<u32, String>, AppError> {
        let mut strings = HashMap::new();
        
        // lang_db.dat format parsing
        // This is a placeholder - actual implementation depends on FM's binary format
        // The file contains:
        // - Header with version info
        // - String table with ID -> offset mappings
        // - String data (null-terminated or length-prefixed)
        
        todo!("Implement lang_db.dat binary parsing based on FM format specification")
    }
    
    /// Get total number of loaded strings
    pub fn len(&self) -> usize {
        self.strings.len()
    }
    
    /// Check if database is empty
    pub fn is_empty(&self) -> bool {
        self.strings.is_empty()
    }
}
```

### Path Detection Commands

```rust
// src-tauri/src/commands/paths.rs

use crate::services::fm_paths::{FmPaths, SaveFileInfo, ShortlistFileInfo};
use crate::utils::error::AppError;
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;

/// Cached FM paths
pub struct FmPathsState(pub Mutex<Option<FmPaths>>);

#[tauri::command]
pub async fn detect_fm_paths(
    state: State<'_, FmPathsState>,
) -> Result<FmPaths, AppError> {
    let paths = FmPaths::detect();
    
    // Cache the detected paths
    *state.0.lock().unwrap() = Some(paths.clone());
    
    Ok(paths)
}

#[tauri::command]
pub async fn get_fm_paths(
    state: State<'_, FmPathsState>,
) -> Result<Option<FmPaths>, AppError> {
    Ok(state.0.lock().unwrap().clone())
}

#[tauri::command]
pub async fn set_custom_path(
    state: State<'_, FmPathsState>,
    path_type: String,
    path: String,
) -> Result<(), AppError> {
    let mut guard = state.0.lock().unwrap();
    
    if let Some(ref mut paths) = *guard {
        let new_path = PathBuf::from(path);
        
        match path_type.as_str() {
            "user_data" => {
                paths.user_data_dir = Some(new_path.clone());
                paths.saves_dir = Some(new_path.join("games"));
                paths.shortlists_dir = Some(new_path.join("shortlists"));
                paths.graphics_dir = Some(new_path.join("graphics"));
            }
            "saves" => paths.saves_dir = Some(new_path),
            "shortlists" => paths.shortlists_dir = Some(new_path),
            "graphics" => paths.graphics_dir = Some(new_path),
            "install" => paths.install_dir = Some(new_path),
            "lang_db" => paths.lang_db_path = Some(new_path),
            _ => return Err(AppError::InvalidInput(format!("Unknown path type: {}", path_type))),
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_save_files(
    state: State<'_, FmPathsState>,
) -> Result<Vec<SaveFileInfo>, AppError> {
    let guard = state.0.lock().unwrap();
    let paths = guard.as_ref()
        .ok_or(AppError::NotInitialized("FM paths not detected".into()))?;
    
    paths.get_save_files()
}

#[tauri::command]
pub async fn get_shortlist_files(
    state: State<'_, FmPathsState>,
) -> Result<Vec<ShortlistFileInfo>, AppError> {
    let guard = state.0.lock().unwrap();
    let paths = guard.as_ref()
        .ok_or(AppError::NotInitialized("FM paths not detected".into()))?;
    
    paths.get_shortlist_files()
}

#[tauri::command]
pub async fn validate_paths(
    state: State<'_, FmPathsState>,
) -> Result<PathValidationResult, AppError> {
    let guard = state.0.lock().unwrap();
    let paths = guard.as_ref()
        .ok_or(AppError::NotInitialized("FM paths not detected".into()))?;
    
    Ok(PathValidationResult {
        user_data_valid: paths.user_data_dir.as_ref().map_or(false, |p| p.exists()),
        saves_valid: paths.saves_dir.as_ref().map_or(false, |p| p.exists()),
        shortlists_valid: paths.shortlists_dir.as_ref().map_or(false, |p| p.exists()),
        graphics_valid: paths.graphics_dir.as_ref().map_or(false, |p| p.exists()),
        install_valid: paths.install_dir.as_ref().map_or(false, |p| p.exists()),
        lang_db_valid: paths.lang_db_path.as_ref().map_or(false, |p| p.exists()),
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PathValidationResult {
    pub user_data_valid: bool,
    pub saves_valid: bool,
    pub shortlists_valid: bool,
    pub graphics_valid: bool,
    pub install_valid: bool,
    pub lang_db_valid: bool,
}
```

### Database Schema

```rust
// src-tauri/src/database/schema.rs

pub const SCHEMA: &str = r#"
-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    age INTEGER NOT NULL,
    date_of_birth TEXT,
    nationality TEXT NOT NULL,
    secondary_nationality TEXT,
    club_id TEXT,
    club_name TEXT,
    position TEXT NOT NULL,
    secondary_positions TEXT,
    current_ability INTEGER NOT NULL,
    potential_ability INTEGER NOT NULL,
    reputation INTEGER,
    value INTEGER,
    wage INTEGER,
    contract_expiry TEXT,
    contract_status TEXT,
    release_clause INTEGER,
    
    -- Technical attributes
    corners INTEGER,
    crossing INTEGER,
    dribbling INTEGER,
    finishing INTEGER,
    first_touch INTEGER,
    free_kick INTEGER,
    heading INTEGER,
    long_shots INTEGER,
    long_throws INTEGER,
    marking INTEGER,
    passing INTEGER,
    penalty_taking INTEGER,
    tackling INTEGER,
    technique INTEGER,
    
    -- Mental attributes
    aggression INTEGER,
    anticipation INTEGER,
    bravery INTEGER,
    composure INTEGER,
    concentration INTEGER,
    decisions INTEGER,
    determination INTEGER,
    flair INTEGER,
    leadership INTEGER,
    off_the_ball INTEGER,
    positioning INTEGER,
    teamwork INTEGER,
    vision INTEGER,
    work_rate INTEGER,
    
    -- Physical attributes
    acceleration INTEGER,
    agility INTEGER,
    balance INTEGER,
    jumping_reach INTEGER,
    natural_fitness INTEGER,
    pace INTEGER,
    stamina INTEGER,
    strength INTEGER,
    
    -- Hidden attributes
    adaptability INTEGER,
    ambition INTEGER,
    controversy INTEGER,
    consistency INTEGER,
    dirtiness INTEGER,
    important_matches INTEGER,
    injury_proneness INTEGER,
    loyalty INTEGER,
    pressure INTEGER,
    professionalism INTEGER,
    sportsmanship INTEGER,
    temperament INTEGER,
    versatility INTEGER,
    
    -- Preferred foot
    preferred_foot TEXT,
    weak_foot INTEGER,
    
    -- Preferred moves (JSON array)
    preferred_moves TEXT,
    
    -- Position ratings (JSON object)
    position_ratings TEXT,
    
    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_age ON players(age);
CREATE INDEX IF NOT EXISTS idx_players_ca ON players(current_ability);
CREATE INDEX IF NOT EXISTS idx_players_pa ON players(potential_ability);
CREATE INDEX IF NOT EXISTS idx_players_value ON players(value);

-- Full-text search for players
CREATE VIRTUAL TABLE IF NOT EXISTS players_fts USING fts5(
    id,
    name,
    club_name,
    nationality,
    content='players',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS players_ai AFTER INSERT ON players BEGIN
    INSERT INTO players_fts(id, name, club_name, nationality) 
    VALUES (new.id, new.name, new.club_name, new.nationality);
END;

CREATE TRIGGER IF NOT EXISTS players_ad AFTER DELETE ON players BEGIN
    INSERT INTO players_fts(players_fts, id, name, club_name, nationality) 
    VALUES('delete', old.id, old.name, old.club_name, old.nationality);
END;

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    nationality TEXT NOT NULL,
    club_id TEXT,
    club_name TEXT,
    role TEXT NOT NULL,
    current_ability INTEGER NOT NULL,
    potential_ability INTEGER NOT NULL,
    reputation INTEGER,
    wage INTEGER,
    contract_expiry TEXT,
    
    -- Coaching attributes
    attacking INTEGER,
    defending INTEGER,
    tactical INTEGER,
    technical INTEGER,
    mental INTEGER,
    fitness INTEGER,
    goalkeeping INTEGER,
    
    -- Hidden attributes
    judging_ability INTEGER,
    judging_potential INTEGER,
    level_of_discipline INTEGER,
    man_management INTEGER,
    motivating INTEGER,
    adaptability INTEGER,
    determination INTEGER,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_club ON staff(club_id);

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    country TEXT NOT NULL,
    league TEXT,
    division_level INTEGER,
    reputation INTEGER,
    stadium_name TEXT,
    stadium_capacity INTEGER,
    training_facilities INTEGER,
    youth_facilities INTEGER,
    transfer_budget INTEGER,
    wage_budget INTEGER,
    balance INTEGER,
    manager_id TEXT,
    manager_name TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);
CREATE INDEX IF NOT EXISTS idx_clubs_country ON clubs(country);
CREATE INDEX IF NOT EXISTS idx_clubs_league ON clubs(league);
CREATE INDEX IF NOT EXISTS idx_clubs_reputation ON clubs(reputation);

-- Shortlists table
CREATE TABLE IF NOT EXISTS shortlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    is_fm_synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Shortlist players junction table
CREATE TABLE IF NOT EXISTS shortlist_players (
    shortlist_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    tag TEXT,
    note TEXT,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shortlist_id, player_id),
    FOREIGN KEY (shortlist_id) REFERENCES shortlists(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Rating schemes table
CREATE TABLE IF NOT EXISTS rating_schemes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    role TEXT,
    weights TEXT NOT NULL, -- JSON object
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- History points table
CREATE TABLE IF NOT EXISTS history_points (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    name TEXT,
    snapshot_date TEXT NOT NULL,
    attributes TEXT NOT NULL, -- JSON object with all attributes
    current_ability INTEGER NOT NULL,
    potential_ability INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_player ON history_points(player_id);

-- Saved filters table
CREATE TABLE IF NOT EXISTS saved_filters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'players', 'staff', 'clubs'
    filter_config TEXT NOT NULL, -- JSON object
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default preferences
INSERT OR IGNORE INTO preferences (key, value) VALUES
    ('theme', '"dark"'),
    ('sidebar_collapsed', 'false'),
    ('auto_sync_shortlist', 'true'),
    ('default_columns_players', '["name","age","club","position","ca","pa","value"]'),
    ('default_columns_staff', '["name","age","role","club","ca","attacking","defending"]'),
    ('fm_install_path', 'null'),
    ('fm_saves_path', 'null'),
    ('fm_graphics_path', 'null'),
    ('export_path', 'null');
"#;
```

---

## React Frontend Architecture

### Application Entry Point

```tsx
// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

// Pages
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Staff from './pages/Staff';
import Clubs from './pages/Clubs';
import Shortlists from './pages/Shortlists';
import RatingDesignerPage from './pages/RatingDesigner';
import HistoryManager from './pages/HistoryManager';
import TopLists from './pages/TopLists';
import RoleFinderPage from './pages/RoleFinder';
import Settings from './pages/Settings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'players', element: <Players /> },
      { path: 'staff', element: <Staff /> },
      { path: 'clubs', element: <Clubs /> },
      { path: 'shortlists', element: <Shortlists /> },
      { path: 'ratings', element: <RatingDesignerPage /> },
      { path: 'history', element: <HistoryManager /> },
      { path: 'top-lists', element: <TopLists /> },
      { path: 'role-finder', element: <RoleFinderPage /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### Root App Component

```tsx
// src/App.tsx

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { listen } from '@tauri-apps/api/event';
import { AppShell } from './components/layout/AppShell';
import { useAppStore } from './stores/appStore';
import { useDatabaseStore } from './stores/databaseStore';
import { usePreferencesStore } from './stores/preferencesStore';

function App() {
  const { setLoadProgress } = useDatabaseStore();
  const { theme } = usePreferencesStore();
  
  useEffect(() => {
    // Listen for load progress events from Rust
    const unlisten = listen<{ status: string; percentage: number }>('load-progress', (event) => {
      setLoadProgress(event.payload.status, event.payload.percentage);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, [setLoadProgress]);
  
  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster 
        theme={theme} 
        position="bottom-right"
        richColors
      />
    </>
  );
}

export default App;
```

### IPC Service Layer

```typescript
// src/services/ipc.ts

import { invoke } from '@tauri-apps/api/core';
import type { 
  Player, 
  PlayerSummary, 
  PlayerFilter,
  Staff,
  Club,
  Shortlist,
  RatingScheme,
  HistoryPoint,
  Preferences,
} from '../types';

// Type-safe invoke wrapper
async function typedInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`IPC Error [${cmd}]:`, error);
    throw error;
  }
}

// Path detection types
export interface FmPaths {
  userDataDir: string | null;
  savesDir: string | null;
  shortlistsDir: string | null;
  graphicsDir: string | null;
  installDir: string | null;
  langDbPath: string | null;
  fmVersion: string | null;
}

export interface SaveFileInfo {
  name: string;
  path: string;
  size: number;
  modified: number | null;
}

export interface ShortlistFileInfo {
  name: string;
  path: string;
}

export interface PathValidationResult {
  userDataValid: boolean;
  savesValid: boolean;
  shortlistsValid: boolean;
  graphicsValid: boolean;
  installValid: boolean;
  langDbValid: boolean;
}

// Path detection commands
export const pathService = {
  detectFmPaths: () =>
    typedInvoke<FmPaths>('detect_fm_paths'),
  
  getFmPaths: () =>
    typedInvoke<FmPaths | null>('get_fm_paths'),
  
  setCustomPath: (pathType: string, path: string) =>
    typedInvoke<void>('set_custom_path', { pathType, path }),
  
  getSaveFiles: () =>
    typedInvoke<SaveFileInfo[]>('get_save_files'),
  
  getShortlistFiles: () =>
    typedInvoke<ShortlistFileInfo[]>('get_shortlist_files'),
  
  validatePaths: () =>
    typedInvoke<PathValidationResult>('validate_paths'),
};

// Game commands
export const gameService = {
  detectFmProcess: () => 
    typedInvoke<{ detected: boolean; version?: string }>('detect_fm_process'),
  
  loadSave: () => 
    typedInvoke<void>('load_save'),
  
  loadSaveFromFile: (path: string) => 
    typedInvoke<void>('load_save_from_file', { path }),
  
  cancelLoad: () => 
    typedInvoke<void>('cancel_load'),
};

// Player commands
export const playerService = {
  getPlayers: (filter: PlayerFilter, page: number, pageSize: number, sortBy?: string, sortOrder?: string) =>
    typedInvoke<{ players: PlayerSummary[]; totalCount: number; page: number; pageSize: number }>(
      'get_players', 
      { filter, page, pageSize, sortBy, sortOrder }
    ),
  
  getPlayerById: (playerId: string) =>
    typedInvoke<Player>('get_player_by_id', { playerId }),
  
  searchPlayers: (query: string, limit: number = 20) =>
    typedInvoke<PlayerSummary[]>('search_players', { query, limit }),
  
  getPlayerCount: (filter: PlayerFilter) =>
    typedInvoke<number>('get_player_count', { filter }),
};

// Staff commands
export const staffService = {
  getStaff: (filter: any, page: number, pageSize: number) =>
    typedInvoke<{ staff: Staff[]; totalCount: number }>('get_staff', { filter, page, pageSize }),
  
  getStaffById: (staffId: string) =>
    typedInvoke<Staff>('get_staff_by_id', { staffId }),
  
  searchStaff: (query: string, limit: number = 20) =>
    typedInvoke<Staff[]>('search_staff', { query, limit }),
};

// Club commands
export const clubService = {
  getClubs: (filter: any, page: number, pageSize: number) =>
    typedInvoke<{ clubs: Club[]; totalCount: number }>('get_clubs', { filter, page, pageSize }),
  
  getClubById: (clubId: string) =>
    typedInvoke<Club>('get_club_by_id', { clubId }),
  
  searchClubs: (query: string, limit: number = 20) =>
    typedInvoke<Club[]>('search_clubs', { query, limit }),
};

// Shortlist commands
export const shortlistService = {
  getShortlists: () =>
    typedInvoke<Shortlist[]>('get_shortlists'),
  
  createShortlist: (name: string, color?: string) =>
    typedInvoke<Shortlist>('create_shortlist', { name, color }),
  
  deleteShortlist: (shortlistId: string) =>
    typedInvoke<void>('delete_shortlist', { shortlistId }),
  
  addToShortlist: (shortlistId: string, playerId: string, tag?: string, note?: string) =>
    typedInvoke<void>('add_to_shortlist', { shortlistId, playerId, tag, note }),
  
  removeFromShortlist: (shortlistId: string, playerId: string) =>
    typedInvoke<void>('remove_from_shortlist', { shortlistId, playerId }),
  
  updateAnnotation: (shortlistId: string, playerId: string, tag?: string, note?: string) =>
    typedInvoke<void>('update_annotation', { shortlistId, playerId, tag, note }),
  
  syncFmShortlist: () =>
    typedInvoke<{ synced: number }>('sync_fm_shortlist'),
  
  importShortlist: (path: string) =>
    typedInvoke<Shortlist>('import_shortlist', { path }),
  
  exportShortlist: (shortlistId: string, format: string, path: string) =>
    typedInvoke<void>('export_shortlist', { shortlistId, format, path }),
};

// Rating commands
export const ratingService = {
  getRatingSchemes: () =>
    typedInvoke<RatingScheme[]>('get_rating_schemes'),
  
  saveRatingScheme: (scheme: RatingScheme) =>
    typedInvoke<RatingScheme>('save_rating_scheme', { scheme }),
  
  deleteRatingScheme: (schemeId: string) =>
    typedInvoke<void>('delete_rating_scheme', { schemeId }),
  
  calculatePlayerRating: (playerId: string, schemeId: string) =>
    typedInvoke<number>('calculate_player_rating', { playerId, schemeId }),
};

// History commands
export const historyService = {
  getHistoryPoints: (playerId: string) =>
    typedInvoke<HistoryPoint[]>('get_history_points', { playerId }),
  
  createHistoryPoint: (playerId: string, name?: string) =>
    typedInvoke<HistoryPoint>('create_history_point', { playerId, name }),
  
  deleteHistoryPoint: (pointId: string) =>
    typedInvoke<void>('delete_history_point', { pointId }),
};

// Export commands
export const exportService = {
  exportToHtml: (data: any, config: any, path: string) =>
    typedInvoke<void>('export_to_html', { data, config, path }),
  
  exportToExcel: (data: any, config: any, path: string) =>
    typedInvoke<void>('export_to_excel', { data, config, path }),
  
  exportToCsv: (data: any, config: any, path: string) =>
    typedInvoke<void>('export_to_csv', { data, config, path }),
};

// Settings commands
export const settingsService = {
  getPreferences: () =>
    typedInvoke<Preferences>('get_preferences'),
  
  savePreferences: (preferences: Partial<Preferences>) =>
    typedInvoke<void>('save_preferences', { preferences }),
  
  getSavedDirectories: () =>
    typedInvoke<{ fmInstall?: string; fmSaves?: string; fmGraphics?: string; exports?: string }>(
      'get_saved_directories'
    ),
  
  saveDirectoryPath: (key: string, path: string) =>
    typedInvoke<void>('save_directory_path', { key, path }),
};

// g Edition commands
export const gEditionService = {
  getPlayerProjections: (playerId: string) =>
    typedInvoke<any>('get_player_projections', { playerId }),
  
  getDevelopmentProbability: (playerId: string) =>
    typedInvoke<{ probability: number; factors: any[] }>('get_development_probability', { playerId }),
  
  getProgressRate: (playerId: string) =>
    typedInvoke<{ rate: string; factors: any[] }>('get_progress_rate', { playerId }),
  
  getTopLists: (listType: string, filters: any) =>
    typedInvoke<any[]>('get_top_lists', { listType, filters }),
  
  checkSubscription: () =>
    typedInvoke<{ isActive: boolean; expiryDate?: string; features: string[] }>('check_subscription'),
  
  activateSubscription: (key: string) =>
    typedInvoke<{ success: boolean; message?: string }>('activate_subscription', { key }),
};
```

---

## Inter-Process Communication (IPC)

### Communication Patterns

```
┌─────────────────┐                      ┌─────────────────┐
│  React Frontend │                      │   Rust Backend  │
│                 │                      │                 │
│  ┌───────────┐  │    invoke()          │  ┌───────────┐  │
│  │ Component │──┼──────────────────────┼─►│  Command  │  │
│  └───────────┘  │                      │  │  Handler  │  │
│        ▲        │                      │  └─────┬─────┘  │
│        │        │    Result<T>         │        │        │
│        └────────┼──────────────────────┼────────┘        │
│                 │                      │                 │
│  ┌───────────┐  │    emit()            │  ┌───────────┐  │
│  │  Event    │◄─┼──────────────────────┼──│  Service  │  │
│  │  Listener │  │                      │  │           │  │
│  └───────────┘  │                      │  └───────────┘  │
└─────────────────┘                      └─────────────────┘

Pattern 1: Request/Response (invoke)
- Synchronous-style async calls
- Type-safe with TypeScript generics
- Used for: queries, mutations, commands

Pattern 2: Events (emit/listen)
- Unidirectional from Rust to JS
- Used for: progress updates, real-time sync, notifications
```

### Event Types

```typescript
// src/types/ipc.ts

// Progress events
export interface LoadProgressEvent {
  status: string;
  percentage: number;
}

// Sync events
export interface ShortlistSyncEvent {
  type: 'added' | 'removed' | 'updated';
  playerId: string;
  shortlistId: string;
}

// Notification events
export interface NotificationEvent {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// FM process events
export interface FmProcessEvent {
  type: 'detected' | 'lost';
  version?: string;
}
```

### Event Listener Hook

```typescript
// src/hooks/useEventListener.ts

import { useEffect } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export function useEventListener<T>(
  eventName: string,
  handler: (payload: T) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    let unlisten: UnlistenFn;
    
    const setupListener = async () => {
      unlisten = await listen<T>(eventName, (event) => {
        handler(event.payload);
      });
    };
    
    setupListener();
    
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, deps);
}

// Usage example
function LoadingScreen() {
  const [progress, setProgress] = useState({ status: '', percentage: 0 });
  
  useEventListener<LoadProgressEvent>('load-progress', (payload) => {
    setProgress(payload);
  });
  
  return (
    <ProgressBar value={progress.percentage} label={progress.status} />
  );
}
```

---

## State Management

### Store Structure

```typescript
// src/stores/index.ts

export { useAppStore } from './appStore';
export { useDatabaseStore } from './databaseStore';
export { usePathsStore } from './pathsStore';
export { useFilterStore } from './filterStore';
export { useShortlistStore } from './shortlistStore';
export { usePreferencesStore } from './preferencesStore';
export { useSubscriptionStore } from './subscriptionStore';
```

### Paths Store

```typescript
// src/stores/pathsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pathService, FmPaths, SaveFileInfo, ShortlistFileInfo, PathValidationResult } from '../services/ipc';

interface PathsState {
  // Detected paths
  paths: FmPaths | null;
  isDetecting: boolean;
  
  // Validation
  validation: PathValidationResult | null;
  
  // Available files
  saveFiles: SaveFileInfo[];
  shortlistFiles: ShortlistFileInfo[];
  
  // Actions
  detectPaths: () => Promise<void>;
  refreshPaths: () => Promise<void>;
  setCustomPath: (pathType: string, path: string) => Promise<void>;
  validatePaths: () => Promise<void>;
  loadSaveFiles: () => Promise<void>;
  loadShortlistFiles: () => Promise<void>;
}

export const usePathsStore = create<PathsState>()(
  persist(
    (set, get) => ({
      paths: null,
      isDetecting: false,
      validation: null,
      saveFiles: [],
      shortlistFiles: [],
      
      detectPaths: async () => {
        set({ isDetecting: true });
        try {
          const paths = await pathService.detectFmPaths();
          set({ paths, isDetecting: false });
          
          // Auto-validate after detection
          await get().validatePaths();
          
          // Load available files
          await get().loadSaveFiles();
          await get().loadShortlistFiles();
        } catch (error) {
          set({ isDetecting: false });
          throw error;
        }
      },
      
      refreshPaths: async () => {
        const paths = await pathService.getFmPaths();
        set({ paths });
      },
      
      setCustomPath: async (pathType: string, path: string) => {
        await pathService.setCustomPath(pathType, path);
        await get().refreshPaths();
        await get().validatePaths();
      },
      
      validatePaths: async () => {
        const validation = await pathService.validatePaths();
        set({ validation });
      },
      
      loadSaveFiles: async () => {
        try {
          const saveFiles = await pathService.getSaveFiles();
          set({ saveFiles });
        } catch (error) {
          console.error('Failed to load save files:', error);
          set({ saveFiles: [] });
        }
      },
      
      loadShortlistFiles: async () => {
        try {
          const shortlistFiles = await pathService.getShortlistFiles();
          set({ shortlistFiles });
        } catch (error) {
          console.error('Failed to load shortlist files:', error);
          set({ shortlistFiles: [] });
        }
      },
    }),
    {
      name: 'paths-storage',
      partialize: (state) => ({
        // Don't persist paths - always detect fresh on startup
      }),
    }
  )
);
```

### Database Store Example

```typescript
// src/stores/databaseStore.ts

import { create } from 'zustand';
import { gameService, playerService } from '../services/ipc';
import type { PlayerSummary, Player, PlayerFilter } from '../types';

interface DatabaseState {
  // Loading state
  isLoading: boolean;
  loadProgress: number;
  loadStatus: string;
  
  // Database state
  isLoaded: boolean;
  playerCount: number;
  staffCount: number;
  clubCount: number;
  fmVersion: string | null;
  
  // Current query results
  players: PlayerSummary[];
  totalPlayerCount: number;
  currentPage: number;
  pageSize: number;
  
  // Selected player (for profile modal)
  selectedPlayer: Player | null;
  
  // Actions
  detectFm: () => Promise<{ detected: boolean; version?: string }>;
  loadSave: () => Promise<void>;
  loadSaveFromFile: (path: string) => Promise<void>;
  cancelLoad: () => void;
  setLoadProgress: (status: string, percentage: number) => void;
  
  fetchPlayers: (filter: PlayerFilter, page?: number) => Promise<void>;
  fetchPlayerById: (playerId: string) => Promise<void>;
  clearSelectedPlayer: () => void;
  
  reset: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // Initial state
  isLoading: false,
  loadProgress: 0,
  loadStatus: '',
  isLoaded: false,
  playerCount: 0,
  staffCount: 0,
  clubCount: 0,
  fmVersion: null,
  players: [],
  totalPlayerCount: 0,
  currentPage: 0,
  pageSize: 50,
  selectedPlayer: null,
  
  // Actions
  detectFm: async () => {
    const result = await gameService.detectFmProcess();
    return result;
  },
  
  loadSave: async () => {
    set({ isLoading: true, loadProgress: 0, loadStatus: 'Starting...' });
    try {
      await gameService.loadSave();
      // After successful load, fetch initial data
      const result = await playerService.getPlayers({}, 0, 50);
      set({
        isLoaded: true,
        isLoading: false,
        players: result.players,
        totalPlayerCount: result.totalCount,
        playerCount: result.totalCount,
      });
    } catch (error) {
      set({ isLoading: false, loadStatus: 'Error loading save' });
      throw error;
    }
  },
  
  loadSaveFromFile: async (path: string) => {
    set({ isLoading: true, loadProgress: 0, loadStatus: 'Starting...' });
    try {
      await gameService.loadSaveFromFile(path);
      set({ isLoaded: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false, loadStatus: 'Error loading save' });
      throw error;
    }
  },
  
  cancelLoad: () => {
    gameService.cancelLoad();
    set({ isLoading: false, loadProgress: 0, loadStatus: '' });
  },
  
  setLoadProgress: (status: string, percentage: number) => {
    set({ loadStatus: status, loadProgress: percentage });
  },
  
  fetchPlayers: async (filter: PlayerFilter, page: number = 0) => {
    const { pageSize } = get();
    const result = await playerService.getPlayers(filter, page, pageSize);
    set({
      players: result.players,
      totalPlayerCount: result.totalCount,
      currentPage: page,
    });
  },
  
  fetchPlayerById: async (playerId: string) => {
    const player = await playerService.getPlayerById(playerId);
    set({ selectedPlayer: player });
  },
  
  clearSelectedPlayer: () => {
    set({ selectedPlayer: null });
  },
  
  reset: () => {
    set({
      isLoading: false,
      loadProgress: 0,
      loadStatus: '',
      isLoaded: false,
      playerCount: 0,
      staffCount: 0,
      clubCount: 0,
      fmVersion: null,
      players: [],
      totalPlayerCount: 0,
      currentPage: 0,
      selectedPlayer: null,
    });
  },
}));
```

### Filter Store

```typescript
// src/stores/filterStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlayerFilter, StaffFilter, ClubFilter, SavedFilter } from '../types';

interface FilterState {
  // Current filters
  playerFilter: PlayerFilter;
  staffFilter: StaffFilter;
  clubFilter: ClubFilter;
  
  // Saved filters
  savedFilters: SavedFilter[];
  filterHistory: { filter: PlayerFilter | StaffFilter | ClubFilter; timestamp: Date }[];
  
  // Actions
  setPlayerFilter: (filter: Partial<PlayerFilter>) => void;
  setStaffFilter: (filter: Partial<StaffFilter>) => void;
  setClubFilter: (filter: Partial<ClubFilter>) => void;
  
  resetPlayerFilter: () => void;
  resetStaffFilter: () => void;
  resetClubFilter: () => void;
  
  saveFilter: (name: string, entityType: string) => void;
  loadFilter: (filterId: string) => void;
  deleteFilter: (filterId: string) => void;
  
  applyPreset: (presetId: string) => void;
}

const defaultPlayerFilter: PlayerFilter = {
  positions: [],
  ageRange: undefined,
  nationalities: [],
  divisions: [],
  clubs: [],
  caRange: undefined,
  paRange: undefined,
  minRating: undefined,
  contractStatus: [],
  valueRange: undefined,
  wageRange: undefined,
  technicalMins: {},
  mentalMins: {},
  physicalMins: {},
  hiddenMins: {},
  personalities: [],
  preferredMoves: [],
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      playerFilter: defaultPlayerFilter,
      staffFilter: {},
      clubFilter: {},
      savedFilters: [],
      filterHistory: [],
      
      setPlayerFilter: (filter) => {
        set((state) => ({
          playerFilter: { ...state.playerFilter, ...filter },
        }));
      },
      
      setStaffFilter: (filter) => {
        set((state) => ({
          staffFilter: { ...state.staffFilter, ...filter },
        }));
      },
      
      setClubFilter: (filter) => {
        set((state) => ({
          clubFilter: { ...state.clubFilter, ...filter },
        }));
      },
      
      resetPlayerFilter: () => {
        const current = get().playerFilter;
        set({
          playerFilter: defaultPlayerFilter,
          filterHistory: [
            ...get().filterHistory,
            { filter: current, timestamp: new Date() },
          ].slice(-10), // Keep last 10
        });
      },
      
      resetStaffFilter: () => set({ staffFilter: {} }),
      resetClubFilter: () => set({ clubFilter: {} }),
      
      saveFilter: (name, entityType) => {
        const { playerFilter, staffFilter, clubFilter, savedFilters } = get();
        const filter = entityType === 'players' ? playerFilter :
                       entityType === 'staff' ? staffFilter : clubFilter;
        
        const newFilter: SavedFilter = {
          id: crypto.randomUUID(),
          name,
          entityType,
          filterConfig: filter,
          isFavorite: false,
          createdAt: new Date(),
        };
        
        set({ savedFilters: [...savedFilters, newFilter] });
      },
      
      loadFilter: (filterId) => {
        const filter = get().savedFilters.find(f => f.id === filterId);
        if (!filter) return;
        
        switch (filter.entityType) {
          case 'players':
            set({ playerFilter: filter.filterConfig as PlayerFilter });
            break;
          case 'staff':
            set({ staffFilter: filter.filterConfig as StaffFilter });
            break;
          case 'clubs':
            set({ clubFilter: filter.filterConfig as ClubFilter });
            break;
        }
      },
      
      deleteFilter: (filterId) => {
        set({
          savedFilters: get().savedFilters.filter(f => f.id !== filterId),
        });
      },
      
      applyPreset: (presetId) => {
        // Preset definitions
        const presets: Record<string, Partial<PlayerFilter>> = {
          wonderkids: {
            ageRange: [15, 21],
            paRange: [150, 200],
          },
          bargains: {
            caRange: [130, 200],
            valueRange: [0, 5000000],
          },
          freeAgents: {
            contractStatus: ['free'],
          },
          expiring: {
            contractStatus: ['expiring'],
          },
        };
        
        const preset = presets[presetId];
        if (preset) {
          set({
            playerFilter: { ...defaultPlayerFilter, ...preset },
          });
        }
      },
    }),
    {
      name: 'filter-storage',
      partialize: (state) => ({
        savedFilters: state.savedFilters,
      }),
    }
  )
);
```

---

## Performance Architecture

### Virtualization Strategy

```typescript
// src/hooks/useVirtualization.ts

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualTableOptions {
  count: number;
  rowHeight?: number;
  overscan?: number;
}

export function useVirtualTable({ count, rowHeight = 48, overscan = 10 }: UseVirtualTableOptions) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });
  
  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 
    ? totalHeight - (virtualRows[virtualRows.length - 1]?.end || 0) 
    : 0;
  
  return {
    parentRef,
    virtualRows,
    totalHeight,
    paddingTop,
    paddingBottom,
  };
}
```

### Debounced Filter Updates

```typescript
// src/hooks/useDebounce.ts

import { useState, useEffect, useRef, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
  
  return debouncedCallback;
}
```

### Query Caching Strategy

```typescript
// src/hooks/useQueryCache.ts

import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseQueryCacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in ms
}

export function useQueryCache<T>(options: UseQueryCacheOptions = {}) {
  const { maxSize = 50, ttl = 5 * 60 * 1000 } = options; // 5 minutes default TTL
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  
  const get = useCallback((key: string): T | undefined => {
    const entry = cacheRef.current.get(key);
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() - entry.timestamp > ttl) {
      cacheRef.current.delete(key);
      return undefined;
    }
    
    return entry.data;
  }, [ttl]);
  
  const set = useCallback((key: string, data: T) => {
    // Evict oldest if at max size
    if (cacheRef.current.size >= maxSize) {
      const oldestKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(oldestKey);
    }
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, [maxSize]);
  
  const invalidate = useCallback((pattern?: string) => {
    if (!pattern) {
      cacheRef.current.clear();
      return;
    }
    
    for (const key of cacheRef.current.keys()) {
      if (key.includes(pattern)) {
        cacheRef.current.delete(key);
      }
    }
  }, []);
  
  return { get, set, invalidate };
}
```

---

## Build & Deployment

### Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "FM Genie Scout",
  "version": "1.0.0",
  "identifier": "com.geniescout.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "FM Genie Scout",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "fullscreen": false,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: asset: https://asset.localhost; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "macOS": {
      "minimumSystemVersion": "10.15"
    }
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          'chart-vendor': ['recharts', 'd3'],
          'table-vendor': ['@tanstack/react-table', '@tanstack/react-virtual'],
        },
      },
    },
  },
});
```

### Build Scripts

```json
// package.json (scripts section)
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/release.yml

name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: 'FM Genie Scout v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/stores/filterStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetPlayerFilter();
  });
  
  it('should set player filter correctly', () => {
    const { setPlayerFilter, playerFilter } = useFilterStore.getState();
    
    setPlayerFilter({ ageRange: [18, 25] });
    
    expect(useFilterStore.getState().playerFilter.ageRange).toEqual([18, 25]);
  });
  
  it('should apply wonderkids preset', () => {
    const { applyPreset } = useFilterStore.getState();
    
    applyPreset('wonderkids');
    
    const filter = useFilterStore.getState().playerFilter;
    expect(filter.ageRange).toEqual([15, 21]);
    expect(filter.paRange).toEqual([150, 200]);
  });
  
  it('should save and load filters', () => {
    const { setPlayerFilter, saveFilter, loadFilter, savedFilters } = useFilterStore.getState();
    
    setPlayerFilter({ positions: ['ST', 'CF'] });
    saveFilter('Strikers', 'players');
    
    const saved = useFilterStore.getState().savedFilters;
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('Strikers');
  });
});
```

### Integration Tests

```typescript
// tests/integration/playerSearch.test.ts

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Players } from '@/pages/Players';
import { playerService } from '@/services/ipc';

vi.mock('@/services/ipc', () => ({
  playerService: {
    getPlayers: vi.fn(),
    searchPlayers: vi.fn(),
  },
}));

describe('Player Search Integration', () => {
  it('should filter players by position', async () => {
    const mockPlayers = [
      { id: '1', name: 'Test Player', position: 'ST', currentAbility: 150 },
    ];
    
    vi.mocked(playerService.getPlayers).mockResolvedValue({
      players: mockPlayers,
      totalCount: 1,
      page: 0,
      pageSize: 50,
    });
    
    render(<Players />);
    
    // Open filter panel
    await userEvent.click(screen.getByText('Filters'));
    
    // Select position
    await userEvent.click(screen.getByText('ST'));
    
    // Verify API was called with correct filter
    await waitFor(() => {
      expect(playerService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ positions: ['ST'] }),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/app.spec.ts

import { test, expect } from '@playwright/test';

test.describe('FM Genie Scout', () => {
  test('should load dashboard on startup', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Welcome to Genie Scout')).toBeVisible();
    await expect(page.getByText('Load Your FM Save')).toBeVisible();
  });
  
  test('should navigate to players page', async ({ page }) => {
    await page.goto('/');
    
    // Note: In real tests, we'd need to mock the loaded state
    await page.getByRole('link', { name: 'Players' }).click();
    
    await expect(page).toHaveURL('/players');
  });
});
```

---

## Development Workflow

### Getting Started

```bash
# Clone repository
git clone https://github.com/your-org/fm-genie-scout.git
cd fm-genie-scout

# Install dependencies
pnpm install

# Start development server
pnpm tauri:dev

# Run tests
pnpm test

# Build for production
pnpm tauri:build
```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server only |
| `pnpm tauri:dev` | Start full Tauri dev environment |
| `pnpm build` | Build frontend only |
| `pnpm tauri:build` | Build production app |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

### Code Quality Standards

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint**: Follows Airbnb style guide with React hooks rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for linting and testing
- **Conventional Commits**: Commit message format for changelogs

---

*Document Version: 1.0 | Last Updated: December 2025*
