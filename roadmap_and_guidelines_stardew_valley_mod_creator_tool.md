# Roadmap and Guidelines: Stardew Valley Easy Mod Creator Tool

This document serves as the **Master Blueprint** to design, develop, and distribute a visual/guided tool for simplified mod creation in *Stardew Valley* (powered by SMAPI and Content Patcher), structured to be used as the primary context inside **Antigravity**.

## Part 1: Strict Architecture, Security, and Style Rules (System Rules)

These rules must be strictly enforced across every single module of the project. If an implementation violates any of these principles, it must be refactored immediately.

### 1. Security (Security First)

* **Zero Arbitrary Code Execution:** The tool must primarily generate *Content Patcher* packs (`manifest.json` and `content.json`) and static assets (`.png`, `.tmx`, `.xnb`). Avoid dynamic compilation of unverified C# DLLs.

* **Path Sanitization (Path Traversal Protection):** Any file path entered by the user or read from an existing project must be resolved and validated (`Path.GetFullPath` / `path.resolve`). Prevent any write operations outside the current project directory or the configured `Mods` folder.

* **Strict Input Validation (Schema Validation):** Every input entered into forms (mod IDs, versions, game targets, coordinates) must be validated via strict schemas (e.g., Zod for TypeScript or Pydantic for Python) before touching the file system.

* **Safe External Asset Handling:** When the user imports images or maps, verify the file's *magic bytes* (do not rely solely on the file extension) and enforce maximum file size limits to prevent Out-Of-Memory (OOM) crashes.

* **Automatic Backups:** Before overwriting any project file or exporting to the game directory, create a snapshot inside a temporary `.backup` folder.

### 2. Performance (Speed & Low Footprint)

* **Non-Blocking Asynchronous I/O:** All disk operations (reading game assets, writing JSON, generating sprites) must be strictly asynchronous to keep the user interface running smoothly at 60 FPS.

* **Lazy Loading and Virtualization:** Stardew Valley's item databases (IDs, sprites, dialogues) contain thousands of entries. Use virtualized lists in the UI and load textures into memory only when they are visible on screen.

* **Smart In-Memory Caching:** Index extracted game data (e.g., `Content/Data/Objects.json`) into a key-value structure (Hash Map / in-memory SQLite) at startup, avoiding repeated disk reads during searches.

* **Debounce on Auto-Save and Live Preview:** Form edits must not trigger disk writes on every keystroke. Apply a debounce of at least `300ms-500ms`.

### 3. Code Formatting and Simplicity (KISS & Clean Code)

* **KISS Principle (Keep It Simple, Stupid):** Always favor linear, readable solutions over complex abstractions. If a function exceeds 40 lines, split it into pure sub-functions.

* **Strict Typing:** The use of `any`, generic `object` types, or unsafe casts is strictly forbidden. Every Stardew Valley data structure (e.g., `Manifest`, `ContentPatch`, `ObjectData`) must have its own explicit interface/model.

* **Conventional and Descriptive Naming:**

  * Files and folders: `kebab-case` (e.g., `crop-editor.tsx`, `manifest-generator.ts`).

  * Classes, Types, Components: `PascalCase` (e.g., `ManifestSchema`, `SpritePreviewer`).

  * Functions and variables: `camelCase` using action verbs for functions (e.g., `validateUniqueId()`, `exportModPackage()`).

  * Global constants: `UPPER_SNAKE_CASE` (e.g., `MAX_SPRITE_SIZE_PX`).

* **Strict Separation of Concerns (UI vs. Core Logic):** The logic that generates JSONs, validates data, or manipulates images must never depend on the UI framework. It must reside in independent, unit-testable modules.

* **Automated Formatting:** Enforce strict linting rules (2-space indentation, single quotes, mandatory semicolons, trailing commas, maximum line length of 100 characters).

## Part 2: Complete 30-Step Roadmap

### Phase 1: Foundations, Architecture, and Setup (Steps 1 - 5)

1. **Tech Stack Definition and Repository Setup:**
   Initialize the project (recommended: Tauri + React/TypeScript for native performance and low RAM footprint, or Electron). Immediately configure the Linter, Formatter, and Strict Type-Checking according to Part 1 rules.

2. **Layered Architecture Design (Core vs. UI):**
   Create the folder structure separating `src/core` (mod generation engine, parsers, validators), `src/data` (Stardew Valley schemas and databases), and `src/ui` (graphical user interface).

3. **Game and SMAPI Detection System:**
   Implement an automatic scanner (with manual fallback) to locate the *Stardew Valley* installation directory (Steam, GOG, Xbox App) and verify the presence and version of SMAPI and Content Patcher.

4. **Vanilla Data Extractor and Indexer (Game Data Parser):**
   Develop a module that reads base game data files (or a pre-indexed JSON dump of version 1.6+) to populate the internal database with IDs for objects, crops, NPCs, recipes, and locations.

5. **Project File Format Definition (`.sdvproj`):**
   Create a proprietary yet human-readable JSON structure that saves the user's work state (metadata, list of edits, linked asset paths) prior to final compilation into SMAPI format.

### Phase 2: Content Patcher Core Engine (Steps 6 - 11)

 6. **`manifest.json` Schema Modeling:**
    Create data models and validators for SMAPI's `manifest.json` file, handling mandatory fields (`Name`, `Author`, `Version`, `UniqueID`, `ContentPackFor`) and optional dependencies.

 7. **`content.json` Schema Modeling (Content Patcher 2.0+):**
    Implement data structures for core Content Patcher actions: `EditData`, `EditImage`, `Load`, `Include`, as well as `DynamicTokens` and `When` conditions.

 8. **JSON Serialization Engine Construction:**
    Write the internal compiler that translates the `.sdvproj` project state into clean, well-formatted `manifest.json` and `content.json` files stripped of null or redundant properties.

 9. **Asset Management System and Safe Import:**
    Build the internal asset manager that copies user-imported `.png` images into the project's `assets/` folder, renaming them safely and verifying their dimensions and color format (32-bit RGBA).

10. **Automatic UniqueID and Versioning Generator:**
    Implement helpers that automatically generate valid `UniqueID` strings (e.g., `Author.ModName`), preventing illegal characters and handling automatic Semantic Versioning increments (`1.0.0`).

11. **Pre-Build Validation Engine (Mod Linter):**
    Create a system that analyzes the project prior to export to catch common errors: missing `.png` file references, duplicate IDs, non-existent game targets, or invalid JSON syntax.

### Phase 3: Visual Content Creation Modules (Steps 12 - 20)

12. **Main Interface and Project Dashboard:**
    Build the home screen to create a new project from templates (e.g., "New Object", "Retexture", "NPC Dialogue"), open recent projects, or import an existing Content Patcher mod for editing.

13. **Visual Manifest and Mod Configuration Editor:**
    Create a guided form to fill out the mod's name, description, author, version, and update keys (Nexus/ModDrop ID) with real-time validation.

14. **Module 1: Custom Objects Creator:**
    Develop a visual form to create brand-new items (food, materials, artifacts) by defining their name, description, sell price, category, edibility, and crafting/cooking recipes.

15. **Module 2: Crops & Seeds Creator:**
    Implement a dedicated wizard that automatically links the seed, the plant, growth stages, valid seasons, days to mature, and the final harvested crop.

16. **Module 3: Retexture and Sprite Replacement (Visual Patcher):**
    Create a visual tool where the user selects a vanilla sprite (e.g., a tool, animal, or piece of furniture) from a gallery, uploads their modified version, and the tool automatically calculates `ToArea` and `FromArea` coordinates for `EditImage`.

17. **Module 4: NPC Dialogue and Event Editor:**
    Build a block-based or rich-text editor to modify villager dialogues (daily, seasonal, marriage) with easy insertion of game tokens (e.g., `@` for the player's name, `$h` for the happy portrait expression).

18. **Module 5: In-Game Configurations (`config.json` & GMCM):**
    Allow mod creators to add customizable options (e.g., price multipliers, aesthetic toggles) by automatically generating the `ConfigSchema` compatible with *Generic Mod Config Menu*.

19. **Lightweight Integrated Pixel-Art Editor (Quick Touch-up):**
    Integrate a minimal canvas (16x16, 16x32, 32x32) with a pixel grid, eyedropper, and eraser to allow quick sprite edits without needing to open external software.

20. **Multi-Language Localization System (`i18n`):**
    Create a built-in translation table that automatically moves all entered text strings into `i18n/default.json` files and makes it easy to add additional languages (`it.json`, `es.json`, etc.).

### Phase 4: Preview, Testing, and Integration (Steps 21 - 25)

21. **In-Game Live Preview (Stardew Valley UI Simulator):**
    Develop a graphical component that displays in real time how the item will look inside Stardew Valley's inventory tooltip or how a dialogue box with an NPC portrait will render.

22. **Generated Code Inspector (Read-Only Live View):**
    Add an optional side panel (for advanced users or learning purposes) that shows the live `content.json` being generated as visual fields are filled out.

23. **One-Click Exporter and Mod Manager Integration:**
    Implement the build function that packages the ready-to-use mod and sends it directly to the game's `Mods` folder, or passes it via CLI/IPC to your existing Mod Manager for immediate activation.

24. **Quick Test Launch with SMAPI (Quick Launch):**
    Add a "Test in Game" button that launches SMAPI directly while monitoring the SMAPI console log in real time to highlight any red errors tied to the user's mod.

25. **Distribution Packaging (Export ZIP):**
    Create a function that generates a clean, properly structured `.zip` archive (with a properly named root folder), ready to be uploaded to Nexus Mods.

### Phase 5: Polish, Advanced Security, and Release (Steps 26 - 30)

26. **Global Undo/Redo Management (Command Pattern):**
    Implement a chronological action stack allowing users to undo (`Ctrl+Z`) and redo (`Ctrl+Y`) any changes made in forms or visual editors.

27. **Integrity Check and Recovery System:**
    Implement silent auto-saving every 2 minutes into a recovery file, ensuring zero data loss in the event of an unexpected crash or shutdown.

28. **Automated Test Suite (Unit & Integration Tests):**
    Write automated tests covering the entire `src/core` module: verify that every input produces valid JSON according to official Content Patcher specifications and that security checks block malicious inputs.

29. **Resource Optimization and Profiling:**
    Analyze RAM consumption and application startup times, compressing internal vanilla data databases and optimizing preview rendering.

30. **Built-in Documentation, Onboarding, and Final Build:**
    Create a short interactive first-launch tutorial ("Create your first mod in 2 minutes"), compile signed final executables for target operating systems, and prepare the release.