import { describe, expect, it } from "vitest";
import { KlondikeGame, type GameState, type PileRef } from "./KlondikeGame";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a game with a controllable clock. */
function createGame(
	seed: string,
	opts: { matchDurationSeconds?: number; turnCount?: 1 | 3; redealPenaltyPoints?: number } = {}
) {
	let clock = 1000;
	const now = () => clock;
	const advance = (ms: number) => {
		clock += ms;
	};
	const game = new KlondikeGame(seed, {
		matchDurationSeconds: opts.matchDurationSeconds ?? 300,
		turnCount: opts.turnCount ?? 1,
		redealPenaltyPoints: opts.redealPenaltyPoints ?? 0,
		now,
	});
	return { game, advance, now };
}

/** Find a face-up card in the tableau that can move to foundation. */
function findFoundationMove(state: GameState): { from: PileRef; to: PileRef } | null {
	for (let i = 0; i < 7; i++) {
		const pile = state.tableau[i];
		if (pile.length === 0) continue;
		const top = pile[pile.length - 1];
		if (!top.faceUp) continue;
		const fPile = state.foundations[top.suit];
		const needed = fPile.length === 0 ? 1 : fPile[fPile.length - 1].rank + 1;
		if (top.rank === needed) {
			return {
				from: { pile: "tableau", index: i },
				to: { pile: "foundation", suit: top.suit },
			};
		}
	}
	return null;
}

/** Find a face-up card on waste that can move to foundation. */
function findWasteToFoundationMove(state: GameState): { from: PileRef; to: PileRef } | null {
	if (state.waste.length === 0) return null;
	const top = state.waste[state.waste.length - 1];
	const fPile = state.foundations[top.suit];
	const needed = fPile.length === 0 ? 1 : fPile[fPile.length - 1].rank + 1;
	if (top.rank === needed) {
		return {
			from: { pile: "waste" },
			to: { pile: "foundation", suit: top.suit },
		};
	}
	return null;
}

// ---------------------------------------------------------------------------
// Tests — Phase 1: Scoring & Event Enhancements
// ---------------------------------------------------------------------------

describe("KlondikeGame — Phase 1 Scoring Enhancements", () => {
	describe("GameState interface", () => {
		it("includes columnClears in the initial state", () => {
			const { game } = createGame("state-test");
			const state = game.deal();
			expect(state.columnClears).toBe(0);
		});

		it("includes efficiencyBonus in the score object", () => {
			const { game } = createGame("state-test");
			const state = game.deal();
			expect(state.score.efficiencyBonus).toBe(0);
		});

		it("totalScore equals baseScore before game is finished", () => {
			const { game } = createGame("state-test");
			const state = game.deal();
			expect(state.score.totalScore).toBe(state.score.baseScore);
			expect(state.score.timeBonus).toBe(0);
			expect(state.score.efficiencyBonus).toBe(0);
		});
	});

	describe("Column clear bonus (+50)", () => {
		it("awards +50 when a tableau column becomes empty", () => {
			// Seed "col-clear-1" with draw-1 — we manually play to empty a column.
			// Strategy: find a seed where column 0 (1 card) can be moved immediately.
			const { game } = createGame("col-clear-1");
			const state = game.deal();

			// Column 0 has exactly 1 face-up card. Moving it somewhere empties the column.
			const col0Card = state.tableau[0][0];
			expect(col0Card.faceUp).toBe(true);

			// Try to move it to foundation if it's an Ace
			if (col0Card.rank === 1) {
				const newState = game.moveCard(
					{ pile: "tableau", index: 0 },
					{ pile: "foundation", suit: col0Card.suit }
				);
				// Foundation move (+100) + column clear (+50) = 150
				expect(newState.score.baseScore).toBe(150);
				expect(newState.columnClears).toBe(1);
				return;
			}

			// Otherwise try to move it to another tableau column
			for (let i = 1; i < 7; i++) {
				const destPile = state.tableau[i];
				const destTop = destPile[destPile.length - 1];
				if (!destTop.faceUp) continue;

				const col0Suit = col0Card.suit;
				const col0Color = col0Suit === "H" || col0Suit === "D" ? "red" : "black";
				const destColor = destTop.suit === "H" || destTop.suit === "D" ? "red" : "black";

				if (col0Color !== destColor && col0Card.rank === destTop.rank - 1) {
					const newState = game.moveCard(
						{ pile: "tableau", index: 0 },
						{ pile: "tableau", index: i }
					);
					// Tableau-to-tableau move with column clear: +50 (no foundation bonus, no reveal since col is empty)
					expect(newState.score.baseScore).toBe(50);
					expect(newState.columnClears).toBe(1);
					return;
				}
			}

			// If the above didn't work with this seed, try a known-good approach:
			// Use a different seed that guarantees column 0's card is an ace.
			// We'll handle this in a deterministic test below.
		});

		it("awards column clear when moving only card from column 0 (deterministic search)", () => {
			// Try multiple seeds to find one where col 0 is an Ace (guaranteed movable)
			const seeds = ["ace-col0-1", "ace-col0-2", "ace-col0-3", "ace-test-4", "ace-test-5",
				"clear-1", "clear-2", "clear-3", "test-a", "test-b", "test-c", "test-d",
				"seed-1", "seed-2", "seed-3", "seed-4", "seed-5", "seed-6", "seed-7", "seed-8",
				"seed-9", "seed-10", "xx", "yy", "zz", "aa", "bb", "cc", "dd", "ee", "ff"];

			for (const seed of seeds) {
				const { game } = createGame(seed);
				const state = game.deal();
				const col0Card = state.tableau[0][0];

				if (col0Card.rank === 1) {
					// It's an Ace — move to foundation
					const newState = game.moveCard(
						{ pile: "tableau", index: 0 },
						{ pile: "foundation", suit: col0Card.suit }
					);
					expect(newState.score.baseScore).toBe(150); // 100 foundation + 50 column clear
					expect(newState.columnClears).toBe(1);
					expect(newState.lastMove!.pointsDelta).toBe(150);
					return;
				}
			}

			// If no seed produced an ace at col0, the test is inconclusive — but this is very unlikely
			// given 30 seeds (probability of ace at col0 is ~4/52 ≈ 7.7% per seed).
			throw new Error("No seed found with Ace at column 0 — expand seed list");
		});

		it("does not award column clear bonus when cards remain in column", () => {
			const { game } = createGame("no-clear-test");
			const state = game.deal();

			// Column 1 has 2 cards, only top is face-up
			expect(state.tableau[1].length).toBe(2);
			const topCard = state.tableau[1][1];
			expect(topCard.faceUp).toBe(true);

			// Try to move the top card to foundation if it's an ace
			if (topCard.rank === 1) {
				const newState = game.moveCard(
					{ pile: "tableau", index: 1 },
					{ pile: "foundation", suit: topCard.suit }
				);
				// Foundation (+100) + reveal (+20) = 120, no column clear (1 card remains)
				expect(newState.score.baseScore).toBe(120);
				expect(newState.columnClears).toBe(0);
			}
		});
	});

	describe("Move efficiency bonus", () => {
		it("awards efficiency bonus on game finish based on move count", () => {
			const { game, advance } = createGame("efficiency-test", { matchDurationSeconds: 300 });
			game.deal();

			// Simulate finishing — use the finish() method directly
			// First make a few moves so moveCount > 0
			// The efficiency bonus = max(0, 200 - moveCount) * 5
			// With 0 extra moves and finish(), moveCount stays 0 → bonus = 200 * 5 = 1000
			advance(60_000); // 60 seconds elapsed
			const state = game.finish();

			expect(state.score.efficiencyBonus).toBe(1000); // max(0, 200 - 0) * 5
			expect(state.finishedAtMs).not.toBeNull();
		});

		it("efficiency bonus decreases with more moves", () => {
			const { game, advance } = createGame("eff-moves", { matchDurationSeconds: 300 });
			game.deal();

			// Make some draw-from-stock moves to increment moveCount
			// (drawFromStock doesn't count as moveCount increments — check if it does)
			// Actually, drawFromStock calls recordMove which increments moveCount.
			for (let i = 0; i < 10; i++) {
				game.drawFromStock();
			}

			advance(60_000);
			const state = game.finish();
			// moveCount = 10 from draws, efficiency = max(0, 200-10) * 5 = 950
			expect(state.moveCount).toBe(10);
			expect(state.score.efficiencyBonus).toBe(950);
		});

		it("efficiency bonus is zero when moveCount >= 200", () => {
			const { game, advance } = createGame("eff-high-moves", {
				matchDurationSeconds: 300,
				turnCount: 1,
			});
			game.deal();

			// Cycle through stock many times to accumulate 200+ moves
			for (let i = 0; i < 200; i++) {
				game.drawFromStock();
			}

			advance(60_000);
			const state = game.finish();
			expect(state.moveCount).toBeGreaterThanOrEqual(200);
			expect(state.score.efficiencyBonus).toBe(0);
		});

		it("efficiency bonus is not included before game is finished", () => {
			const { game } = createGame("eff-pre-finish");
			const state = game.deal();
			expect(state.score.efficiencyBonus).toBe(0);
			expect(state.score.totalScore).toBe(state.score.baseScore);
		});
	});

	describe("totalScore (PI) composition", () => {
		it("totalScore = baseScore + timeBonus + efficiencyBonus after finish", () => {
			const { game, advance } = createGame("pi-test", { matchDurationSeconds: 300 });
			game.deal();

			// Make 5 draws to set moveCount = 5
			for (let i = 0; i < 5; i++) {
				game.drawFromStock();
			}

			advance(120_000); // 120s elapsed → 180s remaining
			const state = game.finish();

			const expectedEfficiency = Math.max(0, 200 - state.moveCount) * 5;
			const expectedTimeBonus = Math.floor(
				state.score.baseScore * (state.timeRemainingSeconds / 300)
			);
			const expectedTotal = state.score.baseScore + expectedTimeBonus + expectedEfficiency;

			expect(state.score.efficiencyBonus).toBe(expectedEfficiency);
			expect(state.score.timeBonus).toBe(expectedTimeBonus);
			expect(state.score.totalScore).toBe(expectedTotal);
		});
	});

	describe("Foundation scoring (+100)", () => {
		it("awards +100 per card moved to foundation", () => {
			// Find a seed where we can move a card to foundation early
			const seeds = ["found-1", "found-2", "found-3", "found-4", "found-5",
				"fx-1", "fx-2", "fx-3", "fx-4", "fx-5", "fx-6", "fx-7", "fx-8"];

			for (const seed of seeds) {
				const { game } = createGame(seed);
				const state = game.deal();
				const move = findFoundationMove(state);

				if (move) {
					const scoreBefore = state.score.baseScore;
					const newState = game.moveCard(move.from, move.to);
					// At least +100 for foundation. May also get +20 reveal and/or +50 column clear.
					expect(newState.score.baseScore).toBeGreaterThanOrEqual(scoreBefore + 100);
					return;
				}
			}
		});
	});

	describe("Reveal scoring (+20)", () => {
		it("awards +20 when revealing a facedown card", () => {
			// Moving a card from a tableau column that has facedown cards beneath it
			// should award +20 for the reveal
			const seeds = ["rev-1", "rev-2", "rev-3", "rev-4", "rev-5",
				"rx-1", "rx-2", "rx-3", "rx-4", "rx-5", "rx-6"];

			for (const seed of seeds) {
				const { game } = createGame(seed);
				const state = game.deal();

				// Look for a move from tableau col with facedowns to another tableau col
				for (let i = 1; i < 7; i++) {
					const pile = state.tableau[i];
					if (pile.length < 2) continue;
					const topCard = pile[pile.length - 1];
					if (!topCard.faceUp) continue;

					// Check if the card below is facedown (meaning reveal will happen)
					const below = pile[pile.length - 2];
					if (below.faceUp) continue;

					// Try to move topCard to another tableau column
					for (let j = 0; j < 7; j++) {
						if (j === i) continue;
						const destPile = state.tableau[j];
						if (destPile.length === 0) {
							if (topCard.rank === 13) {
								const newState = game.moveCard(
									{ pile: "tableau", index: i },
									{ pile: "tableau", index: j }
								);
								expect(newState.score.baseScore).toBeGreaterThanOrEqual(20);
								return;
							}
							continue;
						}
						const destTop = destPile[destPile.length - 1];
						if (!destTop.faceUp) continue;
						const topColor = topCard.suit === "H" || topCard.suit === "D" ? "red" : "black";
						const destColor = destTop.suit === "H" || destTop.suit === "D" ? "red" : "black";
						if (topColor !== destColor && topCard.rank === destTop.rank - 1) {
							const newState = game.moveCard(
								{ pile: "tableau", index: i },
								{ pile: "tableau", index: j }
							);
							// Should include +20 for the reveal
							expect(newState.score.baseScore).toBeGreaterThanOrEqual(20);
							return;
						}
					}
				}
			}
		});
	});

	describe("Redeal penalty", () => {
		it("applies redeal penalty when stock is recycled", () => {
			const { game } = createGame("redeal-test", {
				turnCount: 1,
				redealPenaltyPoints: 20,
			});
			game.deal();

			// Draw all cards from stock first
			for (let i = 0; i < 24; i++) {
				game.drawFromStock();
			}
			// Now stock is empty, waste has cards — next draw redeals
			const stateBeforeRedeal = game.getState();
			expect(stateBeforeRedeal.stock.length).toBe(0);

			const stateAfterRedeal = game.drawFromStock();
			// Redeal penalty: -20
			expect(stateAfterRedeal.score.baseScore).toBe(stateBeforeRedeal.score.baseScore - 20);
		});
	});

	describe("State reset on new deal", () => {
		it("resets columnClears and efficiencyBonus on new deal", () => {
			const { game, advance } = createGame("reset-test");
			game.deal();
			advance(60_000);
			const finished = game.finish();
			expect(finished.score.efficiencyBonus).toBeGreaterThan(0);

			// New deal should reset everything
			const newState = game.deal();
			expect(newState.columnClears).toBe(0);
			expect(newState.score.efficiencyBonus).toBe(0);
			expect(newState.score.baseScore).toBe(0);
			expect(newState.score.timeBonus).toBe(0);
			expect(newState.moveCount).toBe(0);
		});
	});
});
