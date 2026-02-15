// ---------------------------------------------------------------------------
// Tale Tail Solitaire — Player Economy (Phase 4)
// Wallet management, daily grants, bankruptcy protection.
// Structured for localStorage MVP; backend-replaceable later.
// ---------------------------------------------------------------------------

export interface PlayerWallet {
	coins: number;
	lastDailyGrantDate: string | null; // ISO date string "YYYY-MM-DD"
	lastBankruptcyDate: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STARTING_COINS = 1000;
export const DAILY_GRANT_COINS = 200;
export const BANKRUPTCY_THRESHOLD = 10;
export const BANKRUPTCY_GRANT = 200;
export const PRACTICE_WIN_COINS = 10;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWallet(): PlayerWallet {
	return {
		coins: STARTING_COINS,
		lastDailyGrantDate: null,
		lastBankruptcyDate: null,
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function canAffordStake(wallet: PlayerWallet, stake: number): boolean {
	return wallet.coins >= stake && stake > 0;
}

export function isBankrupt(wallet: PlayerWallet): boolean {
	return wallet.coins < BANKRUPTCY_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Mutations (all return new wallet — immutable)
// ---------------------------------------------------------------------------

export function deductStake(wallet: PlayerWallet, stake: number): PlayerWallet {
	if (!canAffordStake(wallet, stake)) {
		throw new Error(`Cannot afford stake ${stake} with ${wallet.coins} coins`);
	}
	return { ...wallet, coins: wallet.coins - stake };
}

export function addCoins(wallet: PlayerWallet, amount: number): PlayerWallet {
	return { ...wallet, coins: wallet.coins + amount };
}

export function applyWagerPayout(wallet: PlayerWallet, payoutCoins: number, stake: number): PlayerWallet {
	// payoutCoins is the gross payout (stake was already deducted before the game).
	// So we just add the payout back.
	return { ...wallet, coins: wallet.coins + payoutCoins };
}

/**
 * Grant daily coins if not already granted today.
 * Returns [updatedWallet, granted: boolean].
 */
export function grantDailyCoins(
	wallet: PlayerWallet,
	todayDate: string
): [PlayerWallet, boolean] {
	if (wallet.lastDailyGrantDate === todayDate) {
		return [wallet, false];
	}
	return [
		{
			...wallet,
			coins: wallet.coins + DAILY_GRANT_COINS,
			lastDailyGrantDate: todayDate,
		},
		true,
	];
}

/**
 * Bankruptcy bailout: if coins < threshold and not already bailed out today,
 * reset to BANKRUPTCY_GRANT coins.
 * Returns [updatedWallet, bailed: boolean].
 */
export function checkBankruptcy(
	wallet: PlayerWallet,
	todayDate: string
): [PlayerWallet, boolean] {
	if (!isBankrupt(wallet)) {
		return [wallet, false];
	}
	if (wallet.lastBankruptcyDate === todayDate) {
		return [wallet, false]; // already bailed out today
	}
	return [
		{
			...wallet,
			coins: BANKRUPTCY_GRANT,
			lastBankruptcyDate: todayDate,
		},
		true,
	];
}

// ---------------------------------------------------------------------------
// Persistence (localStorage MVP)
// ---------------------------------------------------------------------------

const WALLET_STORAGE_KEY = "taletail_wallet";

export function saveWallet(wallet: PlayerWallet): void {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
	}
}

export function loadWallet(): PlayerWallet {
	if (typeof localStorage !== "undefined") {
		const raw = localStorage.getItem(WALLET_STORAGE_KEY);
		if (raw) {
			try {
				return JSON.parse(raw) as PlayerWallet;
			} catch {
				// corrupted — return fresh wallet
			}
		}
	}
	return createWallet();
}
