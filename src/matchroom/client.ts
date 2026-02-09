import { doc, collection, getDoc, onSnapshot, type Firestore, type Unsubscribe } from "firebase/firestore";
import { httpsCallable, type Functions } from "firebase/functions";

import type { TournamentDoc, UserDoc, ScoreDoc } from "./types";

export type CreateTournamentParams = {
	entryFeeCoins: number;
	maxPlayers: number;
	matchDurationSeconds?: number;
	displayName?: string | null;
};


export async function createTournament(functions: Functions, params: CreateTournamentParams): Promise<string> {
	const fn = httpsCallable(functions, "createTournament");
	const res = await fn({
		entryFeeCoins: params.entryFeeCoins,
		maxPlayers: params.maxPlayers,
		matchDurationSeconds: params.matchDurationSeconds ?? 300,
		displayName: params.displayName ?? null,
	});
	const tournamentId = (res.data as any)?.tournamentId as string | undefined;
	if (!tournamentId) throw new Error("createTournament: missing tournamentId");
	return tournamentId;
}


export async function joinTournament(functions: Functions, tournamentId: string, displayName?: string | null): Promise<void> {
	const fn = httpsCallable(functions, "joinTournament");
	await fn({ tournamentId, displayName: displayName ?? null });
}

export function subscribeTournament(db: Firestore, tournamentId: string, onTournament: (t: TournamentDoc | null) => void): Unsubscribe {
	const tournamentRef = doc(db, "tournaments", tournamentId);
	return onSnapshot(tournamentRef, (snap) => {
		onTournament(snap.exists() ? (snap.data() as TournamentDoc) : null);
	});
}

export function subscribeScores(db: Firestore, tournamentId: string, onScores: (scores: Record<string, ScoreDoc>) => void): Unsubscribe {
	const scoresCol = collection(db, "tournaments", tournamentId, "scores");
	return onSnapshot(scoresCol, (snap) => {
		const scores: Record<string, ScoreDoc> = {};
		snap.forEach((d) => {
			scores[d.id] = d.data() as ScoreDoc;
		});
		onScores(scores);
	});
}


export async function submitFinalScore(
	functions: Functions,
	tournamentId: string,
	score: { baseScore: number; timeBonus: number; totalScore: number; moveCount: number }
): Promise<void> {
	const fn = httpsCallable(functions, "submitFinalScore");
	await fn({ tournamentId, ...score });
}

export async function getTournament(db: Firestore, tournamentId: string): Promise<TournamentDoc | null> {
	const snap = await getDoc(doc(db, "tournaments", tournamentId));
	return snap.exists() ? (snap.data() as TournamentDoc) : null;
}
