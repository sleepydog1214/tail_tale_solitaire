import { describe, expect, it } from "vitest";
import {
	createProgression,
	getRankDef,
	getNextRank,
	getUnlockedStakeTiers,
	isStakeUnlocked,
	getTrialForNextRank,
	addXP,
	recordRunForTrial,
	getStreakBonus,
	STREAK_BONUS_THRESHOLD,
	STREAK_BONUS_MULTIPLIER,
} from "./progression";

describe("Progression — Ranks", () => {
	it("starts at mouse rank", () => {
		const p = createProgression();
		expect(p.rank).toBe("mouse");
		expect(p.xp).toBe(0);
		expect(p.winStreak).toBe(0);
	});

	it("getRankDef returns correct rank", () => {
		expect(getRankDef("mouse").label).toBe("Mouse Table");
		expect(getRankDef("dragon").label).toBe("Dragon Table");
	});

	it("getNextRank returns next rank or null", () => {
		expect(getNextRank("mouse")!.id).toBe("fox");
		expect(getNextRank("fox")!.id).toBe("wolf");
		expect(getNextRank("dragon")).toBeNull();
	});
});

describe("Progression — Stake unlocking", () => {
	it("mouse unlocks tiers 10, 25, 50", () => {
		expect(getUnlockedStakeTiers("mouse")).toEqual([10, 25, 50]);
	});

	it("fox unlocks tiers 10, 25, 50, 100", () => {
		expect(getUnlockedStakeTiers("fox")).toEqual([10, 25, 50, 100]);
	});

	it("wolf unlocks up to 500", () => {
		expect(getUnlockedStakeTiers("wolf")).toEqual([10, 25, 50, 100, 250, 500]);
	});

	it("dragon unlocks all tiers", () => {
		expect(getUnlockedStakeTiers("dragon")).toEqual([10, 25, 50, 100, 250, 500, 1000]);
	});

	it("isStakeUnlocked checks correctly", () => {
		expect(isStakeUnlocked("mouse", 10)).toBe(true);
		expect(isStakeUnlocked("mouse", 100)).toBe(false);
		expect(isStakeUnlocked("fox", 100)).toBe(true);
		expect(isStakeUnlocked("fox", 250)).toBe(false);
	});
});

describe("Progression — XP", () => {
	it("addXP accumulates", () => {
		let p = createProgression();
		p = addXP(p, 100);
		expect(p.xp).toBe(100);
		p = addXP(p, 50);
		expect(p.xp).toBe(150);
	});
});

describe("Progression — Rank Trials", () => {
	it("getTrialForNextRank at mouse returns fox trial", () => {
		const trial = getTrialForNextRank("mouse");
		expect(trial).not.toBeNull();
		expect(trial!.targetRank).toBe("fox");
	});

	it("getTrialForNextRank at dragon returns null", () => {
		expect(getTrialForNextRank("dragon")).toBeNull();
	});

	it("completeUnder trial: mouse → fox promotion", () => {
		let p = createProgression();

		// Fox trial: complete 2 Classic Clear runs under 240s
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 200,
			pi: 5000,
			profitable: true,
		});
		expect(p.rank).toBe("mouse"); // not yet — need 2

		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 230,
			pi: 5500,
			profitable: true,
		});
		expect(p.rank).toBe("fox"); // promoted!
	});

	it("completeUnder trial: does not count if time >= value", () => {
		let p = createProgression();
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 240, // exactly 240 — not under
			pi: 5000,
			profitable: true,
		});
		expect(p.trialProgress["fox:0"] ?? 0).toBe(0);
	});

	it("completeUnder trial: does not count if not completed", () => {
		let p = createProgression();
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: false,
			timeSeconds: 100,
			pi: 5000,
			profitable: true,
		});
		expect(p.trialProgress["fox:0"] ?? 0).toBe(0);
	});

	it("hitPI trial: wolf promotion after 3 runs hitting PI 8000+", () => {
		let p = createProgression();
		p = { ...p, rank: "fox" }; // start at fox

		for (let i = 0; i < 3; i++) {
			p = recordRunForTrial(p, {
				mode: "classicClear",
				completed: true,
				timeSeconds: 200,
				pi: 8000,
				profitable: true,
			});
		}
		expect(p.rank).toBe("wolf");
	});

	it("hitPI trial: does not count if PI below threshold", () => {
		let p = { ...createProgression(), rank: "fox" as const };
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 200,
			pi: 7999,
			profitable: true,
		});
		expect(p.trialProgress["wolf:0"] ?? 0).toBe(0);
	});

	it("wrong mode does not count toward trial", () => {
		let p = createProgression();
		p = recordRunForTrial(p, {
			mode: "scoreTarget",
			completed: true,
			timeSeconds: 100,
			pi: 5000,
			profitable: true,
		});
		expect(p.trialProgress["fox:0"] ?? 0).toBe(0);
	});

	it("dragon trial requires both hitPI and consecutiveWins", () => {
		let p = { ...createProgression(), rank: "wolf" as const };

		// 3 runs hitting PI 10000+ and profitable (building streak)
		for (let i = 0; i < 3; i++) {
			p = recordRunForTrial(p, {
				mode: "classicClear",
				completed: true,
				timeSeconds: 180,
				pi: 10000,
				profitable: true,
			});
		}
		expect(p.rank).toBe("dragon");
	});

	it("dragon trial: consecutive wins reset on loss", () => {
		let p = { ...createProgression(), rank: "wolf" as const };

		// 2 profitable runs
		for (let i = 0; i < 2; i++) {
			p = recordRunForTrial(p, {
				mode: "classicClear",
				completed: true,
				timeSeconds: 180,
				pi: 10000,
				profitable: true,
			});
		}
		expect(p.winStreak).toBe(2);

		// Loss resets streak
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 180,
			pi: 10000,
			profitable: false,
		});
		expect(p.winStreak).toBe(0);
	});

	it("no promotion at max rank (dragon)", () => {
		let p = { ...createProgression(), rank: "dragon" as const };
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 60,
			pi: 20000,
			profitable: true,
		});
		expect(p.rank).toBe("dragon");
	});
});

describe("Progression — Win streak", () => {
	it("increments on profitable runs", () => {
		let p = createProgression();
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: true,
			timeSeconds: 200,
			pi: 5000,
			profitable: true,
		});
		expect(p.winStreak).toBe(1);
	});

	it("resets on non-profitable run", () => {
		let p = { ...createProgression(), winStreak: 5 };
		p = recordRunForTrial(p, {
			mode: "classicClear",
			completed: false,
			timeSeconds: 300,
			pi: 1000,
			profitable: false,
		});
		expect(p.winStreak).toBe(0);
	});
});

describe("Progression — Streak bonus", () => {
	it("no bonus below threshold", () => {
		expect(getStreakBonus(0)).toBe(0);
		expect(getStreakBonus(STREAK_BONUS_THRESHOLD - 1)).toBe(0);
	});

	it("bonus at threshold", () => {
		expect(getStreakBonus(STREAK_BONUS_THRESHOLD)).toBe(STREAK_BONUS_MULTIPLIER);
	});

	it("bonus above threshold", () => {
		expect(getStreakBonus(10)).toBe(STREAK_BONUS_MULTIPLIER);
	});
});
