import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { Card, GameState, PileRef, Suit } from "./KlondikeGame";
import { KlondikeGame } from "./KlondikeGame";
import { generateCardFrontSvg, generateCardBackSvg, svgToDataUri } from "./cardGen";
import type { CardDesign } from "./cardGen";

type DragItem = {
	type: "CARD_STACK";
	from: PileRef;
	cards: Card[];
};

function suitSymbol(suit: Suit): string {
	switch (suit) {
		case "H":
			return "♥";
		case "D":
			return "♦";
		case "C":
			return "♣";
		case "S":
			return "♠";
	}
}

function cardLabel(card: Card): string {
	const rank =
		card.rank === 1
			? "A"
			: card.rank === 11
				? "J"
				: card.rank === 12
					? "Q"
					: card.rank === 13
						? "K"
						: String(card.rank);
	return `${rank}${suitSymbol(card.suit)}`;
}

function cardFrontDataUri(card: Card, design: CardDesign): string {
	return svgToDataUri(generateCardFrontSvg(card.suit, card.rank, design));
}

function cardBackDataUri(design: CardDesign): string {
	return svgToDataUri(generateCardBackSvg(design));
}

function suitColor(card: Card): "red" | "black" {
	return card.suit === "H" || card.suit === "D" ? "red" : "black";
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function isValidTableauRun(cards: Card[]): boolean {
	if (cards.length === 0) return false;
	for (let i = 0; i < cards.length; i++) {
		if (!cards[i].faceUp) return false;
		if (i === 0) continue;
		const prev = cards[i - 1];
		const cur = cards[i];
		const alternate = suitColor(prev) !== suitColor(cur);
		const descending = prev.rank === cur.rank + 1;
		if (!alternate || !descending) return false;
	}
	return true;
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
	if (foundation.length === 0) return card.rank === 1;
	const top = foundation[foundation.length - 1];
	return card.suit === top.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(movingTop: Card, destPile: Card[]): boolean {
	if (destPile.length === 0) return movingTop.rank === 13;
	const destTop = destPile[destPile.length - 1];
	if (!destTop.faceUp) return false;
	const alt = suitColor(movingTop) !== suitColor(destTop);
	return alt && movingTop.rank === destTop.rank - 1;
}

function getTop3Waste(waste: Card[]): Card[] {
	return waste.slice(Math.max(0, waste.length - 3));
}

function tryAutoMove(game: KlondikeGame, from: PileRef, movingCards: Card[]): GameState | null {
	// Single-card: try foundation first.
	if (movingCards.length === 1) {
		const card = movingCards[0];
		try {
			return game.moveCard(from, { pile: "foundation", suit: card.suit });
		} catch {
			// fall through
		}
	}

	// Try tableau destinations in order.
	for (let i = 0; i < 7; i++) {
		try {
			return game.moveCard(from, { pile: "tableau", index: i });
		} catch {
			// keep trying
		}
	}
	return null;
}

function CardView(props: {
	card: Card;
	draggable: boolean;
	cardDesign: CardDesign;
	onClick?: () => void;
	dragItem?: DragItem;
}) {
	const { card, draggable, cardDesign, onClick, dragItem } = props;

	const [{ isDragging }, dragRef] = useDrag(
		() => ({
			type: "CARD_STACK",
			item: dragItem,
			canDrag: () => draggable,
			collect: (monitor) => ({
				isDragging: monitor.isDragging(),
			}),
		}),
		[draggable, dragItem]
	);

	const className = ["card", card.faceUp ? suitColor(card) : "", draggable ? "draggable" : ""]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			ref={dragRef}
			className={className}
			onClick={onClick}
			style={{ opacity: isDragging ? 0.4 : 1 }}
		>
 		{card.faceUp ? (
 			<img className="cardBackImg" src={cardFrontDataUri(card, cardDesign)} alt={cardLabel(card)} />
 		) : (
 			<img className="cardBackImg" src={cardBackDataUri(cardDesign)} alt="Card back" />
 		)}
		</div>
	);
}

function TableauPile(props: {
	index: number;
	pile: Card[];
	state: GameState;
	game: KlondikeGame;
	disabled: boolean;
	cardDesign: CardDesign;
	onState: (s: GameState) => void;
}) {
	const { index, pile, state, game, disabled, cardDesign, onState } = props;

	const [{ isOver, canDrop }, dropRef] = useDrop(
		() => ({
			accept: "CARD_STACK",
			canDrop: (item: DragItem) => {
				if (disabled) return false;
				if (!item || item.type !== "CARD_STACK") return false;
				if (!isValidTableauRun(item.cards)) return false;
				return canPlaceOnTableau(item.cards[0], pile);
			},
			drop: (item: DragItem) => {
				if (disabled) return;
				try {
					const next = game.moveCard(item.from, { pile: "tableau", index });
					onState(next);
				} catch {
					// ignore illegal drop
				}
			},
			collect: (monitor) => ({
				isOver: monitor.isOver({ shallow: true }),
				canDrop: monitor.canDrop(),
			}),
		}),
		[disabled, pile, game, index]
	);

	const pileClass = [
		"pile",
		isOver && canDrop ? "validDrop" : "",
		isOver && !canDrop ? "invalidDrop" : "",
	]
		.filter(Boolean)
		.join(" ");

	// Find the top of the longest valid run (first face-up card that starts a valid run to the end).
	const stackTopPos = useMemo(() => {
		for (let p = 0; p < pile.length; p++) {
			if (!pile[p].faceUp) continue;
			const slice = pile.slice(p);
			if (isValidTableauRun(slice) && slice.length > 1) return p;
		}
		return -1;
	}, [pile]);

	return (
		<div ref={dropRef} className={pileClass}>
			<div className="pileTitle">T{index + 1}</div>
 		<div className="cardStack" style={{ minHeight: pile.length > 0 ? (pile.length - 1) * 24 + 114 + 8 : 132 }}>
 			{pile.map((card, pos) => {
					const isFaceUp = card.faceUp;
					const slice = isFaceUp ? pile.slice(pos) : [];
					const draggable =
						!disabled && isFaceUp && slice.length > 0 && isValidTableauRun(slice);
					const isStackTop = pos === stackTopPos;

					const from: PileRef = { pile: "tableau", index, position: pos };
					const dragItem: DragItem | undefined = draggable
						? { type: "CARD_STACK", from, cards: slice }
						: undefined;

					return (
						<div
							key={card.id}
							className={`cardInTableau${isStackTop ? " stackTopCard" : ""}`}
							style={{ top: pos * 24 }}
						>
 						<CardView
 							card={card}
 							draggable={draggable}
 							cardDesign={cardDesign}
 							dragItem={dragItem}
 							onClick={() => {
 								if (disabled) return;
 								if (!isFaceUp) return;

 								const current = state.tableau[index];
 								const moving = current.slice(pos);
 								const next = tryAutoMove(game, from, moving);
 								if (next) onState(next);
 							}}
 						/>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function FoundationPile(props: {
	suit: Suit;
	pile: Card[];
	game: KlondikeGame;
	disabled: boolean;
	cardDesign: CardDesign;
	onState: (s: GameState) => void;
}) {
	const { suit, pile, game, disabled, cardDesign, onState } = props;

	const [{ isOver, canDrop }, dropRef] = useDrop(
		() => ({
			accept: "CARD_STACK",
			canDrop: (item: DragItem) => {
				if (disabled) return false;
				if (!item || item.type !== "CARD_STACK") return false;
				if (item.cards.length !== 1) return false;
				const card = item.cards[0];
				if (card.suit !== suit) return false;
				return canPlaceOnFoundation(card, pile);
			},
			drop: (item: DragItem) => {
				if (disabled) return;
				try {
					const next = game.moveCard(item.from, { pile: "foundation", suit });
					onState(next);
				} catch {
					// ignore illegal drop
				}
			},
			collect: (monitor) => ({
				isOver: monitor.isOver({ shallow: true }),
				canDrop: monitor.canDrop(),
			}),
		}),
		[disabled, pile, suit]
	);

	const pileClass = [
		"pile",
		isOver && canDrop ? "validDrop" : "",
		isOver && !canDrop ? "invalidDrop" : "",
	]
		.filter(Boolean)
		.join(" ");

	const top = pile.length ? pile[pile.length - 1] : null;

	return (
		<div ref={dropRef} className={pileClass}>
			<div className="pileTitle">F {suitSymbol(suit)}</div>
			{top ? (
 			<CardView
 				card={top}
 				draggable={!disabled}
 				cardDesign={cardDesign}
 				dragItem={{ type: "CARD_STACK", from: { pile: "foundation", suit }, cards: [top] }}
 				onClick={() => {
 					if (disabled) return;
 					// Auto move from foundation only to tableau.
 					const next = tryAutoMove(game, { pile: "foundation", suit }, [top]);
 					if (next) onState(next);
 				}}
 			/>
			) : (
				<div className={`foundationPlaceholder ${suit === "H" || suit === "D" ? "red" : "black"}`}>
					{suitSymbol(suit)}
				</div>
			)}
		</div>
	);
}

export function SolitaireBoard(props: {
	seed: string;
	cardDesign: CardDesign;
	onStateChange?: (state: GameState) => void;
	onRequestHome?: () => void;
	onRequestNewGame?: () => void;
}) {
	const { seed, cardDesign, onStateChange, onRequestHome, onRequestNewGame } = props;
	const gameRef = useRef<KlondikeGame | null>(null);
	const stateRef = useRef<GameState | null>(null);

	const game = useMemo(() => {
		return new KlondikeGame(seed);
	}, [seed]);

	const [state, setState] = useState<GameState | null>(null);
	const [tick, setTick] = useState(0);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		gameRef.current = game;
		const s = game.deal();
		setState(s);
		onStateChange?.(s);
	}, [game, onStateChange]);

	useEffect(() => {
		const handle = window.setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);
		return () => window.clearInterval(handle);
	}, []);

	useEffect(() => {
		const current = stateRef.current;
		if (!current) return;
		// Refresh timer in state.
		if (current.finishedAtMs !== null) return;
		try {
			const s = game.getState();
			setState(s);
			onStateChange?.(s);
		} catch {
			// ignore
		}
		// Only re-run on tick; state changes are expected.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tick, game, onStateChange]);

	useEffect(() => {
		if (!state) return;
		if (state.finishedAtMs !== null) return;
		if (state.timeRemainingSeconds > 0) return;
		const s = game.finish();
		setState(s);
		onStateChange?.(s);
	}, [game, onStateChange, state]);

	if (!state) return null;

	const isFinished = state.finishedAtMs !== null || state.timeRemainingSeconds <= 0;

	const wasteTop3 = getTop3Waste(state.waste);
	const wasteTop = state.waste.length ? state.waste[state.waste.length - 1] : null;

	return (
		<div className="board">
			<div className="controls">
				<div>Time: {formatTime(state.timeRemainingSeconds)}</div>
				{!isFinished ? (
					<button
						onClick={() => {
							const s = game.finish();
							setState(s);
							onStateChange?.(s);
						}}
					>
						Finish
					</button>
				) : (
					<>
						<button onClick={onRequestHome} disabled={!onRequestHome}>
							Home
						</button>
						<button onClick={onRequestNewGame} disabled={!onRequestNewGame}>
							New Game
						</button>
					</>
				)}
			</div>

			<div className="topRow">
				<div className="leftTop">
					<div className="pile">
						<div className="pileTitle">Stock ({state.stock.length})</div>
						<div
							className="card"
							style={{ cursor: isFinished ? "default" : "pointer" }}
							onClick={() => {
								if (isFinished) return;
								const s = game.drawFromStock();
								setState(s);
								onStateChange?.(s);
							}}
						>
 						<img className="cardBackImg" src={cardBackDataUri(cardDesign)} alt="Stock" />
						</div>
					</div>

					<div className="pile">
						<div className="pileTitle">Waste ({state.waste.length})</div>
						<div className="wasteFan">
							{wasteTop3.map((c, i) => {
								const isTop = wasteTop?.id === c.id;
								const count = wasteTop3.length;
								const angle = count === 1 ? 0 : count === 2 ? (i === 0 ? -6 : 6) : i === 0 ? -10 : i === 1 ? 0 : 10;
								const x = count === 1 ? 0 : i * 18;
								return (
									<div
										key={c.id}
										className="wasteFanItem"
										style={{ transform: `translateX(${x}px) rotate(${angle}deg)` }}
									>
   							<CardView
   								card={c}
   								draggable={!isFinished && isTop}
   								cardDesign={cardDesign}
   								dragItem={
												isTop
													? { type: "CARD_STACK", from: { pile: "waste" }, cards: [c] }
													: undefined
											}
											onClick={() => {
												if (isFinished) return;
												if (!isTop) return;
												const next = tryAutoMove(game, { pile: "waste" }, [c]);
												if (next) {
													setState(next);
													onStateChange?.(next);
												}
											}}
										/>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<div className="foundations">
					{(["H", "D", "C", "S"] as Suit[]).map((suit) => (
 					<FoundationPile
 						key={suit}
 						suit={suit}
 						pile={state.foundations[suit]}
 						game={game}
 						disabled={isFinished}
 						cardDesign={cardDesign}
							onState={(next) => {
								setState(next);
								onStateChange?.(next);
							}}
						/>
					))}
				</div>
			</div>

			<div className="tableau">
				{state.tableau.map((pile, i) => (
					<TableauPile
						key={i}
						index={i}
						pile={pile}
						state={state}
						game={game}
						disabled={isFinished}
						cardDesign={cardDesign}
						onState={(next) => {
							setState(next);
							onStateChange?.(next);
						}}
					/>
				))}
			</div>
		</div>
	);
}
