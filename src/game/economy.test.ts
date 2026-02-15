import { describe, expect, it } from "vitest";
import {
	createWallet,
	canAffordStake,
	isBankrupt,
	deductStake,
	addCoins,
	applyWagerPayout,
	grantDailyCoins,
	checkBankruptcy,
	STARTING_COINS,
	DAILY_GRANT_COINS,
	BANKRUPTCY_THRESHOLD,
	BANKRUPTCY_GRANT,
} from "./economy";

describe("Economy — Wallet", () => {
	it("creates wallet with starting coins", () => {
		const w = createWallet();
		expect(w.coins).toBe(STARTING_COINS);
		expect(w.lastDailyGrantDate).toBeNull();
		expect(w.lastBankruptcyDate).toBeNull();
	});

	describe("canAffordStake", () => {
		it("can afford when coins >= stake", () => {
			const w = createWallet();
			expect(canAffordStake(w, 100)).toBe(true);
			expect(canAffordStake(w, STARTING_COINS)).toBe(true);
		});

		it("cannot afford when coins < stake", () => {
			const w = createWallet();
			expect(canAffordStake(w, STARTING_COINS + 1)).toBe(false);
		});

		it("cannot afford zero or negative stake", () => {
			const w = createWallet();
			expect(canAffordStake(w, 0)).toBe(false);
			expect(canAffordStake(w, -10)).toBe(false);
		});
	});

	describe("isBankrupt", () => {
		it("not bankrupt with starting coins", () => {
			expect(isBankrupt(createWallet())).toBe(false);
		});

		it("bankrupt below threshold", () => {
			expect(isBankrupt({ coins: BANKRUPTCY_THRESHOLD - 1, lastDailyGrantDate: null, lastBankruptcyDate: null })).toBe(true);
		});

		it("not bankrupt at exactly threshold", () => {
			expect(isBankrupt({ coins: BANKRUPTCY_THRESHOLD, lastDailyGrantDate: null, lastBankruptcyDate: null })).toBe(false);
		});
	});

	describe("deductStake", () => {
		it("deducts correctly", () => {
			const w = deductStake(createWallet(), 100);
			expect(w.coins).toBe(STARTING_COINS - 100);
		});

		it("throws if cannot afford", () => {
			expect(() => deductStake(createWallet(), STARTING_COINS + 1)).toThrow("Cannot afford");
		});
	});

	describe("addCoins", () => {
		it("adds coins", () => {
			const w = addCoins(createWallet(), 500);
			expect(w.coins).toBe(STARTING_COINS + 500);
		});
	});

	describe("applyWagerPayout", () => {
		it("adds payout coins back to wallet", () => {
			let w = deductStake(createWallet(), 100); // 900
			w = applyWagerPayout(w, 140, 100); // won 1.4x
			expect(w.coins).toBe(1040);
		});

		it("losing wager: payout is 0", () => {
			let w = deductStake(createWallet(), 100); // 900
			w = applyWagerPayout(w, 0, 100); // lost
			expect(w.coins).toBe(900);
		});
	});
});

describe("Economy — Daily grant", () => {
	it("grants coins on first daily call", () => {
		const [w, granted] = grantDailyCoins(createWallet(), "2026-02-15");
		expect(granted).toBe(true);
		expect(w.coins).toBe(STARTING_COINS + DAILY_GRANT_COINS);
		expect(w.lastDailyGrantDate).toBe("2026-02-15");
	});

	it("does not grant twice on same day", () => {
		const [w1] = grantDailyCoins(createWallet(), "2026-02-15");
		const [w2, granted2] = grantDailyCoins(w1, "2026-02-15");
		expect(granted2).toBe(false);
		expect(w2.coins).toBe(w1.coins);
	});

	it("grants again on a new day", () => {
		const [w1] = grantDailyCoins(createWallet(), "2026-02-15");
		const [w2, granted2] = grantDailyCoins(w1, "2026-02-16");
		expect(granted2).toBe(true);
		expect(w2.coins).toBe(w1.coins + DAILY_GRANT_COINS);
	});
});

describe("Economy — Bankruptcy protection", () => {
	it("bails out when below threshold", () => {
		const w = { coins: 5, lastDailyGrantDate: null, lastBankruptcyDate: null };
		const [bailed, didBail] = checkBankruptcy(w, "2026-02-15");
		expect(didBail).toBe(true);
		expect(bailed.coins).toBe(BANKRUPTCY_GRANT);
		expect(bailed.lastBankruptcyDate).toBe("2026-02-15");
	});

	it("does not bail out if already bailed today", () => {
		const w = { coins: 5, lastDailyGrantDate: null, lastBankruptcyDate: "2026-02-15" };
		const [bailed, didBail] = checkBankruptcy(w, "2026-02-15");
		expect(didBail).toBe(false);
		expect(bailed.coins).toBe(5);
	});

	it("bails out again on a new day", () => {
		const w = { coins: 3, lastDailyGrantDate: null, lastBankruptcyDate: "2026-02-15" };
		const [bailed, didBail] = checkBankruptcy(w, "2026-02-16");
		expect(didBail).toBe(true);
		expect(bailed.coins).toBe(BANKRUPTCY_GRANT);
	});

	it("does not bail out if above threshold", () => {
		const w = { coins: 100, lastDailyGrantDate: null, lastBankruptcyDate: null };
		const [bailed, didBail] = checkBankruptcy(w, "2026-02-15");
		expect(didBail).toBe(false);
		expect(bailed.coins).toBe(100);
	});
});
