export type GameModeId = "classic";

export interface GameSessionConfig {
	seed: string;
	modeId: GameModeId;
}

function createSeed(): string {
	// Simple, collision-resistant-enough seed. (Future: replace with a server-issued seed.)
	const now = Date.now();
	const rand = Math.random().toString(16).slice(2);
	return `${now}-${rand}`;
}

export function createGameSession(
	overrides: Partial<GameSessionConfig> = {}
): GameSessionConfig {
	return {
		seed: overrides.seed ?? createSeed(),
		modeId: overrides.modeId ?? "classic",
	};
}
