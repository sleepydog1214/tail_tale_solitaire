import React, { useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { BackendFactory } from "dnd-core";
import { HomePage } from "./HomePage";
import { SolitaireBoard } from "./SolitaireBoard";
import { CardDesigner } from "./CardDesigner";
import { GameWindow } from "./GameWindow";
import { WagerScreen } from "./WagerScreen";
import { ResultsScreen } from "./ResultsScreen";
import { createGameSession, type GameSessionConfig } from "./game/session";
import { loadCardDesign, saveCardDesign } from "./cardGen";
import type { CardDesign } from "./cardGen";
import type { Contract } from "./game/contracts";
import type { GameState } from "./KlondikeGame";
import {
	loadWallet,
	saveWallet,
	createWallet,
	grantDailyCoins,
	checkBankruptcy,
	addCoins,
	PRACTICE_WIN_COINS,
} from "./game/economy";
import type { PlayerWallet } from "./game/economy";
import { loadProgression, saveProgression, createProgression } from "./game/progression";
import type { PlayerProgression } from "./game/progression";
import {
	beginWager,
	completeWager,
	type WagerSelection,
	type WagerSessionResult,
} from "./game/wagerSession";

type AppRoute =
	| { screen: "home" }
	| { screen: "game"; session: GameSessionConfig }
	| { screen: "designer" }
	| { screen: "wager" }
	| { screen: "wagerGame"; session: GameSessionConfig; selection: WagerSelection }
	| { screen: "results"; result: WagerSessionResult; stake: number; selection: WagerSelection };

function getTodayDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export function App(props: { dndBackend?: BackendFactory } = {}) {
	const dndBackend = props.dndBackend ?? HTML5Backend;

	const [route, setRoute] = useState<AppRoute>({ screen: "home" });
	const [cardDesign, setCardDesign] = useState<CardDesign>(loadCardDesign);
	const [wallet, setWallet] = useState<PlayerWallet>(() => {
		let w = loadWallet();
		const [granted, didGrant] = grantDailyCoins(w, getTodayDate());
		if (didGrant) {
			w = granted;
			saveWallet(w);
		}
		const [bailed, didBail] = checkBankruptcy(w, getTodayDate());
		if (didBail) {
			w = bailed;
			saveWallet(w);
		}
		return w;
	});
	const [progression, setProgression] = useState<PlayerProgression>(loadProgression);

	const updateWallet = useCallback((w: PlayerWallet) => {
		setWallet(w);
		saveWallet(w);
	}, []);

	const updateProgression = useCallback((p: PlayerProgression) => {
		setProgression(p);
		saveProgression(p);
	}, []);

	const startNewGame = useCallback(() => {
		setRoute({ screen: "game", session: createGameSession() });
	}, []);

	const goHome = useCallback(() => {
		setRoute({ screen: "home" });
	}, []);

	const openDesigner = useCallback(() => {
		setRoute({ screen: "designer" });
	}, []);

	const openWager = useCallback(() => {
		setRoute({ screen: "wager" });
	}, []);

	const applyDesign = useCallback((design: CardDesign) => {
		setCardDesign(design);
		saveCardDesign(design);
		setRoute({ screen: "home" });
	}, []);

	const startWager = useCallback((contract: Contract, stake: number) => {
		const updatedWallet = beginWager(wallet, stake);
		updateWallet(updatedWallet);
		const session = createGameSession();
		const selection: WagerSelection = { contract, stake };
		setRoute({ screen: "wagerGame", session, selection });
	}, [wallet, updateWallet]);

	const handleWagerGameFinished = useCallback((finalState: GameState, selection: WagerSelection) => {
		const result = completeWager(selection, finalState, wallet, progression);
		updateWallet(result.updatedWallet);
		updateProgression(result.updatedProgression);
		setRoute({ screen: "results", result, stake: selection.stake, selection });
	}, [wallet, progression, updateWallet, updateProgression]);

	const handlePracticeFinished = useCallback((finalState: GameState) => {
		if (
			finalState.foundations.H.length === 13 &&
			finalState.foundations.D.length === 13 &&
			finalState.foundations.C.length === 13 &&
			finalState.foundations.S.length === 13
		) {
			const updated = addCoins(wallet, PRACTICE_WIN_COINS);
			updateWallet(updated);
		}
	}, [wallet, updateWallet]);

	// Wager game screen
	if (route.screen === "wagerGame") {
		const { session, selection } = route;
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title={`Wager: ${selection.contract.mode === "classicClear" ? "Classic Clear" : "Score Target"} — ${selection.stake} coins`}>
					<SolitaireBoard
						key={session.seed}
						seed={session.seed}
						cardDesign={cardDesign}
						matchDurationSeconds={selection.contract.timerSeconds}
						turnCount={selection.contract.rules.drawMode}
						onGameFinished={(state) => handleWagerGameFinished(state, selection)}
						onRequestHome={goHome}
					/>
				</GameWindow>
			</DndProvider>
		);
	}

	// Results screen
	if (route.screen === "results") {
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title="Wager Results">
					<ResultsScreen
						result={route.result}
						stake={route.stake}
						onPlayAgain={() => startWager(route.selection.contract, route.selection.stake)}
						onChangeContract={openWager}
						onHome={goHome}
					/>
				</GameWindow>
			</DndProvider>
		);
	}

	// Wager selection screen
	if (route.screen === "wager") {
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title="Wager Challenge">
					<WagerScreen
						wallet={wallet}
						progression={progression}
						onStartWager={startWager}
						onPractice={startNewGame}
						onHome={goHome}
					/>
				</GameWindow>
			</DndProvider>
		);
	}

	// Practice game screen
	if (route.screen === "game") {
		return (
			<DndProvider backend={dndBackend}>
				<GameWindow title="Tale Tail Solitaire — Practice">
					<SolitaireBoard
						key={route.session.seed}
						seed={route.session.seed}
						cardDesign={cardDesign}
						onGameFinished={handlePracticeFinished}
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
				<HomePage onNewGame={startNewGame} onCustomizeCards={openDesigner} onWagerChallenge={openWager} />
			</GameWindow>
		</DndProvider>
	);
}
