import React, { useState } from "react";
import type { Contract, ContractRules } from "./game/contracts";
import { ALL_CONTRACTS, DEFAULT_CONTRACT_RULES, DEFAULT_TIMER_SECONDS } from "./game/contracts";
import type { PlayerWallet } from "./game/economy";
import { canAffordStake } from "./game/economy";
import type { PlayerProgression } from "./game/progression";
import { getUnlockedStakeTiers, getRankDef } from "./game/progression";

interface WagerScreenProps {
	wallet: PlayerWallet;
	progression: PlayerProgression;
	onStartWager: (contract: Contract, stake: number) => void;
	onPractice: () => void;
	onHome: () => void;
}

const TIMER_OPTIONS = [
	{ label: "3:00", value: 180 },
	{ label: "5:00", value: 300 },
	{ label: "7:00", value: 420 },
	{ label: "10:00", value: 600 },
];

const OUTCOME_COLORS: Record<string, string> = {
	fail: "#dc2626",
	partial: "#f59e0b",
	pass: "#22c55e",
	great: "#3b82f6",
	exceptional: "#a855f7",
};

export function WagerScreen({ wallet, progression, onStartWager, onPractice, onHome }: WagerScreenProps) {
	const [selectedContractIdx, setSelectedContractIdx] = useState(0);
	const [selectedStake, setSelectedStake] = useState<number | null>(null);
	const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
	const [drawMode, setDrawMode] = useState<1 | 3>(DEFAULT_CONTRACT_RULES.drawMode);
	const [undoAllowed, setUndoAllowed] = useState(DEFAULT_CONTRACT_RULES.undoAllowed);
	const [hintAllowed, setHintAllowed] = useState(DEFAULT_CONTRACT_RULES.hintAllowed);

	const baseContract = ALL_CONTRACTS[selectedContractIdx];

	// Create customized contract with user's configuration
	const contract: Contract = {
		...baseContract,
		timerSeconds,
		rules: {
			drawMode,
			undoAllowed,
			hintAllowed,
		},
	};

	const unlockedTiers = getUnlockedStakeTiers(progression.rank);
	const rankDef = getRankDef(progression.rank);

	return (
		<div style={{
			padding: "30px",
			maxWidth: "700px",
			margin: "0 auto",
			fontFamily: "sans-serif",
			backgroundColor: "#0a0a0a",
			minHeight: "100vh"
		}}>
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "30px",
				padding: "20px",
				backgroundColor: "#1a1a1a",
				borderRadius: "12px",
				border: "2px solid #333"
			}}>
				<h2 style={{ margin: 0, fontSize: "2em", color: "#fff" }}>🎰 Wager Challenge</h2>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "1.5em", fontWeight: "bold", color: "#fbbf24" }}>🪙 {wallet.coins} coins</div>
					<div style={{ fontSize: "1em", color: "#9ca3af", marginTop: "4px" }}>
						{rankDef.label} • Streak: {progression.winStreak}
					</div>
				</div>
			</div>

			{/* Contract Selection */}
			<div style={{ marginBottom: "24px" }}>
				<label style={{
					fontWeight: "bold",
					display: "block",
					marginBottom: "12px",
					fontSize: "1.2em",
					color: "#e5e7eb"
				}}>Contract Mode</label>
				<div style={{ display: "flex", gap: "12px" }}>
					{ALL_CONTRACTS.map((c, i) => (
						<button
							key={c.id}
							onClick={() => { setSelectedContractIdx(i); setSelectedStake(null); }}
							style={{
								padding: "16px 20px",
								border: i === selectedContractIdx ? "3px solid #3b82f6" : "2px solid #444",
								borderRadius: "12px",
								background: i === selectedContractIdx ? "#1e3a5f" : "#1f1f1f",
								color: "#fff",
								cursor: "pointer",
								flex: 1,
								transition: "all 0.2s"
							}}
						>
							<div style={{ fontWeight: "bold", fontSize: "1.1em", marginBottom: "6px" }}>
								{c.mode === "classicClear" ? "⏱ Classic Clear" : "🎯 Score Target"}
							</div>
							<div style={{ fontSize: "0.9em", color: "#9ca3af" }}>
								{c.mode === "classicClear" ? "Complete the game fast" : "Hit PI threshold"}
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Configuration Options */}
			<div style={{ marginBottom: "24px" }}>
				<label style={{
					fontWeight: "bold",
					display: "block",
					marginBottom: "12px",
					fontSize: "1.2em",
					color: "#e5e7eb"
				}}>Game Configuration</label>

				{/* Timer Selection */}
				<div style={{ marginBottom: "16px" }}>
					<div style={{ fontSize: "0.95em", color: "#9ca3af", marginBottom: "8px" }}>⏱ Timer</div>
					<div style={{ display: "flex", gap: "8px" }}>
						{TIMER_OPTIONS.map(option => (
							<button
								key={option.value}
								onClick={() => setTimerSeconds(option.value)}
								style={{
									padding: "8px 16px",
									border: timerSeconds === option.value ? "2px solid #3b82f6" : "2px solid #444",
									borderRadius: "8px",
									background: timerSeconds === option.value ? "#1e3a5f" : "#1f1f1f",
									color: "#fff",
									cursor: "pointer",
									fontSize: "0.95em",
									fontWeight: timerSeconds === option.value ? "bold" : "normal",
									transition: "all 0.2s"
								}}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>

				{/* Draw Mode Selection */}
				<div style={{ marginBottom: "16px" }}>
					<div style={{ fontSize: "0.95em", color: "#9ca3af", marginBottom: "8px" }}>🃏 Draw Mode</div>
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							onClick={() => setDrawMode(1)}
							style={{
								padding: "8px 16px",
								border: drawMode === 1 ? "2px solid #3b82f6" : "2px solid #444",
								borderRadius: "8px",
								background: drawMode === 1 ? "#1e3a5f" : "#1f1f1f",
								color: "#fff",
								cursor: "pointer",
								fontSize: "0.95em",
								fontWeight: drawMode === 1 ? "bold" : "normal",
								transition: "all 0.2s"
							}}
						>
							Draw 1
						</button>
						<button
							onClick={() => setDrawMode(3)}
							style={{
								padding: "8px 16px",
								border: drawMode === 3 ? "2px solid #3b82f6" : "2px solid #444",
								borderRadius: "8px",
								background: drawMode === 3 ? "#1e3a5f" : "#1f1f1f",
								color: "#fff",
								cursor: "pointer",
								fontSize: "0.95em",
								fontWeight: drawMode === 3 ? "bold" : "normal",
								transition: "all 0.2s"
							}}
						>
							Draw 3
						</button>
					</div>
				</div>

				{/* Undo Toggle */}
				<div style={{ marginBottom: "16px" }}>
					<label style={{
						display: "flex",
						alignItems: "center",
						cursor: "pointer",
						fontSize: "0.95em",
						color: "#e5e7eb"
					}}>
						<input
							type="checkbox"
							checked={undoAllowed}
							onChange={(e) => setUndoAllowed(e.target.checked)}
							style={{
								width: "20px",
								height: "20px",
								marginRight: "10px",
								cursor: "pointer"
							}}
						/>
						<span>↩️ Allow Undo</span>
					</label>
				</div>

				{/* Hints Toggle */}
				<div>
					<label style={{
						display: "flex",
						alignItems: "center",
						cursor: "pointer",
						fontSize: "0.95em",
						color: "#e5e7eb"
					}}>
						<input
							type="checkbox"
							checked={hintAllowed}
							onChange={(e) => setHintAllowed(e.target.checked)}
							style={{
								width: "20px",
								height: "20px",
								marginRight: "10px",
								cursor: "pointer"
							}}
						/>
						<span>💡 Allow Hints {hintAllowed && <span style={{ color: "#9ca3af" }}>(−400 PI each)</span>}</span>
					</label>
				</div>
			</div>

			{/* Stake Selection */}
			<div style={{ marginBottom: "24px" }}>
				<label style={{
					fontWeight: "bold",
					display: "block",
					marginBottom: "12px",
					fontSize: "1.2em",
					color: "#e5e7eb"
				}}>Stake</label>
				<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
					{contract.stakeTiers.map((tier) => {
						const unlocked = unlockedTiers.includes(tier);
						const affordable = canAffordStake(wallet, tier);
						const disabled = !unlocked || !affordable;
						const selected = selectedStake === tier;

						return (
							<button
								key={tier}
								onClick={() => !disabled && setSelectedStake(tier)}
								disabled={disabled}
								style={{
									padding: "12px 20px",
									border: selected ? "3px solid #fbbf24" : "2px solid #444",
									borderRadius: "10px",
									background: selected ? "#78350f" : disabled ? "#0f0f0f" : "#1f1f1f",
									color: disabled ? "#4b5563" : "#fff",
									cursor: disabled ? "not-allowed" : "pointer",
									opacity: disabled ? 0.5 : 1,
									minWidth: "80px",
									fontSize: "1.1em",
									fontWeight: "bold",
									transition: "all 0.2s"
								}}
							>
								{tier}
								{!unlocked && <div style={{ fontSize: "0.8em", color: "#6b7280", marginTop: "2px" }}>🔒</div>}
							</button>
						);
					})}
				</div>
			</div>

			{/* Payout Preview */}
			{selectedStake && (
				<div style={{
					marginBottom: "24px",
					padding: "20px",
					background: "#1a1a1a",
					borderRadius: "12px",
					border: "2px solid #333"
				}}>
					<div style={{
						fontWeight: "bold",
						marginBottom: "16px",
						fontSize: "1.2em",
						color: "#e5e7eb"
					}}>Payout Table (stake {selectedStake})</div>
					<div style={{
						display: "grid",
						gridTemplateColumns: "auto auto auto",
						gap: "12px 20px",
						fontSize: "1.05em",
						alignItems: "center"
					}}>
						<div style={{ fontWeight: "bold", color: "#9ca3af" }}>Outcome</div>
						<div style={{ fontWeight: "bold", color: "#9ca3af", textAlign: "center" }}>Multiplier</div>
						<div style={{ fontWeight: "bold", color: "#9ca3af", textAlign: "right" }}>Net Gain</div>
						{(["fail", "partial", "pass", "great", "exceptional"] as const).map((label) => {
							const mult = contract.payouts[label];
							const payout = Math.floor(selectedStake * mult);
							const net = payout - selectedStake;
							return (
								<React.Fragment key={label}>
									<div style={{
										color: OUTCOME_COLORS[label],
										textTransform: "capitalize",
										fontWeight: "600"
									}}>{label}</div>
									<div style={{ textAlign: "center", color: "#e5e7eb" }}>{mult}×</div>
									<div style={{
										color: net >= 0 ? "#22c55e" : "#dc2626",
										fontWeight: "bold",
										textAlign: "right"
									}}>
										{net >= 0 ? "+" : ""}{net}
									</div>
								</React.Fragment>
							);
						})}
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div style={{ display: "flex", gap: "12px" }}>
				<button
					onClick={() => selectedStake && onStartWager(contract, selectedStake)}
					disabled={!selectedStake}
					style={{
						flex: 2,
						padding: "18px",
						fontSize: "1.2em",
						fontWeight: "bold",
						background: selectedStake ? "#16a34a" : "#1f1f1f",
						color: selectedStake ? "#fff" : "#6b7280",
						border: selectedStake ? "2px solid #22c55e" : "2px solid #444",
						borderRadius: "12px",
						cursor: selectedStake ? "pointer" : "not-allowed",
						transition: "all 0.2s"
					}}
				>
					{selectedStake ? `🎮 Play for ${selectedStake} coins` : "Select a stake"}
				</button>
				<button
					onClick={onPractice}
					style={{
						flex: 1,
						padding: "18px",
						background: "#1f1f1f",
						color: "#d1d5db",
						border: "2px solid #444",
						borderRadius: "12px",
						cursor: "pointer",
						fontSize: "1.1em",
						fontWeight: "600",
						transition: "all 0.2s"
					}}
				>
					Practice
				</button>
				<button
					onClick={onHome}
					style={{
						padding: "18px 24px",
						background: "#1f1f1f",
						color: "#d1d5db",
						border: "2px solid #444",
						borderRadius: "12px",
						cursor: "pointer",
						fontSize: "1.1em",
						fontWeight: "600",
						transition: "all 0.2s"
					}}
				>
					Home
				</button>
			</div>
		</div>
	);
}
