
// src/components/PlayerList.tsx
export function PlayerList({ players, currentPlayer, isGameStarted }: {
    players: Player[];
    currentPlayer: Player | undefined;
    isGameStarted: boolean;
  }) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">ผู้เล่น ({players.length})</h2>
        <ul className="space-y-2">
          {players.map(player => (
            <li
              key={player.id}
              className={`p-3 rounded ${
                player.isLeader ? 'bg-yellow-100' : 'bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{player.name} {player.isLeader && '👑'}</span>
                {isGameStarted && player.name === currentPlayer?.name && (
                  <span className="text-sm text-gray-600">
                    บทบาท: {player.role}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  