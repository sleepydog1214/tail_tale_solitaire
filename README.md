# Multiplayer Solitaire (Starter)

Vite + React + TypeScript + Tailwind + Firebase starter for a multiplayer 3-card-draw Klondike game.

## Local dev

1. Install deps
   - `npm install`

2. Create `.env` from `.env.example` and fill in Firebase config.

3. Start dev server
   - `npm run dev`

## Firebase

This repo includes:
- Firestore rules: `firestore.rules`
- Hosting config: `firebase.json` (serves `dist/`)
- Cloud Functions: `functions/`

## VS Code: run & debug

### Prereqs

- Install Node.js (use Node 20+ if possible).

### Run (dev server)

- VS Code: `Terminal` → `Run Task…` → `npm: dev`
- Browser: open `http://localhost:5173`

### Debug (breakpoints in TS/TSX)

- VS Code: `Run and Debug` → `Debug Vite App (Chrome)`

This uses the workspace configs in `.vscode/launch.json` and `.vscode/tasks.json`.

### Other useful tasks

- `npm: typecheck`
- `npm: build`
- `npm: preview`
- `functions: build` (builds Firebase Functions TypeScript)

## Scripts

- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run typecheck` - TypeScript typecheck
- `npm run test` - Unit/UI tests (Vitest)
- `npm run electron:dev` - Build and launch in Electron (quick test)
- `npm run electron:start` - Launch Electron using an existing `dist/` build
- `npm run electron:build` - Build and package as a Windows .exe installer
- `npm run android:sync` - Build web assets and sync them into the Android project
- `npm run android:open` - Open the native Android project in Android Studio
- `npm run android:build` - Build a debug Android APK via Gradle

## Electron desktop app

### Quick launch (no installer)

1. `npm run build` — builds the Vite app into `dist/`.
2. `npm run electron:start` — opens the app in an Electron window.

Or combine both steps: `npm run electron:dev`

### Build a Windows .exe installer

```bash
npm run electron:build
```

The installer is written to the `release/` folder.

### How it works

- `electron/main.js` creates a `BrowserWindow` that loads `dist/index.html`.
- The React `GameWindow` component sets `document.title` per screen, and Electron
  automatically reflects that in the native OS title bar.
- In dev mode you can set `VITE_DEV_SERVER_URL=http://localhost:5173` before
  running `electron .` to load from the Vite dev server with hot-reload.

### IntelliJ / WebStorm: run & debug the Electron app

#### Run configuration (launch the app)

1. **Run → Edit Configurations… → + → npm**
2. Set **Command** to `run`, **Scripts** to `electron:dev`.
3. Click **OK**, then run this configuration from the toolbar.

#### Debug configuration (breakpoints in main process)

1. **Run → Edit Configurations… → + → Node.js**
2. Set **Node interpreter** to the Electron executable:
   `node_modules\electron\dist\electron.exe`
3. Set **JavaScript file** to `electron/main.js`.
4. Under **Before launch**, add an **npm** task: command `run`, script `build`.
5. Click **OK**, then **Debug** (Shift+F9) to hit breakpoints in `electron/main.js`.

#### Debug configuration (breakpoints in renderer / React code)

1. Launch the Vite dev server: `npm run dev`.
2. **Run → Edit Configurations… → + → JavaScript Debug**
3. Set **URL** to `http://localhost:5173`.
4. Run the Electron app with `VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .`
   (or create a **Shell Script** run config for this command).
5. Use the JavaScript Debug config to attach the IDE debugger — you can now
   set breakpoints in `.tsx` / `.ts` files.

### VS Code: run & debug the Electron app

Add the following to `.vscode/launch.json`:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "cwd": "${workspaceFolder}",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*"]
    }
  ]
}
```

Then press **F5** to build and launch Electron with the debugger attached.

## Android build (Capacitor)

Android support is now wired through Capacitor with native project files in `android/`.

### Build steps

1. `npm run android:sync` to build `dist/` and copy web assets into Android.
2. `npm run android:build` to produce a debug APK (`android/app/build/outputs/apk/debug/`).
3. Optionally run `npm run android:open` to open the project in Android Studio.

## App flow

- Home screen: "Tail Tale Solitaire" + "New Game"
- In game: "Finish" ends the run
- After finish: controls swap to "Home" + "New Game"

## Building as Windows 11 Packaged App (MSIX)

The app is now configured as a Progressive Web App (PWA) and can be packaged as a native-feeling MSIX app for Windows 11 using [PWABuilder](https://www.pwabuilder.com/) (Microsoft's official tool).

### Steps to generate MSIX:

1. `npm run build` — produces `dist/`.

2. Serve `dist/` locally:
   ```
   npx serve -s dist
   ```
   (install serve: `npm i -g serve`)

   Or use `npm run preview`.

3. Open [PWABuilder.com](https://www.pwabuilder.com/), paste your app URL (e.g. `http://localhost:4173`).

4. Review & fix any warnings (e.g. generate better icons using PWABuilder tools).

5. Click "Build My PWA for Windows" → Generate & download `.msixbundle`.

6. Double-click the MSIX to install (enable Developer Mode / sideloading in Windows Settings > Privacy & security > For developers).
