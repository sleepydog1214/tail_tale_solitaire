import React, { useState, useRef, useEffect } from "react";
import type { HomeOffer} from "./game/offers";
import { getOfferMaxWin } from "./game/offers";

function KittenMascot({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 120 130" width="100" height="108" className={className} aria-label="Cute kitten mascot">
			{/* Left ear */}
			<polygon points="22,52 37,8 54,46" fill="#ffd6e0" stroke="#e8a0b8" strokeWidth="2"/>
			<polygon points="30,46 37,18 47,43" fill="#ffb0c8"/>
			{/* Right ear */}
			<polygon points="66,46 83,8 98,52" fill="#ffd6e0" stroke="#e8a0b8" strokeWidth="2"/>
			<polygon points="73,43 83,18 90,46" fill="#ffb0c8"/>
			{/* Head */}
			<ellipse cx="60" cy="68" rx="42" ry="38" fill="#ffd6e0" stroke="#e8a0b8" strokeWidth="2"/>
			{/* Eyes */}
			<ellipse cx="43" cy="62" rx="8" ry="10" fill="#3a1860"/>
			<ellipse cx="77" cy="62" rx="8" ry="10" fill="#3a1860"/>
			<ellipse cx="46" cy="58" rx="3.5" ry="4" fill="#fff"/>
			<ellipse cx="80" cy="58" rx="3.5" ry="4" fill="#fff"/>
			<ellipse cx="41" cy="64" rx="1.5" ry="2" fill="rgba(255,255,255,0.6)"/>
			<ellipse cx="75" cy="64" rx="1.5" ry="2" fill="rgba(255,255,255,0.6)"/>
			{/* Nose */}
			<polygon points="57,73 63,73 60,77" fill="#ff8faa"/>
			{/* Mouth */}
			<path d="M53,79 Q56,84 60,79 Q64,84 67,79" fill="none" stroke="#e8a0b8" strokeWidth="1.5" strokeLinecap="round"/>
			{/* Whiskers */}
			<line x1="12" y1="70" x2="38" y2="72" stroke="#e0a0b8" strokeWidth="1.2"/>
			<line x1="12" y1="78" x2="38" y2="76" stroke="#e0a0b8" strokeWidth="1.2"/>
			<line x1="82" y1="72" x2="108" y2="70" stroke="#e0a0b8" strokeWidth="1.2"/>
			<line x1="82" y1="76" x2="108" y2="78" stroke="#e0a0b8" strokeWidth="1.2"/>
			{/* Blush */}
			<ellipse cx="33" cy="74" rx="7" ry="4" fill="#ffb0c8" opacity="0.5"/>
			<ellipse cx="87" cy="74" rx="7" ry="4" fill="#ffb0c8" opacity="0.5"/>
			{/* Tail */}
			<path d="M100,105 Q118,82 108,60 Q104,50 110,42" fill="none" stroke="#ffd6e0" strokeWidth="6" strokeLinecap="round"/>
			<path d="M100,105 Q118,82 108,60 Q104,50 110,42" fill="none" stroke="#e8a0b8" strokeWidth="2" strokeLinecap="round"/>
		</svg>
	);
}

export function HomePage(props: {
	onNewGame: () => void;
	onCustomizeCards: () => void;
	onWagerChallenge?: () => void;
	players: { id: string; name: string }[];
	activePlayerId: string;
	onSetActivePlayer: (id: string) => void;
	onAddPlayer: (name: string) => void;
	activePlayerStats?: {
		gamesPlayed: number;
		wins: number;
		losses: number;
		bestScore: number | null;
		fastestWinSeconds: number | null;
	};
	offers: HomeOffer[];
	onPlayOffer: (offerId: string) => void;
}) {
	const {
		onNewGame,
		onCustomizeCards,
		onWagerChallenge,
		players,
		activePlayerId,
		onSetActivePlayer,
		onAddPlayer,
		activePlayerStats,
		offers,
		onPlayOffer,
	} = props;

	const isElectron = typeof window !== "undefined" && window.electronAPI !== undefined;

	const [showAddPlayer, setShowAddPlayer] = useState(false);
	const [newPlayerName, setNewPlayerName] = useState("");
	const addPlayerInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (showAddPlayer && addPlayerInputRef.current) {
			addPlayerInputRef.current.focus();
		}
	}, [showAddPlayer]);

	const handleAddPlayerSubmit = () => {
		const trimmed = newPlayerName.trim();
		if (trimmed) {
			onAddPlayer(trimmed);
			setNewPlayerName("");
			setShowAddPlayer(false);
		}
	};

	const handleQuit = () => {
		if (isElectron && window.electronAPI) {
			window.electronAPI.quitApp();
		}
	};

	const winRate = activePlayerStats && activePlayerStats.gamesPlayed > 0
		? Math.round((activePlayerStats.wins / activePlayerStats.gamesPlayed) * 100)
		: null;

	return (
		<div className="homePage">
			{/* Hero section */}
			<div className="homeHero">
				<KittenMascot className="homeHeroMascot" />
				<h1 className="homeTitle">Tail Tale Solitaire</h1>
				<p className="homeSubtitle">A kitten's tale about their tail~</p>
			</div>

			{/* Player bar */}
			<div className="homePlayerBar">
				<div className="playerSelectRow">
					<select
						className="playerSelect"
						value={activePlayerId}
						onChange={(e) => onSetActivePlayer(e.target.value)}
					>
						{players.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
					<button
						className="addPlayerBtn"
						onClick={() => setShowAddPlayer(!showAddPlayer)}
						title="Add Player"
					>
						+
					</button>
				</div>

				{showAddPlayer && (
					<form
						className="addPlayerForm"
						onSubmit={(e) => { e.preventDefault(); handleAddPlayerSubmit(); }}
					>
						<input
							ref={addPlayerInputRef}
							className="addPlayerInput"
							type="text"
							placeholder="Player name..."
							value={newPlayerName}
							onChange={(e) => setNewPlayerName(e.target.value)}
							maxLength={24}
						/>
						<button type="submit" className="addPlayerConfirm" disabled={!newPlayerName.trim()}>
							Add
						</button>
						<button type="button" className="addPlayerCancel" onClick={() => { setShowAddPlayer(false); setNewPlayerName(""); }}>
							Cancel
						</button>
					</form>
				)}

				{activePlayerStats && activePlayerStats.gamesPlayed > 0 && (
					<div className="statsRow">
						<div className="statBubble">
							<span className="statIcon">&#127942;</span>
							<span className="statNum">{activePlayerStats.wins}</span>
							<span className="statLbl">Wins</span>
						</div>
						<div className="statBubble">
							<span className="statIcon">&#128200;</span>
							<span className="statNum">{winRate}%</span>
							<span className="statLbl">Rate</span>
						</div>
						<div className="statBubble">
							<span className="statIcon">&#11088;</span>
							<span className="statNum">{activePlayerStats.bestScore ?? "-"}</span>
							<span className="statLbl">Best</span>
						</div>
						{activePlayerStats.fastestWinSeconds !== null && (
							<div className="statBubble">
								<span className="statIcon">&#9889;</span>
								<span className="statNum">{Math.round(activePlayerStats.fastestWinSeconds)}s</span>
								<span className="statLbl">Fastest</span>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Main actions */}
			<div className="homeActions">
				<button className="actionCard actionPrimary" onClick={onNewGame}>
					<span className="actionEmoji">&#127183;</span>
					<span className="actionLabel">Practice Game</span>
					<span className="actionDesc">Play free, earn coins on wins</span>
				</button>

				{onWagerChallenge && (
					<button className="actionCard actionWager" onClick={onWagerChallenge}>
						<span className="actionEmoji">&#128062;</span>
						<span className="actionLabel">Wager Challenge</span>
						<span className="actionDesc">Stake coins for big rewards</span>
					</button>
				)}

				<button className="actionCard actionDesign" onClick={onCustomizeCards}>
					<span className="actionEmoji">&#127912;</span>
					<span className="actionLabel">Card Designer</span>
					<span className="actionDesc">Customize your card backs</span>
				</button>
			</div>

			{/* Quick-play offers */}
			{offers.length > 0 && (
				<div className="homeOffersSection">
					<h3 className="offersTitle">Quick Play</h3>
					<div className="offersGrid">
						{offers.map((offer) => (
							<button
								key={offer.id}
								className="offerCard"
								onClick={() => onPlayOffer(offer.id)}
							>
								<span className="offerName">{offer.title}</span>
								<span className="offerDetail">
									{offer.stake} &#129689; &rarr; up to {getOfferMaxWin(offer.stake, offer.contractId)} &#129689;
								</span>
							</button>
						))}
					</div>
				</div>
			)}

			{isElectron && (
				<button className="quitButton" onClick={handleQuit}>Quit</button>
			)}
		</div>
	);
}
