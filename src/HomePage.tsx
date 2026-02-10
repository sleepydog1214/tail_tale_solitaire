import React from "react";

export function HomePage(props: { onNewGame: () => void }) {
	const { onNewGame } = props;

	return (
		<div className="home">
			<h1 className="homeTitle">Tail Tale Solitaire</h1>
			<button onClick={onNewGame}>New Game</button>
		</div>
	);
}
