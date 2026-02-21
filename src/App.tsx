import React, { useCallback, useEffect, useState, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
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
import { ALL_CONTRACTS } from "./game/contracts";
import { HOME_OFFERS } from "./game/offers";
import type { GameState } from "./KlondikeGame";
import {
	createWallet,
	grantDailyCoins,
	checkBankruptcy,
	addCoins,
	PRACTICE_WIN_COINS,
	loadWalletForPlayer,
	saveWalletForPlayer,
} from "./game/economy";
import type { PlayerWallet } from "./game/economy";
import { createProgression, loadProgressionForPlayer, saveProgressionForPlayer } from "./game/progression";
import type { PlayerProgression } from "./game/progression";
import {
	ensureDefaultPlayer,
	loadPlayers,
	setActivePlayerId,
	createPlayer,
} from "./players/playerStore";
import type { PlayerProfile } from "./players/playerStore";
import { recordGameResult, getPlayerStats } from "./players/statsStore";
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

type GameMode = "practice" | "wager";

const isTouchDevice = () =>
	"ontouchstart" in window || navigator.maxTouchPoints > 0;

function getTodayDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function generateResultId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return Date.now().toString() + Math.random().toString(36).substring(2);
}

function isWin(state: GameState): boolean {
	const f = state.foundations;
	return f.H.length === 13 && f.D.length === 13 && f.C.length === 13 && f.S.length === 13;
}

/** Load a player's wallet and apply daily grant / bankruptcy protection. */
function loadAndGrantWallet(playerId: string): PlayerWallet {
	let w = loadWalletForPlayer(playerId);
	const today = getTodayDate();

	const [granted, didGrant] = grantDailyCoins(w, today);
	if (didGrant) w = granted;

	const [bailed, didBail] = checkBankruptcy(w, today);
	if (didBail) w = bailed;

	if (didGrant || didBail) {
		saveWalletForPlayer(playerId, w);
	}

	return w;
}

export function App(props: { dndBackend?: BackendFactory } = {}) {
	const dndBackend = useMemo(() => {
		if (props.dndBackend) return props.dndBackend;
		return isTouchDevice() ? TouchBackend : HTML5Backend;
	}, [props.dndBackend]);

	const dndOptions = useMemo(() => {
		return dndBackend === TouchBackend ? { enableMouseEvents: true } : {};
	}, [dndBackend]);

	const [route, setRoute] = useState<AppRoute>({ screen: "home" });
	const [cardDesign, setCardDesign] = useState<CardDesign>(loadCardDesign);
	const [players, setPlayers] = useState<PlayerProfile[]>([]);
	const [activePlayerId, setActivePlayerIdState] = useState("");
	const [wallet, setWallet] = useState<PlayerWallet>(createWallet);
	const [progression, setProgression] = useState<PlayerProgression>(createProgression);
	const [gameStartedAtMsByMode, setGameStartedAtMsByMode] = useState<Record<GameMode, number>>({
		practice: 0,
		wager: 0,
	});

	const activePlayerStats = useMemo(() => {
		if (!activePlayerId) return undefined;
		return getPlayerStats(activePlayerId);
	}, [activePlayerId]);

	// Bootstrap on mount
	useEffect(() => {
		const { players: bootPlayers, activePlayerId: bootId } = ensureDefaultPlayer();
		setPlayers(bootPlayers);
		setActivePlayerIdState(bootId);
		setWallet(loadAndGrantWallet(bootId));
		setProgression(loadProgressionForPlayer(bootId));
	}, []);

	// Switch player data when activePlayerId changes (after initial mount)
	useEffect(() => {
		if (!activePlayerId) return;
		setActivePlayerId(activePlayerId);
		setWallet(loadAndGrantWallet(activePlayerId));
		setProgression(loadProgressionForPlayer(activePlayerId));
	}, [activePlayerId]);

	const updateWallet = useCallback((w: PlayerWallet) => {
		setWallet(w);
		if (activePlayerId) saveWalletForPlayer(activePlayerId, w);
	}, [activePlayerId]);

	const updateProgression = useCallback((p: PlayerProgression) => {
		setProgression(p);
		if (activePlayerId) saveProgressionForPlayer(activePlayerId, p);
	}, [activePlayerId]);

	// ── Navigation ────────────────────────────────────────────────────────

	const goHome = useCallback(() => setRoute({ screen: "home" }), []);
	const openDesigner = useCallback(() => setRoute({ screen: "designer" }), []);
	const openWager = useCallback(() => setRoute({ screen: "wager" }), []);

	const startNewGame = useCallback(() => {
		setGameStartedAtMsByMode((prev) => ({ ...prev, practice: Date.now() }));
		setRoute({ screen: "game", session: createGameSession() });
	}, []);

	const applyDesign = useCallback((design: CardDesign) => {
		setCardDesign(design);
		saveCardDesign(design);
		setRoute({ screen: "home" });
	}, []);

	// ── Wager flow ────────────────────────────────────────────────────────

	const startWager = useCallback((contract: Contract, stake: number) => {
		setGameStartedAtMsByMode((prev) => ({ ...prev, wager: Date.now() }));
		updateWallet(beginWager(wallet, stake));
		setRoute({
			screen: "wagerGame",
			session: createGameSession(),
			selection: { contract, stake },
		});
	}, [wallet, updateWallet]);

	const handlePlayOffer = useCallback((offerId: string) => {
		const offer = HOME_OFFERS.find((o) => o.id === offerId);
		if (!offer) return;
		const contract = ALL_CONTRACTS.find((c) => c.id === offer.contractId);
		if (!contract) return;
		startWager(contract, offer.stake);
	}, [startWager]);

	// ── Game finished handlers ────────────────────────────────────────────

	const recordResult = useCallback((mode: GameMode, finalState: GameState, extra?: { contractId?: string; stake?: number; payoutCoins?: number }) => {
		if (!activePlayerId) return;
		const finishedAtMs = Date.now();
		const startedAtMs = gameStartedAtMsByMode[mode] || finishedAtMs;
		recordGameResult({
			id: generateResultId(),
			playerId: activePlayerId,
			mode,
			seed: finalState.seed,
			startedAtMs,
			finishedAtMs,
			durationSeconds:
				typeof finalState.timeElapsedSeconds === "number"
					? finalState.timeElapsedSeconds
					: Math.max(0, (finishedAtMs - startedAtMs) / 1000),
			won: isWin(finalState),
			score: finalState.score.totalScore,
			...extra,
		});
	}, [activePlayerId, gameStartedAtMsByMode]);

	const handleWagerGameFinished = useCallback((finalState: GameState, selection: WagerSelection) => {
		const result = completeWager(selection, finalState, wallet, progression);
		updateWallet(result.updatedWallet);
		updateProgression(result.updatedProgression);
		recordResult("wager", finalState, {
			contractId: selection.contract.id,
			stake: selection.stake,
			payoutCoins: result.totalPayout,
		});
		setRoute({ screen: "results", result, stake: selection.stake, selection });
	}, [wallet, progression, updateWallet, updateProgression, recordResult]);

	const handlePracticeFinished = useCallback((finalState: GameState) => {
		if (isWin(finalState)) {
			updateWallet(addCoins(wallet, PRACTICE_WIN_COINS));
		}
		recordResult("practice", finalState);
	}, [wallet, updateWallet, recordResult]);

	// ── Player management ─────────────────────────────────────────────────

	const handleAddPlayer = useCallback((name: string) => {
		const newPlayer = createPlayer(name);
		setPlayers(loadPlayers());
		setActivePlayerIdState(newPlayer.id);
	}, []);

	const handleSwitchPlayer = useCallback((id: string) => {
		setActivePlayerIdState(id);
		setPlayers(loadPlayers());
	}, []);

	// ── Render ────────────────────────────────────────────────────────────

	const renderContent = () => {
		switch (route.screen) {
			case "wagerGame": {
				const { session, selection } = route;
				const modeLabel = selection.contract.mode === "classicClear" ? "Classic Clear" : "Score Target";
				return (
					<GameWindow title={`Wager: ${modeLabel} — ${selection.stake} coins`}>
						<SolitaireBoard
							key={session.seed}
							seed={session.seed}
							cardDesign={cardDesign}
							matchDurationSeconds={selection.contract.timerSeconds}
							turnCount={selection.contract.rules.drawMode}
							undoAllowed={selection.contract.rules.undoAllowed}
							onGameFinished={(state) => handleWagerGameFinished(state, selection)}
							onRequestHome={goHome}
						/>
					</GameWindow>
				);
			}
			case "results":
				return (
					<GameWindow title="Wager Results">
						<ResultsScreen
							result={route.result}
							stake={route.stake}
							onPlayAgain={() => startWager(route.selection.contract, route.selection.stake)}
							onChangeContract={openWager}
							onHome={goHome}
						/>
					</GameWindow>
				);
			case "wager":
				return (
					<GameWindow title="Wager Challenge">
						<WagerScreen
							wallet={wallet}
							progression={progression}
							onStartWager={startWager}
							onPractice={startNewGame}
							onHome={goHome}
						/>
					</GameWindow>
				);
			case "game":
				return (
					<GameWindow title="Tail Tale Solitaire — Practice">
						<SolitaireBoard
							key={route.session.seed}
							seed={route.session.seed}
							cardDesign={cardDesign}
							onGameFinished={handlePracticeFinished}
							onRequestHome={goHome}
							onRequestNewGame={startNewGame}
						/>
					</GameWindow>
				);
			case "designer":
				return (
					<GameWindow title="Card Designer">
						<CardDesigner
							currentDesign={cardDesign}
							onApply={applyDesign}
							onCancel={goHome}
						/>
					</GameWindow>
				);
			default:
				return (
					<GameWindow title="Tail Tale Solitaire">
						<HomePage
							onNewGame={startNewGame}
							onCustomizeCards={openDesigner}
							onWagerChallenge={openWager}
							players={players}
							activePlayerId={activePlayerId}
							onSetActivePlayer={handleSwitchPlayer}
							onAddPlayer={handleAddPlayer}
							activePlayerStats={activePlayerStats}
							offers={HOME_OFFERS}
							onPlayOffer={handlePlayOffer}
						/>
					</GameWindow>
				);
		}
	};

	return (
		<DndProvider backend={dndBackend} options={dndOptions}>
			{renderContent()}
		</DndProvider>
	);
}
