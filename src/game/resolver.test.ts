import { describe, expect, it } from "vitest";
import { CLASSIC_CLEAR_5MIN, SCORE_TARGET_5MIN } from "./contracts";
import { resolveWager, type RunSummary } from "./resolver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(overrides: Partial<RunSummary> = {}): RunSummary {
	return {
		completed: overrides.completed ?? true,
		pi: overrides.pi ?? 0,
		timeMs: overrides.timeMs ?? 180_000,
		hintCount: overrides.hintCount ?? 0,
	};
}

const CC = CLASSIC_CLEAR_5MIN; // shorthand
const ST = SCORE_TARGET_5MIN;

// ---------------------------------------------------------------------------
// Classic Clear — outcome brackets for stake 10
// Thresholds: partial=3000, pass=6000, great=8000, exceptional=10000
// Payouts: fail=0, partial=0.3, pass=1.4, great=2.0, exceptional=2.8
// ---------------------------------------------------------------------------

describe("Bet Resolver — Classic Clear", () => {
	describe("Outcome brackets (stake 10, completed)", () => {
		it("fail: PI below partial threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 2999 }));
			expect(r.outcome).toBe("fail");
			expect(r.payoutCoins).toBe(0);
			expect(r.netCoins).toBe(-10);
			expect(r.xp).toBe(5);
		});

		it("partial: PI exactly at partial threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 3000 }));
			expect(r.outcome).toBe("partial");
			expect(r.payoutCoins).toBe(3); // floor(10 * 0.3)
			expect(r.netCoins).toBe(-7);
			expect(r.xp).toBe(15);
		});

		it("pass: PI exactly at pass threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 6000 }));
			expect(r.outcome).toBe("pass");
			expect(r.payoutCoins).toBe(14); // floor(10 * 1.4)
			expect(r.netCoins).toBe(4);
			expect(r.xp).toBe(30);
		});

		it("great: PI exactly at great threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 8000 }));
			expect(r.outcome).toBe("great");
			expect(r.payoutCoins).toBe(20); // floor(10 * 2.0)
			expect(r.netCoins).toBe(10);
			expect(r.xp).toBe(50);
		});

		it("exceptional: PI exactly at exceptional threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 10000 }));
			expect(r.outcome).toBe("exceptional");
			expect(r.payoutCoins).toBe(28); // floor(10 * 2.8)
			expect(r.netCoins).toBe(18);
			expect(r.xp).toBe(100);
		});

		it("exceptional: PI well above exceptional threshold", () => {
			const r = resolveWager(CC, 10, run({ pi: 15000 }));
			expect(r.outcome).toBe("exceptional");
		});
	});

	describe("Not-completed caps at partial (Classic Clear)", () => {
		it("high PI but not completed → partial", () => {
			const r = resolveWager(CC, 10, run({ completed: false, pi: 9000 }));
			expect(r.outcome).toBe("partial");
		});

		it("high PI but not completed → never gets pass/great/exceptional", () => {
			const r = resolveWager(CC, 10, run({ completed: false, pi: 20000 }));
			expect(r.outcome).toBe("partial");
		});

		it("low PI and not completed → fail", () => {
			const r = resolveWager(CC, 10, run({ completed: false, pi: 2000 }));
			expect(r.outcome).toBe("fail");
		});
	});

	describe("Higher stake tiers (stake 1000)", () => {
		// Thresholds: partial=6000, pass=9000, great=11000, exceptional=13000
		it("fail at higher tier requires more PI", () => {
			const r = resolveWager(CC, 1000, run({ pi: 5999 }));
			expect(r.outcome).toBe("fail");
			expect(r.payoutCoins).toBe(0);
			expect(r.netCoins).toBe(-1000);
		});

		it("exceptional at stake 1000", () => {
			const r = resolveWager(CC, 1000, run({ pi: 13000 }));
			expect(r.outcome).toBe("exceptional");
			expect(r.payoutCoins).toBe(2800); // floor(1000 * 2.8)
			expect(r.netCoins).toBe(1800);
		});
	});

	describe("Hint penalties", () => {
		it("one hint reduces PI by 400", () => {
			// PI 6200 with 1 hint → adjusted 5800 → below pass(6000) → partial
			const r = resolveWager(CC, 10, run({ pi: 6200, hintCount: 1 }));
			expect(r.outcome).toBe("partial");
		});

		it("hints can push outcome from pass to fail", () => {
			// PI 3400 with 1 hint → adjusted 3000 → partial (barely)
			const r1 = resolveWager(CC, 10, run({ pi: 3400, hintCount: 1 }));
			expect(r1.outcome).toBe("partial");

			// PI 3400 with 2 hints → adjusted 2600 → fail
			const r2 = resolveWager(CC, 10, run({ pi: 3400, hintCount: 2 }));
			expect(r2.outcome).toBe("fail");
		});

		it("many hints can make adjusted PI negative → fail", () => {
			const r = resolveWager(CC, 10, run({ pi: 1000, hintCount: 10 }));
			expect(r.outcome).toBe("fail");
		});

		it("zero hints means no penalty", () => {
			const r = resolveWager(CC, 10, run({ pi: 6000, hintCount: 0 }));
			expect(r.outcome).toBe("pass");
		});
	});
});

// ---------------------------------------------------------------------------
// Score Target — completion not required
// ---------------------------------------------------------------------------

describe("Bet Resolver — Score Target", () => {
	describe("Outcome brackets (stake 10, not completed)", () => {
		// Thresholds: partial=3000, pass=5500, great=7500, exceptional=9500
		it("pass without completion", () => {
			const r = resolveWager(ST, 10, run({ completed: false, pi: 5500 }));
			expect(r.outcome).toBe("pass");
			expect(r.payoutCoins).toBe(13); // floor(10 * 1.3)
			expect(r.netCoins).toBe(3);
		});

		it("exceptional without completion", () => {
			const r = resolveWager(ST, 10, run({ completed: false, pi: 9500 }));
			expect(r.outcome).toBe("exceptional");
			expect(r.payoutCoins).toBe(24); // floor(10 * 2.4)
			expect(r.netCoins).toBe(14);
		});

		it("fail when PI too low", () => {
			const r = resolveWager(ST, 10, run({ completed: false, pi: 2000 }));
			expect(r.outcome).toBe("fail");
		});
	});

	describe("Payout multipliers differ from Classic Clear", () => {
		it("partial payout is 0.5x (vs 0.3x in CC)", () => {
			const r = resolveWager(ST, 100, run({ pi: 4500 }));
			expect(r.outcome).toBe("partial");
			expect(r.payoutCoins).toBe(50); // floor(100 * 0.5)
		});
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Bet Resolver — Edge cases", () => {
	it("zero stake returns fail with zero payout", () => {
		const r = resolveWager(CC, 0, run({ pi: 20000 }));
		expect(r.outcome).toBe("fail");
		expect(r.payoutCoins).toBe(0);
		expect(r.netCoins).toBe(0);
	});

	it("negative stake returns fail with zero payout", () => {
		const r = resolveWager(CC, -5, run({ pi: 20000 }));
		expect(r.outcome).toBe("fail");
		expect(r.payoutCoins).toBe(0);
		expect(r.netCoins).toBe(0);
	});

	it("throws for undefined stake tier", () => {
		expect(() => resolveWager(CC, 999, run({ pi: 10000 }))).toThrow(
			"No thresholds defined for stake 999"
		);
	});

	it("PI exactly at threshold boundary (pass=6000)", () => {
		const r = resolveWager(CC, 10, run({ pi: 6000 }));
		expect(r.outcome).toBe("pass");
	});

	it("PI one below threshold boundary (pass=6000)", () => {
		const r = resolveWager(CC, 10, run({ pi: 5999 }));
		expect(r.outcome).toBe("partial");
	});

	it("payout is floored (no fractional coins)", () => {
		// stake=25, pass multiplier=1.4 → 25*1.4=35 (exact, but test with partial)
		// stake=25, partial=0.3 → 25*0.3=7.5 → floor=7
		const r = resolveWager(CC, 25, run({ pi: 3500 }));
		expect(r.outcome).toBe("partial");
		expect(r.payoutCoins).toBe(7); // floor(25 * 0.3) = 7
	});
});
