import React, { useCallback, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { BackendFactory } from "dnd-core";
import { HomePage } from "./HomePage";
import { SolitaireBoard } from "./SolitaireBoard";
import { createGameSession, type GameSessionConfig } from "./game/session";


type AppRoute =
	| { screen: "home" }
	| { screen: "game"; session: GameSessionConfig };

export function App(props: { dndBackend?: BackendFactory } = {}) {
	const dndBackend = props.dndBackend ?? HTML5Backend;

	const [route, setRoute] = useState<AppRoute>({ screen: "home" });

	const startNewGame = useCallback(() => {
		setRoute({ screen: "game", session: createGameSession() });
	}, []);

	const goHome = useCallback(() => {
		setRoute({ screen: "home" });
	}, []);

	const content = useMemo(() => {
		if (route.screen === "home") {
			return <HomePage onNewGame={startNewGame} />;
		}

		return (
			<SolitaireBoard
				key={route.session.seed}
				seed={route.session.seed}
				onRequestHome={goHome}
				onRequestNewGame={startNewGame}
			/>
		);
	}, [route, goHome, startNewGame]);

	return (
		<DndProvider backend={dndBackend}>
			{content}
		</DndProvider>
	);
}
