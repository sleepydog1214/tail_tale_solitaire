import React from "react";

function KittenMascot() {
	return (
		<svg viewBox="0 0 120 130" width="100" height="108" className="kittenMascot" aria-label="Cute kitten mascot">
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
			<div className="homeCatHeader">
				<KittenMascot />
				<div>
					<h1 className="homeTitle">Tail Tale Solitaire</h1>
					<p className="homeSubtitle">A kitten's tale about their tail~</p>
				</div>
			</div>
			<div className="homePawDivider">🐾 🐾 🐾 🐾 🐾</div>
			<button onClick={onNewGame}>🃏 New Game</button>
			{onWagerChallenge && (
				<button onClick={onWagerChallenge}>🐾 Wager Challenge</button>
			)}
			<button onClick={onCustomizeCards}>🎨 Customize Cards</button>
			{isElectron && (
				<button onClick={handleQuit} className="quitButton">Quit</button>
			)}
		</div>
	);
}
