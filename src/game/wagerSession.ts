// ---------------------------------------------------------------------------
// Tale Tail Solitaire — Wager Session Orchestrator (Phase 5)
// Ties together contracts, resolver, economy, and progression into a
// single game lifecycle: select → play → resolve → update state.
// ---------------------------------------------------------------------------

import type { Contract } from "./contracts";
import type { RunSummary, WagerResult } from "./resolver";
import { resolveWager } from "./resolver";
import type { PlayerWallet } from "./economy";
import { deductStake, applyWagerPayout } from "./economy";
import type { PlayerProgression } from "./progression";
import { addXP, recordRunForTrial, getStreakBonus } from "./progression";
import type { GameState } from "../KlondikeGame";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WagerSelection {
	contract: Contract;
	stake: number;
}

export interface WagerSessionResult {
	wagerResult: WagerResult;
	streakBonusCoins: number;
	totalPayout: number;
	updatedWallet: PlayerWallet;
	updatedProgression: PlayerProgression;
	runSummary: RunSummary;
	piBreakdown: {
		baseScore: number;
		timeBonus: number;
		efficiencyBonus: number;
		hintPenalty: number;
		adjustedPI: number;
	};
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Deduct the stake from the wallet before starting the game.
 * Returns the updated wallet.
 */
export function beginWager(wallet: PlayerWallet, stake: number): PlayerWallet {
	return deductStake(wallet, stake);
}

/**
 * Build a RunSummary from the final GameState.
 */
export function buildRunSummary(
	finalState: GameState,
	hintCount: number = 0
): RunSummary {
	const completed =
		finalState.foundations.H.length === 13 &&
		finalState.foundations.D.length === 13 &&
		finalState.foundations.C.length === 13 &&
		finalState.foundations.S.length === 13;

	return {
		completed,
		pi: finalState.score.totalScore,
		timeMs: finalState.timeElapsedSeconds * 1000,
		hintCount,
	};
}

/**
 * Resolve the wager and update wallet + progression.
 * This is called after the game ends.
 */
export function completeWager(
	selection: WagerSelection,
	finalState: GameState,
	wallet: PlayerWallet,
	progression: PlayerProgression,
	hintCount: number = 0
): WagerSessionResult {
	const runSummary = buildRunSummary(finalState, hintCount);
	const wagerResult = resolveWager(selection.contract, selection.stake, runSummary);

	// Apply streak bonus
	const streakBonus = getStreakBonus(progression.winStreak);
	const streakBonusCoins =
		wagerResult.netCoins > 0 ? Math.floor(wagerResult.payoutCoins * streakBonus) : 0;
	const totalPayout = wagerResult.payoutCoins + streakBonusCoins;

	// Update wallet
	let updatedWallet = applyWagerPayout(wallet, totalPayout, selection.stake);

	// Update progression
	let updatedProgression = addXP(progression, wagerResult.xp);
	updatedProgression = recordRunForTrial(updatedProgression, {
		mode: selection.contract.mode,
		completed: runSummary.completed,
		timeSeconds: finalState.timeElapsedSeconds,
		pi: runSummary.pi,
		profitable: wagerResult.netCoins > 0,
	});

	const hintPenalty = hintCount * 400;
	const piBreakdown = {
		baseScore: finalState.score.baseScore,
		timeBonus: finalState.score.timeBonus,
		efficiencyBonus: finalState.score.efficiencyBonus,
		hintPenalty,
		adjustedPI: runSummary.pi - hintPenalty,
	};

	return {
		wagerResult,
		streakBonusCoins,
		totalPayout,
		updatedWallet,
		updatedProgression,
		runSummary,
		piBreakdown,
	};
}
