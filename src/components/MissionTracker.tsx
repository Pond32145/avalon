
// src/components/MissionTracker.tsx
export function MissionTracker({ missionResults, currentMission }: {
    missionResults: boolean[];
    currentMission: number;
  }) {
    return (
      <div className="flex gap-4 justify-center my-6">
        {Array(5).fill(null).map((_, index) => (
          <div
            key={index}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              index === currentMission
                ? 'bg-yellow-400 border-2 border-yellow-600'
                : missionResults[index] !== undefined
                ? missionResults[index]
                  ? 'bg-green-500'
                  : 'bg-red-500'
                : 'bg-gray-300'
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    );
  }
  