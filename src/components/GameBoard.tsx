// src/components/GameBoard.tsx
import { useEffect } from 'react';
import { Player, Room } from '../types/game';
import { PlayerList } from './PlayerList';
import { MissionTracker } from './MissionTracker';
import { VotePanel } from './VotePanel';
import { Chat } from './Chat';
import { GAME_CONSTANTS } from '../utils/constants';
import { checkGameEnd, distributeRoles } from '../utils/gameLogic';

export function GameBoard({
  room,
  updateRoom,
  currentPlayer,
  onSendMessage
}: {
  room: Room;
  updateRoom: (updates: Partial<Room>) => void;
  currentPlayer: Player | undefined;
  onSendMessage: (message: string) => void;
}) {
  const handleStartGame = () => {
    const updatedPlayers = distributeRoles(room.players, room.players.length);
    updateRoom({
      gameStarted: true,
      players: updatedPlayers
    });
  };

  const handlePlayerSelection = (playerId: string) => {
    if (!room.selectedPlayers.includes(playerId)) {
      const newSelectedPlayers = [...room.selectedPlayers, playerId];
      if (newSelectedPlayers.length <= GAME_CONSTANTS.MISSION_REQUIREMENTS[room.currentMission]) {
        updateRoom({ selectedPlayers: newSelectedPlayers });
      }
    }
  };

  const handleVote = (approved: boolean) => {
    const newVotes = { ...room.votes, [currentPlayer!.name]: approved };
    const allVoted = Object.keys(newVotes).length === room.players.length;

    if (allVoted) {
      const votesPassed = Object.values(newVotes).filter(v => v).length > room.players.length / 2;
      
      if (votesPassed) {
        // Mission proceeds
        const newMissionResults = [...room.missionResults];
        newMissionResults[room.currentMission] = true;
        
        const { isOver, winner } = checkGameEnd(newMissionResults);
        
        updateRoom({
          missionResults: newMissionResults,
          currentMission: room.currentMission + 1,
          votes: {},
          selectedPlayers: [],
          gameOver: isOver,
          winner
        });
      } else {
        // Failed vote, next leader
        const currentLeaderIndex = room.players.findIndex(p => p.isLeader);
        const nextLeaderIndex = (currentLeaderIndex + 1) % room.players.length;
        const updatedPlayers = room.players.map((p, i) => ({
          ...p,
          isLeader: i === nextLeaderIndex
        }));

        updateRoom({
          players: updatedPlayers,
          votes: {},
          selectedPlayers: []
        });
      }
    } else {
      updateRoom({ votes: newVotes });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <PlayerList
            players={room.players}
            currentPlayer={currentPlayer}
            isGameStarted={room.gameStarted}
          />
          {!room.gameStarted && currentPlayer
// src/components/GameBoard.tsx (continued...)
            && currentPlayer.isLeader && room.players.length >= GAME_CONSTANTS.PLAYERS_REQUIRED && (
            <button
              onClick={handleStartGame}
              className="w-full mt-4 bg-green-500 text-white py-3 rounded hover:bg-green-600"
            >
              เริ่มเกม
            </button>
          )}
          {room.gameStarted && !room.gameOver && (
            <>
              <MissionTracker
                missionResults={room.missionResults}
                currentMission={room.currentMission}
              />
              {currentPlayer?.isLeader && room.selectedPlayers.length < GAME_CONSTANTS.MISSION_REQUIREMENTS[room.currentMission] && (
                <div className="mt-4 bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4">เลือกผู้เล่นสำหรับภารกิจ ({room.selectedPlayers.length}/{GAME_CONSTANTS.MISSION_REQUIREMENTS[room.currentMission]})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {room.players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => handlePlayerSelection(player.id)}
                        disabled={room.selectedPlayers.includes(player.id)}
                        className={`p-2 rounded ${
                          room.selectedPlayers.includes(player.id)
                            ? 'bg-blue-200 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <VotePanel
                onVote={handleVote}
                selectedPlayers={room.selectedPlayers}
                currentPlayer={currentPlayer}
                hasVoted={room.votes[currentPlayer?.name || ''] !== undefined}
              />
            </>
          )}
          {room.gameOver && (
            <div className="mt-4 bg-white p-6 rounded-lg shadow-md text-center">
              <h2 className="text-2xl font-bold mb-4">
                {room.winner === 'good' ? 'ฝ่ายธรรมะชนะ! 🎉' : 'ฝ่ายอธรรมชนะ! 😈'}
              </h2>
              <button
                onClick={() => {
                  updateRoom({
                    gameStarted: false,
                    gameOver: false,
                    winner: null,
                    currentMission: 0,
                    missionResults: [],
                    selectedPlayers: [],
                    votes: {}
                  });
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                เริ่มเกมใหม่
              </button>
            </div>
          )}
        </div>
        <Chat messages={room.chat} onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}
