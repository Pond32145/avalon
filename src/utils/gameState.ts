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

// จำนวนผู้เล่นที่ต้องการสำหรับแต่ละรอบ ขึ้นอยู่กับจำนวนผู้เล่นทั้งหมด
const MISSION_SIZES: Record<number, number[]> = {
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
        lastUpdate: now
      };
    }

    case 'SELECT_PLAYER': {
      if (state.phase !== 'TEAM_SELECTION') return state;
      if (state.currentLeader !== action.payload.playerId) return state;

      const { playerId: targetId } = action.payload;
      const missionSize = getMissionSize(state.players.length, state.currentMission);

      // ถ้าเลือกซ้ำให้ลบออก
      if (state.selectedPlayers.includes(targetId)) {
        return {
          ...state,
          selectedPlayers: state.selectedPlayers.filter(id => id !== targetId),
          lastUpdate: now
        };
      }

      // ถ้าเลือกครบแล้วไม่ให้เลือกเพิ่ม
      if (state.selectedPlayers.length >= missionSize) return state;

      // เพิ่มผู้เล่นที่ถูกเลือก
      return {
        ...state,
        selectedPlayers: [...state.selectedPlayers, targetId],
        lastUpdate: now
      };
    }

    case 'SUBMIT_TEAM': {
      if (state.phase !== 'TEAM_SELECTION') return state;
      if (state.selectedPlayers.length !== getMissionSize(state.players.length, state.currentMission)) return state;

      return {
        ...state,
        phase: 'TEAM_VOTING',
        teamVotes: {},  
        votes: {},      
        lastUpdate: now
      };
    }

    case 'VOTE_TEAM': {
      if (state.phase !== 'TEAM_VOTING') return state;

      const { playerId, vote } = action.payload;
      const newTeamVotes = { ...state.teamVotes, [playerId]: vote };

      // ถ้ายังโหวตไม่ครบ รอต่อ
      if (Object.keys(newTeamVotes).length < state.players.length) {
        return {
          ...state,
          teamVotes: newTeamVotes,
          lastUpdate: now
        };
      }

      // ถ้าโหวตครบแล้ว นับผล
      const approveCount = Object.values(newTeamVotes).filter(v => v).length;
      const rejectCount = state.players.length - approveCount;

      if (approveCount > rejectCount) {
        // ทีมผ่าน เริ่มทำภารกิจ
        return {
          ...state,
          phase: 'MISSION_EXECUTION',
          teamVotes: newTeamVotes,
          votes: {},  
          lastUpdate: now
        };
      }

      // ถ้าโหวตไม่ผ่าน
      const newFailedVotes = state.failedVotes + 1;
      if (newFailedVotes >= 5) {
        // ถ้าโหวตไม่ผ่าน 5 ครั้งติด ฝ่ายอธรรมชนะ
        return {
          ...state,
          phase: 'GAME_OVER',
          winner: 'evil',
          teamVotes: newTeamVotes,
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
        teamVotes: newTeamVotes,
        failedVotes: newFailedVotes,
        lastUpdate: now
      };
    }

    case 'EXECUTE_MISSION': {
      console.log('Executing mission:', {
        playerId: action.payload.playerId,
        success: action.payload.success,
        selectedPlayers: state.selectedPlayers,
        isSelected: state.selectedPlayers.includes(action.payload.playerId),
        currentVotes: state.votes
      });

      // ถ้าไม่ได้อยู่ในทีมที่ถูกเลือก หรือโหวตไปแล้ว ไม่ต้องทำอะไร
      if (!state.selectedPlayers.includes(action.payload.playerId) || state.votes[action.payload.playerId] !== undefined) {
        return state;
      }

      // เพิ่มผลโหวต
      const newVotes = {
        ...state.votes,
        [action.payload.playerId]: action.payload.success
      };

      // ตรวจสอบว่าทุกคนโหวตครบหรือยัง
      const votedPlayers = state.selectedPlayers.filter(id => newVotes[id] !== undefined);
      if (votedPlayers.length === state.selectedPlayers.length) {
        // นับจำนวน fail
        const failCount = Object.values(newVotes).filter(v => !v).length;
        const failsRequired = getFailsRequired(state.players.length, state.currentMission);

        // เพิ่มผลลัพธ์ภารกิจ
        const newMissionResults = [...state.missionResults, failCount >= failsRequired];

        // ตรวจสอบว่าจบเกมหรือยัง
        const successCount = newMissionResults.filter(r => r).length;
        const failureCount = newMissionResults.filter(r => !r).length;

        if (successCount >= 3) {
          return {
            ...state,
            phase: 'ASSASSINATION',
            votes: newVotes,
            missionResults: newMissionResults
          };
        } else if (failureCount >= 3) {
          return {
            ...state,
            phase: 'GAME_OVER',
            winner: 'evil',
            votes: newVotes,
            missionResults: newMissionResults
          };
        }

        // ถ้ายังไม่จบ เริ่มภารกิจใหม่
        return {
          ...state,
          phase: 'TEAM_SELECTION',
          currentMission: state.currentMission + 1,
          votes: newVotes,
          missionResults: newMissionResults,
          selectedPlayers: [],
          teamVotes: {},
          leader: (state.leader + 1) % state.players.length
        };
      }

      // ถ้ายังโหวตไม่ครบ อัพเดทแค่ votes
      return {
        ...state,
        votes: newVotes
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
      return !state.teamVotes[playerId];
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
      return `รอบที่ ${state.currentMission}: กำลังโหวตทีม (${Object.keys(state.teamVotes).length}/${state.players.length})`;
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

export function getMissionSize(playerCount: number, missionNumber: number): number {
  return MISSION_SIZES[playerCount][missionNumber - 1];
}

export function getFailsRequired(playerCount: number, missionNumber: number): number {
  return missionNumber === 4 && playerCount >= 7 ? 2 : 1;
}
