import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { randomUUID } from "crypto";

admin.initializeApp();

type TournamentStatus = "waiting" | "started" | "finished";

type TournamentDoc = {
	status: TournamentStatus;
	createdAt: admin.firestore.Timestamp;
	createdByUid: string;
	entryFeeCoins: number;
	maxPlayers: number;
	matchDurationSeconds: number;
	seed: string | null;
	startedAt: admin.firestore.Timestamp | null;
	endsAt: admin.firestore.Timestamp | null;
	potCoins: number;
	players: Record<
		string,
		{
			uid: string;
			displayName: string | null;
			joinedAt: admin.firestore.Timestamp;
			finishedAt?: admin.firestore.Timestamp;
			finalTotalScore?: number;
			finalBaseScore?: number;
		}
	>;
	finalizedAt: admin.firestore.Timestamp | null;
	results?: Array<{ rank: number; uid: string; totalScore: number; prizeCoins: number }>;
};

type UserDoc = { coins: number; displayName?: string | null };

type ScoreDoc = {
	uid: string;
	baseScore: number;
	timeBonus: number;
	totalScore: number;
	finishedAt: admin.firestore.Timestamp;
	moveCount: number;
};

const db = admin.firestore();

function requireAuth(context: { auth?: { uid: string } }): string {
	if (!context.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required");
	return context.auth.uid;
}

function assertInt(name: string, v: unknown, min: number, max: number): number {
	if (!Number.isInteger(v)) throw new HttpsError("invalid-argument", `${name} must be an integer`);
	const n = v as number;
	if (n < min || n > max) throw new HttpsError("invalid-argument", `${name} out of range`);
	return n;
}

function payoutByRank(maxPlayers: number, potCoins: number): number[] {
	// Starter default payout schedule (adjust to your design as needed).
	// 2 players: 70/30
	// 3 players: 50/30/20
	// 4+ players: 40/25/20/15 (top 4)
	let fractions: number[];
	if (maxPlayers === 2) fractions = [0.7, 0.3];
	else if (maxPlayers === 3) fractions = [0.5, 0.3, 0.2];
	else fractions = [0.4, 0.25, 0.2, 0.15];

	const prizes = fractions.map((f) => Math.floor(potCoins * f));
	// Ensure full pot distributed by adding remainder to 1st.
	const distributed = prizes.reduce((a, b) => a + b, 0);
	prizes[0] += potCoins - distributed;
	return prizes;
}

async function maybeStartTournament(tournamentRef: admin.firestore.DocumentReference, tournament: TournamentDoc): Promise<void> {
	if (tournament.status !== "waiting") return;
	const playerUids = Object.keys(tournament.players ?? {});
	if (playerUids.length !== tournament.maxPlayers) return;

	const seed = randomUUID();
	const startedAt = admin.firestore.Timestamp.now();
	const endsAt = admin.firestore.Timestamp.fromMillis(
		startedAt.toMillis() + tournament.matchDurationSeconds * 1000
	);

	await tournamentRef.update({
		status: "started",
		seed,
		startedAt,
		endsAt,
	});
}

async function finalizeTournament(tournamentId: string): Promise<void> {
	const tournamentRef = db.collection("tournaments").doc(tournamentId);
	await db.runTransaction(async (tx) => {
		const tSnap = await tx.get(tournamentRef);
		if (!tSnap.exists) return;
		const tournament = tSnap.data() as TournamentDoc;
		if (tournament.status !== "started") return;
		if (tournament.finalizedAt) return;
		if (!tournament.endsAt) return;

		const now = admin.firestore.Timestamp.now();
		const playerUids = Object.keys(tournament.players ?? {});

		// Only finalize when time is up OR all players submitted a score.
		const timeUp = now.toMillis() >= tournament.endsAt.toMillis();
		const scoreDocs = await Promise.all(
			playerUids.map((uid) => tx.get(tournamentRef.collection("scores").doc(uid)))
		);
		const scores: ScoreDoc[] = scoreDocs
			.filter((s) => s.exists)
			.map((s) => s.data() as ScoreDoc);
		const allSubmitted = scores.length === playerUids.length;

		if (!timeUp && !allSubmitted) return;

		// Rank scores.
		scores.sort((a, b) => {
			if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
			return a.finishedAt.toMillis() - b.finishedAt.toMillis();
		});

		const prizes = payoutByRank(tournament.maxPlayers, tournament.potCoins);
		const results = scores.slice(0, prizes.length).map((s, i) => ({
			rank: i + 1,
			uid: s.uid,
			totalScore: s.totalScore,
			prizeCoins: prizes[i],
		}));

		// Pay out.
		for (const r of results) {
			const userRef = db.collection("users").doc(r.uid);
			const uSnap = await tx.get(userRef);
			const user = (uSnap.exists ? (uSnap.data() as UserDoc) : ({ coins: 0 } as UserDoc));
			tx.set(
				userRef,
				{
					coins: (user.coins ?? 0) + r.prizeCoins,
				},
				{ merge: true }
			);
		}

		tx.update(tournamentRef, {
			status: "finished",
			finalizedAt: now,
			results,
		});
	});
}

export const createTournament = onCall(async (request) => {
	const uid = requireAuth(request);
	const entryFeeCoins = assertInt("entryFeeCoins", request.data?.entryFeeCoins, 0, 1_000_000);
	const maxPlayers = assertInt("maxPlayers", request.data?.maxPlayers, 2, 8);
	const matchDurationSeconds = assertInt("matchDurationSeconds", request.data?.matchDurationSeconds ?? 300, 30, 3600);
	const displayName = typeof request.data?.displayName === "string" ? request.data.displayName : null;

	const tournamentRef = db.collection("tournaments").doc();
	const userRef = db.collection("users").doc(uid);

	await db.runTransaction(async (tx) => {
		const uSnap = await tx.get(userRef);
		const user = (uSnap.exists ? (uSnap.data() as UserDoc) : ({ coins: 0 } as UserDoc));
		if ((user.coins ?? 0) < entryFeeCoins) throw new HttpsError("failed-precondition", "Not enough coins");

		tx.set(userRef, { coins: (user.coins ?? 0) - entryFeeCoins }, { merge: true });

		const now = admin.firestore.Timestamp.now();
		const tournament: TournamentDoc = {
			status: "waiting",
			createdAt: now,
			createdByUid: uid,
			entryFeeCoins,
			maxPlayers,
			matchDurationSeconds,
			seed: null,
			startedAt: null,
			endsAt: null,
			potCoins: entryFeeCoins,
			players: {
				[uid]: {
					uid,
					displayName,
					joinedAt: now,
				},
			},
			finalizedAt: null,
		};

		tx.set(tournamentRef, tournament);
	});

	return { tournamentId: tournamentRef.id };
});

export const joinTournament = onCall(async (request) => {
	const uid = requireAuth(request);
	const tournamentId = String(request.data?.tournamentId ?? "");
	if (!tournamentId) throw new HttpsError("invalid-argument", "tournamentId required");
	const displayName = typeof request.data?.displayName === "string" ? request.data.displayName : null;

	const tournamentRef = db.collection("tournaments").doc(tournamentId);
	const userRef = db.collection("users").doc(uid);

	await db.runTransaction(async (tx) => {
		const [tSnap, uSnap] = await Promise.all([tx.get(tournamentRef), tx.get(userRef)]);
		if (!tSnap.exists) throw new HttpsError("not-found", "Tournament not found");
		const tournament = tSnap.data() as TournamentDoc;
		if (tournament.status !== "waiting") throw new HttpsError("failed-precondition", "Tournament already started");

		const players = tournament.players ?? {};
		if (players[uid]) return;
		if (Object.keys(players).length >= tournament.maxPlayers) throw new HttpsError("failed-precondition", "Tournament full");

		const user = (uSnap.exists ? (uSnap.data() as UserDoc) : ({ coins: 0 } as UserDoc));
		if ((user.coins ?? 0) < tournament.entryFeeCoins) throw new HttpsError("failed-precondition", "Not enough coins");

		tx.set(userRef, { coins: (user.coins ?? 0) - tournament.entryFeeCoins }, { merge: true });

		const now = admin.firestore.Timestamp.now();
		tx.update(tournamentRef, {
			[`players.${uid}`]: { uid, displayName, joinedAt: now },
			potCoins: tournament.potCoins + tournament.entryFeeCoins,
		});
	});
});

export const submitFinalScore = onCall(async (request) => {
	const uid = requireAuth(request);
	const tournamentId = String(request.data?.tournamentId ?? "");
	if (!tournamentId) throw new HttpsError("invalid-argument", "tournamentId required");

	const baseScore = assertInt("baseScore", request.data?.baseScore, 0, 1_000_000);
	const timeBonus = assertInt("timeBonus", request.data?.timeBonus, 0, 1_000_000);
	const totalScore = assertInt("totalScore", request.data?.totalScore, 0, 2_000_000);
	const moveCount = assertInt("moveCount", request.data?.moveCount, 0, 100_000);

	const tournamentRef = db.collection("tournaments").doc(tournamentId);
	const scoreRef = tournamentRef.collection("scores").doc(uid);

	await db.runTransaction(async (tx) => {
		const tSnap = await tx.get(tournamentRef);
		if (!tSnap.exists) throw new HttpsError("not-found", "Tournament not found");
		const tournament = tSnap.data() as TournamentDoc;
		if (tournament.status !== "started") throw new HttpsError("failed-precondition", "Tournament not started");
		if (!tournament.players?.[uid]) throw new HttpsError("permission-denied", "Not a player in this tournament");

		const finishedAt = admin.firestore.Timestamp.now();
		tx.set(
			scoreRef,
			{ uid, baseScore, timeBonus, totalScore, finishedAt, moveCount } satisfies ScoreDoc,
			{ merge: true }
		);

		tx.update(tournamentRef, {
			[`players.${uid}.finishedAt`]: finishedAt,
			[`players.${uid}.finalTotalScore`]: totalScore,
			[`players.${uid}.finalBaseScore`]: baseScore,
		});
	});

	// Best-effort finalize attempt (idempotent).
	await finalizeTournament(tournamentId);
});

export const onTournamentWrite = onDocumentWritten("tournaments/{tournamentId}", async (event) => {
	const after = event.data?.after;
	if (!after?.exists) return;
	const tournament = after.data() as TournamentDoc;
	try {
		await maybeStartTournament(after.ref, tournament);
		// Also attempt finalize in case endsAt already passed (e.g., backfilled write).
		if (tournament.status === "started") await finalizeTournament(after.id);
	} catch (e) {
		logger.error("onTournamentWrite error", e);
	}
});

export const onScoreWrite = onDocumentWritten("tournaments/{tournamentId}/scores/{uid}", async (event) => {
	const tournamentId = event.params.tournamentId as string;
	try {
		await finalizeTournament(tournamentId);
	} catch (e) {
		logger.error("onScoreWrite error", e);
	}
});
