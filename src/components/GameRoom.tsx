import React, { useEffect } from 'react';
import { useAvalonGame } from '../hooks/useAvalonGame';
import { Player, GameState } from '../types/game';
import { getMissionSize, getFailsRequired } from '../utils/gameState';

interface GameRoomProps {
  roomId: string;
  playerId: string;
  playerName: string;
}

export default function GameRoom({ roomId, playerId, playerName }: GameRoomProps) {
  const {
    gameState,
    isConnected,
    error,
    dispatch,
    isMyTurn,
    gameStatus,
    visibleRoles
  } = useAvalonGame(roomId, playerId, playerName);
  const player = gameState?.players.find(p => p.id === playerId);

  useEffect(() => {
    if (gameState?.phase === 'MISSION_EXECUTION') {
      console.log('Mission execution state:', {
        phase: gameState.phase,
        selectedPlayers: gameState.selectedPlayers,
        playerId,
        votes: gameState.votes,
        isSelected: gameState.selectedPlayers.includes(playerId),
        hasVoted: gameState.votes[playerId] !== undefined
      });
    }
  }, [gameState, playerId]);

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME', payload: {} });
  };

  // เพิ่ม debug log
  const handleSelectPlayer = (targetId: string) => {
    console.log('handleSelectPlayer', {
      phase: gameState?.phase,
      currentLeader: gameState?.currentLeader,
      playerId,
      targetId
    });
    
    if (gameState?.phase === 'TEAM_SELECTION' && gameState.currentLeader === playerId) {
      dispatch({
        type: 'SELECT_PLAYER',
        payload: { 
          playerId,  // ส่ง playerId ของคนที่กดปุ่ม (leader)
          targetId   // ส่ง targetId ของคนที่ถูกเลือก
        }
      });
    }
  };

  const handleSubmitTeam = () => {
    dispatch({ type: 'SUBMIT_TEAM', payload: {} });
  };

  const handleVoteTeam = (vote: boolean) => {
    dispatch({ type: 'VOTE_TEAM', payload: { playerId, vote } });
  };

  // เพิ่ม debug log
  const handleExecuteMission = (success: boolean) => {
    console.log('Executing mission:', {
      playerId,
      success,
      phase: gameState?.phase,
      selectedPlayers: gameState?.selectedPlayers
    });
    
    if (gameState?.phase === 'MISSION_EXECUTION' && gameState.selectedPlayers.includes(playerId)) {
      dispatch({
        type: 'EXECUTE_MISSION',
        payload: { success, playerId }
      });
    }
  };

  const handleAssassinate = (targetId: string) => {
    dispatch({ type: 'ASSASSINATE', payload: { targetId } });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl animate-pulse">กำลังเชื่อมต่อ...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">{gameStatus}</h1>
          {error && (
            <div className="bg-red-900 text-red-100 p-3 rounded-md text-center">
              {error}
            </div>
          )}
        </div>

        {/* Game Content */}
        <div className="space-y-6">
          {/* Waiting Room */}
          {gameState?.phase === 'WAITING_FOR_PLAYERS' && (
            <div className="text-center">
              <button
                onClick={handleStartGame}
                disabled={gameState.players.length < 5}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                เริ่มเกม ({gameState.players.length}/10)
              </button>
            </div>
          )}

          {/* Room ID */}
          <div className="bg-gray-800 p-4 rounded-lg mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Room: <span className="font-mono">{roomId}</span></h2>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                // TODO: Add toast notification
              }}
              className="text-gray-300 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-500 text-sm"
            >
              Copy ID
            </button>
          </div>

          {/* Player List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameState?.players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                gameState={gameState}
                isCurrentPlayer={player.id === playerId}
                isVisible={visibleRoles[player.id]}
                isSelectable={gameState.phase === 'TEAM_SELECTION' && isMyTurn}
                isSelected={gameState.selectedPlayers?.includes(player.id)}
                onSelect={() => handleSelectPlayer(player.id)}
                onAssassinate={() => handleAssassinate(player.id)}
                showAssassinate={
                  gameState.phase === 'ASSASSINATION' &&
                  gameState.players.find(p => p.id === playerId)?.role === 'Assassin'
                }
              />
            ))}
          </div>

          {/* Team Selection */}
          {gameState?.phase === 'TEAM_SELECTION' && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Select Team Members ({gameState.selectedPlayers?.length || 0}/{getMissionSize(gameState.players.length, gameState.currentMission)})</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p.id)}
                    className={`px-4 py-2 rounded ${
                      gameState.selectedPlayers?.includes(p.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    } ${gameState.currentLeader === playerId ? '' : 'cursor-not-allowed opacity-50'}`}
                    disabled={gameState.currentLeader !== playerId}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {gameState.currentLeader === playerId && gameState.selectedPlayers?.length === getMissionSize(gameState.players.length, gameState.currentMission) && (
                <button
                  onClick={handleSubmitTeam}
                  className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Submit Team
                </button>
              )}
            </div>
          )}

          {/* Team Voting */}
          {gameState?.phase === 'TEAM_VOTING' && !gameState.votes[playerId] && (
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <h3 className="text-xl mb-4">โหวตทีม</h3>
              <div className="space-x-4">
                <button
                  onClick={() => handleVoteTeam(true)}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-colors"
                >
                  อนุมัติ
                </button>
                <button
                  onClick={() => handleVoteTeam(false)}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg transition-colors"
                >
                  ไม่อนุมัติ
                </button>
              </div>
            </div>
          )}

          {/* Mission Execution */}
          {gameState?.phase === 'MISSION_EXECUTION' && gameState.selectedPlayers.includes(playerId) && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Execute Mission</h3>
              {/* เปลี่ยนเงื่อนไขการแสดงปุ่มกลับเป็นแบบเดิม */}
              {!gameState.votes[playerId] ? (
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleExecuteMission(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Success
                  </button>
                  {player?.team === 'evil' && (
                    <button
                      onClick={() => handleExecuteMission(false)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Fail
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-gray-600">
                  You have completed your mission. Waiting for others... ({gameState.selectedPlayers.filter(id => 
                    gameState.votes[id] !== undefined
                  ).length}/{gameState.selectedPlayers.length})
                </div>
              )}
            </div>
          )}

          {/* แสดงสถานะการรอผลโหวต */}
          {gameState?.phase === 'MISSION_EXECUTION' && !gameState.selectedPlayers.includes(playerId) && (
            <div className="mt-4 text-gray-600">
              Waiting for mission team to complete their mission... ({gameState.selectedPlayers.filter(id => 
                gameState.votes[id] !== undefined
              ).length}/{gameState.selectedPlayers.length})
            </div>
          )}

          {/* Game Status */}
          {gameState && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-xl mb-4">สถานะเกม</h3>
              <div className="grid grid-cols-5 gap-2">
                {gameState.missionResults.map((result, index) => (
                  <div
                    key={index}
                    className={`h-20 rounded-lg flex items-center justify-center text-2xl font-bold ${
                      result ? 'bg-green-600' : 'bg-red-600'
                    }`}
                  >
                    {result ? '✓' : '✗'}
                  </div>
                ))}
                {Array.from({ length: 5 - gameState.missionResults.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="h-20 bg-gray-700 rounded-lg flex items-center justify-center text-2xl"
                  >
                    ?
                  </div>
                ))}
              </div>
              {gameState.phase === 'TEAM_SELECTION' && (
                <div className="mt-4 text-center text-red-400">
                  โหวตไม่ผ่าน: {gameState.failedVotes}/5
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  gameState: GameState;
  isCurrentPlayer: boolean;
  isVisible: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  showAssassinate: boolean;
  onSelect: () => void;
  onAssassinate: () => void;
}

function PlayerCard({
  player,
  gameState,
  isCurrentPlayer,
  isVisible,
  isSelectable,
  isSelected,
  showAssassinate,
  onSelect,
  onAssassinate
}: PlayerCardProps) {
  return (
    <div
      className={`
        relative p-4 rounded-lg transition-all transform hover:scale-102
        ${isCurrentPlayer ? 'bg-blue-900' : 'bg-gray-800'}
        ${isSelectable ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-2 ring-yellow-400' : ''}
      `}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <div className="font-semibold text-lg">
            {player.name}
            {player.isLeader && (
              <span className="ml-2 text-yellow-400" title="ผู้นำ">👑</span>
            )}
          </div>
          {(isCurrentPlayer || isVisible) && player.role && (
            <div className="text-sm text-gray-300">
              บทบาท: {player.role}
            </div>
          )}
        </div>
        <div className={`w-3 h-3 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* แสดงการโหวต */}
      {gameState.phase === 'TEAM_VOTING' && gameState.votes[player.id] !== undefined && (
        <div className={`
          absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
          ${gameState.votes[player.id] ? 'bg-green-600' : 'bg-red-600'}
        `}>
          {gameState.votes[player.id] ? '✓' : '✗'}
        </div>
      )}

      {/* ปุ่มลอบสังหาร */}
      {showAssassinate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAssassinate();
          }}
          className="mt-2 w-full bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
        >
          เลือกเป้าหมาย
        </button>
      )}
    </div>
  );
}
