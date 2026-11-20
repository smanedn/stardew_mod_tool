<p align="center">
  <img src="assets/logo.png" alt="Stardew Valley Mod Creator Logo" width="128" />
</p>

# Stardew Valley Mod Creator - by Smane (SVMC)

[![Release Build](https://github.com/smanedn/stardew_mod_tool/actions/workflows/release.yml/badge.svg)](https://github.com/smanedn/stardew_mod_tool/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Latest Release](https://img.shields.io/github/v/release/smanedn/stardew_mod_tool?include_prereleases)](https://github.com/smanedn/stardew_mod_tool/releases)

A beginner-friendly, security-first visual studio for creating **Stardew Valley** *Content Patcher* (SMAPI 4.0+) mods without writing raw JSON by hand. Designed as the companion creation tool to [Stardew Valley Mod Manager (SVMM)](https://github.com/smanedn/stardew_mod_manager).

> New to modding? Read the step-by-step **[Beginner's Guide](GUIDE.md)**!

## Features

- **Beginner-Friendly Simple Mode (Default):** Clean 7-step workflow (`1. Mod Info` → `2. New Items` → `3. Crops` → `4. Villager Chat` → `5. Sprites` → `6. Draw Sprite` → `7. Preview & Export`) using plain-English labels with zero raw JSON clutter.
- **Advanced Mode (One Click Away):** Unlocks GMCM `ConfigSchema` builder, multi-language `i18n` translation tables, `Live Code Inspector`, `Test in Game` SMAPI log monitor, and `UniqueID` / `SemVer` controls.
- **Interactive 2-Minute Tutorial:** Animated walkthrough that creates and lets you download a working **Golden Starberry** (`Smane.GoldenStarberry`) Content Patcher mod.
- **Live In-Game Previews in Every Tab:** Real-time Stardew Valley inventory tooltip (with Energy/Health restoration & sell price), NPC dialogue box with portrait mood detection (`$h`, `$s`, `$a`, `$l`, `$u`), crop growth timeline, `EditImage` coordinates, and 4x pixel-art preview.
- **Built-In Pixel-Art Editor:** Quick touch-up canvas (`16x16`, `16x32`, `32x32`) with pixel grid, pencil, eyedropper, eraser, color swatches, and PNG download.
- **Security First:** Content Patcher-only policy (no arbitrary DLL execution), path traversal protection (`path.resolve` / `fs.realpath`), strict Zod schemas, PNG/TMX/XNB magic-byte & 32-bit RGBA checks, and automatic `.backup/` snapshots before overwriting files.
- **Performance & Reliability:** Non-blocking async I/O (`node:fs/promises`), O(1) `GameDataIndex` hash maps, LRU lazy asset caching, 300ms+ debounce, global `Ctrl+Z` / `Ctrl+Y` Undo/Redo, and silent 2-minute SHA-256 crash recovery.
- **One-Click Export & Nexus Packaging:** Export directly to `Mods/` (with optional Mod Manager CLI/IPC hook) or package a clean `[CP] <ModName>/` `.zip` archive ready for Nexus Mods.
- **Light & Dark Mode:** Persistent theme toggle in the top bar.

## Platform Support

| Platform | Status | Notes |
| --- | --- | --- |
| **Web / Browser** | **Tested** | Run `npm run dev` and open `http://localhost:1420` |
| **Windows** | **Tested** (Core & Web; Tauri CI build) | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` |
| **macOS / Linux** | **CI Build** | Configured in `.github/workflows/release.yml` via Tauri v2 |

## Tech Stack

- **Core & Engine:** TypeScript 5.7+ (strict mode), Zod, `node:fs/promises`, `node:zlib`
- **UI:** React + Vite
- **Desktop Wrapper:** Tauri v2 (`src-tauri/`)
- **Testing & Quality:** Vitest (18 test files, 56 tests), ESLint, Prettier

## Development & Build

```bash
npm install
npm run dev          # Start UI preview at http://localhost:1420
npm run typecheck    # Strict TypeScript check
npm run lint         # ESLint checks
npm test             # Run Vitest unit & integration suite (56 tests)
npm run build        # Build production frontend bundle (dist/)
npm run tauri build  # Build native desktop executable (requires Rust)
```

## Companion Project

- [Stardew Valley Mod Manager (SVMM)](https://github.com/smanedn/stardew_mod_manager) — Manage modpacks, switch profiles instantly, check updates, and launch SMAPI.
