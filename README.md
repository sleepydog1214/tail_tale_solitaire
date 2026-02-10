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

## App flow

- Home screen: "Tail Tale Solitaire" + "New Game"
- In game: "Finish" ends the run
- After finish: controls swap to "Home" + "New Game"
