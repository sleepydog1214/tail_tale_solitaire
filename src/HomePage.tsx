import React from "react";

export function HomePage(props: {
	onNewGame: () => void;
	onCustomizeCards: () => void;
}) {
	const { onNewGame, onCustomizeCards } = props;

	return (
		<div className="home">
			<h1 className="homeTitle">Tail Tale Solitaire</h1>
			<button onClick={onNewGame}>New Game</button>
			<button onClick={onCustomizeCards}>Customize Cards</button>
		</div>
	);
}
