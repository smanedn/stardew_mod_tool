# Stardew Valley Mod Creator - by Smane

A visual, security-first studio for building **Stardew Valley** *Content Patcher* (SMAPI 4.0+) mods without writing raw JSON by hand.

## Architecture
- `src/core/` — Framework-independent engine, security, performance, parsers, validators, and SMAPI/game detection.
- `src/data/` — Strict TypeScript models for SMAPI `manifest.json`, Content Patcher 2.0+ `content.json`, `.sdvproj`, and Stardew Valley 1.6+ data.
- `src/ui/` — React + TypeScript visual editors, Stardew UI live preview, pixel-art quick touch-up canvas, i18n table, and 2-minute onboarding tutorial.
- `src-tauri/` — Tauri v2 desktop wrapper for native executables.

## Features
- **Security First:** Content Patcher-only policy (no arbitrary DLL execution), path traversal protection, strict Zod schemas, PNG/TMX/XNB magic-byte & size checks, and automatic `.backup/` snapshots.
- **Visual Modules:** Project Dashboard, Manifest & Config Editor, Custom Objects & Recipes, Crops & Seeds Wizard, Retexture Sprite Patcher, NPC Dialogue & Token Editor, GMCM `ConfigSchema` Builder, Pixel-Art Editor (`16x16` / `16x32` / `32x32`), and Multi-Language `i18n`.
- **Preview & Export:** In-Game Live Preview, Read-Only `content.json` Inspector, One-Click `Mods/` Exporter, Quick Launch SMAPI Log Monitor, and Nexus-ready `[CP]` `.zip` packaging.
- **Reliability:** Global `Ctrl+Z` / `Ctrl+Y` Undo/Redo and silent 2-minute SHA-256 crash recovery.

## Development & Build
```bash
npm install
npm run dev        # Start Vite UI preview at http://localhost:1420
npm run typecheck  # Strict TypeScript check
npm run lint       # ESLint checks
npm test           # Run Vitest unit & integration suite
npm run build      # Build production frontend bundle (dist/)
npm run tauri build # Build native desktop executable (requires Rust)
```
