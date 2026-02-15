import React, { useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { BackendFactory } from "dnd-core";
import { HomePage } from "./HomePage";
import { SolitaireBoard } from "./SolitaireBoard";
import { CardDesigner } from "./CardDesigner";
import { GameWindow } from "./GameWindow";
import { createGameSession, type GameSessionConfig } from "./game/session";
import { loadCardDesign, saveCardDesign } from "./cardGen";
import type { CardDesign } from "./cardGen";


type AppRoute =
	| { screen: "home" }
	| { screen: "game"; session: GameSessionConfig }
	| { screen: "designer" };

export function App(props: { dndBackend?: BackendFactory } = {}) {
	const dndBackend = props.dndBackend ?? HTML5Backend;

	const [route, setRoute] = useState<AppRoute>({ screen: "home" });
	const [cardDesign, setCardDesign] = useState<CardDesign>(loadCardDesign);

	const startNewGame = useCallback(() => {
		setRoute({ screen: "game", session: createGameSession() });
	}, []);

	const goHome = useCallback(() => {
		setRoute({ screen: "home" });
	}, []);

	const openDesigner = useCallback(() => {
		setRoute({ screen: "designer" });
	}, []);

	const applyDesign = useCallback((design: CardDesign) => {
		setCardDesign(design);
		saveCardDesign(design);
		setRoute({ screen: "home" });
	}, []);

	if (route.screen === "game") {
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title="Tale Tail Solitaire">
					<SolitaireBoard
						key={route.session.seed}
						seed={route.session.seed}
						cardDesign={cardDesign}
						onRequestHome={goHome}
						onRequestNewGame={startNewGame}
					/>
				</GameWindow>
			</DndProvider>
		);
	}

	if (route.screen === "designer") {
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title="Card Designer">
					<CardDesigner
						currentDesign={cardDesign}
						onApply={applyDesign}
						onCancel={goHome}
					/>
				</GameWindow>
			</DndProvider>
		);
	}

	return (
		<DndProvider backend={dndBackend}>
			<GameWindow title="Welcome to Tale Tail Solitaire">
				<HomePage onNewGame={startNewGame} onCustomizeCards={openDesigner} />
			</GameWindow>
		</DndProvider>
	);
}
