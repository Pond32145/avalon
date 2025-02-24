// src/utils/gameLogic.ts
export const distributeRoles = (players: Player[], playerCount: number): Player[] => {
    const roles = [...GAME_CONSTANTS.ROLES[playerCount as keyof typeof GAME_CONSTANTS.ROLES]];
    const shuffledRoles = roles.sort(() => Math.random() - 0.5);
    
    return players.map((player, index) => ({
      ...player,
      role: shuffledRoles[index] as Role
    }));
  };
  
  export const checkGameEnd = (missionResults: boolean[]): { isOver: boolean; winner: 'good' | 'evil' | null } => {
    const successMissions = missionResults.filter(result => result).length;
    const failedMissions = missionResults.filter(result => !result).length;
  
    if (successMissions >= 3) {
      return { isOver: true, winner: 'good' };
    }
    if (failedMissions >= 3) {
      return { isOver: true, winner: 'evil' };
    }
    return { isOver: false, winner: null };
  };
  