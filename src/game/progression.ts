// ---------------------------------------------------------------------------
// Tale Tail Solitaire — Progression System (Phase 4)
// Ranks, XP, rank trials, and stake-tier unlocking.
// ---------------------------------------------------------------------------

import type { WagerMode } from "./contracts";

// ---------------------------------------------------------------------------
// Rank definitions
// ---------------------------------------------------------------------------

export type RankId = "mouse" | "fox" | "wolf" | "dragon";

export interface RankDef {
	id: RankId;
	label: string;
	unlockedStakeTiers: number[];
	xpRequired: number; // cumulative XP to reach this rank
}

export const RANKS: readonly RankDef[] = [
	{ id: "mouse",  label: "Mouse Table",  unlockedStakeTiers: [10, 25, 50],       xpRequired: 0 },
	{ id: "fox",    label: "Fox Table",     unlockedStakeTiers: [100],              xpRequired: 500 },
	{ id: "wolf",   label: "Wolf Table",    unlockedStakeTiers: [250, 500],         xpRequired: 2000 },
	{ id: "dragon", label: "Dragon Table",  unlockedStakeTiers: [1000],             xpRequired: 5000 },
];

// ---------------------------------------------------------------------------
// Rank Trial definitions
// ---------------------------------------------------------------------------

export type TrialCondition = "completeUnder" | "hitPI" | "consecutiveWins";

export interface TrialRequirement {
	mode: WagerMode;
	condition: TrialCondition;
	/** For completeUnder: seconds. For hitPI: PI threshold. For consecutiveWins: count. */
	value: number;
	/** How many times this requirement must be met. */
	count: number;
}

export interface RankTrial {
	targetRank: RankId;
	requirements: TrialRequirement[];
}

export const RANK_TRIALS: readonly RankTrial[] = [
	{
		targetRank: "fox",
		requirements: [
			{ mode: "classicClear", condition: "completeUnder", value: 240, count: 2 },
		],
	},
	{
		targetRank: "wolf",
		requirements: [
			{ mode: "classicClear", condition: "hitPI", value: 8000, count: 3 },
		],
	},
	{
		targetRank: "dragon",
		requirements: [
			{ mode: "classicClear", condition: "hitPI", value: 10000, count: 3 },
			{ mode: "classicClear", condition: "consecutiveWins", value: 3, count: 1 },
		],
	},
];

// ---------------------------------------------------------------------------
// Player progression state
// ---------------------------------------------------------------------------

export interface PlayerProgression {
	xp: number;
	rank: RankId;
	trialProgress: Record<string, number>; // "targetRank:reqIndex" → progress count
	winStreak: number;
}

export function createProgression(): PlayerProgression {
	return {
		xp: 0,
		rank: "mouse",
		trialProgress: {},
		winStreak: 0,
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getRankDef(rankId: RankId): RankDef {
	const def = RANKS.find((r) => r.id === rankId);
	if (!def) throw new Error(`Unknown rank: ${rankId}`);
	return def;
}

export function getRankIndex(rankId: RankId): number {
	return RANKS.findIndex((r) => r.id === rankId);
}

export function getNextRank(rankId: RankId): RankDef | null {
	const idx = getRankIndex(rankId);
	return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

/** Get all stake tiers unlocked at the given rank (cumulative). */
export function getUnlockedStakeTiers(rankId: RankId): number[] {
	const idx = getRankIndex(rankId);
	const tiers: number[] = [];
	for (let i = 0; i <= idx; i++) {
		tiers.push(...RANKS[i].unlockedStakeTiers);
	}
	return tiers.sort((a, b) => a - b);
}

export function isStakeUnlocked(rankId: RankId, stake: number): boolean {
	return getUnlockedStakeTiers(rankId).includes(stake);
}

/** Get the trial for promoting to the next rank, or null if at max rank. */
export function getTrialForNextRank(rankId: RankId): RankTrial | null {
	const next = getNextRank(rankId);
	if (!next) return null;
	return RANK_TRIALS.find((t) => t.targetRank === next.id) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations (immutable)
// ---------------------------------------------------------------------------

export function addXP(prog: PlayerProgression, xp: number): PlayerProgression {
	return { ...prog, xp: prog.xp + xp };
}

/**
 * Record a wager run result for trial progress tracking.
 * Returns updated progression (may include rank-up if trial is complete).
 */
export function recordRunForTrial(
	prog: PlayerProgression,
	run: {
		mode: WagerMode;
		completed: boolean;
		timeSeconds: number;
		pi: number;
		profitable: boolean; // netCoins > 0
	}
): PlayerProgression {
	let updated = { ...prog, trialProgress: { ...prog.trialProgress } };

	// Update win streak
	updated.winStreak = run.profitable ? updated.winStreak + 1 : 0;

	const trial = getTrialForNextRank(updated.rank);
	if (!trial) return updated;

	// Check each requirement
	for (let i = 0; i < trial.requirements.length; i++) {
		const req = trial.requirements[i];
		if (req.mode !== run.mode) continue;

		const key = `${trial.targetRank}:${i}`;
		const current = updated.trialProgress[key] ?? 0;

		let met = false;
		switch (req.condition) {
			case "completeUnder":
				met = run.completed && run.timeSeconds < req.value;
				break;
			case "hitPI":
				met = run.pi >= req.value;
				break;
			case "consecutiveWins":
				// For consecutive wins, we check the streak
				met = updated.winStreak >= req.value;
				break;
		}

		if (met && current < req.count) {
			updated.trialProgress[key] = current + 1;
		}
	}

	// Check if trial is complete → rank up
	if (isTrialComplete(updated, trial)) {
		const next = getNextRank(updated.rank);
		if (next) {
			updated = { ...updated, rank: next.id };
		}
	}

	return updated;
}

function isTrialComplete(prog: PlayerProgression, trial: RankTrial): boolean {
	for (let i = 0; i < trial.requirements.length; i++) {
		const req = trial.requirements[i];
		const key = `${trial.targetRank}:${i}`;
		const current = prog.trialProgress[key] ?? 0;
		if (current < req.count) return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// Streak bonus
// ---------------------------------------------------------------------------

export const STREAK_BONUS_THRESHOLD = 3;
export const STREAK_BONUS_MULTIPLIER = 0.1; // 10% bonus

export function getStreakBonus(winStreak: number): number {
	return winStreak >= STREAK_BONUS_THRESHOLD ? STREAK_BONUS_MULTIPLIER : 0;
}

// ---------------------------------------------------------------------------
// Persistence (localStorage MVP)
// ---------------------------------------------------------------------------

const PROGRESSION_STORAGE_KEY = "taletail_progression";

const progKeyForPlayer = (playerId: string) => `taletail_progression:${playerId}`;

export function saveProgressionForPlayer(playerId: string, prog: PlayerProgression): void {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(progKeyForPlayer(playerId), JSON.stringify(prog));
	}
}

export function loadProgressionForPlayer(playerId: string): PlayerProgression {
	if (typeof localStorage === "undefined") {
		return createProgression();
	}

	const playerKey = progKeyForPlayer(playerId);
	const rawPlayer = localStorage.getItem(playerKey);

	if (rawPlayer) {
		try {
			return JSON.parse(rawPlayer) as PlayerProgression;
		} catch {
			// JSON parse error — return fresh progression
			return createProgression();
		}
	}

	// Migration: if player-specific key is missing, check the old global key.
	const rawGlobal = localStorage.getItem(PROGRESSION_STORAGE_KEY);
	if (rawGlobal) {
		try {
			const globalProg = JSON.parse(rawGlobal) as PlayerProgression;
			// Migrate immediately to player-scoped storage.
			saveProgressionForPlayer(playerId, globalProg);
			return globalProg;
		} catch {
			// Corrupted — return fresh progression.
		}
	}

	return createProgression();
}

