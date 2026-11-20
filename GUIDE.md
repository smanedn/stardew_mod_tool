# Beginner's Guide: Create Your First Stardew Valley Mod

Welcome to **Stardew Valley Mod Creator - by Smane**! You don't need any coding experience to make your own mod.

## Step 1: Start the App
1. Open the app (or run `npm run dev` and open `http://localhost:1420`).
2. Follow the **Interactive Mod Tutorial** at the top of the screen—or pick any card under **"What do you want to create today?"**:
   - **Add a New Item** (food, fruit, mineral, artisan good)
   - **Add a New Crop** (seasonal seeds & growth stages)
   - **Repaint a Sprite** (retexture tools, animals, furniture, or objects)
   - **Change Villager Chat** (custom daily, seasonal, or marriage dialogue)

## Step 2: Fill Out Your Mod (Simple Mode)
By default, the app opens in **Simple Mode** with 7 clear steps:
1. **1. Mod Info:** Enter your **Mod Title**, **Your Name**, and a short description.
2. **2. New Items:** Add items, set their gold price, choose whether the player can eat them, and optionally add a cooking/crafting recipe.
3. **3. Crops:** Pick seasons (`Spring`, `Summer`, `Fall`, `Winter`) and days per growth stage.
4. **4. Villager Chat:** Pick a villager (like Abigail) and use the quick-insert buttons (**Player Name**, **Happy Portrait**, **New Dialogue Box**) to write lines.
5. **5. Sprites:** Pick a vanilla sprite from the gallery and upload your replacement `.png` image.
6. **6. Draw Sprite:** Sketch or touch up `16x16`, `16x32`, or `32x32` pixel art directly in the browser and download your `.png`.
7. **7. Preview & Export:** See how your item and dialogue look in-game, then click **Download My Mod Files** to save `manifest.json` and `content.json`.

> **Tip:** Made a mistake? Press `Ctrl+Z` to Undo or `Ctrl+Y` to Redo at any time!

## Step 3: Install Your Mod in Stardew Valley
1. Make sure **SMAPI** and **Content Patcher** are installed in your game.
2. Open your `Stardew Valley/Mods/` folder.
3. Create a new folder (for example, `[CP] My First Mod`).
4. Move the downloaded `manifest.json` and `content.json` (and any `assets/` `.png` files) into that folder.
5. Launch Stardew Valley via SMAPI and enjoy your mod!

## Optional: Advanced Mode
Click **Advanced Mode** in the top bar anytime to unlock:
- **Config (GMCM):** In-game settings compatible with *Generic Mod Config Menu*.
- **Translations (`i18n`):** Multi-language translation tables (`it.json`, `es.json`, etc.).
- **Test in Game:** SMAPI console log monitor highlighting mod errors.
- **Live Code Inspector:** Read-only live view of the generated `content.json` and `manifest.json`.
