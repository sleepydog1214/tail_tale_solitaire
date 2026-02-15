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
	fail:        { color: "#dc2626", emoji: "�", label: "Fail" },
	partial:     { color: "#f59e0b", emoji: "🙀", label: "Partial" },
	pass:        { color: "#22c55e", emoji: "😺", label: "Pass!" },
	great:       { color: "#3b82f6", emoji: "😸", label: "Great!" },
	exceptional: { color: "#a855f7", emoji: "😻", label: "Exceptional!" },
};

export function ResultsScreen({ result, stake, onPlayAgain, onChangeContract, onHome }: ResultsScreenProps) {
	const { wagerResult, streakBonusCoins, totalPayout, piBreakdown, runSummary } = result;
	const style = OUTCOME_STYLES[wagerResult.outcome];
	const netCoins = totalPayout - stake;

	return (
		<div style={{
			padding: "30px",
			maxWidth: "600px",
			margin: "0 auto",
		}}>
			{/* Outcome Header */}
			<div style={{
				textAlign: "center",
				marginBottom: "30px",
				padding: "30px",
				background: "rgba(255,255,255,0.85)",
				borderRadius: "16px",
				border: `3px solid ${style.color}`,
			}}>
				<div style={{ fontSize: "4em", marginBottom: "10px" }}>{style.emoji}</div>
				<div style={{ fontSize: "2.2em", fontWeight: "bold", color: style.color, marginBottom: "12px" }}>
					{style.label}
				</div>
				<div style={{
					fontSize: "2em",
					fontWeight: "bold",
					color: netCoins >= 0 ? "#22c55e" : "#dc2626",
					marginTop: "12px",
				}}>
					{netCoins >= 0 ? "+" : ""}{netCoins} coins
				</div>
				{streakBonusCoins > 0 && (
				<div style={{ fontSize: "1.2em", color: "#d060a0", marginTop: "10px", fontWeight: "600" }}>
						🔥 Streak bonus: +{streakBonusCoins} coins
					</div>
				)}
			</div>

			{/* PI Breakdown */}
			<div style={{
				marginBottom: "24px",
				padding: "20px",
				background: "rgba(255,255,255,0.85)",
				borderRadius: "12px",
				border: "1.5px solid rgba(200,100,160,0.25)"
			}}>
				<div style={{
					fontWeight: "bold",
					marginBottom: "16px",
					fontSize: "1.3em",
					color: "#6b2060"
				}}>Performance Breakdown</div>
				<table style={{ width: "100%", fontSize: "1.1em", borderCollapse: "collapse" }}>
					<tbody>
						<tr style={{ lineHeight: "2.2" }}>
							<td style={{ color: "#8a5070" }}>Base Score</td>
							<td style={{ textAlign: "right", fontWeight: "600", color: "#5a2050" }}>{piBreakdown.baseScore}</td>
						</tr>
						<tr style={{ lineHeight: "2.2" }}>
							<td style={{ color: "#8a5070" }}>Time Bonus</td>
							<td style={{ textAlign: "right", fontWeight: "600", color: "#22c55e" }}>+{piBreakdown.timeBonus}</td>
						</tr>
						<tr style={{ lineHeight: "2.2" }}>
							<td style={{ color: "#8a5070" }}>Efficiency Bonus</td>
							<td style={{ textAlign: "right", fontWeight: "600", color: "#22c55e" }}>+{piBreakdown.efficiencyBonus}</td>
						</tr>
						{piBreakdown.hintPenalty > 0 && (
							<tr style={{ lineHeight: "2.2" }}>
								<td style={{ color: "#8a5070" }}>Hint Penalty</td>
								<td style={{ textAlign: "right", fontWeight: "600", color: "#dc2626" }}>−{piBreakdown.hintPenalty}</td>
							</tr>
						)}
						<tr style={{ borderTop: "2px solid rgba(200,100,160,0.25)", lineHeight: "2.4" }}>
							<td style={{ fontWeight: "bold", fontSize: "1.15em", color: "#5a2050" }}>Performance Index (PI)</td>
							<td style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.15em", color: "#d060a0" }}>{piBreakdown.adjustedPI}</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* Game Stats */}
			<div style={{
				marginBottom: "24px",
				padding: "20px",
				background: "rgba(255,255,255,0.85)",
				borderRadius: "12px",
				border: "1.5px solid rgba(200,100,160,0.25)",
				fontSize: "1.1em",
				lineHeight: "2"
			}}>
				<div style={{ color: "#5a2050", marginBottom: "8px" }}>
					{runSummary.completed ? "✅ Game completed" : "❌ Game not completed"}
				</div>
				<div style={{ color: "#5a2050", marginBottom: "8px" }}>⏱ Time: {Math.floor(runSummary.timeMs / 1000)}s</div>
				<div style={{ color: "#22c55e", fontWeight: "600" }}>🏅 XP earned: +{wagerResult.xp}</div>
			</div>

			{/* Payout Summary */}
			<div style={{
				marginBottom: "30px",
				padding: "20px",
				background: "rgba(255,255,255,0.85)",
				borderRadius: "12px",
				border: "1.5px solid rgba(200,100,160,0.25)",
				fontSize: "1.1em",
				lineHeight: "2"
			}}>
				<div style={{ color: "#8a5070", marginBottom: "8px" }}>Stake: <span style={{ fontWeight: "600", color: "#5a2050" }}>{stake} coins</span></div>
				<div style={{ color: "#8a5070", marginBottom: "8px" }}>
					Payout ({wagerResult.outcome}): <span style={{ fontWeight: "600", color: style.color }}>{wagerResult.payoutCoins} coins</span>
				</div>
				{streakBonusCoins > 0 && (
					<div style={{ color: "#8a5070", marginBottom: "8px" }}>
						Streak bonus: <span style={{ fontWeight: "600", color: "#d060a0" }}>+{streakBonusCoins} coins</span>
					</div>
				)}
				<div style={{ fontWeight: "bold", marginTop: "12px", fontSize: "1.2em", color: "#d060a0", paddingTop: "12px", borderTop: "2px solid rgba(200,100,160,0.25)" }}>
					Balance: {result.updatedWallet.coins} coins
				</div>
			</div>

			{/* Action Buttons */}
			<div style={{ display: "flex", gap: "12px" }}>
				<button
					onClick={onPlayAgain}
					style={{
						flex: 2,
						padding: "18px",
						fontSize: "1.2em",
						fontWeight: "bold",
						background: "linear-gradient(135deg, #ff9ec8 0%, #c890e0 100%)",
						color: "#fff",
						border: "2px solid #e070b0",
						borderRadius: "12px",
						cursor: "pointer",
						transition: "all 0.15s ease"
					}}
				>
					🐾 Play Again
				</button>
				<button
					onClick={onChangeContract}
					style={{
						flex: 1,
						padding: "18px",
						background: "rgba(255,255,255,0.85)",
						color: "#6b2060",
						border: "1.5px solid rgba(200,100,160,0.3)",
						borderRadius: "12px",
						cursor: "pointer",
						fontSize: "1.1em",
						fontWeight: "600",
						transition: "all 0.15s ease"
					}}
				>
					Change
				</button>
				<button
					onClick={onHome}
					style={{
						padding: "18px 24px",
						background: "rgba(255,255,255,0.85)",
						color: "#6b2060",
						border: "1.5px solid rgba(200,100,160,0.3)",
						borderRadius: "12px",
						cursor: "pointer",
						fontSize: "1.1em",
						fontWeight: "600",
						transition: "all 0.15s ease"
					}}
				>
					Home
				</button>
			</div>
		</div>
	);
}
