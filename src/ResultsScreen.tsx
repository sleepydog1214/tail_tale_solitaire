import React from "react";
import type { WagerSessionResult } from "./game/wagerSession";
import type { OutcomeLabel } from "./game/contracts";

interface ResultsScreenProps {
	result: WagerSessionResult;
	stake: number;
	onPlayAgain: () => void;
	onChangeContract: () => void;
	onHome: () => void;
}

const OUTCOME_STYLES: Record<OutcomeLabel, { color: string; emoji: string; label: string }> = {
	fail:        { color: "#dc2626", emoji: "💔", label: "Fail" },
	partial:     { color: "#f59e0b", emoji: "🔶", label: "Partial" },
	pass:        { color: "#22c55e", emoji: "✅", label: "Pass" },
	great:       { color: "#3b82f6", emoji: "🌟", label: "Great!" },
	exceptional: { color: "#a855f7", emoji: "👑", label: "Exceptional!" },
};

export function ResultsScreen({ result, stake, onPlayAgain, onChangeContract, onHome }: ResultsScreenProps) {
	const { wagerResult, streakBonusCoins, totalPayout, piBreakdown, runSummary } = result;
	const style = OUTCOME_STYLES[wagerResult.outcome];
	const netCoins = totalPayout - stake;

	return (
		<div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", fontFamily: "sans-serif" }}>
			{/* Outcome Header */}
			<div style={{
				textAlign: "center",
				marginBottom: "24px",
				padding: "20px",
				background: "#1a1a2e",
				borderRadius: "12px",
				border: `2px solid ${style.color}`,
			}}>
				<div style={{ fontSize: "3em" }}>{style.emoji}</div>
				<div style={{ fontSize: "1.8em", fontWeight: "bold", color: style.color }}>
					{style.label}
				</div>
				<div style={{
					fontSize: "1.4em",
					fontWeight: "bold",
					color: netCoins >= 0 ? "#22c55e" : "#dc2626",
					marginTop: "8px",
				}}>
					{netCoins >= 0 ? "+" : ""}{netCoins} coins
				</div>
				{streakBonusCoins > 0 && (
					<div style={{ fontSize: "0.9em", color: "#f59e0b", marginTop: "4px" }}>
						🔥 Streak bonus: +{streakBonusCoins} coins
					</div>
				)}
			</div>

			{/* PI Breakdown */}
			<div style={{
				marginBottom: "20px",
				padding: "12px",
				background: "#1a1a2e",
				borderRadius: "8px",
			}}>
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>Performance Breakdown</div>
				<table style={{ width: "100%", fontSize: "0.9em" }}>
					<tbody>
						<tr>
							<td>Base Score</td>
							<td style={{ textAlign: "right" }}>{piBreakdown.baseScore}</td>
						</tr>
						<tr>
							<td>Time Bonus</td>
							<td style={{ textAlign: "right" }}>+{piBreakdown.timeBonus}</td>
						</tr>
						<tr>
							<td>Efficiency Bonus</td>
							<td style={{ textAlign: "right" }}>+{piBreakdown.efficiencyBonus}</td>
						</tr>
						{piBreakdown.hintPenalty > 0 && (
							<tr>
								<td>Hint Penalty</td>
								<td style={{ textAlign: "right", color: "#dc2626" }}>−{piBreakdown.hintPenalty}</td>
							</tr>
						)}
						<tr style={{ borderTop: "1px solid #444", fontWeight: "bold" }}>
							<td>Performance Index (PI)</td>
							<td style={{ textAlign: "right" }}>{piBreakdown.adjustedPI}</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* Game Stats */}
			<div style={{
				marginBottom: "20px",
				padding: "12px",
				background: "#1a1a2e",
				borderRadius: "8px",
				fontSize: "0.9em",
			}}>
				<div>
					{runSummary.completed ? "✅ Game completed" : "❌ Game not completed"}
				</div>
				<div>⏱ Time: {Math.floor(runSummary.timeMs / 1000)}s</div>
				<div>🏅 XP earned: +{wagerResult.xp}</div>
			</div>

			{/* Payout Summary */}
			<div style={{
				marginBottom: "24px",
				padding: "12px",
				background: "#1a1a2e",
				borderRadius: "8px",
				fontSize: "0.9em",
			}}>
				<div>Stake: {stake} coins</div>
				<div>Payout ({wagerResult.outcome}): {wagerResult.payoutCoins} coins</div>
				{streakBonusCoins > 0 && <div>Streak bonus: +{streakBonusCoins} coins</div>}
				<div style={{ fontWeight: "bold", marginTop: "4px" }}>
					Balance: {result.updatedWallet.coins} coins
				</div>
			</div>

			{/* Action Buttons */}
			<div style={{ display: "flex", gap: "10px" }}>
				<button
					onClick={onPlayAgain}
					style={{
						flex: 2,
						padding: "12px",
						fontSize: "1.1em",
						fontWeight: "bold",
						background: "#16a34a",
						color: "#fff",
						border: "none",
						borderRadius: "8px",
						cursor: "pointer",
					}}
				>
					Play Again
				</button>
				<button
					onClick={onChangeContract}
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
					Change
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
