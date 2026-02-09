import type { FieldValue, Timestamp } from "firebase/firestore";

export type TournamentStatus = "waiting" | "started" | "finished";

export interface TournamentPlayer {
	uid: string;
	displayName: string | null;
	joinedAt: Timestamp;
	finishedAt?: Timestamp;
	finalTotalScore?: number;
	finalBaseScore?: number;
}

export interface TournamentDoc {
	status: TournamentStatus;
	createdAt: Timestamp;
	createdByUid: string;

	entryFeeCoins: number;
	maxPlayers: number;
	matchDurationSeconds: number; // default 300

	seed: string | null;
	startedAt: Timestamp | null;
	endsAt: Timestamp | null;

	potCoins: number;
	players: Record<string, TournamentPlayer>;

	finalizedAt: Timestamp | null;
	results?: Array<{
		rank: number;
		uid: string;
		totalScore: number;
		prizeCoins: number;
	}>;
}

export interface UserDoc {
	coins: number;
	displayName?: string | null;
	updatedAt?: Timestamp | FieldValue;
}

export interface ScoreDoc {
	uid: string;
	baseScore: number;
	timeBonus: number;
	totalScore: number;
	finishedAt: Timestamp;
	moveCount: number;
}
