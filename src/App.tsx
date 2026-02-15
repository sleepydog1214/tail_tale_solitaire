import React, { useCallback, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { BackendFactory } from "dnd-core";
import { HomePage } from "./HomePage";
import { SolitaireBoard } from "./SolitaireBoard";
import { CardDesigner } from "./CardDesigner";
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

	const content = useMemo(() => {
		if (route.screen === "designer") {
			return (
				<CardDesigner
					currentDesign={cardDesign}
					onApply={applyDesign}
					onCancel={goHome}
				/>
			);
		}

		if (route.screen === "home") {
			return <HomePage onNewGame={startNewGame} onCustomizeCards={openDesigner} />;
		}

		return (
			<SolitaireBoard
				key={route.session.seed}
				seed={route.session.seed}
				cardDesign={cardDesign}
				onRequestHome={goHome}
				onRequestNewGame={startNewGame}
			/>
		);
	}, [route, goHome, startNewGame, openDesigner, applyDesign, cardDesign]);

	return (
		<DndProvider backend={dndBackend}>
			{content}
		</DndProvider>
	);
}
