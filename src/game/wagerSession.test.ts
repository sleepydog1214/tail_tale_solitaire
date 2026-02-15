import { describe, expect, it } from "vitest";
import { CLASSIC_CLEAR_5MIN } from "./contracts";
import { createWallet } from "./economy";
import { createProgression } from "./progression";
import type { GameState } from "../KlondikeGame";
import { beginWager, buildRunSummary, completeWager } from "./wagerSession";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinalState(overrides: Partial<GameState> = {}): GameState {
	return {
		seed: "test-seed",
		startedAtMs: 1000,
		finishedAtMs: 181000,
		matchDurationSeconds: 300,
		timeElapsedSeconds: 180,
		timeRemainingSeconds: 120,
		score: {
			baseScore: 5620,
			timeBonus: 2248,
			efficiencyBonus: 500,
			totalScore: 8368,
		},
		moveCount: 100,
		columnClears: 3,
		stock: [],
		waste: [],
		foundations: {
			H: Array.from({ length: 13 }, (_, i) => ({ id: `${i}H`, suit: "H" as const, rank: (i + 1) as any, faceUp: true })),
			D: Array.from({ length: 13 }, (_, i) => ({ id: `${i}D`, suit: "D" as const, rank: (i + 1) as any, faceUp: true })),
			C: Array.from({ length: 13 }, (_, i) => ({ id: `${i}C`, suit: "C" as const, rank: (i + 1) as any, faceUp: true })),
			S: Array.from({ length: 13 }, (_, i) => ({ id: `${i}S`, suit: "S" as const, rank: (i + 1) as any, faceUp: true })),
		},
		tableau: [[], [], [], [], [], [], []],
		lastMove: null,
		...overrides,
	};
}

function makeIncompleteState(): GameState {
	return makeFinalState({
		score: { baseScore: 2000, timeBonus: 0, efficiencyBonus: 0, totalScore: 2000 },
		foundations: { H: [], D: [], C: [], S: [] },
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Wager Session — beginWager", () => {
	it("deducts stake from wallet", () => {
		const w = createWallet(); // 1000 coins
		const updated = beginWager(w, 100);
		expect(updated.coins).toBe(900);
	});

	it("throws if cannot afford", () => {
		const w = createWallet();
		expect(() => beginWager(w, 2000)).toThrow();
	});
});

describe("Wager Session — buildRunSummary", () => {
	it("detects completed game", () => {
		const summary = buildRunSummary(makeFinalState());
		expect(summary.completed).toBe(true);
		expect(summary.pi).toBe(8368);
		expect(summary.timeMs).toBe(180000);
		expect(summary.hintCount).toBe(0);
	});

	it("detects incomplete game", () => {
		const summary = buildRunSummary(makeIncompleteState());
		expect(summary.completed).toBe(false);
	});

	it("passes hint count through", () => {
		const summary = buildRunSummary(makeFinalState(), 3);
		expect(summary.hintCount).toBe(3);
	});
});

describe("Wager Session — completeWager", () => {
	it("resolves a winning wager and updates wallet + progression", () => {
		const wallet = { ...createWallet(), coins: 900 }; // already deducted 100
		const progression = createProgression();
		const selection = { contract: CLASSIC_CLEAR_5MIN, stake: 10 };

		// PI = 8368, completed, stake 10 → pass threshold is 6000, great is 8000 → great
		const result = completeWager(selection, makeFinalState(), wallet, progression);

		expect(result.wagerResult.outcome).toBe("great");
		expect(result.wagerResult.payoutCoins).toBe(20); // 10 * 2.0
		expect(result.updatedWallet.coins).toBe(920); // 900 + 20
		expect(result.updatedProgression.xp).toBe(50); // great XP
		expect(result.updatedProgression.winStreak).toBe(1);
	});

	it("resolves a losing wager", () => {
		const wallet = { ...createWallet(), coins: 900 };
		const progression = createProgression();
		const selection = { contract: CLASSIC_CLEAR_5MIN, stake: 10 };

		const result = completeWager(selection, makeIncompleteState(), wallet, progression);

		expect(result.wagerResult.outcome).toBe("fail"); // PI 2000, not completed, partial threshold 3000
		expect(result.wagerResult.payoutCoins).toBe(0);
		expect(result.updatedWallet.coins).toBe(900); // no payout
		expect(result.updatedProgression.winStreak).toBe(0);
	});

	it("includes PI breakdown", () => {
		const wallet = { ...createWallet(), coins: 900 };
		const progression = createProgression();
		const selection = { contract: CLASSIC_CLEAR_5MIN, stake: 10 };

		const result = completeWager(selection, makeFinalState(), wallet, progression, 2);

		expect(result.piBreakdown.baseScore).toBe(5620);
		expect(result.piBreakdown.timeBonus).toBe(2248);
		expect(result.piBreakdown.efficiencyBonus).toBe(500);
		expect(result.piBreakdown.hintPenalty).toBe(800);
		expect(result.piBreakdown.adjustedPI).toBe(8368 - 800);
	});

	it("applies streak bonus when streak >= 3", () => {
		const wallet = { ...createWallet(), coins: 900 };
		const progression = { ...createProgression(), winStreak: 3 }; // already at streak 3
		const selection = { contract: CLASSIC_CLEAR_5MIN, stake: 10 };

		const result = completeWager(selection, makeFinalState(), wallet, progression);

		expect(result.wagerResult.outcome).toBe("great");
		expect(result.streakBonusCoins).toBe(2); // floor(20 * 0.1) = 2
		expect(result.totalPayout).toBe(22); // 20 + 2
		expect(result.updatedWallet.coins).toBe(922); // 900 + 22
	});

	it("no streak bonus on a loss", () => {
		const wallet = { ...createWallet(), coins: 900 };
		const progression = { ...createProgression(), winStreak: 5 };
		const selection = { contract: CLASSIC_CLEAR_5MIN, stake: 10 };

		const result = completeWager(selection, makeIncompleteState(), wallet, progression);

		expect(result.streakBonusCoins).toBe(0);
		expect(result.updatedProgression.winStreak).toBe(0); // reset
	});
});
