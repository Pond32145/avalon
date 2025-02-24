// src/types/game.ts
export type Role = 'Merlin' | 'Assassin' | 'Loyal Servant' | 'Minion of Mordred' | 'Percival' | 'Morgana';

export type Team = 'good' | 'evil';

export interface Player {
  id: string;
  name: string;
  role?: Role;
  team?: Team;
  isLeader: boolean;
  isOnline: boolean;
  lastAction: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  currentLeader: string | null;
  phase: GamePhase;
  round: number;
  failedVotes: number;
  selectedPlayers: string[];
  votes: Record<string, boolean>;
  missionResults: boolean[];
  currentMission: number;
  winner: Team | null;
  lastUpdate: number;
}

export type GamePhase = 
  | 'WAITING_FOR_PLAYERS'
  | 'ASSIGNING_ROLES'
  | 'TEAM_SELECTION'
  | 'TEAM_VOTING'
  | 'MISSION_EXECUTION'
  | 'ASSASSINATION'
  | 'GAME_OVER';

export type GameAction = 
  | { type: 'JOIN_GAME'; payload: { roomId: string; playerId: string; playerName: string; } }
  | { type: 'START_GAME'; payload: { roomId: string; } }
  | { type: 'SELECT_PLAYER'; payload: { roomId: string; playerId: string; } }
  | { type: 'SUBMIT_TEAM'; payload: { roomId: string; } }
  | { type: 'VOTE_TEAM'; payload: { roomId: string; playerId: string; vote: boolean; } }
  | { type: 'EXECUTE_MISSION'; payload: { roomId: string; playerId: string; success: boolean; } }
  | { type: 'ASSASSINATE'; payload: { roomId: string; targetId: string; } };