import { describe, expect, it } from "vitest";
import {
	ALL_CONTRACTS,
	CLASSIC_CLEAR_5MIN,
	SCORE_TARGET_5MIN,
	validateContract,
	type Contract,
} from "./contracts";

describe("Contract system", () => {
	describe("Built-in contracts pass validation", () => {
		it("CLASSIC_CLEAR_5MIN is valid", () => {
			expect(validateContract(CLASSIC_CLEAR_5MIN)).toEqual([]);
		});

		it("SCORE_TARGET_5MIN is valid", () => {
			expect(validateContract(SCORE_TARGET_5MIN)).toEqual([]);
		});

		it("all contracts in ALL_CONTRACTS are valid", () => {
			for (const c of ALL_CONTRACTS) {
				expect(validateContract(c)).toEqual([]);
			}
		});
	});

	describe("Contract structure", () => {
		it("CLASSIC_CLEAR_5MIN has correct mode and timer", () => {
			expect(CLASSIC_CLEAR_5MIN.mode).toBe("classicClear");
			expect(CLASSIC_CLEAR_5MIN.timerSeconds).toBe(300);
		});

		it("SCORE_TARGET_5MIN has correct mode and timer", () => {
			expect(SCORE_TARGET_5MIN.mode).toBe("scoreTarget");
			expect(SCORE_TARGET_5MIN.timerSeconds).toBe(300);
		});

		it("both contracts have 7 stake tiers", () => {
			expect(CLASSIC_CLEAR_5MIN.stakeTiers).toEqual([10, 25, 50, 100, 250, 500, 1000]);
			expect(SCORE_TARGET_5MIN.stakeTiers).toEqual([10, 25, 50, 100, 250, 500, 1000]);
		});

		it("wagered runs disallow undo", () => {
			expect(CLASSIC_CLEAR_5MIN.rules.undoAllowed).toBe(false);
			expect(SCORE_TARGET_5MIN.rules.undoAllowed).toBe(false);
		});

		it("thresholds increase with stake tier", () => {
			const tiers = CLASSIC_CLEAR_5MIN.stakeTiers;
			for (let i = 1; i < tiers.length; i++) {
				const prev = CLASSIC_CLEAR_5MIN.thresholds[tiers[i - 1]];
				const curr = CLASSIC_CLEAR_5MIN.thresholds[tiers[i]];
				expect(curr.partial).toBeGreaterThan(prev.partial);
				expect(curr.pass).toBeGreaterThan(prev.pass);
				expect(curr.great).toBeGreaterThan(prev.great);
				expect(curr.exceptional).toBeGreaterThan(prev.exceptional);
			}
		});
	});

	describe("Validation catches errors", () => {
		function makeValid(): Contract {
			return {
				id: "test",
				mode: "classicClear",
				timerSeconds: 300,
				rules: { undoAllowed: false, hintAllowed: true, drawMode: 3 },
				stakeTiers: [10, 50],
				thresholds: {
					10: { partial: 1000, pass: 2000, great: 3000, exceptional: 4000 },
					50: { partial: 1500, pass: 2500, great: 3500, exceptional: 4500 },
				},
				payouts: { fail: 0, partial: 0.3, pass: 1.4, great: 2.0, exceptional: 2.8 },
			};
		}

		it("rejects empty stake tiers", () => {
			const c = { ...makeValid(), stakeTiers: [] };
			const errs = validateContract(c);
			expect(errs.some((e) => e.field === "stakeTiers")).toBe(true);
		});

		it("rejects unsorted stake tiers", () => {
			const c = { ...makeValid(), stakeTiers: [50, 10] };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("sorted ascending"))).toBe(true);
		});

		it("rejects non-positive stake tiers", () => {
			const c = { ...makeValid(), stakeTiers: [0, 10] };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("must be positive"))).toBe(true);
		});

		it("rejects missing threshold entry for a stake tier", () => {
			const c = makeValid();
			delete (c.thresholds as Record<number, unknown>)[50];
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("Missing thresholds for stake 50"))).toBe(true);
		});

		it("rejects non-ascending thresholds (partial >= pass)", () => {
			const c = makeValid();
			c.thresholds[10] = { partial: 3000, pass: 2000, great: 4000, exceptional: 5000 };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("partial"))).toBe(true);
		});

		it("rejects non-ascending thresholds (pass >= great)", () => {
			const c = makeValid();
			c.thresholds[10] = { partial: 1000, pass: 4000, great: 3000, exceptional: 5000 };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("pass"))).toBe(true);
		});

		it("rejects non-ascending thresholds (great >= exceptional)", () => {
			const c = makeValid();
			c.thresholds[10] = { partial: 1000, pass: 2000, great: 5000, exceptional: 4000 };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("great"))).toBe(true);
		});

		it("rejects negative payout multiplier", () => {
			const c = makeValid();
			c.payouts = { ...c.payouts, partial: -0.5 };
			const errs = validateContract(c);
			expect(errs.some((e) => e.message.includes("non-negative"))).toBe(true);
		});

		it("rejects non-positive timer", () => {
			const c = { ...makeValid(), timerSeconds: 0 };
			const errs = validateContract(c);
			expect(errs.some((e) => e.field === "timerSeconds")).toBe(true);
		});
	});
});
