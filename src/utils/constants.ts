// src/utils/constants.ts
export const GAME_CONSTANTS = {
    PLAYERS_REQUIRED: 5,
    MISSIONS_TO_WIN: 3,
    MISSION_REQUIREMENTS: [2, 3, 2, 3, 3], // จำนวนผู้เล่นที่ต้องการในแต่ละภารกิจ
    ROLES: {
      5: ['Merlin', 'Assassin', 'Loyal Servant', 'Loyal Servant', 'Minion of Mordred'],
      6: ['Merlin', 'Assassin', 'Loyal Servant', 'Loyal Servant', 'Minion of Mordred', 'Morgana'],
      7: ['Merlin', 'Assassin', 'Percival', 'Loyal Servant', 'Loyal Servant', 'Morgana', 'Minion of Mordred']
    }
  } as const;
  