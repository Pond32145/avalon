import { GameState, GameAction, Player, Role, Team, GamePhase } from '../types/game';

const INITIAL_STATE: GameState = {
  roomId: '',
  players: [],
  currentLeader: null,
  phase: 'WAITING_FOR_PLAYERS',
  round: 0,
  failedVotes: 0,
  currentMission: 0,
  selectedPlayers: [],
  votes: {},
  missionResults: [],
  winner: null,
  lastUpdate: Date.now()
};

export const initialGameState: GameState = {
  roomId: '',
  players: [],
  currentLeader: null,
  phase: 'WAITING_FOR_PLAYERS',
  round: 1,
  failedVotes: 0,
  currentMission: 1,
  selectedPlayers: [],
  votes: {},
  missionResults: [],
  winner: null,
  lastUpdate: Date.now()
};

// จำนวนผู้เล่นที่ต้องการสำหรับแต่ละรอบ ขึ้นอยู่กับจำนวนผู้เล่นทั้งหมด
const MISSION_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5]
};

// จำนวนคนชั่วร้ายที่ต้องการสำหรับแต่ละจำนวนผู้เล่น
const EVIL_COUNTS: Record<number, number> = {
  5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4
};

// จำนวนคนที่ต้องล้มเหลวเพื่อให้ภารกิจล้มเหลว
const FAIL_REQUIRED: Record<number, number> = {
  5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1
};

// รอบที่ 4 ของเกม 7+ คน ต้องการ 2 คนล้มเหลว
FAIL_REQUIRED[7] = 2;
FAIL_REQUIRED[8] = 2;
FAIL_REQUIRED[9] = 2;
FAIL_REQUIRED[10] = 2;

function generateRoles(playerCount: number): [Role, Team][] {
  const roles: [Role, Team][] = [];
  
  // เพิ่มบทบาทหลัก
  roles.push(['Merlin', 'good']);
  roles.push(['Assassin', 'evil']);
  
  if (playerCount >= 7) {
    roles.push(['Morgana', 'evil']);
    roles.push(['Percival', 'good']);
  }
  
  // เพิ่มสมุนที่เหลือ
  const remainingEvil = EVIL_COUNTS[playerCount] - roles.filter(([_, team]) => team === 'evil').length;
  for (let i = 0; i < remainingEvil; i++) {
    roles.push(['Minion of Mordred', 'evil']);
  }
  
  // เพิ่ม Loyal Servant ที่เหลือ
  while (roles.length < playerCount) {
    roles.push(['Loyal Servant', 'good']);
  }
  
  // สับเปลี่ยนตำแหน่ง
  return roles.sort(() => Math.random() - 0.5);
}

export interface SelectPlayerAction {
  type: 'SELECT_PLAYER';
  payload: {
    playerId: string;
    targetId: string;
  };
}

export interface GameState {
  roomId: string;
  players: Player[];
  currentLeader: string | null;
  phase: GamePhase;
  round: number;
  failedVotes: number;
  currentMission: number;
  selectedPlayers: string[];
  votes: Record<string, boolean>;
  missionResults: boolean[];
  winner: Team | null;
  lastUpdate: number;
}

export function gameStateReducer(state: GameState, action: GameAction): GameState {
  const now = Date.now();

  switch (action.type) {
    case 'JOIN_GAME': {
      const { roomId, playerId, playerName } = action.payload;
      if (state.phase !== 'WAITING_FOR_PLAYERS') {
        return state;
      }
      
      if (state.players.some(p => p.id === playerId)) {
        return {
          ...state,
          players: state.players.map(p => 
            p.id === playerId 
              ? { ...p, isOnline: true, lastAction: now }
              : p
          ),
          lastUpdate: now
        };
      }

      const isFirstPlayer = state.players.length === 0;
      return {
        ...state,
        roomId,
        players: [
          ...state.players,
          {
            id: playerId,
            name: playerName,
            isLeader: isFirstPlayer,
            isOnline: true,
            lastAction: now
          }
        ],
        currentLeader: isFirstPlayer ? playerId : state.currentLeader,
        lastUpdate: now
      };
    }

    case 'START_GAME': {
      if (state.phase !== 'WAITING_FOR_PLAYERS') return state;
      
      const playerCount = state.players.length;
      if (playerCount < 5 || playerCount > 10) return state;

      // สุ่มบทบาทให้ผู้เล่น
      const roleAssignments = generateRoles(playerCount);
      const players = state.players.map((player, index) => ({
        ...player,
        role: roleAssignments[index][0],
        team: roleAssignments[index][1]
      }));

      return {
        ...state,
        players,
        phase: 'TEAM_SELECTION',
        round: 1,
        currentMission: 1,
        failedVotes: 0,
        selectedPlayers: [], // เพิ่มนี่
        lastUpdate: now
      };
    }

    case 'SELECT_PLAYER': {
      console.log('SELECT_PLAYER reducer', {
        phase: state.phase,
        currentLeader: state.currentLeader,
        actionPlayerId: action.payload.playerId,
        targetId: action.payload.targetId,
        selectedPlayers: state.selectedPlayers,
        missionSize: getMissionSize(state.players.length, state.currentMission)
      });

      if (state.phase !== 'TEAM_SELECTION') {
        console.log('Not in TEAM_SELECTION phase');
        return state;
      }

      // ตรวจสอบว่า action.payload.playerId เป็น leader หรือไม่
      if (state.currentLeader !== action.payload.playerId) {
        console.log('Not the current leader');
        return state;
      }

      const { targetId } = action.payload;
      const missionSize = getMissionSize(state.players.length, state.currentMission);

      // ถ้าเลือกซ้ำให้ลบออก
      if (state.selectedPlayers?.includes(targetId)) {
        console.log('Removing player from selection');
        return {
          ...state,
          selectedPlayers: state.selectedPlayers.filter(id => id !== targetId),
          lastUpdate: now
        };
      }

      // ถ้าเลือกครบแล้วไม่ให้เลือกเพิ่ม
      if (state.selectedPlayers?.length >= missionSize) {
        console.log('Team is full');
        return state;
      }

      // เพิ่มผู้เล่นที่ถูกเลือก
      console.log('Adding player to selection', {
        currentPlayers: state.selectedPlayers,
        newPlayer: targetId
      });
      return {
        ...state,
        selectedPlayers: [...(state.selectedPlayers || []), targetId],
        lastUpdate: now
      };
    }

    case 'SUBMIT_TEAM': {
      if (state.phase !== 'TEAM_SELECTION') return state;
      if (state.selectedPlayers.length !== getMissionSize(state.players.length, state.currentMission)) return state;

      return {
        ...state,
        phase: 'TEAM_VOTING',
        votes: {},
        lastUpdate: now
      };
    }

    case 'VOTE_TEAM': {
      if (state.phase !== 'TEAM_VOTING') return state;

      const { playerId, vote } = action.payload;
      const newVotes = { ...state.votes, [playerId]: vote };
      
      // ถ้าทุกคนโหวตแล้ว
      if (Object.keys(newVotes).length === state.players.length) {
        const approvalCount = Object.values(newVotes).filter(v => v).length;
        
        if (approvalCount > state.players.length / 2) {
          // ทีมผ่าน
          return {
            ...state,
            phase: 'MISSION_EXECUTION',
            votes: newVotes,
            failedVotes: 0,
            lastUpdate: now
          };
        } else {
          // ทีมไม่ผ่าน
          const newFailedVotes = state.failedVotes + 1;
          if (newFailedVotes >= 5) {
            // ถ้าโหวตไม่ผ่าน 5 ครั้งติด ฝ่ายอธรรมชนะ
            return {
              ...state,
              phase: 'GAME_OVER',
              winner: 'evil',
              votes: newVotes,
              lastUpdate: now
            };
          }

          // เปลี่ยนผู้นำและเริ่มเลือกทีมใหม่
          const currentLeaderIndex = state.players.findIndex(p => p.id === state.currentLeader);
          const nextLeaderIndex = (currentLeaderIndex + 1) % state.players.length;
          
          return {
            ...state,
            phase: 'TEAM_SELECTION',
            currentLeader: state.players[nextLeaderIndex].id,
            selectedPlayers: [],
            votes: newVotes,
            failedVotes: newFailedVotes,
            lastUpdate: now
          };
        }
      }

      return {
        ...state,
        votes: newVotes,
        lastUpdate: now
      };
    }

    case 'EXECUTE_MISSION': {
      if (state.phase !== 'MISSION_EXECUTION') return state;

      const { playerId, success } = action.payload;
      if (!state.selectedPlayers.includes(playerId)) return state;
      
      // ถ้าผู้เล่นคนนี้โหวตไปแล้ว ไม่ให้โหวตซ้ำ
      if (state.votes[playerId] !== undefined) return state;

      // เก็บผลการโหวตของผู้เล่นในรอบนี้
      const newVotes = { ...state.votes, [playerId]: success };
      
      // ถ้ายังไม่ครบทุกคนในทีม ให้รอ
      if (Object.keys(newVotes).filter(id => state.selectedPlayers.includes(id)).length < state.selectedPlayers.length) {
        return {
          ...state,
          votes: newVotes,
          lastUpdate: now
        };
      }

      // นับจำนวนโหวตล้มเหลวในรอบนี้
      const failCount = Object.values(newVotes).filter(v => !v).length;
      const failsRequired = getFailsRequired(state.players.length, state.currentMission);
      
      // เก็บผลภารกิจ
      const missionResults = [...state.missionResults];
      const missionSuccess = failCount < failsRequired;
      missionResults.push(missionSuccess);

      // ตรวจสอบผลการเล่น
      const successCount = missionResults.filter(r => r).length;
      const failedCount = missionResults.filter(r => !r).length;

      if (successCount >= 3) {
        // ฝ่ายธรรมะชนะ แต่ต้องรอการลอบสังหาร
        return {
          ...state,
          missionResults,
          phase: 'ASSASSINATION',
          lastUpdate: now
        };
      } else if (failedCount >= 3) {
        // ฝ่ายอธรรมชนะ
        return {
          ...state,
          missionResults,
          phase: 'GAME_OVER',
          winner: 'evil',
          lastUpdate: now
        };
      }

      // เปลี่ยนผู้นำและเริ่มภารกิจใหม่
      const currentLeaderIndex = state.players.findIndex(p => p.id === state.currentLeader);
      const nextLeaderIndex = (currentLeaderIndex + 1) % state.players.length;
      
      return {
        ...state,
        missionResults,
        phase: 'TEAM_SELECTION',
        currentMission: state.currentMission + 1,
        selectedPlayers: [],
        teamVotes: {},
        votes: {},
        currentLeader: state.players[nextLeaderIndex].id,
        lastUpdate: now
      };
    }

    case 'ASSASSINATE': {
      if (state.phase !== 'ASSASSINATION') return state;

      const { targetId } = action.payload;
      const target = state.players.find(p => p.id === targetId);
      
      if (!target || target.role !== 'Merlin') {
        // ถ้าไม่ใช่ Merlin ฝ่ายธรรมะชนะ
        return {
          ...state,
          phase: 'GAME_OVER',
          winner: 'good',
          lastUpdate: now
        };
      }

      // ถ้าเป็น Merlin ฝ่ายอธรรมชนะ
      return {
        ...state,
        phase: 'GAME_OVER',
        winner: 'evil',
        lastUpdate: now
      };
    }

    default:
      return state;
  }
}

export function createInitialState(roomId: string): GameState {
  return {
    ...INITIAL_STATE,
    roomId,
    lastUpdate: Date.now()
  };
}

export function isPlayerTurn(state: GameState, playerId: string): boolean {
  switch (state.phase) {
    case 'TEAM_SELECTION':
      return state.currentLeader === playerId;
    case 'TEAM_VOTING':
      return !state.votes[playerId];
    case 'MISSION_EXECUTION':
      return state.selectedPlayers.includes(playerId);
    case 'ASSASSINATION':
      return state.players.find(p => p.id === playerId)?.role === 'Assassin';
    default:
      return false;
  }
}

export function getGameStatus(state: GameState): string {
  switch (state.phase) {
    case 'WAITING_FOR_PLAYERS':
      return `รอผู้เล่น (${state.players.length}/10)`;
    case 'TEAM_SELECTION':
      return `รอบที่ ${state.currentMission}: ${state.players.find(p => p.id === state.currentLeader)?.name} กำลังเลือกทีม`;
    case 'TEAM_VOTING':
      return `รอบที่ ${state.currentMission}: กำลังโหวตทีม (${Object.keys(state.votes).length}/${state.players.length})`;
    case 'MISSION_EXECUTION':
      return `รอบที่ ${state.currentMission}: กำลังทำภารกิจ`;
    case 'ASSASSINATION':
      return 'Assassin กำลังเลือกเป้าหมาย';
    case 'GAME_OVER':
      return `เกมจบแล้ว - ${state.winner === 'good' ? 'ฝ่ายธรรมะชนะ!' : 'ฝ่ายอธรรมชนะ!'}`;
    default:
      return 'กำลังโหลด...';
  }
}

export const getMissionSize = (playerCount: number, missionNumber: number): number => {
  return MISSION_SIZES[playerCount][missionNumber - 1];
}

export const getFailsRequired = (playerCount: number, missionNumber: number): number => {
  return missionNumber === 4 && playerCount >= 7 ? 2 : 1;
}

export function canSeeRole(viewer: Player, target: Player): boolean {
  if (!viewer.role || !target.role) return false;

  switch (viewer.role) {
    case 'Merlin':
      return target.team === 'evil' && target.role !== 'Mordred';
    case 'Percival':
      return target.role === 'Merlin' || target.role === 'Morgana';
    case 'Assassin':
    case 'Morgana':
    case 'Minion of Mordred':
      return target.team === 'evil';
    default:
      return false;
  }
}
