import React from "react";

export function HomePage(props: {
	onNewGame: () => void;
	onCustomizeCards: () => void;
	onWagerChallenge?: () => void;
}) {
	const { onNewGame, onCustomizeCards, onWagerChallenge } = props;

	return (
		<div className="home">
			<h1 className="homeTitle">Tail Tale Solitaire</h1>
			<button onClick={onNewGame}>New Game</button>
			{onWagerChallenge && (
				<button onClick={onWagerChallenge}>🎰 Wager Challenge</button>
			)}
			<button onClick={onCustomizeCards}>Customize Cards</button>
		</div>
	);
}
