# Stardew Valley Mod Creator - by Smane

A beginner-friendly, security-first visual studio for creating **Stardew Valley** *Content Patcher* (SMAPI 4.0+) mods—no coding required.

> New to modding? Read the step-by-step **[Beginner's Guide](GUIDE.md)**!

## Highlights
- **Beginner-Friendly Simple Mode (Default):** Guided 7-step workflow (`Mod Info` → `New Items` → `Crops` → `Villager Chat` → `Sprites` → `Draw Sprite` → `Preview & Export`) with plain-English labels and zero raw JSON clutter.
- **Advanced Mode (One Click Away):** Unlocks GMCM `ConfigSchema` builder, `i18n` translation tables, `Live Code Inspector`, `Test in Game` SMAPI log monitor, and `UniqueID`/`SemVer` controls.
- **Live In-Game Previews:** Every tab includes a real-time preview (Stardew inventory tooltip, NPC dialogue box with portrait mood, crop growth timeline, 4x pixel-art preview).
- **Interactive 2-Minute Tutorial:** Walks you through creating and downloading a working **Golden Starberry** mod.
- **Light & Dark Mode:** Toggleable theme persisted in `localStorage`.
- **Safety & Reliability:** Content Patcher-only policy (no arbitrary DLL execution), path traversal protection, Zod validation, PNG/TMX/XNB magic-byte & 32-bit RGBA checks, `.backup/` snapshots, global `Ctrl+Z` / `Ctrl+Y` Undo/Redo, and 2-minute auto-recovery.

## Architecture
- `src/core/` — Framework-independent engine, security, performance, parsers, validators, and SMAPI/game detection.
- `src/data/` — Strict TypeScript models for SMAPI `manifest.json`, Content Patcher 2.0+ `content.json`, `.sdvproj`, and Stardew Valley 1.6+ data.
- `src/ui/` — React + TypeScript visual editors, onboarding tutorial, and Stardew UI simulator.
- `src-tauri/` — Tauri v2 desktop wrapper for Windows, macOS, and Linux builds.

## Development & Build
```bash
npm install
npm run dev         # Start UI preview at http://localhost:1420
npm run typecheck   # Strict TypeScript check
npm run lint        # ESLint checks
npm test            # Run Vitest unit & integration suite (56 tests)
npm run build       # Build production frontend bundle (dist/)
npm run tauri build # Build native desktop executable (requires Rust)
```
