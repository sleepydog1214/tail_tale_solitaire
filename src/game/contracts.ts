// ---------------------------------------------------------------------------
// Tale Tail Solitaire — Contract System (Phase 2)
// Wager contracts define mode rules, stake tiers, PI thresholds, and payouts.
// ---------------------------------------------------------------------------

export type WagerMode = "classicClear" | "scoreTarget";

export type OutcomeLabel = "fail" | "partial" | "pass" | "great" | "exceptional";

export const OUTCOME_ORDER: readonly OutcomeLabel[] = [
	"fail",
	"partial",
	"pass",
	"great",
	"exceptional",
] as const;

export interface ContractRules {
	undoAllowed: boolean;
	hintAllowed: boolean;
	drawMode: 1 | 3;
}

export interface StakeThresholds {
	partial: number;
	pass: number;
	great: number;
	exceptional: number;
}

export interface PayoutTable {
	fail: number;
	partial: number;
	pass: number;
	great: number;
	exceptional: number;
}

export interface Contract {
	id: string;
	mode: WagerMode;
	timerSeconds: number;
	rules: ContractRules;
	stakeTiers: number[];
	thresholds: Record<number, StakeThresholds>;
	payouts: PayoutTable;
}

// ---------------------------------------------------------------------------
// Starter contracts — rescaled thresholds from implementation-plan.md Part 2
// ---------------------------------------------------------------------------

export const DEFAULT_CONTRACT_RULES: ContractRules = {
	undoAllowed: true,
	hintAllowed: true,
	drawMode: 3,
};

export const DEFAULT_TIMER_SECONDS = 300; // 5:00

export const CLASSIC_CLEAR_5MIN: Contract = {
	id: "classic-clear-5",
	mode: "classicClear",
	timerSeconds: DEFAULT_TIMER_SECONDS,
	rules: { ...DEFAULT_CONTRACT_RULES },
	stakeTiers: [10, 25, 50, 100, 250, 500, 1000],
	thresholds: {
		10:   { partial: 3000, pass: 6000, great: 8000,  exceptional: 10000 },
		25:   { partial: 3500, pass: 6500, great: 8500,  exceptional: 10500 },
		50:   { partial: 4000, pass: 7000, great: 9000,  exceptional: 11000 },
		100:  { partial: 4500, pass: 7500, great: 9500,  exceptional: 11500 },
		250:  { partial: 5000, pass: 8000, great: 10000, exceptional: 12000 },
		500:  { partial: 5500, pass: 8500, great: 10500, exceptional: 12500 },
		1000: { partial: 6000, pass: 9000, great: 11000, exceptional: 13000 },
	},
	payouts: {
		fail: 0.0,
		partial: 0.3,
		pass: 1.4,
		great: 2.0,
		exceptional: 2.8,
	},
};

export const SCORE_TARGET_5MIN: Contract = {
	id: "score-target-5",
	mode: "scoreTarget",
	timerSeconds: DEFAULT_TIMER_SECONDS,
	rules: { ...DEFAULT_CONTRACT_RULES },
	stakeTiers: [10, 25, 50, 100, 250, 500, 1000],
	thresholds: {
		10:   { partial: 3000, pass: 5500, great: 7500,  exceptional: 9500 },
		25:   { partial: 3500, pass: 6000, great: 8000,  exceptional: 10000 },
		50:   { partial: 4000, pass: 6500, great: 8500,  exceptional: 10500 },
		100:  { partial: 4500, pass: 7000, great: 9000,  exceptional: 11000 },
		250:  { partial: 5000, pass: 7500, great: 9500,  exceptional: 11500 },
		500:  { partial: 5500, pass: 8000, great: 10000, exceptional: 12000 },
		1000: { partial: 6000, pass: 8500, great: 10500, exceptional: 12500 },
	},
	payouts: {
		fail: 0.0,
		partial: 0.5,
		pass: 1.3,
		great: 1.8,
		exceptional: 2.4,
	},
};

export const ALL_CONTRACTS: readonly Contract[] = [
	CLASSIC_CLEAR_5MIN,
	SCORE_TARGET_5MIN,
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export interface ContractValidationError {
	field: string;
	message: string;
}

export function validateContract(contract: Contract): ContractValidationError[] {
	const errors: ContractValidationError[] = [];

	if (contract.stakeTiers.length === 0) {
		errors.push({ field: "stakeTiers", message: "Must have at least one stake tier" });
	}

	// Stake tiers must be sorted ascending with positive values
	for (let i = 0; i < contract.stakeTiers.length; i++) {
		if (contract.stakeTiers[i] <= 0) {
			errors.push({ field: "stakeTiers", message: `Stake tier at index ${i} must be positive` });
		}
		if (i > 0 && contract.stakeTiers[i] <= contract.stakeTiers[i - 1]) {
			errors.push({ field: "stakeTiers", message: "Stake tiers must be sorted ascending" });
			break;
		}
	}

	// Every stake tier must have a threshold entry
	for (const tier of contract.stakeTiers) {
		const th = contract.thresholds[tier];
		if (!th) {
			errors.push({ field: "thresholds", message: `Missing thresholds for stake ${tier}` });
			continue;
		}
		// Thresholds must be ascending: partial < pass < great < exceptional
		if (th.partial >= th.pass) {
			errors.push({ field: "thresholds", message: `Stake ${tier}: partial (${th.partial}) must be < pass (${th.pass})` });
		}
		if (th.pass >= th.great) {
			errors.push({ field: "thresholds", message: `Stake ${tier}: pass (${th.pass}) must be < great (${th.great})` });
		}
		if (th.great >= th.exceptional) {
			errors.push({ field: "thresholds", message: `Stake ${tier}: great (${th.great}) must be < exceptional (${th.exceptional})` });
		}
	}

	// Payouts: all non-negative, fail should be 0 or near-0, pass+ should be > 0
	for (const label of OUTCOME_ORDER) {
		if (contract.payouts[label] < 0) {
			errors.push({ field: "payouts", message: `Payout for ${label} must be non-negative` });
		}
	}

	if (contract.timerSeconds <= 0) {
		errors.push({ field: "timerSeconds", message: "Timer must be positive" });
	}

	return errors;
}
