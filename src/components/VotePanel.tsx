
// src/components/VotePanel.tsx
export function VotePanel({
    onVote,
    selectedPlayers,
    currentPlayer,
    hasVoted
  }: {
    onVote: (approved: boolean) => void;
    selectedPlayers: string[];
    currentPlayer: Player | undefined;
    hasVoted: boolean;
  }) {
    if (hasVoted || !currentPlayer) return null;
  
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h3 className="text-lg font-semibold mb-4">โหวตทีมที่ถูกเลือก</h3>
        <div className="flex gap-4">
          <button
            onClick={() => onVote(true)}
            className="flex-1 bg-green-500 text-white py-3 rounded hover:bg-green-600 transition duration-200"
          >
            เห็นด้วย
          </button>
          <button
            onClick={() => onVote(false)}
            className="flex-1 bg-red-500 text-white py-3 rounded hover:bg-red-600 transition duration-200"
          >
            ไม่เห็นด้วย
          </button>
        </div>
      </div>
    );
  }
  