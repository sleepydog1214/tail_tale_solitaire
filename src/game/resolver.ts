// ---------------------------------------------------------------------------
// Tale Tail Solitaire — Bet Resolver (Phase 3)
// Pure, deterministic function that resolves a wager into an outcome + payout.
// ---------------------------------------------------------------------------

import type { Contract, OutcomeLabel } from "./contracts";

export interface RunSummary {
	completed: boolean;
	pi: number;
	timeMs: number;
	hintCount: number;
}

export interface WagerResult {
	outcome: OutcomeLabel;
	payoutCoins: number;
	netCoins: number;
	xp: number;
}

const XP_BY_OUTCOME: Record<OutcomeLabel, number> = {
	fail: 5,
	partial: 15,
	pass: 30,
	great: 50,
	exceptional: 100,
};

const HINT_PENALTY_PI = 400;

/**
 * Resolve a wager: given a contract, the chosen stake, and the run summary,
 * produce a deterministic WagerResult.
 *
 * Rules:
 *  - Hint penalty: adjustedPI = pi - (hintCount * 400)
 *  - For classicClear mode: if not completed, max outcome is "partial"
 *  - Outcome determined by PI vs. stake-tier thresholds
 *  - payoutCoins = floor(stake * multiplier)
 *  - netCoins = payoutCoins - stake
 */
export function resolveWager(
	contract: Contract,
	stake: number,
	run: RunSummary
): WagerResult {
	if (stake <= 0) {
		return { outcome: "fail", payoutCoins: 0, netCoins: 0, xp: XP_BY_OUTCOME.fail };
	}

	const thresholds = contract.thresholds[stake];
	if (!thresholds) {
		throw new Error(`No thresholds defined for stake ${stake} in contract ${contract.id}`);
	}

	const adjustedPI = run.pi - run.hintCount * HINT_PENALTY_PI;

	let outcome: OutcomeLabel = "fail";

	if (contract.mode === "classicClear") {
		// Classic Clear: completion required for pass+
		if (run.completed) {
			outcome = determineOutcome(adjustedPI, thresholds);
		} else {
			// Not completed — max outcome is "partial"
			if (adjustedPI >= thresholds.partial) {
				outcome = "partial";
			} else {
				outcome = "fail";
			}
		}
	} else {
		// scoreTarget: completion not required for any outcome
		outcome = determineOutcome(adjustedPI, thresholds);
	}

	const multiplier = contract.payouts[outcome];
	const payoutCoins = Math.floor(stake * multiplier);
	const netCoins = payoutCoins - stake;
	const xp = XP_BY_OUTCOME[outcome];

	return { outcome, payoutCoins, netCoins, xp };
}

function determineOutcome(
	adjustedPI: number,
	thresholds: { partial: number; pass: number; great: number; exceptional: number }
): OutcomeLabel {
	if (adjustedPI >= thresholds.exceptional) return "exceptional";
	if (adjustedPI >= thresholds.great) return "great";
	if (adjustedPI >= thresholds.pass) return "pass";
	if (adjustedPI >= thresholds.partial) return "partial";
	return "fail";
}
