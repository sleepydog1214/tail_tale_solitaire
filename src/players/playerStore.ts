export type PlayerProfile = {
  id: string;
  name: string;
  createdAtMs: number;
  lastActiveAtMs: number;
};

const PLAYERS_KEY = "tt_players_v1";
const ACTIVE_PLAYER_KEY = "tt_active_player_v1";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substring(2);
}

export function loadPlayers(): PlayerProfile[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const data = localStorage.getItem(PLAYERS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load players", e);
    return [];
  }
}

export function savePlayers(players: PlayerProfile[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {
    console.error("Failed to save players", e);
  }
}

export function createPlayer(name: string): PlayerProfile {
  const players = loadPlayers();
  const now = Date.now();
  const newPlayer: PlayerProfile = {
    id: generateId(),
    name,
    createdAtMs: now,
    lastActiveAtMs: now,
  };
  players.push(newPlayer);
  savePlayers(players);

  if (loadActivePlayerId() === null) {
    setActivePlayerId(newPlayer.id);
  }

  return newPlayer;
}

export function renamePlayer(id: string, newName: string): void {
  const players = loadPlayers();
  const player = players.find((p) => p.id === id);
  if (player) {
    player.name = newName;
    savePlayers(players);
  }
}

export function deletePlayer(id: string): void {
  let players = loadPlayers();
  const activeId = loadActivePlayerId();
  
  players = players.filter((p) => p.id !== id);
  savePlayers(players);

  if (activeId === id) {
    const nextActiveId = players.length > 0 ? players[0].id : null;
    setActivePlayerId(nextActiveId);
  }
}

export function loadActivePlayerId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_PLAYER_KEY);
  } catch (e) {
    console.error("Failed to load active player ID", e);
    return null;
  }
}

export function setActivePlayerId(id: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_PLAYER_KEY);
    } else {
      localStorage.setItem(ACTIVE_PLAYER_KEY, id);
    }
  } catch (e) {
    console.error("Failed to set active player ID", e);
  }
}

export function ensureDefaultPlayer(): { players: PlayerProfile[]; activePlayerId: string } {
  let players = loadPlayers();
  let activeId = loadActivePlayerId();

  if (players.length === 0) {
    const defaultPlayer = createPlayer("Guest");
    players = [defaultPlayer];
    activeId = defaultPlayer.id;
  }

  return { players, activePlayerId: activeId as string };
}
