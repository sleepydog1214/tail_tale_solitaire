import React from "react";

export function HomePage(props: {
	onNewGame: () => void;
	onCustomizeCards: () => void;
	onWagerChallenge?: () => void;
}) {
	const { onNewGame, onCustomizeCards, onWagerChallenge } = props;

	const isElectron = typeof window !== "undefined" && window.electronAPI !== undefined;

	const handleQuit = () => {
		if (isElectron && window.electronAPI) {
			window.electronAPI.quitApp();
		}
	};

	return (
		<div className="home">
			<h1 className="homeTitle">Tail Tale Solitaire</h1>
			<button onClick={onNewGame}>New Game</button>
			{onWagerChallenge && (
				<button onClick={onWagerChallenge}>🎰 Wager Challenge</button>
			)}
			<button onClick={onCustomizeCards}>Customize Cards</button>
			{isElectron && (
				<button onClick={handleQuit} className="quitButton">Quit</button>
			)}
		</div>
	);
}
