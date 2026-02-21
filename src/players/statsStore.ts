import type { GameState } from "../KlondikeGame";

export type GameMode = "practice" | "wager";

export type GameResult = {
  id: string;
  playerId: string;
  mode: GameMode;
  seed: string;
  startedAtMs: number;
  finishedAtMs: number;
  durationSeconds: number;
  won: boolean;
  score: number;
  moveCount?: number;
  contractId?: string;
  stake?: number;
  payoutCoins?: number;
};

export type PlayerStats = {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  bestScore: number | null;
  worstScore: number | null;
  fastestWinSeconds: number | null;
};

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const resultsKey = (playerId: string) => `tt_results_v1:${playerId}`;
const statsKey = (playerId: string) => `tt_stats_v1:${playerId}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substring(2);
}

function makeEmptyStats(playerId: string): PlayerStats {
  return {
    playerId,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    bestScore: null,
    worstScore: null,
    fastestWinSeconds: null,
  };
}

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function getPlayerStats(playerId: string): PlayerStats {
  if (typeof localStorage === "undefined") return makeEmptyStats(playerId);
  const raw = localStorage.getItem(statsKey(playerId));
  return safeParse(raw, makeEmptyStats(playerId));
}

export function getRecentResults(playerId: string, limit = 20): GameResult[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(resultsKey(playerId));
  const results = safeParse<GameResult[]>(raw, []);
  return results.slice(-limit).reverse(); // latest first
}

export function recordGameResult(result: GameResult): void {
  if (typeof localStorage === "undefined") return;

  const { playerId } = result;

  try {
    // 1. Update Results (cap at 200)
    const rawResults = localStorage.getItem(resultsKey(playerId));
    const results = safeParse<GameResult[]>(rawResults, []);
    results.push(result);
    if (results.length > 200) {
      results.shift();
    }
    localStorage.setItem(resultsKey(playerId), JSON.stringify(results));

    // 2. Update Stats incrementally
    const stats = getPlayerStats(playerId);
    
    stats.gamesPlayed++;
    if (result.won) {
      stats.wins++;
      if (stats.fastestWinSeconds === null || result.durationSeconds < stats.fastestWinSeconds) {
        stats.fastestWinSeconds = result.durationSeconds;
      }
    } else {
      stats.losses++;
    }

    if (stats.bestScore === null || result.score > stats.bestScore) {
      stats.bestScore = result.score;
    }
    if (stats.worstScore === null || result.score < stats.worstScore) {
      stats.worstScore = result.score;
    }

    localStorage.setItem(statsKey(playerId), JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to record game result", e);
  }
}
