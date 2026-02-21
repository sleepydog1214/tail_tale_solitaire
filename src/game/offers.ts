import { ALL_CONTRACTS } from "./contracts";

export type HomeOffer = {
	id: string;
	title: string;
	contractId: string;
	stake: number;
};

export const HOME_OFFERS: HomeOffer[] = [
	{
		id: "classic-low",
		title: "Classic Quick-start (Low Stake)",
		contractId: "classic-clear-5",
		stake: 10,
	},
	{
		id: "classic-med",
		title: "Classic Pro (Med Stake)",
		contractId: "classic-clear-5",
		stake: 100,
	},
	{
		id: "classic-high",
		title: "Classic Whale (High Stake)",
		contractId: "classic-clear-5",
		stake: 500,
	},
	{
		id: "score-low",
		title: "Score Run (Low Stake)",
		contractId: "score-target-5",
		stake: 25,
	},
	{
		id: "score-med",
		title: "Score Master (Med Stake)",
		contractId: "score-target-5",
		stake: 250,
	},
	{
		id: "score-high",
		title: "Score Elite (High Stake)",
		contractId: "score-target-5",
		stake: 1000,
	},
];

export function getOfferMaxWin(stake: number, contractId: string): number {
	const contract = ALL_CONTRACTS.find((c) => c.id === contractId);
	if (!contract) return 0;
	return Math.floor(stake * contract.payouts.exceptional);
}
