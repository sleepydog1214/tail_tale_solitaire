import seedrandom from "seedrandom";

export type Suit = "H" | "D" | "C" | "S";
export type Rank =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13;

export type DeckCard = { rank: Rank; suit: Suit };

const SUITS: Suit[] = ["H", "D", "C", "S"];

/**
 * Deterministically shuffles a standard 52-card deck from a seed.
 * Returns the exact same order for the same seed on every client.
 */
export function createShuffledDeckFromSeed(seed: string): DeckCard[] {
	const rng = seedrandom(seed);

	const deck: DeckCard[] = [];
	for (const suit of SUITS) {
		for (let r = 1 as Rank; r <= 13; r = (r + 1) as Rank) {
			deck.push({ rank: r, suit });
		}
	}

	// Fisher–Yates shuffle using seeded RNG.
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}

	return deck;
}
