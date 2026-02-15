import React, { useState } from "react";
import type { Contract } from "./game/contracts";
import { ALL_CONTRACTS } from "./game/contracts";
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

	const contract = ALL_CONTRACTS[selectedContractIdx];
	const unlockedTiers = getUnlockedStakeTiers(progression.rank);
	const rankDef = getRankDef(progression.rank);

	return (
		<div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
				<h2 style={{ margin: 0 }}>🎰 Wager Challenge</h2>
				<div style={{ textAlign: "right" }}>
					<div style={{ fontSize: "1.2em", fontWeight: "bold" }}>🪙 {wallet.coins} coins</div>
					<div style={{ fontSize: "0.85em", color: "#888" }}>
						{rankDef.label} • Streak: {progression.winStreak}
					</div>
				</div>
			</div>

			{/* Contract Selection */}
			<div style={{ marginBottom: "20px" }}>
				<label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Contract Mode</label>
				<div style={{ display: "flex", gap: "8px" }}>
					{ALL_CONTRACTS.map((c, i) => (
						<button
							key={c.id}
							onClick={() => { setSelectedContractIdx(i); setSelectedStake(null); }}
							style={{
								padding: "10px 16px",
								border: i === selectedContractIdx ? "2px solid #3b82f6" : "2px solid #555",
								borderRadius: "8px",
								background: i === selectedContractIdx ? "#1e3a5f" : "#2a2a2a",
								color: "#fff",
								cursor: "pointer",
								flex: 1,
							}}
						>
							<div style={{ fontWeight: "bold" }}>
								{c.mode === "classicClear" ? "⏱ Classic Clear" : "🎯 Score Target"}
							</div>
							<div style={{ fontSize: "0.8em", color: "#aaa" }}>
								{c.mode === "classicClear" ? "Complete the game fast" : "Hit PI threshold"}
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Rules Display */}
			<div style={{
				marginBottom: "20px",
				padding: "12px",
				background: "#1a1a2e",
				borderRadius: "8px",
				fontSize: "0.9em",
			}}>
				<div>⏱ Timer: {contract.timerSeconds / 60}:00</div>
				<div>🃏 Draw: {contract.rules.drawMode}</div>
				<div>↩️ Undo: {contract.rules.undoAllowed ? "Allowed" : "Disabled"}</div>
				<div>💡 Hints: {contract.rules.hintAllowed ? "Allowed (−400 PI each)" : "Disabled"}</div>
			</div>

			{/* Stake Selection */}
			<div style={{ marginBottom: "20px" }}>
				<label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Stake</label>
				<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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
									padding: "8px 16px",
									border: selected ? "2px solid #f59e0b" : "2px solid #444",
									borderRadius: "6px",
									background: selected ? "#4a3520" : disabled ? "#1a1a1a" : "#2a2a2a",
									color: disabled ? "#555" : "#fff",
									cursor: disabled ? "not-allowed" : "pointer",
									opacity: disabled ? 0.5 : 1,
									minWidth: "60px",
								}}
							>
								{tier}
								{!unlocked && <div style={{ fontSize: "0.7em", color: "#888" }}>🔒</div>}
							</button>
						);
					})}
				</div>
			</div>

			{/* Payout Preview */}
			{selectedStake && (
				<div style={{
					marginBottom: "20px",
					padding: "12px",
					background: "#1a1a2e",
					borderRadius: "8px",
				}}>
					<div style={{ fontWeight: "bold", marginBottom: "8px" }}>Payout Table (stake {selectedStake})</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", fontSize: "0.85em" }}>
						{(["fail", "partial", "pass", "great", "exceptional"] as const).map((label) => {
							const mult = contract.payouts[label];
							const payout = Math.floor(selectedStake * mult);
							const net = payout - selectedStake;
							return (
								<React.Fragment key={label}>
									<div style={{ color: OUTCOME_COLORS[label], textTransform: "capitalize" }}>{label}</div>
									<div>{mult}×</div>
									<div style={{ color: net >= 0 ? "#22c55e" : "#dc2626" }}>
										{net >= 0 ? "+" : ""}{net}
									</div>
								</React.Fragment>
							);
						})}
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div style={{ display: "flex", gap: "10px" }}>
				<button
					onClick={() => selectedStake && onStartWager(contract, selectedStake)}
					disabled={!selectedStake}
					style={{
						flex: 2,
						padding: "12px",
						fontSize: "1.1em",
						fontWeight: "bold",
						background: selectedStake ? "#16a34a" : "#333",
						color: "#fff",
						border: "none",
						borderRadius: "8px",
						cursor: selectedStake ? "pointer" : "not-allowed",
					}}
				>
					{selectedStake ? `Play for ${selectedStake} coins` : "Select a stake"}
				</button>
				<button
					onClick={onPractice}
					style={{
						flex: 1,
						padding: "12px",
						background: "#2a2a2a",
						color: "#aaa",
						border: "2px solid #444",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Practice
				</button>
				<button
					onClick={onHome}
					style={{
						padding: "12px",
						background: "#2a2a2a",
						color: "#aaa",
						border: "2px solid #444",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Home
				</button>
			</div>
		</div>
	);
}
