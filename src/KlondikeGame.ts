import seedrandom from "seedrandom";

export type Suit = "H" | "D" | "C" | "S";
export type Color = "red" | "black";

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

export type PileRef =
	| { pile: "stock" }
	| { pile: "waste" }
	| { pile: "foundation"; suit: Suit }
	| { pile: "tableau"; index: number; position?: number };

export interface Card {
	id: string;
	suit: Suit;
	rank: Rank;
	faceUp: boolean;
}

export interface MoveRecord {
	from: PileRef;
	to: PileRef;
	movedCardIds: string[];
	uncoveredCardId?: string;
	pointsDelta: number;
	createdAtMs: number;
}

export interface GameScoreState {
	baseScore: number;
	timeBonus: number;
	efficiencyBonus: number;
	totalScore: number;
}

export interface GameState {
	seed: string;
	startedAtMs: number;
	finishedAtMs: number | null;
	matchDurationSeconds: number;
	timeElapsedSeconds: number;
	timeRemainingSeconds: number;
	score: GameScoreState;
	moveCount: number;
	columnClears: number;

	stock: Card[];
	waste: Card[];
	foundations: Record<Suit, Card[]>;
	tableau: Card[][];
	lastMove: MoveRecord | null;
}

export interface KlondikeGameOptions {
	matchDurationSeconds?: number;
	now?: () => number;
	turnCount?: 1 | 3;
	redealPenaltyPoints?: number; // optional; default 0 per prompt
}

const SUITS: Suit[] = ["H", "D", "C", "S"];

function suitColor(suit: Suit): Color {
	return suit === "H" || suit === "D" ? "red" : "black";
}

function rankToString(rank: Rank): string {
	switch (rank) {
		case 1:
			return "A";
		case 11:
			return "J";
		case 12:
			return "Q";
		case 13:
			return "K";
		default:
			return String(rank);
	}
}

function cardId(suit: Suit, rank: Rank): string {
	return `${rankToString(rank)}${suit}`;
}

function deepCloneState(state: GameState): GameState {
	// State is plain JSON already; structuredClone not always available.
	return JSON.parse(JSON.stringify(state)) as GameState;
}

function clampInt(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, Math.trunc(value)));
}

export class KlondikeGame {
	private readonly seed: string;
	private readonly rng: seedrandom.PRNG;
	private readonly now: () => number;
	private readonly matchDurationSeconds: number;
	private readonly turnCount: 1 | 3;
	private readonly redealPenaltyPoints: number;

	private startedAtMs = 0;
	private finishedAtMs: number | null = null;
	private baseScore = 0;
	private timeBonus = 0;
	private efficiencyBonus = 0;
	private moveCount = 0;
	private columnClears = 0;
	private lastMove: MoveRecord | null = null;

	private stock: Card[] = [];
	private waste: Card[] = [];
	private foundations: Record<Suit, Card[]> = { H: [], D: [], C: [], S: [] };
	private tableau: Card[][] = [[], [], [], [], [], [], []];

	constructor(seed: string, options: KlondikeGameOptions = {}) {
		this.seed = seed;
		this.rng = seedrandom(seed);
		this.now = options.now ?? Date.now;
		this.matchDurationSeconds = options.matchDurationSeconds ?? 300;
		this.turnCount = options.turnCount ?? 3;
		this.redealPenaltyPoints = options.redealPenaltyPoints ?? 0;
	}

	deal(): GameState {
		this.startedAtMs = this.now();
		this.finishedAtMs = null;
		this.baseScore = 0;
		this.timeBonus = 0;
		this.efficiencyBonus = 0;
		this.moveCount = 0;
		this.columnClears = 0;
		this.lastMove = null;

		const deck = this.createShuffledDeck();

		this.tableau = [[], [], [], [], [], [], []];
		let deckIndex = 0;
		for (let pileIndex = 0; pileIndex < 7; pileIndex++) {
			const count = pileIndex + 1;
			const pile: Card[] = [];
			for (let i = 0; i < count; i++) {
				const card = deck[deckIndex++];
				pile.push({ ...card, faceUp: i === count - 1 });
			}
			this.tableau[pileIndex] = pile;
		}

		this.stock = deck.slice(deckIndex).map((c) => ({ ...c, faceUp: false }));
		this.waste = [];
		this.foundations = { H: [], D: [], C: [], S: [] };

		return this.getState();
	}

	finish(): GameState {
		this.assertDealt();
		if (this.finishedAtMs !== null) return this.getState();
		this.finishGame();
		return this.getState();
	}

	drawFromStock(): GameState {
		this.assertDealt();
		if (this.finishedAtMs !== null) return this.getState();

		const createdAtMs = this.now();
		let pointsDelta = 0;

		if (this.stock.length === 0) {
			if (this.waste.length === 0) {
				return this.getState();
			}

			// Redeal: flip waste over to become new stock (unlimited passes).
			const newStock = this.waste
				.map((c) => ({ ...c, faceUp: false }))
				.reverse();
			this.stock = newStock;
			this.waste = [];

			if (this.redealPenaltyPoints !== 0) {
				pointsDelta -= Math.abs(this.redealPenaltyPoints);
				this.baseScore += pointsDelta;
			}

			this.recordMove(
				{ pile: "stock" },
				{ pile: "stock" },
				[],
				undefined,
				pointsDelta,
				createdAtMs
			);
			return this.getState();
		}

		const drawCount = Math.min(this.turnCount, this.stock.length);
		const movedIds: string[] = [];
		for (let i = 0; i < drawCount; i++) {
			const card = this.stock.pop()!;
			const faceUpCard: Card = { ...card, faceUp: true };
			this.waste.push(faceUpCard);
			movedIds.push(faceUpCard.id);
		}

		this.recordMove(
			{ pile: "stock" },
			{ pile: "waste" },
			movedIds,
			undefined,
			0,
			createdAtMs
		);
		return this.getState();
	}

	moveCard(from: PileRef, to: PileRef): GameState {
		this.assertDealt();
		if (this.finishedAtMs !== null) return this.getState();

		const createdAtMs = this.now();
		let pointsDelta = 0;
		let uncoveredCardId: string | undefined;

		const { cards: movingCards, remove: removeFromSource } =
			this.peekMoveFrom(from);

		if (movingCards.length === 0) throw new Error("No cards to move");
		this.assertMoveLegal(movingCards, from, to);

		// Apply move
		removeFromSource();
		this.pushToDestination(movingCards, to);

		// Scoring
		if (to.pile === "foundation") {
			pointsDelta += 100;
			this.baseScore += 100;
		}

		// Uncover scoring: only possible if source was tableau.
		if (from.pile === "tableau") {
			const tableauIndex = this.assertTableauIndex(from.index);
			const pile = this.tableau[tableauIndex];
			if (pile.length > 0) {
				const top = pile[pile.length - 1];
				if (!top.faceUp) {
					top.faceUp = true;
					uncoveredCardId = top.id;
					pointsDelta += 20;
					this.baseScore += 20;
				}
			}

			// Column clear bonus: tableau column became empty after the move
			if (pile.length === 0) {
				pointsDelta += 50;
				this.baseScore += 50;
				this.columnClears += 1;
			}
		}

		this.recordMove(from, to, movingCards.map((c) => c.id), uncoveredCardId, pointsDelta, createdAtMs);

		if (this.isSolved()) {
			this.finishGame();
		}

		return this.getState();
	}

	canAutoMoveToFoundation(): Array<{ from: PileRef; to: PileRef }> {
		this.assertDealt();
		if (this.finishedAtMs !== null) return [];

		const moves: Array<{ from: PileRef; to: PileRef }> = [];

		// Waste top
		if (this.waste.length > 0) {
			const card = this.waste[this.waste.length - 1];
			const dest: PileRef = { pile: "foundation", suit: card.suit };
			if (this.canPlaceOnFoundation(card, card.suit)) {
				moves.push({ from: { pile: "waste" }, to: dest });
			}
		}

		// Tableau tops
		for (let i = 0; i < 7; i++) {
			const pile = this.tableau[i];
			if (pile.length === 0) continue;
			const top = pile[pile.length - 1];
			if (!top.faceUp) continue;
			const dest: PileRef = { pile: "foundation", suit: top.suit };
			if (this.canPlaceOnFoundation(top, top.suit)) {
				moves.push({ from: { pile: "tableau", index: i }, to: dest });
			}
		}

		return moves;
	}

	isSolved(): boolean {
		return (
			this.foundations.H.length === 13 &&
			this.foundations.D.length === 13 &&
			this.foundations.C.length === 13 &&
			this.foundations.S.length === 13
		);
	}

	getState(): GameState {
		this.assertDealt();
		const timeElapsedSeconds = this.getTimeElapsedSeconds();
		const timeRemainingSeconds = this.getTimeRemainingSeconds();
		const timeBonus = this.finishedAtMs === null ? 0 : this.timeBonus;
		const efficiencyBonus = this.finishedAtMs === null ? 0 : this.efficiencyBonus;
		const totalScore = this.baseScore + timeBonus + efficiencyBonus;

		const state: GameState = {
			seed: this.seed,
			startedAtMs: this.startedAtMs,
			finishedAtMs: this.finishedAtMs,
			matchDurationSeconds: this.matchDurationSeconds,
			timeElapsedSeconds,
			timeRemainingSeconds,
			score: {
				baseScore: this.baseScore,
				timeBonus,
				efficiencyBonus,
				totalScore,
			},
			moveCount: this.moveCount,
			columnClears: this.columnClears,
			stock: this.stock.map((c) => ({ ...c })),
			waste: this.waste.map((c) => ({ ...c })),
			foundations: {
				H: this.foundations.H.map((c) => ({ ...c })),
				D: this.foundations.D.map((c) => ({ ...c })),
				C: this.foundations.C.map((c) => ({ ...c })),
				S: this.foundations.S.map((c) => ({ ...c })),
			},
			tableau: this.tableau.map((pile) => pile.map((c) => ({ ...c }))),
			lastMove: this.lastMove ? { ...this.lastMove, movedCardIds: [...this.lastMove.movedCardIds] } : null,
		};

		return deepCloneState(state);
	}

	// -------------------- Internals --------------------

	private assertDealt(): void {
		if (this.startedAtMs === 0) {
			throw new Error("Game has not been dealt yet. Call deal() first.");
		}
	}

	private getTimeElapsedSeconds(): number {
		if (this.startedAtMs === 0) return 0;
		const endMs = this.finishedAtMs ?? this.now();
		return clampInt((endMs - this.startedAtMs) / 1000, 0, Number.MAX_SAFE_INTEGER);
	}

	private getTimeRemainingSeconds(): number {
		const elapsed = this.getTimeElapsedSeconds();
		return clampInt(this.matchDurationSeconds - elapsed, 0, this.matchDurationSeconds);
	}

	private finishGame(): void {
		if (this.finishedAtMs !== null) return;
		this.finishedAtMs = this.now();

		// Time Bonus = Base Score × (Time Remaining / matchDuration)
		const timeRemaining = this.getTimeRemainingSeconds();
		this.timeBonus = Math.floor(
			this.baseScore * (timeRemaining / this.matchDurationSeconds)
		);

		// Move Efficiency Bonus: reward fewer moves (max 200 moves threshold)
		this.efficiencyBonus = Math.max(0, 200 - this.moveCount) * 5;
	}

	private recordMove(
		from: PileRef,
		to: PileRef,
		movedCardIds: string[],
		uncoveredCardId: string | undefined,
		pointsDelta: number,
		createdAtMs: number
	): void {
		this.moveCount += 1;
		this.lastMove = {
			from,
			to,
			movedCardIds,
			uncoveredCardId,
			pointsDelta,
			createdAtMs,
		};
	}

	private createShuffledDeck(): Card[] {
		const deck: Card[] = [];
		for (const suit of SUITS) {
			for (let r = 1 as Rank; r <= 13; r = (r + 1) as Rank) {
				deck.push({
					id: cardId(suit, r),
					suit,
					rank: r,
					faceUp: false,
				});
			}
		}

		// Fisher-Yates with seeded RNG.
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(this.rng() * (i + 1));
			[deck[i], deck[j]] = [deck[j], deck[i]];
		}
		return deck;
	}

	private assertTableauIndex(index: number): number {
		if (!Number.isInteger(index) || index < 0 || index > 6) {
			throw new Error(`Invalid tableau index: ${index}`);
		}
		return index;
	}

	private getFoundation(suit: Suit): Card[] {
		return this.foundations[suit];
	}

	private canPlaceOnFoundation(card: Card, suit: Suit): boolean {
		const foundation = this.getFoundation(suit);
		if (card.suit !== suit) return false;
		if (foundation.length === 0) return card.rank === 1;
		const top = foundation[foundation.length - 1];
		return card.rank === ((top.rank + 1) as Rank);
	}

	private canPlaceOnTableau(movingTop: Card, destPile: Card[]): boolean {
		if (destPile.length === 0) return movingTop.rank === 13;
		const destTop = destPile[destPile.length - 1];
		if (!destTop.faceUp) return false;
		const differentColor = suitColor(movingTop.suit) !== suitColor(destTop.suit);
		return differentColor && movingTop.rank === ((destTop.rank - 1) as Rank);
	}

	private isValidTableauRun(cards: Card[]): boolean {
		if (cards.length === 0) return false;
		for (let i = 0; i < cards.length; i++) {
			if (!cards[i].faceUp) return false;
			if (i === 0) continue;
			const prev = cards[i - 1];
			const cur = cards[i];
			const alternate = suitColor(prev.suit) !== suitColor(cur.suit);
			const descending = prev.rank === ((cur.rank + 1) as Rank);
			if (!alternate || !descending) return false;
		}
		return true;
	}

	private peekMoveFrom(from: PileRef): {
		cards: Card[];
		remove: () => void;
	} {
		switch (from.pile) {
			case "waste": {
				if (this.waste.length === 0) return { cards: [], remove: () => {} };
				const top = this.waste[this.waste.length - 1];
				return {
					cards: [top],
					remove: () => {
						this.waste.pop();
					},
				};
			}
			case "tableau": {
				const index = this.assertTableauIndex(from.index);
				const pile = this.tableau[index];
				if (pile.length === 0) return { cards: [], remove: () => {} };

				const position =
					from.position === undefined
						? pile.length - 1
						: from.position;
				if (!Number.isInteger(position) || position < 0 || position >= pile.length) {
					throw new Error(`Invalid tableau position: ${position}`);
				}

				const slice = pile.slice(position);
				return {
					cards: slice,
					remove: () => {
						pile.splice(position, slice.length);
					},
				};
			}
			case "foundation": {
				const foundation = this.getFoundation(from.suit);
				if (foundation.length === 0) return { cards: [], remove: () => {} };
				const top = foundation[foundation.length - 1];
				return {
					cards: [top],
					remove: () => {
						foundation.pop();
					},
				};
			}
			case "stock": {
				// No direct stock-> moves (drawFromStock is the only action).
				return { cards: [], remove: () => {} };
			}
			default: {
				const _exhaustive: never = from;
				return _exhaustive;
			}
		}
	}

	private pushToDestination(cards: Card[], to: PileRef): void {
		switch (to.pile) {
			case "tableau": {
				const index = this.assertTableauIndex(to.index);
				this.tableau[index].push(...cards.map((c) => ({ ...c, faceUp: true })));
				return;
			}
			case "foundation": {
				// Foundations always hold face-up cards.
				this.foundations[to.suit].push(...cards.map((c) => ({ ...c, faceUp: true })));
				return;
			}
			case "waste": {
				this.waste.push(...cards.map((c) => ({ ...c, faceUp: true })));
				return;
			}
			case "stock": {
				this.stock.push(...cards.map((c) => ({ ...c, faceUp: false })));
				return;
			}
			default: {
				const _exhaustive: never = to;
				return _exhaustive;
			}
		}
	}

	private assertMoveLegal(movingCards: Card[], from: PileRef, to: PileRef): void {
		// Disallow moving from stock directly.
		if (from.pile === "stock") {
			throw new Error("Cannot move cards directly from stock. Use drawFromStock().");
		}

		// Destination must be tableau or foundation.
		if (to.pile !== "tableau" && to.pile !== "foundation") {
			throw new Error("Invalid destination pile");
		}

		// Waste: only top card is movable; enforced by peek.
		if (from.pile === "waste") {
			if (movingCards.length !== 1) throw new Error("Only one card can be moved from waste");
			if (!movingCards[0].faceUp) throw new Error("Waste card must be face-up");
		}

		// Foundation: only top card movable; enforced by peek.
		if (from.pile === "foundation") {
			if (movingCards.length !== 1) throw new Error("Only one card can be moved from foundation");
		}

		// If moving from tableau, validate run if multi-card.
		if (from.pile === "tableau") {
			if (!this.isValidTableauRun(movingCards)) {
				throw new Error("Invalid tableau run (must be face-up, descending, alternating colors)");
			}
		}

		if (to.pile === "foundation") {
			if (movingCards.length !== 1) {
				throw new Error("Only single cards can be moved to foundation");
			}
			const card = movingCards[0];
			if (!this.canPlaceOnFoundation(card, to.suit)) {
				throw new Error("Illegal move to foundation");
			}
			return;
		}

		// to.tableau
		if (to.pile === "tableau") {
			const destIndex = this.assertTableauIndex(to.index);
			const destPile = this.tableau[destIndex];
			const movingTop = movingCards[0];
			if (!this.canPlaceOnTableau(movingTop, destPile)) {
				throw new Error("Illegal move to tableau");
			}
			return;
		}
	}
}
