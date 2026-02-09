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
- Cloud Functions: `functions/` (callable APIs for tournaments + payouts)

Typical flow:
- Client calls callable functions to create/join tournaments and submit final scores.
- Clients subscribe to `tournaments/{id}` and `tournaments/{id}/scores/*`.
- Functions start the match when `N` players joined and finalize/payout when it ends.

## Scripts
- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run typecheck` - TypeScript typecheck
